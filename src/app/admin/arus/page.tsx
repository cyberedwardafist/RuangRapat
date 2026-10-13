import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime } from '@/lib/utils';
import { EndRoomButton } from '@/components/admin/AdminActions';

export const metadata = { title: 'Arus rapat' };

export default async function ArusPage() {
  const admin = createAdminClient();
  const { data: rooms } = await admin
    .from('rooms')
    .select('id, code, name, status, starts_at, created_via, profiles:host_id(full_name)')
    .in('status', ['berlangsung', 'terjadwal'])
    .order('status')
    .order('starts_at', { ascending: true, nullsFirst: false })
    .limit(50);
  const list = (rooms ?? []) as any[];
  const counts: Record<string, number> = {};
  if (list.length) {
    const { data: parts } = await admin.from('participants').select('room_id').in('room_id', list.map((r) => r.id)).is('left_at', null);
    (parts ?? []).forEach((p) => { counts[p.room_id] = (counts[p.room_id] ?? 0) + 1; });
  }

  return (
    <>
      <div className="page-head"><div><h1>Arus rapat</h1><p>Rapat yang sedang berlangsung dan yang terjadwal.</p></div></div>
      <section className="card">
        {list.length === 0 && <div className="empty">Tidak ada rapat aktif.</div>}
        {list.map((r) => (
          <div key={r.id} className="item">
            <div className="item-main">
              <b>{r.name}</b>
              <span className="muted">Host: {r.profiles?.full_name ?? (r.created_via === 'api' ? 'Dibuat lewat API' : 'Tidak diketahui')} · {formatDateTime(r.starts_at)} · <span className="mono">{r.code}</span></span>
            </div>
            <span className="chip">{counts[r.id] ?? 0} peserta</span>
            <span className={`chip ${r.status === 'berlangsung' ? 'ok' : 'info'}`}>{r.status === 'berlangsung' ? 'Berlangsung' : 'Terjadwal'}</span>
            <EndRoomButton code={r.code} />
          </div>
        ))}
      </section>
    </>
  );
}
