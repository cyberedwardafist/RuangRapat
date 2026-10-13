'use client';

import { useState } from 'react';
import { useApi } from '@/components/useApi';

export function ProfileForm({ initialName }: { initialName: string }) {
  const { call, busy, error } = useApi();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (await call('/api/me', 'PATCH', { fullName: name })) setSaved(true);
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label htmlFor="pn">Nama tampilan</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></div>
      {error && <div className="notice err">{error}</div>}
      {saved && <div className="notice ok">Tersimpan.</div>}
      <button className="btn btn-primary" disabled={busy}>Simpan</button>
    </form>
  );
}
