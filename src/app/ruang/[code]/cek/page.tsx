import { Logo } from '@/components/Logo';
import { PreJoin } from './PreJoin';

export const metadata = { title: 'Cek kamera dan lokasi' };

export default function CekPage({ params }: { params: { code: string } }) {
  return (
    <div className="center-page">
      <header className="topbar"><Logo /></header>
      <PreJoin code={params.code} />
    </div>
  );
}
