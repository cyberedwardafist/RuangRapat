import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatTime } from '@/lib/utils';

export const metadata = { title: 'Kalender' };

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pad = (n: number) => String(n).padStart(2, '0');

export default async function KalenderPage({ searchParams }: { searchParams: { bulan?: string; tgl?: string } }) {
  const me = (await getProfile())!;
  const today = new Date();
  const m = /^(\d{4})-(\d{2})$/.exec(searchParams.bulan ?? '');
  const year = m ? Number(m[1]) : today.getFullYear();
  const month = m ? Number(m[2]) - 1 : today.getMonth();

  const first = new Date(year, month, 1);
  const daysIn = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Senin = 0

  const from = new Date(year, month, 1).toISOString();
  const to = new Date(year, month + 1, 1).toISOString();
  const admin = createAdminClient();
  const { data } = await admin.from('rooms').select('code, name, starts_at, status').eq('host_id', me.id).gte('starts_at', from).lt('starts_at', to).order('starts_at');
  const rooms = data ?? [];

  const byDay = new Map<number, typeof rooms>();
  rooms.forEach((r) => {
    const d = new Date(r.starts_at!).getDate();
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  });

  const selected = Number((searchParams.tgl ?? '').split('-')[2]) || (today.getMonth() === month && today.getFullYear() === year ? today.getDate() : 1);
  const prev = new Date(year, month - 1, 1);
  const next = new Date(year, month + 1, 1);
  const key = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const title = first.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];

  return (
    <>
      <div className="page-head">
        <div><h1>Kalender</h1><p>Jadwal rapat yang kamu buat.</p></div>
        <div className="row">
          <Link className="btn btn-sm" href={`/dasbor/kalender?bulan=${key(prev)}`}>Sebelumnya</Link>
          <b style={{ minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>{title}</b>
          <Link className="btn btn-sm" href={`/dasbor/kalender?bulan=${key(next)}`}>Berikutnya</Link>
        </div>
      </div>

      <div className="grid-2">
        <section className="card grow-2">
          <div className="cal">
            {DAYS.map((d) => <div key={d} className="cal-h">{d}</div>)}
            {cells.map((d, i) => d === null ? <div key={`e${i}`} className="cal-d dim" /> : (
              <Link key={d} href={`/dasbor/kalender?bulan=${key(first)}&tgl=${key(first)}-${pad(d)}`} className={`cal-d${isToday(d) ? ' today' : ''}${selected === d ? ' sel' : ''}`} style={{ textDecoration: 'none' }}>
                {d}
                {(byDay.get(d)?.length ?? 0) > 0 && <span className="cal-dot" title={`${byDay.get(d)!.length} rapat`} />}
              </Link>
            ))}
          </div>
        </section>

        <section className="card grow">
          <h2>Agenda tanggal {selected}</h2>
          {(byDay.get(selected) ?? []).length === 0 && <div className="empty">Tidak ada rapat.</div>}
          {(byDay.get(selected) ?? []).map((r) => (
            <div key={r.code} className="item">
              <div className="item-main"><b>{r.name}</b><span className="muted">{formatTime(r.starts_at)} · <span className="mono">{r.code}</span></span></div>
              <Link className="btn btn-sm btn-primary" href={`/gabung?kode=${r.code}`}>Masuk</Link>
            </div>
          ))}
          <Link href="/buat" className="btn">Jadwalkan rapat baru</Link>
        </section>
      </div>
    </>
  );
}
