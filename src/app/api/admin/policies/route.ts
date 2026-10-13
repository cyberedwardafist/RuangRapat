import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';

const BOOLS = ['require_waiting_room', 'cam_mic_off_on_join', 'host_may_ask_location', 'allow_recording', 'org_only_create'];
const TEXTS = ['org_domain', 'api_webhook_url', 'api_allowed_origins'];
const INTS = ['max_minutes', 'api_rate_limit'];

// Admin: simpan kebijakan ruang dan pengaturan API (hanya kolom yang dikirim)
export async function PATCH(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const k of BOOLS) if (typeof body[k] === 'boolean') patch[k] = body[k];
  for (const k of TEXTS) if (typeof body[k] === 'string') patch[k] = body[k].trim().slice(0, 300);
  for (const k of INTS) if (Number.isFinite(Number(body[k]))) patch[k] = Math.max(0, Math.round(Number(body[k])));

  const admin = createAdminClient();
  const { error } = await admin.from('policies').update(patch).eq('id', 1);
  if (error) return jsonError(error.message, 500);
  await logAudit(me, body.scope === 'api' ? 'menyimpan pengaturan API' : 'menyimpan kebijakan ruang', 'info');
  return NextResponse.json({ ok: true });
}
