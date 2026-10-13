import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';

// Tandai peserta keluar; jika end=true dan pemanggil adalah host/admin, rapat diakhiri.
export async function POST(request: Request, { params }: { params: { code: string } }) {
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('id, host_id').eq('code', params.code).maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);

  if (body.participantId) {
    const { data: part } = await admin
      .from('participants')
      .update({ left_at: new Date().toISOString() })
      .eq('id', body.participantId)
      .eq('room_id', room.id)
      .select('display_name')
      .maybeSingle();
    if (part) await sendWebhook('participant.left', { code: params.code, displayName: part.display_name });
  }

  if (body.end) {
    const me = await getProfile();
    if (!me || (me.id !== room.host_id && me.role !== 'admin')) return jsonError('Hanya host yang bisa mengakhiri rapat', 403);
    await admin.from('rooms').update({ status: 'selesai', ended_at: new Date().toISOString() }).eq('id', room.id);
    await admin.from('participants').update({ left_at: new Date().toISOString() }).eq('room_id', room.id).is('left_at', null);
    await sendWebhook('room.ended', { code: params.code, endedBy: me.role === 'admin' && me.id !== room.host_id ? 'admin' : 'host' });
  }
  return NextResponse.json({ ok: true });
}
