import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authenticateKey, jsonError } from '@/lib/api';

// GET /api/v1/rooms/:code -> status ruang dan jumlah peserta.
// Sengaja TIDAK mengembalikan kamera, mikrofon, atau lokasi peserta.
export async function GET(request: Request, { params }: { params: { code: string } }) {
  const auth = await authenticateKey(request, 'rooms');
  if (auth.error) return auth.error;
  const admin = createAdminClient();
  const { data: room } = await admin.from('rooms').select('id, code, name, status, starts_at, created_at').eq('code', params.code).maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);
  const { count } = await admin.from('participants').select('id', { count: 'exact', head: true }).eq('room_id', room.id).is('left_at', null);
  return NextResponse.json({ code: room.code, name: room.name, status: room.status, startsAt: room.starts_at, participants: count ?? 0 });
}
