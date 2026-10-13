import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPolicy, jsonError } from '@/lib/api';

// Menyimpan lokasi hanya jika peserta setuju dan host memang meminta lokasi.
// Koordinat dibulatkan (sekitar 100 m) agar tidak terlalu tepat.
export async function POST(request: Request, { params }: { params: { code: string } }) {
  const body = await request.json().catch(() => ({}));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!body.participantId || !Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError('Data lokasi tidak lengkap');

  const admin = createAdminClient();
  const policy = await getPolicy();
  const { data: room } = await admin.from('rooms').select('id, ask_location').eq('code', params.code).maybeSingle();
  if (!room) return jsonError('Ruang tidak ditemukan', 404);
  if (!room.ask_location || !policy.host_may_ask_location) return jsonError('Ruang ini tidak meminta lokasi', 403);

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const { error } = await admin
    .from('participants')
    .update({ location_shared: true, lat: round(lat), lng: round(lng) })
    .eq('id', body.participantId)
    .eq('room_id', room.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
