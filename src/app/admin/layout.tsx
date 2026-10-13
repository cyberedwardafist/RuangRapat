import { redirect } from 'next/navigation';
import { Dock, type DockEntry } from '@/components/Dock';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  if (!me) redirect('/dasbor');

  const items: DockEntry[] = [
    { href: '/', label: 'Beranda RuangRapat', color: '#0B1A2E', logo: true },
    { href: '/admin', label: 'Ringkasan', color: 'linear-gradient(145deg,#6C8CFF,#2F5BFF)', icon: 'M4 4h7v7H4z|M13 4h7v7h-7z|M4 13h7v7H4z|M13 13h7v7h-7z' },
    { href: '/admin/arus', label: 'Arus rapat', color: 'linear-gradient(145deg,#4FD1A1,#0B7A53)', icon: 'M3 12h4l3-8 4 16 3-8h4' },
    { href: '/admin/pelanggaran', label: 'Pelanggaran', color: 'linear-gradient(145deg,#FF9A5B,#E04F1A)', icon: 'M12 3l10 18H2z|M12 10v5|M12 18h.01' },
    { href: '/admin/akun', label: 'Akun dan peran', color: 'linear-gradient(145deg,#C79BFF,#7A3FE0)', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z|M2.5 20a6.5 6.5 0 0 1 13 0|M17 5a3.5 3.5 0 0 1 0 6|M19 14a6.5 6.5 0 0 1 2.5 6' },
    { href: '/admin/integrasi', label: 'Integrasi dan alat', color: 'linear-gradient(145deg,#5EC8F2,#2F5BFF)', icon: 'M2 7h20v11H2z|M7 10v5|M4.5 12.5h5|M16 11h.01|M18.5 14h.01' },
    { href: '/admin/api', label: 'Atur API', color: 'linear-gradient(145deg,#7C5CFF,#4B2FD0)', icon: 'M8 7l-5 5 5 5|M16 7l5 5-5 5|M14 4l-4 16' },
    { href: '/admin/kebijakan', label: 'Kebijakan', color: 'linear-gradient(145deg,#8DA0BD,#51617A)', icon: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z|M9 12l2 2 4-4' },
    { href: '/admin/log', label: 'Log aktivitas', color: 'linear-gradient(145deg,#F2C94C,#D98E04)', icon: 'M9 3h6v4H9z|M6 5H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1|M8 12h8|M8 16h5' },
    { href: '/dasbor', label: 'Kembali ke dasbor', color: '#A9C1FF', letter: (me.full_name[0] || 'A').toUpperCase(), separatorBefore: true },
  ];

  return (
    <div className="dock-layout">
      <Dock items={items} exact={['/admin']} />
      <main className="dock-main">{children}</main>
    </div>
  );
}
