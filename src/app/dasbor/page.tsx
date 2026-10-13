import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Dasbor' };

export default async function DasborPage() {
  const me = (await getProfile())!;
  const admin = createAdminClient();
  const { data: rooms } = await admin.from('rooms').select('code, name, starts_at, status').eq('host_id', me.id).order('starts_at', { ascending: true, nullsFirst: false });
  const list = rooms ?? [];
  const now = Date.now();
  const upcoming = list.filter((r) => r.status !== 'selesai' && (!r.starts_at || new Date(r.starts_at).getTime() >= now - 3600_000)).slice(0, 5);
  const live = list.filter((r) => r.status === 'berlangsung').length;
  const scheduled = list.filter((r) => r.status === 'terjadwal').length;
  const done = list.filter((r) => r.status === 'selesai').length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Halo, {me.full_name || 'selamat datang'}</h1>
          <p>Ringkasan ruang meeting milikmu.</p>
        </div>
        <div className="row">
          <Link href="/gabung" className="btn">Masuk dengan kode</Link>
          <Link href="/buat" className="btn btn-primary">Buat ruang</Link>
        </div>
      </div>

      {me.status !== 'aktif' && <div className="notice info">Akunmu menunggu persetujuan admin.</div>}

      <div className="row" style={{ alignItems: 'stretch' }}>
        <div className="stat"><span className="muted">Sedang berlangsung</span><b>{live}</b></div>
        <div className="stat"><span className="muted">Terjadwal</span><b>{scheduled}</b></div>
        <div className="stat"><span className="muted">Selesai</span><b>{done}</b></div>
      </div>

      <section className="card">
        <div className="row between"><h2>Rapat mendatang</h2><Link href="/dasbor/kalender" className="btn btn-sm">Buka kalender</Link></div>
        {upcoming.length === 0 && <div className="empty">Belum ada rapat. Buat ruang pertamamu.</div>}
        {upcoming.map((r) => (
          <div key={r.code} className="item">
            <div className="item-main">
              <b>{r.name}</b>
              <span className="muted">{formatDateTime(r.starts_at)} · <span className="mono">{r.code}</span></span>
            </div>
            <span className={`chip ${r.status === 'berlangsung' ? 'ok' : 'info'}`}>{r.status === 'berlangsung' ? 'Berlangsung' : 'Terjadwal'}</span>
            <Link className="btn btn-sm btn-primary" href={`/gabung?kode=${r.code}`}>Masuk</Link>
          </div>
        ))}
      </section>
    </>
  );
}
