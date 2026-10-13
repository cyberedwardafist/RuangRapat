import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Log aktivitas' };

export default async function LogPage() {
  const admin = createAdminClient();
  const { data } = await admin.from('audit_log').select('id, actor_name, action, tone, created_at').order('created_at', { ascending: false }).limit(200);
  const color: Record<string, string> = { ok: '#0B7A53', warn: '#B42318', info: '#2F5BFF' };
  return (
    <>
      <div className="page-head"><div><h1>Log aktivitas</h1><p>Riwayat tindakan admin.</p></div></div>
      <section className="card" style={{ maxWidth: 760 }}>
        {(data ?? []).length === 0 && <div className="empty">Belum ada aktivitas.</div>}
        {(data ?? []).map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ flex: 'none', width: 10, height: 10, marginTop: 5, borderRadius: '50%', background: color[l.tone] }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{l.actor_name} {l.action}</span>
              <span className="muted" style={{ fontSize: 12 }}>{new Date(l.created_at).toLocaleString('id-ID')}</span>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
