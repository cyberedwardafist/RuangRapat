import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { jsonError } from '@/lib/api';

// Ubah nama tampilan akun sendiri
export async function PATCH(request: Request) {
  const me = await getProfile();
  if (!me) return jsonError('Masuk dulu', 401);
  const body = await request.json().catch(() => ({}));
  const name = String(body.fullName || '').trim().slice(0, 60);
  if (!name) return jsonError('Nama tidak boleh kosong');
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ full_name: name }).eq('id', me.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
