'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm({ startRegister, next }: { startRegister: boolean; next: string }) {
  const [mode, setMode] = useState<'masuk' | 'daftar'>(startRegister ? 'daftar' : 'masuk');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setInfo('');
    const supabase = createClient();
    try {
      if (mode === 'masuk') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        window.location.href = next;
      } else {
        if (password.length < 8) throw new Error('Kata sandi minimal 8 karakter');
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (err) throw err;
        if (data.session) window.location.href = next;
        else setInfo('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(msg === 'Invalid login credentials' ? 'Email atau kata sandi salah' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'masuk'} className={mode === 'masuk' ? 'on' : ''} onClick={() => setMode('masuk')}>Masuk</button>
        <button type="button" role="tab" aria-selected={mode === 'daftar'} className={mode === 'daftar' ? 'on' : ''} onClick={() => setMode('daftar')}>Daftar</button>
      </div>
      <h1>{mode === 'masuk' ? 'Selamat datang kembali' : 'Buat akun RuangRapat'}</h1>
      {mode === 'daftar' && (
        <div className="field">
          <label htmlFor="nama">Nama lengkap</label>
          <input id="nama" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="sandi">Kata sandi</label>
        <input id="sandi" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} />
      </div>
      {error && <div className="notice err" role="alert">{error}</div>}
      {info && <div className="notice ok">{info}</div>}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Memproses...' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
      <span className="muted">Akun pertama yang mendaftar otomatis menjadi admin.</span>
    </form>
  );
}
