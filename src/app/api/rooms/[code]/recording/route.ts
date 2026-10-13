import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile, logAudit } from '@/lib/auth';
import { getPolicy, jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';

// Host mencatat mulai/berhenti merekam. Berkas rekaman dibuat di peramban host dan diunduh ke perangkatnya.
// Perekaman hanya boleh jika admin mengizinkannya di kebijakan.
export async function POST(request: Request, { params }: { params: { code: string } }) {
  const body = await request.json().catch(() => ({}));
  const me = await getProfile();
  if (!me) return jsonError('Masuk dulu', 401);

  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('id, name, host_id').eq('code', params.code).maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);
  if (me.id !== room.host_id) return jsonError('Hanya host yang bisa merekam', 403);

  if (body.state === 'start') {
    const policy = await getPolicy();
    if (!policy.allow_recording) return jsonError('Perekaman tidak diizinkan oleh admin', 403);
    await admin.from('recordings').insert({ room_id: room.id, started_by: me.id });
    await logAudit(me, `mulai merekam rapat "${room.name}"`, 'warn');
    await sendWebhook('recording.started', { code: params.code, name: room.name });
  } else if (body.state === 'stop') {
    await admin.from('recordings').update({ stopped_at: new Date().toISOString() }).eq('room_id', room.id).is('stopped_at', null);
    await logAudit(me, `berhenti merekam rapat "${room.name}"`, 'info');
    await sendWebhook('recording.stopped', { code: params.code, name: room.name });
  } else return jsonError('Status tidak dikenal');
  return NextResponse.json({ ok: true });
}
