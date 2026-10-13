'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/components/useApi';

type Created = { code: string; name: string };

export function CreateForm({ myName, forceWaiting, forceOff, canAskLocation, maxMinutes }: {
  myName: string; forceWaiting: boolean; forceOff: boolean; canAskLocation: boolean; maxMinutes: number;
}) {
  const router = useRouter();
  const { call, busy, error } = useApi();
  const [name, setName] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [max, setMax] = useState(25);
  const [password, setPassword] = useState('');
  const [waiting, setWaiting] = useState(forceWaiting);
  const [off, setOff] = useState(true);
  const [askLoc, setAskLoc] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await call<{ room: Created }>('/api/rooms', 'POST', {
      name, password, max,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      waitingRoom: waiting, micOff: off, camOff: off, askLocation: askLoc,
    }, { refresh: false });
    if (res) setCreated(res.room);
  }

  async function enterAsHost() {
    if (!created) return;
    const res = await fetch('/api/rooms/join', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: created.code, name: myName || 'Host' }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    try { sessionStorage.setItem('rr_session', JSON.stringify({ code: json.code, participantId: json.participantId, name: myName || 'Host', isHost: true })); } catch { /* abaikan */ }
    router.push(`/ruang/${json.code}/cek`);
  }

  if (created) {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/gabung?kode=${created.code}`;
    return (
      <div className="panel">
        <h1>Ruang siap dipakai</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{created.name}</p>
        <div className="item" style={{ background: 'var(--navy)', color: '#fff' }}>
          <span className="mono" style={{ flex: '1 1 200px', fontSize: 16, fontWeight: 600 }}>{created.code}</span>
          <button type="button" className="btn btn-sm" onClick={async () => { await navigator.clipboard.writeText(link).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}>
            {copied ? 'Tersalin' : 'Salin tautan'}
          </button>
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={enterAsHost}>Masuk sebagai host</button>
        <button type="button" className="btn btn-block" onClick={() => router.push('/dasbor/ruang-saya')}>Lihat di Ruang saya</button>
      </div>
    );
  }

  return (
    <form className="panel" style={{ maxWidth: 560 }} onSubmit={submit}>
      <h1>Buat ruang meeting</h1>
      <div className="field">
        <label htmlFor="nama">Nama ruang</label>
        <input id="nama" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} placeholder="Contoh: Rapat mingguan tim" />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="mulai">Waktu mulai (opsional)</label>
          <input id="mulai" type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="batas">Batas peserta</label>
          <input id="batas" type="number" min={2} max={300} className="input" value={max} onChange={(e) => setMax(Number(e.target.value))} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="sandi">Sandi ruang (opsional)</label>
        <input id="sandi" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <label className="check"><input type="checkbox" checked={waiting} disabled={forceWaiting} onChange={(e) => setWaiting(e.target.checked)} />Aktifkan ruang tunggu{forceWaiting ? ' (diwajibkan admin)' : ''}</label>
      <label className="check"><input type="checkbox" checked={off || forceOff} disabled={forceOff} onChange={(e) => setOff(e.target.checked)} />Kamera dan mikrofon mati saat peserta masuk{forceOff ? ' (diwajibkan admin)' : ''}</label>
      {canAskLocation && <label className="check"><input type="checkbox" checked={askLoc} onChange={(e) => setAskLoc(e.target.checked)} />Minta lokasi peserta (peserta boleh menolak)</label>}
      <span className="muted">Durasi maksimal rapat: {maxMinutes ? `${maxMinutes} menit` : 'tanpa batas'} (diatur admin).</span>
      {error && <div className="notice err" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Membuat...' : 'Buat ruang'}</button>
    </form>
  );
}
