import { createAdminClient } from '@/lib/supabase/admin';
import { ToolStatus, ToolsBulk, RegisterTool } from '@/components/admin/AdminActions';

export const metadata = { title: 'Integrasi dan alat' };

export default async function IntegrasiPage() {
  const admin = createAdminClient();
  const { data } = await admin.from('tools').select('id, name, category, description, status').order('name');
  const tools = data ?? [];
  const tone: Record<string, string> = { aktif: 'ok', maintenance: 'warn', nonaktif: '' };
  const label: Record<string, string> = { aktif: 'Aktif', maintenance: 'Maintenance', nonaktif: 'Nonaktif' };

  return (
    <>
      <div className="page-head">
        <div><h1>Integrasi dan alat</h1><p>Atur game dan alat yang tersedia di ruang meeting.</p></div>
        <ToolsBulk />
      </div>
      <div className="grid-2">
        <section className="card grow-2">
          {tools.map((t) => (
            <div key={t.id} className="item">
              <div className="item-main">
                <div className="row" style={{ gap: 8 }}><b>{t.name}</b><span className={`chip ${tone[t.status]}`}>{label[t.status]}</span><span className="chip">{t.category}</span></div>
                <span className="muted">{t.description}</span>
              </div>
              <ToolStatus id={t.id} status={t.status} />
            </div>
          ))}
        </section>
        <section className="card grow"><h2>Daftarkan project baru</h2><RegisterTool /></section>
      </div>
    </>
  );
}
