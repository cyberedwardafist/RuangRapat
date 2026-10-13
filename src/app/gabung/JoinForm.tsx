'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function JoinForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, password, name }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(json.error || 'Gagal masuk ke ruang'); return; }
    try {
      sessionStorage.setItem('rr_session', JSON.stringify({ code: json.code, participantId: json.participantId, name, isHost: json.isHost }));
    } catch { /* abaikan */ }
    router.push(`/ruang/${json.code}/cek`);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h1>Masuk ke ruang meeting</h1>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>Masukkan kode dari host. Tidak perlu akun.</p>
      <div className="field">
        <label htmlFor="kode">Kode ruang</label>
        <input id="kode" className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="abc-defg-hij" required autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="sandi">Sandi ruang (jika ada)</label>
        <input id="sandi" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="nama">Nama tampilan</label>
        <input id="nama" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
      </div>
      {error && <div className="notice err" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memeriksa...' : 'Lanjut'}</button>
    </form>
  );
}
