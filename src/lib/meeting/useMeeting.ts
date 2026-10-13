'use client';

// Mesin meeting RuangRapat.
// - Video/audio: WebRTC antar peserta (mesh), cocok untuk ruang kecil (sekitar 2-6 orang).
// - Sinyal (offer/answer/ICE), kehadiran, chat, game, dan tugas: Supabase Realtime (broadcast + presence).
// - Teknik "perfect negotiation" dipakai agar dua peserta yang saling menelepon tidak bentrok.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type Presence = {
  name: string;
  isHost: boolean;
  cam: boolean;
  mic: boolean;
  hand: boolean;
  sharing: boolean;
  state: 'waiting' | 'in';
};

export type Peer = Presence & { id: string; stream: MediaStream | null };
export type ChatMessage = { id: string; from: string; name: string; text: string; ts: number; mine: boolean };
export type Task = { id: string; text: string; done: boolean };
export type Game = {
  board: string[];
  turn: 'X' | 'O';
  players: { X?: string; O?: string };
  names: { X?: string; O?: string };
  winner: string | null;
};
export type MeetingStatus = 'menyiapkan' | 'tersambung' | 'menunggu' | 'ditolak' | 'berakhir' | 'dikeluarkan' | 'galat';

type Options = { code: string; name: string; isHost: boolean; waitingRoom: boolean };
type PeerConn = {
  pc: RTCPeerConnection;
  stream: MediaStream;
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
};

const emptyGame = (): Game => ({ board: Array(9).fill(''), turn: 'X', players: {}, names: {}, winner: null });

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function winnerOf(b: string[]): string | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every(Boolean) ? 'seri' : null;
}

function iceServers(): RTCIceServer[] {
  const list: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const url = process.env.NEXT_PUBLIC_TURN_URL;
  if (url) {
    list.push({
      urls: url,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }
  return list;
}

export function useMeeting({ code, name, isHost, waitingRoom }: Options) {
  const [status, setStatus] = useState<MeetingStatus>('menyiapkan');
  const [mediaNote, setMediaNote] = useState('');
  const [peers, setPeers] = useState<Peer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [me, setMe] = useState<Presence>({ name, isHost, cam: false, mic: false, hand: false, sharing: false, state: 'in' });
  const [game, setGame] = useState<Game>(emptyGame());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myId] = useState(() => (typeof crypto !== 'undefined' ? crypto.randomUUID() : String(Math.random())));

  const channelRef = useRef<RealtimeChannel | null>(null);
  const conns = useRef(new Map<string, PeerConn>());
  const camTrack = useRef<MediaStreamTrack | null>(null);
  const micTrack = useRef<MediaStreamTrack | null>(null);
  const screenTrack = useRef<MediaStreamTrack | null>(null);
  const meRef = useRef(me);
  const presenceRef = useRef<Record<string, Presence>>({});
  const gameRef = useRef(game);
  const tasksRef = useRef(tasks);
  const statusRef = useRef<MeetingStatus>('menyiapkan');
  const leftRef = useRef(false);
  const cleanupRef = useRef<() => void>(() => {});
  const [recording, setRecording] = useState(false);
  const recRef = useRef(false);
  const localAudioRef = useRef<MediaStream | null>(null);

  const setStat = (s: MeetingStatus) => { statusRef.current = s; setStatus(s); };
  const send = useCallback((event: string, payload: unknown) => {
    channelRef.current?.send({ type: 'broadcast', event, payload });
  }, []);

  const publish = useCallback((patch: Partial<Presence>) => {
    const next = { ...meRef.current, ...patch };
    meRef.current = next;
    setMe(next);
    channelRef.current?.track(next);
  }, []);

  // ---------- Koneksi peer ----------
  const refreshPeers = useCallback(() => {
    const list: Peer[] = Object.entries(presenceRef.current)
      .filter(([id]) => id !== myId)
      .map(([id, p]) => ({ ...p, id, stream: conns.current.get(id)?.stream ?? null }));
    setPeers(list);
  }, [myId]);

  const closePeer = useCallback((id: string) => {
    const c = conns.current.get(id);
    if (!c) return;
    c.pc.close();
    conns.current.delete(id);
  }, []);

  const ensurePeer = useCallback((remoteId: string): PeerConn => {
    const existing = conns.current.get(remoteId);
    if (existing) return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const stream = new MediaStream();
    const conn: PeerConn = { pc, stream, makingOffer: false, ignoreOffer: false, polite: myId < remoteId };
    conns.current.set(remoteId, conn);

    // Selalu sediakan jalur audio dan video agar bisa dipasang/diganti kapan saja
    const aTx = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const vTx = pc.addTransceiver('video', { direction: 'sendrecv' });
    if (micTrack.current) aTx.sender.replaceTrack(micTrack.current).catch(() => {});
    const vTrack = screenTrack.current ?? camTrack.current;
    if (vTrack) vTx.sender.replaceTrack(vTrack).catch(() => {});

    pc.ontrack = (ev) => {
      if (!stream.getTracks().includes(ev.track)) stream.addTrack(ev.track);
      refreshPeers();
    };
    pc.onicecandidate = (ev) => {
      if (ev.candidate) send('signal', { to: remoteId, from: myId, kind: 'ice', data: ev.candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      try {
        conn.makingOffer = true;
        await pc.setLocalDescription();
        send('signal', { to: remoteId, from: myId, kind: 'desc', data: pc.localDescription });
      } catch { /* diabaikan, negosiasi berikutnya akan mencoba lagi */ } finally {
        conn.makingOffer = false;
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') pc.restartIce();
    };
    return conn;
  }, [myId, refreshPeers, send]);

  const handleSignal = useCallback(async (msg: { to: string; from: string; kind: 'desc' | 'ice'; data: any }) => {
    if (msg.to !== myId || statusRef.current !== 'tersambung') return;
    const conn = ensurePeer(msg.from);
    const { pc } = conn;
    try {
      if (msg.kind === 'desc') {
        const desc: RTCSessionDescriptionInit = msg.data;
        const collision = desc.type === 'offer' && (conn.makingOffer || pc.signalingState !== 'stable');
        conn.ignoreOffer = !conn.polite && collision;
        if (conn.ignoreOffer) return;
        await pc.setRemoteDescription(desc);
        if (desc.type === 'offer') {
          await pc.setLocalDescription();
          send('signal', { to: msg.from, from: myId, kind: 'desc', data: pc.localDescription });
        }
      } else if (msg.data) {
        try { await pc.addIceCandidate(msg.data); } catch (e) { if (!conn.ignoreOffer) throw e; }
      }
    } catch { /* sinyal usang, abaikan */ }
  }, [ensurePeer, myId, send]);

  const syncPresence = useCallback((state: Record<string, any[]>) => {
    const next: Record<string, Presence> = {};
    for (const [id, metas] of Object.entries(state)) {
      const m = metas[metas.length - 1] as Presence | undefined;
      if (m) next[id] = m;
    }
    const prev = presenceRef.current;
    presenceRef.current = next;

    if (statusRef.current === 'tersambung') {
      for (const [id, p] of Object.entries(next)) {
        if (id === myId || p.state !== 'in') continue;
        if (!conns.current.has(id)) {
          ensurePeer(id);
          // Peserta baru: kirim keadaan game dan tugas saat ini
          if (!prev[id]) {
            send('game', gameRef.current);
            send('tasks', tasksRef.current);
            if (recRef.current) send('rec', { on: true });
          }
        }
      }
    }
    for (const id of Array.from(conns.current.keys())) {
      if (!next[id] || next[id].state !== 'in') closePeer(id);
    }
    refreshPeers();
  }, [closePeer, ensurePeer, myId, refreshPeers, send]);

  // ---------- Hidup-mati ----------
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      // 1) Ambil kamera dan mikrofon sesuai pilihan di halaman cek perangkat
      let prefs: { cam?: boolean; mic?: boolean; camId?: string; micId?: string } = { cam: true, mic: true };
      try { prefs = { ...prefs, ...JSON.parse(sessionStorage.getItem('rr_prefs') || '{}') }; } catch { /* abaikan */ }

      let stream: MediaStream | null = null;
      const notes: string[] = [];
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: prefs.camId ? { deviceId: { exact: prefs.camId } } : true,
          audio: prefs.micId ? { deviceId: { exact: prefs.micId } } : true,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          notes.push('Kamera tidak bisa diakses, kamu masuk tanpa video.');
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            notes.push('Mikrofon tidak bisa diakses, kamu masuk tanpa suara.');
          } catch {
            notes.push('Kamera dan mikrofon tidak bisa diakses. Kamu tetap bisa melihat, mendengar, dan chat.');
          }
        }
      }
      if (cancelled) { stream?.getTracks().forEach((t) => t.stop()); return; }

      camTrack.current = stream?.getVideoTracks()[0] ?? null;
      micTrack.current = stream?.getAudioTracks()[0] ?? null;
      if (camTrack.current) camTrack.current.enabled = prefs.cam !== false;
      if (micTrack.current) micTrack.current.enabled = prefs.mic !== false;
      setLocalStream(stream);
      localAudioRef.current = micTrack.current ? new MediaStream([micTrack.current]) : null;
      setMediaNote(notes.join(' '));

      const needWait = waitingRoom && !isHost;
      const initial: Presence = {
        name, isHost,
        cam: !!camTrack.current && camTrack.current.enabled,
        mic: !!micTrack.current && micTrack.current.enabled,
        hand: false, sharing: false,
        state: needWait ? 'waiting' : 'in',
      };
      meRef.current = initial;
      setMe(initial);
      setStat(needWait ? 'menunggu' : 'tersambung');

      // 2) Masuk saluran realtime ruang ini
      const channel = supabase.channel(`ruang:${code}`, {
        config: { broadcast: { self: false }, presence: { key: myId } },
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => syncPresence(channel.presenceState() as any))
        .on('broadcast', { event: 'signal' }, ({ payload }) => handleSignal(payload))
        .on('broadcast', { event: 'chat' }, ({ payload }) => {
          setMessages((m) => [...m, { ...payload, mine: false }].slice(-200));
        })
        .on('broadcast', { event: 'game' }, ({ payload }) => {
          // Terima keadaan game yang lebih baru (lebih banyak langkah) atau reset
          const cur = gameRef.current;
          const filled = (g: Game) => g.board.filter(Boolean).length;
          if (payload.reset || filled(payload) >= filled(cur)) { gameRef.current = payload; setGame(payload); }
        })
        .on('broadcast', { event: 'tasks' }, ({ payload }) => {
          if (Array.isArray(payload) && (payload.length >= tasksRef.current.length || payload.some((t: Task) => t.done))) {
            tasksRef.current = payload; setTasks(payload);
          }
        })
        .on('broadcast', { event: 'rec' }, ({ payload }) => { setRecording(!!payload?.on); })
        .on('broadcast', { event: 'admit' }, ({ payload }) => {
          if (payload.to !== myId) return;
          setStat('tersambung');
          publish({ state: 'in' });
          // Hubungkan ke semua yang sudah di dalam
          for (const [id, p] of Object.entries(presenceRef.current)) {
            if (id !== myId && p.state === 'in') ensurePeer(id);
          }
        })
        .on('broadcast', { event: 'deny' }, ({ payload }) => { if (payload.to === myId) { setStat('ditolak'); cleanup(); } })
        .on('broadcast', { event: 'kick' }, ({ payload }) => { if (payload.to === myId) { setStat('dikeluarkan'); cleanup(); } })
        .on('broadcast', { event: 'end' }, () => { setStat('berakhir'); cleanup(); })
        .subscribe(async (s) => {
          if (s === 'SUBSCRIBED') await channel.track(initial);
          if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { setMediaNote((n) => n || 'Koneksi realtime bermasalah. Periksa jaringanmu.'); }
        });
    })();

    function cleanup() {
      conns.current.forEach((c) => c.pc.close());
      conns.current.clear();
      camTrack.current?.stop();
      micTrack.current?.stop();
      screenTrack.current?.stop();
      const ch = channelRef.current;
      if (ch) { supabase.removeChannel(ch); channelRef.current = null; }
    }

    cleanupRef.current = cleanup;
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ---------- Kontrol ----------
  const toggleMic = useCallback(() => {
    if (!micTrack.current) return;
    micTrack.current.enabled = !micTrack.current.enabled;
    publish({ mic: micTrack.current.enabled });
  }, [publish]);

  const toggleCam = useCallback(() => {
    if (!camTrack.current) return;
    camTrack.current.enabled = !camTrack.current.enabled;
    publish({ cam: camTrack.current.enabled });
  }, [publish]);

  const toggleHand = useCallback(() => publish({ hand: !meRef.current.hand }), [publish]);

  const setOutgoingVideo = useCallback((track: MediaStreamTrack | null) => {
    conns.current.forEach(({ pc }) => {
      const sender = pc.getTransceivers().find((t) => t.receiver.track.kind === 'video')?.sender;
      sender?.replaceTrack(track).catch(() => {});
    });
  }, []);

  const stopShare = useCallback(() => {
    screenTrack.current?.stop();
    screenTrack.current = null;
    setOutgoingVideo(camTrack.current);
    publish({ sharing: false });
  }, [publish, setOutgoingVideo]);

  const toggleShare = useCallback(async () => {
    if (screenTrack.current) { stopShare(); return; }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      screenTrack.current = track;
      track.onended = () => stopShare();
      setOutgoingVideo(track);
      publish({ sharing: true });
    } catch { /* dibatalkan pengguna */ }
  }, [publish, setOutgoingVideo, stopShare]);

  const sendChat = useCallback((text: string) => {
    const clean = text.trim().slice(0, 500);
    if (!clean) return;
    const msg = { id: crypto.randomUUID(), from: myId, name, text: clean, ts: Date.now() };
    setMessages((m) => [...m, { ...msg, mine: true }].slice(-200));
    send('chat', msg);
  }, [myId, name, send]);

  // Host: ruang tunggu
  const admit = useCallback((id: string) => send('admit', { to: id }), [send]);
  const deny = useCallback((id: string) => send('deny', { to: id }), [send]);
  const kick = useCallback((id: string) => send('kick', { to: id }), [send]);
  const stopAll = useCallback(() => { cleanupRef.current(); }, []);
  const endForAll = useCallback(() => {
    send('end', {});
    setStat('berakhir');
    setTimeout(() => cleanupRef.current(), 300); // beri waktu pesan "end" terkirim
  }, [send]);

  // Game tic-tac-toe
  const playMove = useCallback((i: number) => {
    const g = gameRef.current;
    if (g.winner || g.board[i]) return;
    const players = { ...g.players };
    const names = { ...g.names };
    let mark: 'X' | 'O' | null = null;
    if (players.X === myId) mark = 'X';
    else if (players.O === myId) mark = 'O';
    else if (!players.X) { players.X = myId; names.X = name; mark = 'X'; }
    else if (!players.O) { players.O = myId; names.O = name; mark = 'O'; }
    if (!mark || mark !== g.turn) return;
    const board = g.board.slice();
    board[i] = mark;
    const next: Game = { board, turn: mark === 'X' ? 'O' : 'X', players, names, winner: winnerOf(board) };
    gameRef.current = next; setGame(next); send('game', next);
  }, [myId, name, send]);

  const resetGame = useCallback(() => {
    const g = emptyGame();
    gameRef.current = g; setGame(g); send('game', { ...g, reset: true });
  }, [send]);

  // Tugas bersama
  const pushTasks = useCallback((list: Task[]) => { tasksRef.current = list; setTasks(list); send('tasks', list); }, [send]);
  const addTask = useCallback((text: string) => {
    const t = text.trim().slice(0, 140);
    if (t) pushTasks([...tasksRef.current, { id: crypto.randomUUID(), text: t, done: false }]);
  }, [pushTasks]);
  const toggleTask = useCallback((id: string) => {
    pushTasks(tasksRef.current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }, [pushTasks]);

  // Perekaman: umumkan ke semua peserta dan sediakan semua aliran suara untuk dicampur
  const announceRecording = useCallback((on: boolean) => {
    recRef.current = on;
    setRecording(on);
    send('rec', { on });
  }, [send]);
  const getAudioStreams = useCallback((): MediaStream[] => {
    const list: MediaStream[] = [];
    if (localAudioRef.current) list.push(localAudioRef.current);
    conns.current.forEach((c) => list.push(c.stream));
    return list;
  }, []);

  const markLeft = useCallback(() => { leftRef.current = true; }, []);

  const waiting = peers.filter((p) => p.state === 'waiting');
  const inRoom = peers.filter((p) => p.state === 'in');

  return {
    myId, status, mediaNote, me, localStream, peers: inRoom, waiting, messages, game, tasks,
    toggleMic, toggleCam, toggleHand, toggleShare, sendChat,
    recording, announceRecording, getAudioStreams,
    admit, deny, kick, endForAll, stopAll, playMove, resetGame, addTask, toggleTask, markLeft,
  };
}
