import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { jsonError } from '@/lib/api';

export async function POST(request: Request) {
  const me = await getProfile();
  if (!me) return jsonError('Masuk dulu', 401);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 60);
  if (!name) return jsonError('Nama kontak wajib diisi');
  const admin = createAdminClient();
  const { error } = await admin.from('contacts').insert({ owner_id: me.id, name, email: String(body.email || '').trim().slice(0, 120) });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const me = await getProfile();
  if (!me) return jsonError('Masuk dulu', 401);
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  await admin.from('contacts').delete().eq('id', body.id).eq('owner_id', me.id);
  return NextResponse.json({ ok: true });
}
