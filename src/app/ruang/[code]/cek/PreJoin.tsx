'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type RoomInfo = { name: string; askLocation: boolean; waitingRoom: boolean; hasPassword: boolean };
type Perm = 'belum' | 'diizinkan' | 'ditolak' | 'dilewati';

export function PreJoin({ code }: { code: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [session, setSession] = useState<{ participantId: string; name: string } | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camPerm, setCamPerm] = useState<Perm>('belum');
  const [micPerm, setMicPerm] = useState<Perm>('belum');
  const [locPerm, setLocPerm] = useState<Perm>('belum');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState('');
  const [micId, setMicId] = useState('');
  const [joining, setJoining] = useState(false);

  // Data ruang dan sesi masuk
  useEffect(() => {
    try {
      const s = JSON.parse(sessionStorage.getItem('rr_session') || 'null');
      if (!s || s.code !== code) { router.replace(`/gabung?kode=${code}`); return; }
      setSession(s);
    } catch { router.replace(`/gabung?kode=${code}`); return; }
    fetch(`/api/rooms/${code}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) setLoadError(j.error || 'Ruang tidak ditemukan');
      else setRoom(j.room);
    }).catch(() => setLoadError('Tidak bisa terhubung ke server'));
  }, [code, router]);

  const startMedia = useCallback(async (video: boolean, audio: boolean, vId?: string, aId?: string) => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (!video && !audio) { if (videoRef.current) videoRef.current.srcObject = null; return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? (vId ? { deviceId: { exact: vId } } : true) : false,
        audio: audio ? (aId ? { deviceId: { exact: aId } } : true) : false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      if (video) setCamPerm('diizinkan');
      if (audio) setMicPerm('diizinkan');
      const devs = await navigator.mediaDevices.enumerateDevices();
      setCams(devs.filter((d) => d.kind === 'videoinput'));
      setMics(devs.filter((d) => d.kind === 'audioinput'));
    } catch {
      if (video) setCamPerm('ditolak');
      if (audio) setMicPerm('ditolak');
    }
  }, []);

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  async function allowCameraAndMic() {
    await startMedia(true, true, camId || undefined, micId || undefined);
  }

  function toggleCam() {
    const t = streamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); } else setCamOn((v) => !v);
  }
  function toggleMic() {
    const t = streamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); } else setMicOn((v) => !v);
  }

  function allowLocation() {
    if (!navigator.geolocation) { setLocPerm('ditolak'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocPerm('diizinkan'); },
      () => setLocPerm('ditolak'),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  async function join() {
    if (!session) return;
    setJoining(true);
    try {
      sessionStorage.setItem('rr_prefs', JSON.stringify({ cam: camOn, mic: micOn, camId, micId }));
    } catch { /* abaikan */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (room?.askLocation && locPerm === 'diizinkan' && coords) {
      await fetch(`/api/rooms/${code}/location`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: session.participantId, ...coords }),
      }).catch(() => {});
    }
    router.push(`/ruang/${code}`);
  }

  if (loadError) return <div className="center-body"><div className="panel"><h1>Ruang tidak tersedia</h1><div className="notice err">{loadError}</div><a className="btn" href="/gabung">Coba kode lain</a></div></div>;
  if (!room || !session) return <div className="center-body"><span className="muted">Memuat...</span></div>;

  const permChip = (p: Perm) => (
    <span className={`chip ${p === 'diizinkan' ? 'ok' : p === 'ditolak' ? 'bad' : ''}`}>
      {p === 'belum' ? 'Belum diminta' : p === 'diizinkan' ? 'Diizinkan' : p === 'ditolak' ? 'Ditolak' : 'Dilewati'}
    </span>
  );

  return (
    <div className="prejoin">
      <div style={{ flex: '1 1 460px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="preview">
          <video ref={videoRef} autoPlay muted playsInline style={{ display: camPerm === 'diizinkan' && camOn ? 'block' : 'none' }} />
          {!(camPerm === 'diizinkan' && camOn) && (
            <span style={{ fontSize: 15, opacity: 0.8 }}>{camPerm === 'ditolak' ? 'Kamera tidak diizinkan' : camOn ? 'Pratinjau kamera' : 'Kamera dimatikan'}</span>
          )}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button type="button" className={`btn ${camOn ? '' : 'btn-danger'}`} onClick={toggleCam}>{camOn ? 'Matikan kamera' : 'Nyalakan kamera'}</button>
          <button type="button" className={`btn ${micOn ? '' : 'btn-danger'}`} onClick={toggleMic}>{micOn ? 'Matikan mikrofon' : 'Nyalakan mikrofon'}</button>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="kamera">Kamera</label>
            <select id="kamera" className="select" value={camId} onChange={(e) => { setCamId(e.target.value); startMedia(true, true, e.target.value || undefined, micId || undefined); }}>
              <option value="">Bawaan</option>
              {cams.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Kamera'}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="mik">Mikrofon</label>
            <select id="mik" className="select" value={micId} onChange={(e) => { setMicId(e.target.value); startMedia(true, true, camId || undefined, e.target.value || undefined); }}>
              <option value="">Bawaan</option>
              {mics.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mikrofon'}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="panel" style={{ flex: '1 1 380px', maxWidth: 440 }}>
        <div>
          <h1 style={{ fontSize: 28 }}>{room.name}</h1>
          <p className="muted" style={{ margin: '6px 0 0' }}>Masuk sebagai {session.name}. Cek perangkatmu sebelum bergabung.</p>
        </div>
        {room.waitingRoom && <div className="notice info">Ruang ini memakai ruang tunggu. Host akan mengizinkanmu masuk.</div>}

        <div className="perm">
          <div style={{ flex: 1 }}><b>Kamera dan mikrofon</b><span>Dipakai agar peserta lain melihat dan mendengarmu.</span></div>
          {camPerm === 'belum' ? <button type="button" className="btn btn-sm btn-primary" onClick={allowCameraAndMic}>Izinkan</button> : permChip(camPerm)}
        </div>
        {room.askLocation && (
          <div className="perm">
            <div style={{ flex: 1 }}><b>Lokasi</b><span>Host meminta lokasi, misalnya untuk absensi. Boleh dilewati.</span></div>
            {locPerm === 'belum' ? (
              <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                <button type="button" className="btn btn-sm btn-primary" onClick={allowLocation}>Izinkan</button>
                <button type="button" className="btn btn-sm" onClick={() => setLocPerm('dilewati')}>Lewati</button>
              </div>
            ) : permChip(locPerm)}
          </div>
        )}
        {(camPerm === 'ditolak' || micPerm === 'ditolak') && (
          <div className="notice err">Izin ditolak. Kamu tetap bisa masuk tanpa video/suara, atau izinkan lewat ikon gembok di bilah alamat lalu muat ulang.</div>
        )}
        <button type="button" className="btn btn-primary btn-block" onClick={join} disabled={joining}>{joining ? 'Bergabung...' : 'Gabung sekarang'}</button>
      </div>
    </div>
  );
}
