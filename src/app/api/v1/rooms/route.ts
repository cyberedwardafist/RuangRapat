import { NextResponse } from 'next/server';
import { authenticateKey, createRoomRecord, jsonError } from '@/lib/api';

// API publik untuk project lain. Header: Authorization: Bearer <kunci>
// POST /api/v1/rooms  { "name": "Rapat game" }  -> membuat ruang dan mengembalikan kode + tautan
export async function POST(request: Request) {
  const auth = await authenticateKey(request, 'rooms');
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  try {
    const room = await createRoomRecord({
      name: body.name,
      hostId: null,
      startsAt: body.startsAt || null,
      max: Number(body.max) || 50,
      password: body.password || '',
      via: 'api',
    });
    const origin = new URL(request.url).origin;
    return NextResponse.json({ code: room.code, name: room.name, url: `${origin}/ruang/${room.code}/cek` }, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : 'Gagal membuat ruang');
  }
}
