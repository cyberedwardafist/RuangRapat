import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';

// Admin: kirim event uji ({action:'test'}) atau buat rahasia penandatangan baru ({action:'rotate'})
export async function POST(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));

  if (body.action === 'test') {
    const r = await sendWebhook('webhook.test', { message: 'Uji dari konsol admin RuangRapat' });
    await logAudit(me, r.ok ? 'mengirim uji webhook (berhasil)' : 'mengirim uji webhook (gagal)', r.ok ? 'ok' : 'warn');
    return NextResponse.json({ ok: r.ok, status: r.status ?? null, error: r.error ?? '' });
  }
  if (body.action === 'rotate') {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const admin = createAdminClient();
    const { error } = await admin.from('policies').update({ api_webhook_secret: secret }).eq('id', 1);
    if (error) return jsonError(error.message, 500);
    await logAudit(me, 'membuat rahasia webhook baru', 'warn');
    return NextResponse.json({ ok: true });
  }
  return jsonError('Aksi tidak dikenal');
}
