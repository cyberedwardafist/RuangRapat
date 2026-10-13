import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ReportActions } from '@/components/admin/AdminActions';

export const metadata = { title: 'Pelanggaran' };

const SEV: Record<string, string> = { Tinggi: 'bad', Sedang: 'warn', Rendah: '' };

export default async function PelanggaranPage({ searchParams }: { searchParams: { tab?: string } }) {
  const tab = ['terbuka', 'ditinjau', 'selesai'].includes(searchParams.tab ?? '') ? searchParams.tab! : 'terbuka';
  const admin = createAdminClient();
  const { data } = await admin
    .from('reports')
    .select('id, type, severity, status, note, reporter_name, created_at, rooms:room_id(name)')
    .order('created_at', { ascending: false })
    .limit(200);
  const all = (data ?? []) as any[];
  const n = (s: string) => all.filter((r) => r.status === s).length;
  const rows = all.filter((r) => r.status === tab);

  return (
    <>
      <div className="page-head"><div><h1>Pelanggaran</h1><p>Laporan dari peserta yang perlu ditinjau.</p></div></div>
      <div className="tabs" style={{ maxWidth: 480 }}>
        {(['terbuka', 'ditinjau', 'selesai'] as const).map((t) => (
          <Link key={t} href={`/admin/pelanggaran?tab=${t}`} style={{ flex: 1, textDecoration: 'none' }}>
            <button type="button" className={tab === t ? 'on' : ''} style={{ width: '100%' }} tabIndex={-1}>{t[0].toUpperCase() + t.slice(1)} ({n(t)})</button>
          </Link>
        ))}
      </div>
      <section className="card">
        {rows.length === 0 && <div className="empty">Tidak ada laporan di tab ini.</div>}
        {rows.map((r) => (
          <div key={r.id} className="item">
            <div className="item-main">
              <div className="row" style={{ gap: 8 }}><b>{r.type}</b><span className={`chip ${SEV[r.severity] ?? ''}`}>{r.severity}</span></div>
              <span className="muted">{r.rooms?.name ?? 'Tanpa ruang'} · dilaporkan {r.reporter_name || 'Tamu'} · {new Date(r.created_at).toLocaleString('id-ID')}</span>
              {r.note && <span style={{ fontSize: 14 }}>{r.note}</span>}
            </div>
            <ReportActions id={r.id} status={r.status} />
          </div>
        ))}
      </section>
    </>
  );
}
