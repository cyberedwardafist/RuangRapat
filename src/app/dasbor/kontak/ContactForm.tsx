'use client';

import { useState } from 'react';
import { useApi } from '@/components/useApi';

export function ContactForm() {
  const { call, busy, error } = useApi();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call('/api/contacts', 'POST', { name, email });
    if (ok) { setName(''); setEmail(''); }
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label htmlFor="kn">Nama</label><input id="kn" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></div>
      <div className="field"><label htmlFor="ke">Email (opsional)</label><input id="ke" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {error && <div className="notice err">{error}</div>}
      <button className="btn btn-primary" disabled={busy}>Simpan kontak</button>
    </form>
  );
}

export function DeleteContact({ id }: { id: string }) {
  const { call, busy } = useApi();
  return <button type="button" className="btn btn-sm btn-danger" disabled={busy} onClick={() => call('/api/contacts', 'DELETE', { id })}>Hapus</button>;
}
