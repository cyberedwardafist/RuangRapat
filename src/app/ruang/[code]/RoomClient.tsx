'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting, type Peer } from '@/lib/meeting/useMeeting';
import { LogoMark } from '@/components/Logo';
import { downloadBlob, startRoomRecorder, type RoomRecorder } from '@/lib/meeting/recorder';

export type RoomData = {
  room: { code: string; name: string; waitingRoom: boolean; askLocation: boolean };
  isHost: boolean;
  isAdmin: boolean;
  maxMinutes: number;
  allowRecording: boolean;
  tools: { id: string; name: string; category: string; description: string; status: 'aktif' | 'maintenance' | 'nonaktif' }[];
  participantId: string;
  name: string;
};

const COLORS = ['#7C9BFF', '#7FE3B8', '#E0A8FF', '#FFC98A', '#A9C1FF', '#FF9DB6'];
const colorFor = (s: string) => COLORS[Array.from(s).reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

const ICON = {
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z|M19 11a7 7 0 0 1-14 0|M12 18v3',
  cam: 'M3 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z|M15 11l6-3v8l-6-3',
  screen: 'M3 5h18v11H3z|M8 20h8|M12 16v4',
  hand: 'M8 13V5a1.5 1.5 0 0 1 3 0v6|M11 11V4a1.5 1.5 0 0 1 3 0v7|M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-3a1.5 1.5 0 0 1 2.4-1.8L8 14',
  chat: 'M4 5h16v11H9l-5 4z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2.5 20a6.5 6.5 0 0 1 13 0|M16 4.3a3.5 3.5 0 0 1 0 6.4|M18 14a6.5 6.5 0 0 1 3.5 6',
  apps: 'M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z',
  flag: 'M5 21V4|M5 4h12l-2 4 2 4H5',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
};
function Icon({ name, slash }: { name: keyof typeof ICON; slash?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[name].split('|').map((d, i) => <path key={i} d={d} />)}
      {slash && <path d="M4 4l16 16" />}
    </svg>
  );
}

function Tile({ stream, name, cam, mic, hand, sharing, local, isHost }: {
  stream: MediaStream | null; name: string; cam: boolean; mic: boolean; hand: boolean; sharing: boolean; local?: boolean; isHost?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  const showVideo = !!stream && (cam || sharing);
  return (
    <div className={`tile${hand ? ' hand' : ''}`}>
      <video ref={ref} autoPlay playsInline muted={!!local} style={{ display: showVideo ? 'block' : 'none', transform: local && !sharing ? 'scaleX(-1)' : undefined }} />
      {!showVideo && <div className="big-avatar" style={{ background: colorFor(name) }}>{(name[0] || '?').toUpperCase()}</div>}
      <div className="name">
        {!mic && <span style={{ width: 14, height: 14, display: 'inline-flex' }}><Icon name="mic" slash /></span>}
        {name}{local ? ' (kamu)' : ''}{isHost ? ' · host' : ''}{sharing ? ' · berbagi layar' : ''}
      </div>
      {hand && <div style={{ position: 'absolute', top: 10, right: 10, background: '#f2c94c', color: '#0b1a2e', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 800 }}>Angkat tangan</div>}
    </div>
  );
}

export function RoomClient({ code, data }: { code: string; data: RoomData }) {
  const router = useRouter();
  const m = useMeeting({ code, name: data.name, isHost: data.isHost, waitingRoom: data.room.waitingRoom });
  const [panel, setPanel] = useState<'chat' | 'peserta' | 'aplikasi' | 'lapor' | null>('chat');
  const [chatText, setChatText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [reportType, setReportType] = useState('Peserta mengganggu rapat');
  const [reportNote, setReportNote] = useState('');
  const [reportDone, setReportDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ block: 'end' }); }, [m.messages, panel]);
  useEffect(() => { const t = setInterval(() => setElapsed((e) => e + 1), 1000); return () => clearInterval(t); }, []);

  // Batas durasi dari kebijakan admin: host mengakhiri rapat otomatis
  useEffect(() => {
    if (!data.isHost || !data.maxMinutes || m.status !== 'tersambung') return;
    if (elapsed >= data.maxMinutes * 60) endAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, m.status]);

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  const tools = useMemo(() => Object.fromEntries(data.tools.map((t) => [t.id, t])), [data.tools]);

  const recorder = useRef<RoomRecorder | null>(null);

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    m.announceRecording(false);
    const blob = await r.stop();
    await fetch(`/api/rooms/${code}/recording`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'stop' }) }).catch(() => {});
    if (blob) downloadBlob(blob, `rapat-${code}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.webm`);
  }

  async function toggleRecord() {
    if (recorder.current) { await stopRecording(); return; }
    const res = await fetch(`/api/rooms/${code}/recording`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'start' }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); alert(j.error || 'Tidak bisa mulai merekam'); return; }
    const r = startRoomRecorder('.stage', m.getAudioStreams);
    if (!r) {
      alert('Peramban ini tidak mendukung perekaman.');
      await fetch(`/api/rooms/${code}/recording`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state: 'stop' }) }).catch(() => {});
      return;
    }
    recorder.current = r;
    m.announceRecording(true);
  }

  async function leave() {
    await stopRecording();
    m.markLeft();
    m.stopAll();
    await fetch(`/api/rooms/${code}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: data.participantId }) }).catch(() => {});
    router.push('/');
  }
  async function endAll() {
    await stopRecording();
    await fetch(`/api/rooms/${code}/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantId: data.participantId, end: true }) }).catch(() => {});
    m.endForAll();
  }
  async function sendReport() {
    await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomCode: code, type: reportType, note: reportNote, reporterName: data.name }) });
    setReportDone(true); setReportNote('');
  }

  // Layar akhir
  if (m.status === 'ditolak' || m.status === 'dikeluarkan' || m.status === 'berakhir') {
    const msg = m.status === 'ditolak' ? 'Host tidak mengizinkanmu masuk.' : m.status === 'dikeluarkan' ? 'Kamu dikeluarkan dari ruang oleh host.' : 'Rapat telah berakhir.';
    return <div className="center-body"><div className="panel"><h1>{msg}</h1><a className="btn btn-primary" href="/">Ke beranda</a></div></div>;
  }
  if (m.status === 'menunggu') {
    return <div className="center-body"><div className="panel"><h1>Menunggu host</h1><p className="muted" style={{ margin: 0, fontSize: 14 }}>Host akan mengizinkanmu masuk ke &quot;{data.room.name}&quot;. Jangan tutup halaman ini.</p><button className="btn" onClick={leave}>Batal</button></div></div>;
  }

  const everyone = 1 + m.peers.length;
  const cols = everyone <= 1 ? 1 : everyone <= 4 ? 2 : 3;
  const tool = (id: string) => tools[id];
  const chip = (s?: string) => <span className={`chip ${s === 'aktif' ? 'ok' : s === 'maintenance' ? 'warn' : ''}`}>{s === 'aktif' ? 'Aktif' : s === 'maintenance' ? 'Maintenance' : 'Nonaktif'}</span>;
  const toggle = (p: typeof panel) => setPanel((cur) => (cur === p ? null : p));

  const tttMark = (i: number) => m.game.board[i];

  return (
    <div className="room">
      <div className="room-top">
        <div className="row" style={{ gap: 12 }}>
          <span className="logo-mark" style={{ width: 34, height: 34, borderRadius: 10 }}><LogoMark size={20} /></span>
          <div>
            <div style={{ fontWeight: 700 }}>{data.room.name}</div>
            <div style={{ fontSize: 12, color: '#8ea2c4' }}>{code} · {clock}</div>
          </div>
        </div>
        <button type="button" className="btn btn-sm" style={{ background: '#1f2d4a', color: '#fff', borderColor: '#2a3a5c' }}
          onClick={async () => { await navigator.clipboard.writeText(`${window.location.origin}/gabung?kode=${code}`).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
          {copied ? 'Tautan tersalin' : 'Salin tautan'}
        </button>
      </div>

      {m.recording && (
        <div role="status" style={{ background: '#7a1a12', color: '#fff', padding: '8px 20px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5b4d' }} />
          Rapat ini sedang direkam oleh host. Keluar dari ruang jika kamu tidak setuju.
        </div>
      )}
      {m.mediaNote &&<div className="notice info" style={{ borderRadius: 0 }}>{m.mediaNote}</div>}

      <div className="room-body">
        <div className="stage" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, overflowY: 'auto' }}>
          <Tile stream={m.localStream} name={data.name} cam={m.me.cam} mic={m.me.mic} hand={m.me.hand} sharing={m.me.sharing} local isHost={data.isHost} />
          {m.peers.map((p: Peer) => (
            <Tile key={p.id} stream={p.stream} name={p.name} cam={p.cam} mic={p.mic} hand={p.hand} sharing={p.sharing} isHost={p.isHost} />
          ))}
          {m.status === 'menyiapkan' && <div className="muted" style={{ color: '#8ea2c4' }}>Menyiapkan kamera dan mikrofon...</div>}
        </div>

        {panel && (
          <aside className="side" aria-label="Panel samping">
            <div className="side-head">
              <span>{panel === 'chat' ? 'Chat' : panel === 'peserta' ? `Peserta (${everyone})` : panel === 'aplikasi' ? 'Aplikasi di ruang' : 'Laporkan pelanggaran'}</span>
              <button type="button" onClick={() => setPanel(null)} style={{ background: 'none', border: 0, color: '#8ea2c4', fontSize: 20 }} aria-label="Tutup panel">×</button>
            </div>

            {panel === 'chat' && (
              <>
                <div className="side-body">
                  {m.messages.length === 0 && <span style={{ color: '#8ea2c4', fontSize: 14 }}>Belum ada pesan.</span>}
                  {m.messages.map((x) => <div key={x.id} className={`msg${x.mine ? ' mine' : ''}`}><small>{x.mine ? 'Kamu' : x.name}</small>{x.text}</div>)}
                  <div ref={chatEnd} />
                </div>
                <form style={{ padding: 12, display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); m.sendChat(chatText); setChatText(''); }}>
                  <input className="dark-input" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Tulis pesan" maxLength={500} />
                  <button className="btn btn-primary btn-sm" type="submit">Kirim</button>
                </form>
              </>
            )}

            {panel === 'peserta' && (
              <div className="side-body">
                {data.isHost && m.waiting.length > 0 && (
                  <>
                    <b style={{ fontSize: 13, color: '#f2c94c' }}>Menunggu izin masuk</b>
                    {m.waiting.map((w) => (
                      <div key={w.id} className="msg row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                        <span>{w.name}</span>
                        <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                          <button className="btn btn-sm btn-primary" onClick={() => m.admit(w.id)}>Izinkan</button>
                          <button className="btn btn-sm btn-danger" onClick={() => m.deny(w.id)}>Tolak</button>
                        </span>
                      </div>
                    ))}
                  </>
                )}
                <div className="msg">{data.name} (kamu){data.isHost ? ' · host' : ''}</div>
                {m.peers.map((p) => (
                  <div key={p.id} className="msg row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
                    <span>{p.name}{p.isHost ? ' · host' : ''}{p.hand ? ' ✋' : ''}</span>
                    {data.isHost && <button className="btn btn-sm btn-danger" onClick={() => { if (confirm(`Keluarkan ${p.name}?`)) m.kick(p.id); }}>Keluarkan</button>}
                  </div>
                ))}
              </div>
            )}

            {panel === 'aplikasi' && (
              <div className="side-body">
                <span style={{ fontSize: 12.5, color: '#8ea2c4' }}>Alat diatur admin. Alat hanya berbagi nama, kode ruang, dan peran. Tidak pernah kamera, mikrofon, atau lokasi.</span>

                <div className="msg">
                  <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{tool('tictactoe')?.name ?? 'Tic-tac-toe'}</b>{chip(tool('tictactoe')?.status)}</div>
                  {tool('tictactoe')?.status === 'aktif' ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 13, marginBottom: 8 }}>
                        {m.game.winner ? (m.game.winner === 'seri' ? 'Seri.' : `Pemenang: ${m.game.names[m.game.winner as 'X' | 'O'] ?? m.game.winner}`) : `Giliran ${m.game.turn}${m.game.names[m.game.turn] ? ` (${m.game.names[m.game.turn]})` : ''}. Klik kotak untuk ikut main.`}
                      </div>
                      <div className="ttt">
                        {Array.from({ length: 9 }, (_, i) => <button key={i} type="button" onClick={() => m.playMove(i)} aria-label={`Kotak ${i + 1}`}>{tttMark(i)}</button>)}
                      </div>
                      <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={m.resetGame}>Main lagi</button>
                    </div>
                  ) : <div style={{ marginTop: 6, fontSize: 13, color: '#8ea2c4' }}>{tool('tictactoe')?.status === 'maintenance' ? 'Sedang maintenance oleh admin.' : 'Dinonaktifkan oleh admin.'}</div>}
                </div>

                <div className="msg">
                  <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{tool('tugas')?.name ?? 'Tugas bersama'}</b>{chip(tool('tugas')?.status)}</div>
                  {tool('tugas')?.status === 'aktif' ? (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {m.tasks.length === 0 && <span style={{ fontSize: 13, color: '#8ea2c4' }}>Belum ada tugas.</span>}
                      {m.tasks.map((t) => (
                        <label key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                          <input type="checkbox" checked={t.done} onChange={() => m.toggleTask(t.id)} />
                          <span style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.text}</span>
                        </label>
                      ))}
                      <form style={{ display: 'flex', gap: 8 }} onSubmit={(e) => { e.preventDefault(); m.addTask(taskText); setTaskText(''); }}>
                        <input className="dark-input" value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Tambah tugas" maxLength={140} />
                        <button className="btn btn-primary btn-sm" type="submit">Tambah</button>
                      </form>
                    </div>
                  ) : <div style={{ marginTop: 6, fontSize: 13, color: '#8ea2c4' }}>{tool('tugas')?.status === 'maintenance' ? 'Sedang maintenance oleh admin.' : 'Dinonaktifkan oleh admin.'}</div>}
                </div>

                {data.tools.filter((t) => !['tictactoe', 'tugas'].includes(t.id)).map((t) => (
                  <div key={t.id} className="msg">
                    <div className="row between" style={{ flexWrap: 'nowrap' }}><b>{t.name}</b>{chip(t.status)}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#8ea2c4' }}>{t.description || t.category}. {t.status === 'aktif' ? 'Menunggu project yang terhubung lewat API.' : t.status === 'maintenance' ? 'Sedang maintenance.' : 'Dinonaktifkan.'}</div>
                  </div>
                ))}
                {data.isAdmin && <a href="/admin/integrasi" style={{ color: '#9db5ff', fontSize: 13 }}>Atur alat di konsol admin</a>}
              </div>
            )}

            {panel === 'lapor' && (
              <div className="side-body">
                {reportDone ? <div className="notice ok">Laporan terkirim ke admin. Terima kasih.</div> : (
                  <>
                    <select className="dark-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                      {['Konten tidak pantas', 'Peserta mengganggu rapat', 'Penyalahgunaan izin lokasi', 'Spam undangan', 'Lainnya'].map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <textarea className="dark-input" style={{ height: 110, padding: 12 }} value={reportNote} onChange={(e) => setReportNote(e.target.value)} placeholder="Ceritakan singkat apa yang terjadi" maxLength={500} />
                    <button className="btn btn-primary" onClick={sendReport}>Kirim laporan</button>
                  </>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      <div className="controls">
        <button type="button" className={`ctl${m.me.mic ? '' : ' off'}`} onClick={m.toggleMic} aria-label={m.me.mic ? 'Matikan mikrofon' : 'Nyalakan mikrofon'} title="Mikrofon"><Icon name="mic" slash={!m.me.mic} /></button>
        <button type="button" className={`ctl${m.me.cam ? '' : ' off'}`} onClick={m.toggleCam} aria-label={m.me.cam ? 'Matikan kamera' : 'Nyalakan kamera'} title="Kamera"><Icon name="cam" slash={!m.me.cam} /></button>
        <button type="button" className={`ctl${m.me.sharing ? ' on' : ''}`} onClick={m.toggleShare} aria-label="Bagikan layar" title="Bagikan layar"><Icon name="screen" /></button>
        <button type="button" className={`ctl${m.me.hand ? ' on' : ''}`} onClick={m.toggleHand} aria-label="Angkat tangan" title="Angkat tangan"><Icon name="hand" /></button>
        <button type="button" className={`ctl${panel === 'chat' ? ' on' : ''}`} onClick={() => toggle('chat')} aria-label="Chat" title="Chat"><Icon name="chat" /></button>
        <button type="button" className={`ctl${panel === 'peserta' ? ' on' : ''}`} onClick={() => toggle('peserta')} aria-label="Peserta" title="Peserta" style={{ position: 'relative' }}>
          <Icon name="users" />
          {data.isHost && m.waiting.length > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#f2c94c', color: '#0b1a2e', borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '1px 6px' }}>{m.waiting.length}</span>}
        </button>
        {data.isHost && data.allowRecording && (
          <button type="button" className={`ctl${m.recording ? ' off' : ''}`} onClick={toggleRecord} aria-label={m.recording ? 'Berhenti merekam' : 'Mulai merekam'} title={m.recording ? 'Berhenti merekam' : 'Mulai merekam'}>
            <svg viewBox="0 0 24 24" aria-hidden="true">{m.recording ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /> : <circle cx="12" cy="12" r="6" fill="#ff5b4d" />}</svg>
          </button>
        )}
        <button type="button" className={`ctl${panel === 'aplikasi' ? ' on' : ''}`} onClick={() => toggle('aplikasi')} aria-label="Aplikasi di ruang" title="Aplikasi di ruang"><Icon name="apps" /></button>
        <button type="button" className={`ctl${panel === 'lapor' ? ' on' : ''}`} onClick={() => { setReportDone(false); toggle('lapor'); }} aria-label="Laporkan pelanggaran" title="Laporkan"><Icon name="flag" /></button>
        <button type="button" className="ctl leave" onClick={leave}><Icon name="phone" />Keluar</button>
        {data.isHost && <button type="button" className="ctl leave" style={{ background: '#7a1a12' }} onClick={() => { if (confirm('Akhiri rapat untuk semua peserta?')) endAll(); }}>Akhiri untuk semua</button>}
      </div>
    </div>
  );
}
