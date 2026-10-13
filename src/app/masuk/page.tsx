import { redirect } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Masuk atau daftar' };

export default async function MasukPage({ searchParams }: { searchParams: { daftar?: string; kembali?: string } }) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect(searchParams.kembali?.startsWith('/') ? searchParams.kembali : '/dasbor');

  return (
    <div className="center-page">
      <header className="topbar"><Logo /></header>
      <div className="center-body">
        <LoginForm startRegister={searchParams.daftar === '1'} next={searchParams.kembali?.startsWith('/') ? searchParams.kembali : '/dasbor'} />
      </div>
    </div>
  );
}
