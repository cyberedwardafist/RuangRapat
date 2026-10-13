'use client';

import { useState } from 'react';
import { useApi } from '@/components/useApi';

type Btn = { label: string; className?: string; onClick: () => void; disabled?: boolean };
function Btn({ label, className = '', onClick, disabled }: Btn) {
  return <button type="button" className={`btn btn-sm ${className}`} onClick={onClick} disabled={disabled}>{label}</button>;
}

// ---- Akun ----
export function AccountActions({ id, status, role, isMe }: { id: string; status: string; role: string; isMe: boolean }) {
  const { call, busy, error } = useApi();
  const act = (action: string, extra?: object) => call('/api/admin/accounts', 'PATCH', { id, action, ...extra });
  return (
    <div className="row" style={{ gap: 8 }}>
      {status === 'menunggu' && <Btn label="Setujui" className="btn-primary" onClick={() => act('approve')} disabled={busy} />}
      {status === 'diblokir' && <Btn label="Buka blokir" onClick={() => act('unblock')} disabled={busy} />}
      {status === 'aktif' && !isMe && <Btn label="Blokir" className="btn-danger" onClick={() => act('block')} disabled={busy} />}
      {!isMe && (
        <select className="select" style={{ height: 36, width: 120, fontSize: 13 }} value={role} disabled={busy} aria-label="Ubah peran"
          onChange={(e) => act('role', { role: e.target.value })}>
          <option value="anggota">anggota</option><option value="host">host</option><option value="admin">admin</option>
        </select>
      )}
      {error && <span className="chip bad">{error}</span>}
    </div>
  );
}

// ---- Laporan ----
export function ReportActions({ id, status }: { id: string; status: string }) {
  const { call, busy } = useApi();
  const set = (s: string) => call('/api/admin/reports', 'PATCH', { id, status: s });
  return (
    <div className="row" style={{ gap: 8 }}>
      {status === 'terbuka' && <Btn label="Tinjau" onClick={() => set('ditinjau')} disabled={busy} />}
      {status !== 'selesai' && <Btn label="Selesaikan" className="btn-primary" onClick={() => set('selesai')} disabled={busy} />}
      {status === 'selesai' && <Btn label="Buka lagi" onClick={() => set('terbuka')} disabled={busy} />}
    </div>
  );
}

// ---- Rapat ----
export function EndRoomButton({ code }: { code: string }) {
  const { call, busy } = useApi();
  return <Btn label="Akhiri rapat" className="btn-danger" disabled={busy} onClick={() => { if (confirm('Akhiri rapat ini untuk semua peserta?')) call('/api/admin/rooms/end', 'POST', { code }); }} />;
}

// ---- Alat ----
export function ToolStatus({ id, status }: { id: string; status: string }) {
  const { call, busy } = useApi();
  const set = (s: string) => call('/api/admin/tools', 'PATCH', { id, status: s });
  const on = (s: string, color: string) => status === s ? { background: color, color: '#fff', borderColor: color } : undefined;
  return (
    <div className="row" style={{ gap: 6 }} role="group" aria-label="Status alat">
      <button type="button" className="btn btn-sm" style={on('aktif', '#0B7A53')} disabled={busy} onClick={() => set('aktif')}>Aktif</button>
      <button type="button" className="btn btn-sm" style={on('maintenance', '#A8480F')} disabled={busy} onClick={() => set('maintenance')}>Maintenance</button>
      <button type="button" className="btn btn-sm" style={on('nonaktif', '#51617A')} disabled={busy} onClick={() => set('nonaktif')}>Nonaktif</button>
    </div>
  );
}

export function ToolsBulk() {
  const { call, busy } = useApi();
  return (
    <div className="row">
      <Btn label="Aktifkan semua" disabled={busy} onClick={() => call('/api/admin/tools', 'PATCH', { all: 'aktif' })} />
      <Btn label="Maintenance semua" disabled={busy} onClick={() => call('/api/admin/tools', 'PATCH', { all: 'maintenance' })} />
    </div>
  );
}

export function RegisterTool() {
  const { call, busy, error } = useApi();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Game');
  const [description, setDescription] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (await call('/api/admin/tools', 'POST', { name, category, description })) { setName(''); setDescription(''); }
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label htmlFor="pn">Nama project</label><input id="pn" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></div>
      <div className="field"><label htmlFor="pk">Kategori</label>
        <select id="pk" className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {['Game', 'Kuis', 'Kerja bersama', 'Kolaborasi', 'Project'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="pd">Deskripsi</label><input id="pd" className="input" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} /></div>
      <span className="muted">Data yang dibagikan ke project: nama, kode ruang, dan peran. Tidak pernah kamera, mikrofon, atau lokasi. Project baru dimulai dengan status Maintenance.</span>
      {error && <div className="notice err">{error}</div>}
      <button className="btn btn-primary" disabled={busy}>Daftarkan project</button>
    </form>
  );
}

// ---- Kunci API ----
export function KeyStatus({ id, status }: { id: string; status: string }) {
  const { call, busy } = useApi();
  return status === 'aktif'
    ? <Btn label="Cabut" className="btn-danger" disabled={busy} onClick={() => { if (confirm('Cabut kunci ini? Project yang memakainya langsung berhenti bekerja.')) call('/api/admin/keys', 'PATCH', { id, status: 'dicabut' }); }} />
    : <Btn label="Aktifkan lagi" disabled={busy} onClick={() => call('/api/admin/keys', 'PATCH', { id, status: 'aktif' })} />;
}

export function CreateKey() {
  const { call, busy, error } = useApi();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['rooms']);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const toggle = (s: string) => setScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await call<{ key: string }>('/api/admin/keys', 'POST', { name, scopes });
    if (res) { setNewKey(res.key); setName(''); }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {newKey && (
        <div className="notice ok" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span>Salin kunci ini sekarang. Kunci lengkap tidak akan ditampilkan lagi.</span>
          <span className="mono">{newKey}</span>
          <button type="button" className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={async () => { await navigator.clipboard.writeText(newKey).catch(() => {}); setCopied(true); }}>{copied ? 'Tersalin' : 'Salin kunci'}</button>
        </div>
      )}
      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
        <div className="field"><label htmlFor="kn">Nama kunci</label><input id="kn" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="Contoh: Project game" /></div>
        <div className="row" style={{ gap: 14, paddingBottom: 12 }}>
          {[['rooms', 'Ruang'], ['tools', 'Alat'], ['participants', 'Peserta']].map(([v, l]) => (
            <label key={v} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600 }}><input type="checkbox" checked={scopes.includes(v)} onChange={() => toggle(v)} />{l}</label>
          ))}
        </div>
        <button className="btn btn-primary" disabled={busy}>Buat kunci baru</button>
      </form>
      {error && <div className="notice err">{error}</div>}
    </div>
  );
}

// ---- Webhook ----
export function WebhookPanel({ secret }: { secret: string }) {
  const { call, busy, error } = useApi();
  const [result, setResult] = useState<{ ok: boolean; status: number | null; error: string } | null>(null);
  async function test() {
    setResult(null);
    const r = await call<{ ok: boolean; status: number | null; error: string }>('/api/admin/webhook', 'POST', { action: 'test' });
    if (r) setResult(r);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row">
        <button type="button" className="btn btn-sm btn-primary" onClick={test} disabled={busy}>Kirim event uji</button>
        <button type="button" className="btn btn-sm btn-danger" disabled={busy}
          onClick={() => { if (confirm('Buat rahasia baru? Penerima harus memperbarui rahasianya.')) call('/api/admin/webhook', 'POST', { action: 'rotate' }); }}>
          Buat rahasia baru
        </button>
      </div>
      {result && <div className={`notice ${result.ok ? 'ok' : 'err'}`}>{result.ok ? `Berhasil (kode ${result.status}).` : `Gagal: ${result.error || 'tidak diketahui'}`}</div>}
      {error && <div className="notice err">{error}</div>}
      <details>
        <summary style={{ fontSize: 14 }}>Rahasia penandatangan</summary>
        <p className="mono" style={{ margin: '10px 0 0' }}>{secret}</p>
        <p className="muted" style={{ margin: '8px 0 0' }}>Penerima memeriksa header <span className="mono">X-RuangRapat-Signature: sha256=&lt;hex&gt;</span>, yaitu HMAC-SHA256 dari badan permintaan mentah memakai rahasia ini.</p>
      </details>
    </div>
  );
}

// ---- Kebijakan dan pengaturan API ----
type PolicyShape = {
  require_waiting_room: boolean; cam_mic_off_on_join: boolean; host_may_ask_location: boolean; allow_recording: boolean;
  org_only_create: boolean; org_domain: string; max_minutes: number;
  api_webhook_url: string; api_allowed_origins: string; api_rate_limit: number;
};

export function PolicyForm({ policy }: { policy: PolicyShape }) {
  const { call, busy, error } = useApi();
  const [p, setP] = useState(policy);
  const [saved, setSaved] = useState(false);
  const flag = (k: keyof PolicyShape, label: string) => (
    <label className="check"><input type="checkbox" checked={p[k] as boolean} onChange={(e) => setP({ ...p, [k]: e.target.checked })} />{label}</label>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (await call('/api/admin/policies', 'PATCH', p)) setSaved(true);
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {flag('require_waiting_room', 'Wajib ruang tunggu untuk semua rapat')}
      {flag('cam_mic_off_on_join', 'Kamera dan mikrofon mati saat peserta masuk')}
      {flag('host_may_ask_location', 'Host boleh meminta lokasi peserta (peserta tetap bisa menolak)')}
      {flag('allow_recording', 'Izinkan host merekam rapat (semua peserta diberi tahu, berkas diunduh ke perangkat host)')}
      {flag('org_only_create', 'Hanya akun dengan email organisasi yang boleh membuat ruang')}
      <div className="row">
        <div className="field"><label htmlFor="md">Durasi maksimal rapat (menit, 0 = tanpa batas)</label><input id="md" type="number" min={0} className="input" value={p.max_minutes} onChange={(e) => setP({ ...p, max_minutes: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="od">Domain email organisasi</label><input id="od" className="input" value={p.org_domain} onChange={(e) => setP({ ...p, org_domain: e.target.value })} placeholder="contoh.id" /></div>
      </div>
      {error && <div className="notice err">{error}</div>}
      {saved && <div className="notice ok">Kebijakan tersimpan.</div>}
      <button className="btn btn-primary" disabled={busy}>Simpan perubahan</button>
    </form>
  );
}

export function ApiSettingsForm({ policy }: { policy: PolicyShape }) {
  const { call, busy, error } = useApi();
  const [p, setP] = useState(policy);
  const [saved, setSaved] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (await call('/api/admin/policies', 'PATCH', { scope: 'api', api_webhook_url: p.api_webhook_url, api_allowed_origins: p.api_allowed_origins, api_rate_limit: p.api_rate_limit })) setSaved(true);
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="field"><label htmlFor="aw">Alamat webhook</label><input id="aw" className="input" value={p.api_webhook_url} onChange={(e) => setP({ ...p, api_webhook_url: e.target.value })} placeholder="https://contoh.id/webhook" /></div>
      <div className="field"><label htmlFor="ao">Domain yang diizinkan</label><input id="ao" className="input" value={p.api_allowed_origins} onChange={(e) => setP({ ...p, api_allowed_origins: e.target.value })} placeholder="game.contoh.id" /></div>
      <div className="field"><label htmlFor="ar">Batas permintaan per menit</label><input id="ar" type="number" min={10} className="input" value={p.api_rate_limit} onChange={(e) => setP({ ...p, api_rate_limit: Number(e.target.value) })} /></div>
      <span className="muted">API tidak pernah membagikan kamera, mikrofon, atau lokasi peserta. Webhook mengirim event ruang, peserta, laporan, dan perekaman ke alamat di atas (detail di panel Webhook).</span>
      {error && <div className="notice err">{error}</div>}
      {saved && <div className="notice ok">Pengaturan tersimpan.</div>}
      <button className="btn btn-primary" disabled={busy}>Simpan perubahan</button>
    </form>
  );
}
