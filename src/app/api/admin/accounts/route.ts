import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';

// Admin: setujui, blokir, buka blokir, atau ubah peran akun
export async function PATCH(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();

  const { data: target } = await admin.from('profiles').select('id, full_name, role').eq('id', body.id).maybeSingle();
  if (!target) return jsonError('Akun tidak ditemukan', 404);
  if (target.id === me.id && (body.action === 'block' || body.action === 'role')) {
    return jsonError('Kamu tidak bisa memblokir atau mengubah peran akunmu sendiri');
  }

  let patch: Record<string, string> = {};
  let log = '';
  let tone: 'ok' | 'warn' | 'info' = 'info';
  if (body.action === 'approve') { patch = { status: 'aktif' }; log = `menyetujui akun ${target.full_name}`; tone = 'ok'; }
  else if (body.action === 'block') { patch = { status: 'diblokir' }; log = `memblokir akun ${target.full_name}`; tone = 'warn'; }
  else if (body.action === 'unblock') { patch = { status: 'aktif' }; log = `membuka blokir akun ${target.full_name}`; tone = 'ok'; }
  else if (body.action === 'role' && ['anggota', 'host', 'admin'].includes(body.role)) {
    patch = { role: body.role }; log = `mengubah peran ${target.full_name} menjadi ${body.role}`;
  } else return jsonError('Aksi tidak dikenal');

  const { error } = await admin.from('profiles').update(patch).eq('id', target.id);
  if (error) return jsonError(error.message, 500);
  await logAudit(me, log, tone);
  return NextResponse.json({ ok: true });
}
