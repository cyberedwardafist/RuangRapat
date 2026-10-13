import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';
import { normalizeCode } from '@/lib/utils';

// Masuk ke ruang dengan kode, sandi (jika ada), dan nama tampilan
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = normalizeCode(String(body.code || ''));
  const name = String(body.name || '').trim().slice(0, 60);
  if (!code) return jsonError('Kode ruang wajib diisi');
  if (!name) return jsonError('Nama tampilan wajib diisi');

  const me = await getProfile();
  if (me && me.status === 'diblokir') return jsonError('Akunmu diblokir oleh admin', 403);

  const admin = createAdminClient();
  const { data: room } = await admin
    .from('rooms')
    .select('id, code, name, host_id, status, max_participants')
    .eq('code', code)
    .maybeSingle();
  if (!room) return jsonError('Ruang dengan kode itu tidak ditemukan', 404);
  if (room.status === 'selesai') return jsonError('Rapat ini sudah selesai', 410);

  // Host tidak perlu mengetik sandi ruangnya sendiri
  if (!(me && me.id === room.host_id)) {
    const { data: ok } = await admin.rpc('verify_room_password', { p_code: code, p_password: String(body.password || '') });
    if (ok === false) return jsonError('Sandi ruang salah', 403);
  }

  const { count } = await admin
    .from('participants')
    .select('id', { count: 'exact', head: true })
    .eq('room_id', room.id)
    .is('left_at', null);
  if ((count ?? 0) >= room.max_participants) return jsonError('Ruang sudah penuh', 409);

  const { data: part, error } = await admin
    .from('participants')
    .insert({ room_id: room.id, user_id: me?.id ?? null, display_name: name })
    .select('id')
    .single();
  if (error) return jsonError(error.message, 500);

  if (room.status === 'terjadwal') {
    await admin.from('rooms').update({ status: 'berlangsung' }).eq('id', room.id);
    await sendWebhook('room.started', { code: room.code, name: room.name });
  }
  await sendWebhook('participant.joined', { code: room.code, displayName: name, role: me && me.id === room.host_id ? 'host' : 'peserta' });

  return NextResponse.json({
    code: room.code,
    participantId: part.id,
    isHost: !!me && me.id === room.host_id,
  });
}
