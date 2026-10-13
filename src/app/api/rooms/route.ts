import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createRoomRecord, getPolicy, jsonError } from '@/lib/api';

// Buat ruang meeting (harus masuk akun)
export async function POST(request: Request) {
  const me = await getProfile();
  if (!me) return jsonError('Masuk dulu untuk membuat ruang', 401);
  if (me.status !== 'aktif') return jsonError('Akunmu belum aktif atau diblokir', 403);

  const policy = await getPolicy();
  if (policy.org_only_create && policy.org_domain) {
    const domain = me.email.split('@')[1]?.toLowerCase();
    if (domain !== policy.org_domain.toLowerCase()) {
      return jsonError(`Hanya akun dengan email @${policy.org_domain} yang boleh membuat ruang`, 403);
    }
  }

  const body = await request.json().catch(() => ({}));
  try {
    const room = await createRoomRecord({
      name: body.name,
      hostId: me.id,
      startsAt: body.startsAt || null,
      max: Number(body.max) || 50,
      waitingRoom: !!body.waitingRoom,
      micOff: body.micOff !== false,
      camOff: body.camOff !== false,
      askLocation: !!body.askLocation,
      password: body.password || '',
    });
    return NextResponse.json({ room });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'Gagal membuat ruang', 400);
  }
}
