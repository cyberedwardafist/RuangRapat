import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Konsol admin' };

export default async function AdminHome() {
  const admin = createAdminClient();
  const count = async (table: string, filter?: (q: any) => any) => {
    let q: any = admin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = filter(q);
    const { count: c } = await q;
    return c ?? 0;
  };
  const [live, openReports, pending, toolsOn, toolsMaint, toolsOff, people] = await Promise.all([
    count('rooms', (q) => q.eq('status', 'berlangsung')),
    count('reports', (q) => q.eq('status', 'terbuka')),
    count('profiles', (q) => q.eq('status', 'menunggu')),
    count('tools', (q) => q.eq('status', 'aktif')),
    count('tools', (q) => q.eq('status', 'maintenance')),
    count('tools', (q) => q.eq('status', 'nonaktif')),
    count('participants', (q) => q.is('left_at', null)),
  ]);
  const { data: logs } = await admin.from('audit_log').select('actor_name, action, tone, created_at').order('created_at', { ascending: false }).limit(5);

  return (
    <>
      <div className="page-head"><div><h1>Konsol admin</h1><p>Ringkasan seluruh organisasi.</p></div></div>
      <div className="row" style={{ alignItems: 'stretch' }}>
        <div className="stat"><span className="muted">Rapat berlangsung</span><b>{live}</b></div>
        <div className="stat"><span className="muted">Peserta di ruang</span><b>{people}</b></div>
        <div className="stat"><span className="muted">Laporan terbuka</span><b>{openReports}</b></div>
        <div className="stat"><span className="muted">Akun menunggu</span><b>{pending}</b></div>
      </div>
      <div className="grid-2">
        <section className="card grow">
          <h2>Status alat</h2>
          <div className="row"><span className="chip ok">{toolsOn} aktif</span><span className="chip warn">{toolsMaint} maintenance</span><span className="chip">{toolsOff} nonaktif</span></div>
          <Link href="/admin/integrasi" className="btn">Atur alat</Link>
        </section>
        <section className="card grow-2">
          <div className="row between"><h2>Aktivitas terakhir</h2><Link href="/admin/log" className="btn btn-sm">Semua log</Link></div>
          {(logs ?? []).length === 0 && <div className="empty">Belum ada aktivitas.</div>}
          {(logs ?? []).map((l, i) => (
            <div key={i} className="item"><div className="item-main"><b>{l.actor_name} {l.action}</b><span className="muted">{new Date(l.created_at).toLocaleString('id-ID')}</span></div></div>
          ))}
        </section>
      </div>
    </>
  );
}
