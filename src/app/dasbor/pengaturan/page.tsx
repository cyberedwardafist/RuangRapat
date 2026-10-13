import { getProfile } from '@/lib/auth';
import { ProfileForm } from './ProfileForm';

export const metadata = { title: 'Pengaturan' };

export default async function PengaturanPage() {
  const me = (await getProfile())!;
  return (
    <>
      <div className="page-head"><div><h1>Pengaturan</h1><p>Profil akunmu.</p></div></div>
      <section className="card" style={{ maxWidth: 560 }}>
        <ProfileForm initialName={me.full_name} />
        <div className="field"><label>Email</label><input className="input" value={me.email} readOnly /></div>
        <div className="row"><span className="muted">Peran:</span><span className="chip info">{me.role}</span><span className="muted">Status:</span><span className={`chip ${me.status === 'aktif' ? 'ok' : 'warn'}`}>{me.status}</span></div>
      </section>
    </>
  );
}
