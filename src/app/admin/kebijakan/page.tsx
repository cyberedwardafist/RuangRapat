import { getPolicy } from '@/lib/api';
import { PolicyForm } from '@/components/admin/AdminActions';

export const metadata = { title: 'Kebijakan ruang' };

export default async function KebijakanPage() {
  const policy = await getPolicy();
  return (
    <>
      <div className="page-head"><div><h1>Kebijakan ruang</h1><p>Aturan bawaan untuk semua ruang meeting.</p></div></div>
      <section className="card" style={{ maxWidth: 720 }}>
        <PolicyForm policy={policy} />
      </section>
    </>
  );
}
