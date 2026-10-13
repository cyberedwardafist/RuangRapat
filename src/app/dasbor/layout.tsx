import { redirect } from 'next/navigation';
import { Dock, type DockEntry } from '@/components/Dock';
import { getProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DasborLayout({ children }: { children: React.ReactNode }) {
  const me = await getProfile();
  if (!me) redirect('/masuk?kembali=/dasbor');

  const items: DockEntry[] = [
    { href: '/', label: 'Beranda RuangRapat', color: '#0B1A2E', logo: true },
    { href: '/dasbor', label: 'Dasbor', color: 'linear-gradient(145deg,#6C8CFF,#2F5BFF)', icon: 'M3 12l9-8 9 8|M5 10v10h14V10' },
    { href: '/dasbor/kalender', label: 'Kalender', color: 'linear-gradient(145deg,#FF9A8B,#E8505B)', icon: 'M4 6h16v14H4z|M4 10h16|M8 3v4|M16 3v4' },
    { href: '/dasbor/ruang-saya', label: 'Ruang saya', color: 'linear-gradient(145deg,#4FD1A1,#0B7A53)', icon: 'M3 7h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H3z|M15 11l6-3v8l-6-3' },
    { href: '/dasbor/kontak', label: 'Kontak', color: 'linear-gradient(145deg,#C79BFF,#7A3FE0)', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2.5 20a6.5 6.5 0 0 1 13 0|M17 5a3.5 3.5 0 0 1 0 6|M19 14a6.5 6.5 0 0 1 2.5 6' },
    { href: '/dasbor/pengaturan', label: 'Pengaturan', color: 'linear-gradient(145deg,#8DA0BD,#51617A)', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z' },
  ];
  if (me.role === 'admin') {
    items.push({ href: '/admin', label: 'Konsol admin', color: 'linear-gradient(145deg,#F2C94C,#D98E04)', icon: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z|M9 12l2 2 4-4', separatorBefore: true } as DockEntry);
  }
  items.push({ href: '/auth/signout', label: 'Keluar', color: 'linear-gradient(145deg,#FF8E8E,#B42318)', icon: 'M9 4H5v16h4|M16 8l4 4-4 4|M20 12H9', post: true, separatorBefore: me.role !== 'admin' });

  return (
    <div className="dock-layout">
      <Dock items={items} exact={['/dasbor']} />
      <main className="dock-main">{children}</main>
    </div>
  );
}
