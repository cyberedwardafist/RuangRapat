import { Logo } from '@/components/Logo';
import { JoinForm } from './JoinForm';

export const metadata = { title: 'Masuk ke ruang meeting' };

export default function GabungPage({ searchParams }: { searchParams: { kode?: string } }) {
  return (
    <div className="center-page">
      <header className="topbar"><Logo /></header>
      <div className="center-body">
        <JoinForm initialCode={searchParams.kode ?? ''} />
      </div>
    </div>
  );
}
