import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ContactForm, DeleteContact } from './ContactForm';

export const metadata = { title: 'Kontak' };
const COLORS = ['#7C9BFF', '#7FE3B8', '#E0A8FF', '#FFC98A', '#A9C1FF'];

export default async function KontakPage() {
  const me = (await getProfile())!;
  const admin = createAdminClient();
  const { data } = await admin.from('contacts').select('id, name, email').eq('owner_id', me.id).order('name');
  const contacts = data ?? [];
  return (
    <>
      <div className="page-head"><div><h1>Kontak</h1><p>Orang yang sering kamu undang.</p></div></div>
      <div className="grid-2">
        <section className="card grow-2">
          {contacts.length === 0 && <div className="empty">Belum ada kontak.</div>}
          {contacts.map((c, i) => (
            <div key={c.id} className="item">
              <span className="avatar" style={{ background: COLORS[i % COLORS.length] }}>{c.name.charAt(0).toUpperCase()}</span>
              <div className="item-main"><b>{c.name}</b><span className="muted">{c.email || 'Tanpa email'}</span></div>
              <DeleteContact id={c.id} />
            </div>
          ))}
        </section>
        <section className="card grow"><h2>Tambah kontak</h2><ContactForm /></section>
      </div>
    </>
  );
}
