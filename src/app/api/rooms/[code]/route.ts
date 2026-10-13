import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { getPolicy, jsonError } from '@/lib/api';

// Info ruang untuk halaman cek perangkat dan ruang meeting
export async function GET(_req: Request, { params }: { params: { code: string } }) {
  const admin = createAdminClient();
  const { data: room } = await admin
    .from('rooms')
    .select('id, code, name, host_id, status, waiting_room, mic_off_on_join, cam_off_on_join, ask_location, password_hash')
    .eq('code', params.code)
    .maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);

  const me = await getProfile();
  const policy = await getPolicy();
  const { data: tools } = await admin.from('tools').select('id, name, category, description, status').order('name');

  return NextResponse.json({
    room: {
      code: room.code,
      name: room.name,
      status: room.status,
      waitingRoom: room.waiting_room,
      micOff: room.mic_off_on_join,
      camOff: room.cam_off_on_join,
      askLocation: room.ask_location,
      hasPassword: !!room.password_hash,
    },
    maxMinutes: policy.max_minutes,
    allowRecording: policy.allow_recording,
    isHost: !!me && me.id === room.host_id,
    isAdmin: me?.role === 'admin',
    myName: me?.full_name ?? '',
    tools: tools ?? [],
  });
}
