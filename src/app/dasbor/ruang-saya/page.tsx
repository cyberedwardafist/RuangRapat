import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime } from '@/lib/utils';
import { EndButton } from './EndButton';

export const metadata = { title: 'Ruang saya' };

export default async function RuangSayaPage() {
  const me = (await getProfile())!;
  const admin = createAdminClient();
  const { data } = await admin.from('rooms').select('code, name, starts_at, status, created_at').eq('host_id', me.id).order('created_at', { ascending: false });
  const rooms = data ?? [];
  const chip: Record<string, [string, string]> = { berlangsung: ['ok', 'Berlangsung'], terjadwal: ['info', 'Terjadwal'], selesai: ['', 'Selesai'] };

  return (
    <>
      <div className="page-head">
        <div><h1>Ruang saya</h1><p>Semua ruang yang kamu buat.</p></div>
        <Link href="/buat" className="btn btn-primary">Buat ruang</Link>
      </div>
      <section className="card">
        {rooms.length === 0 && <div className="empty">Belum ada ruang.</div>}
        {rooms.map((r) => (
          <div key={r.code} className="item">
            <div className="item-main">
              <b>{r.name}</b>
              <span className="muted">{formatDateTime(r.starts_at)} · <span className="mono">{r.code}</span></span>
            </div>
            <span className={`chip ${chip[r.status][0]}`}>{chip[r.status][1]}</span>
            {r.status !== 'selesai' && <Link className="btn btn-sm btn-primary" href={`/gabung?kode=${r.code}`}>Masuk</Link>}
            {r.status === 'berlangsung' && <EndButton code={r.code} />}
          </div>
        ))}
      </section>
    </>
  );
}
