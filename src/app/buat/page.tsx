import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { getProfile, } from '@/lib/auth';
import { getPolicy } from '@/lib/api';
import { CreateForm } from './CreateForm';

export const metadata = { title: 'Buat ruang meeting' };
export const dynamic = 'force-dynamic';

export default async function BuatPage() {
  const me = await getProfile();
  const policy = await getPolicy();
  return (
    <div className="center-page">
      <header className="topbar">
        <Logo />
        <Link href="/dasbor" className="btn btn-sm">Kembali ke dasbor</Link>
      </header>
      <div className="center-body">
        <CreateForm
          myName={me?.full_name ?? ''}
          forceWaiting={policy.require_waiting_room}
          forceOff={policy.cam_mic_off_on_join}
          canAskLocation={policy.host_may_ask_location}
          maxMinutes={policy.max_minutes}
        />
      </div>
    </div>
  );
}
