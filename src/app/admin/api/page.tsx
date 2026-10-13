import { createAdminClient } from '@/lib/supabase/admin';
import { getPolicy } from '@/lib/api';
import { ApiSettingsForm, CreateKey, KeyStatus, WebhookPanel } from '@/components/admin/AdminActions';

export const metadata = { title: 'Atur API' };

export default async function ApiPage() {
  const admin = createAdminClient();
  const policy = await getPolicy();
  const { data } = await admin.from('api_keys').select('id, name, key_prefix, scopes, status, request_count, last_used_at').order('created_at', { ascending: false });
  const keys = data ?? [];
  const { data: dl } = await admin.from('webhook_deliveries').select('id, event, ok, status_code, error, duration_ms, created_at').order('created_at', { ascending: false }).limit(10);
  const deliveries = dl ?? [];
  const active = keys.filter((k) => k.status === 'aktif').length;
  const total = keys.reduce((a, k) => a + Number(k.request_count), 0);

  return (
    <>
      <div className="page-head"><div><h1>Atur API</h1><p>Kunci akses dan pengaturan untuk project yang terhubung.</p></div></div>
      <div className="grid-2">
        <section className="card grow-2">
          <h2>Kunci API</h2>
          <span className="muted">{active} kunci aktif. Dipakai project lain lewat header <span className="mono">Authorization: Bearer ...</span></span>
          <CreateKey />
          {keys.length === 0 && <div className="empty">Belum ada kunci.</div>}
          {keys.map((k) => (
            <div key={k.id} className="item">
              <div className="item-main">
                <div className="row" style={{ gap: 8 }}><b>{k.name}</b><span className={`chip ${k.status === 'aktif' ? 'ok' : 'bad'}`}>{k.status === 'aktif' ? 'Aktif' : 'Dicabut'}</span></div>
                <span className="mono">{k.key_prefix}</span>
                <span className="muted">Akses: {(k.scopes as string[]).join(', ')} · {Number(k.request_count).toLocaleString('id-ID')} permintaan · terakhir dipakai: {k.last_used_at ? new Date(k.last_used_at).toLocaleString('id-ID') : 'belum pernah'}</span>
              </div>
              <KeyStatus id={k.id} status={k.status} />
            </div>
          ))}
          <div className="row" style={{ alignItems: 'stretch' }}>
            <div className="stat"><span className="muted">Total permintaan</span><b>{total.toLocaleString('id-ID')}</b></div>
            <div className="stat"><span className="muted">Kunci aktif</span><b>{active}</b></div>
            <div className="stat"><span className="muted">Kunci dicabut</span><b>{keys.length - active}</b></div>
          </div>
          <pre className="code">{`# Membuat ruang dari project lain
curl -X POST $SITE/api/v1/rooms \\
  -H "Authorization: Bearer rr_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Main bareng"}'

# Status ruang      GET $SITE/api/v1/rooms/{kode}
# Status alat       GET $SITE/api/v1/tools`}</pre>
        </section>
        <div className="grow" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <section className="card"><h2>Pengaturan API</h2><ApiSettingsForm policy={policy} /></section>
          <section className="card">
            <h2>Webhook</h2>
            <span className="muted">Event: room.created, room.started, room.ended, participant.joined, participant.left, report.created, recording.started, recording.stopped. Data kamera, mikrofon, dan lokasi tidak pernah dikirim.</span>
            <WebhookPanel secret={policy.api_webhook_secret} />
            <h3 style={{ fontSize: 15 }}>Pengiriman terakhir</h3>
            {deliveries.length === 0 && <div className="empty" style={{ padding: 12 }}>Belum ada pengiriman.</div>}
            {deliveries.map((d) => (
              <div key={d.id} className="item" style={{ padding: 12 }}>
                <div className="item-main"><b style={{ fontSize: 14 }}>{d.event}</b><span className="muted">{new Date(d.created_at).toLocaleString('id-ID')} · {d.duration_ms} ms{d.error ? ` · ${d.error}` : ''}</span></div>
                <span className={`chip ${d.ok ? 'ok' : 'bad'}`}>{d.ok ? 'Terkirim' : 'Gagal'}{d.status_code ? ` ${d.status_code}` : ''}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}
