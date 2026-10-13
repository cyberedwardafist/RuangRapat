import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';

const STATUSES = ['aktif', 'maintenance', 'nonaktif'];

// Admin: atur status satu alat, atau semua alat sekaligus ({ all: status })
export async function PATCH(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  if (!STATUSES.includes(body.status ?? body.all)) return jsonError('Status tidak valid');
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.all) {
    const { error } = await admin.from('tools').update({ status: body.all, updated_at: now }).neq('id', '');
    if (error) return jsonError(error.message, 500);
    await logAudit(me, `mengubah semua alat menjadi ${body.all}`, 'info');
  } else {
    const { data: t, error } = await admin.from('tools').update({ status: body.status, updated_at: now }).eq('id', body.id).select('name').maybeSingle();
    if (error) return jsonError(error.message, 500);
    if (!t) return jsonError('Alat tidak ditemukan', 404);
    await logAudit(me, `mengubah ${t.name} menjadi ${body.status}`, body.status === 'aktif' ? 'ok' : 'warn');
  }
  return NextResponse.json({ ok: true });
}

// Admin: daftarkan project baru agar muncul di ruang meeting
export async function POST(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 60);
  if (!name) return jsonError('Nama project wajib diisi');
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `proyek-${Date.now()}`;

  const admin = createAdminClient();
  const { error } = await admin.from('tools').insert({
    id,
    name,
    category: String(body.category || 'Project').slice(0, 30),
    description: String(body.description || '').slice(0, 200),
    status: 'maintenance',
  });
  if (error) return jsonError(error.code === '23505' ? 'Project dengan nama itu sudah ada' : error.message, 400);
  await logAudit(me, `mendaftarkan project ${name}`, 'ok');
  return NextResponse.json({ ok: true, id });
}
