import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { generateApiKey, jsonError } from '@/lib/api';
import { sha256Hex } from '@/lib/utils';

const SCOPES = ['rooms', 'tools', 'participants'];

// Admin: buat kunci API. Kunci lengkap hanya ditampilkan SEKALI di respons ini.
export async function POST(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 60);
  if (!name) return jsonError('Nama kunci wajib diisi');
  const scopes = (Array.isArray(body.scopes) ? body.scopes : ['rooms']).filter((s: string) => SCOPES.includes(s));

  const { key, prefix } = generateApiKey();
  const admin = createAdminClient();
  const { error } = await admin.from('api_keys').insert({
    name, key_prefix: prefix, key_hash: await sha256Hex(key), scopes: scopes.length ? scopes : ['rooms'], created_by: me.id,
  });
  if (error) return jsonError(error.message, 500);
  await logAudit(me, `membuat kunci API "${name}"`, 'ok');
  return NextResponse.json({ key, prefix });
}

// Admin: cabut atau aktifkan lagi kunci
export async function PATCH(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  if (!['aktif', 'dicabut'].includes(body.status)) return jsonError('Status tidak valid');
  const admin = createAdminClient();
  const { data: k, error } = await admin.from('api_keys').update({ status: body.status }).eq('id', body.id).select('name').maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!k) return jsonError('Kunci tidak ditemukan', 404);
  await logAudit(me, `${body.status === 'dicabut' ? 'mencabut' : 'mengaktifkan lagi'} kunci API "${k.name}"`, body.status === 'dicabut' ? 'warn' : 'ok');
  return NextResponse.json({ ok: true });
}
