import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { AccountActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Akun dan peran' };
const COLORS = ['#7C9BFF', '#7FE3B8', '#E0A8FF', '#FFC98A', '#A9C1FF'];

export default async function AkunPage() {
  const me = (await getProfile())!;
  const admin = createAdminClient();
  const { data } = await admin.from('profiles').select('id, full_name, email, role, status, created_at').order('created_at', { ascending: false }).limit(300);
  const list = data ?? [];
  const st: Record<string, string> = { aktif: 'ok', menunggu: 'warn', diblokir: 'bad' };

  return (
    <>
      <div className="page-head"><div><h1>Akun dan peran</h1><p>Kelola anggota, peran, dan persetujuan akun.</p></div></div>
      <section className="card">
        {list.map((a, i) => (
          <div key={a.id} className="item">
            <span className="avatar" style={{ background: COLORS[i % COLORS.length] }}>{(a.full_name[0] || '?').toUpperCase()}</span>
            <div className="item-main"><b>{a.full_name || '(tanpa nama)'}{a.id === me.id ? ' (kamu)' : ''}</b><span className="muted">{a.email}</span></div>
            <span className={`chip ${st[a.status]}`}>{a.status}</span>
            <AccountActions id={a.id} status={a.status} role={a.role} isMe={a.id === me.id} />
          </div>
        ))}
      </section>
    </>
  );
}
