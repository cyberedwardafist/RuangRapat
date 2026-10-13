import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';

// Admin: akhiri rapat yang sedang berlangsung
export async function POST(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('id, name').eq('code', body.code).maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);
  const now = new Date().toISOString();
  await admin.from('rooms').update({ status: 'selesai', ended_at: now }).eq('id', room.id);
  await admin.from('participants').update({ left_at: now }).eq('room_id', room.id).is('left_at', null);
  await logAudit(me, `mengakhiri rapat "${room.name}"`, 'warn');
  await sendWebhook('room.ended', { code: body.code, endedBy: 'admin' });
  return NextResponse.json({ ok: true });
}
