import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit, requireAdmin } from '@/lib/auth';
import { jsonError } from '@/lib/api';

// Admin: ubah status laporan pelanggaran (terbuka, ditinjau, selesai)
export async function PATCH(request: Request) {
  const me = await requireAdmin();
  if (!me) return jsonError('Khusus admin', 403);
  const body = await request.json().catch(() => ({}));
  if (!['terbuka', 'ditinjau', 'selesai'].includes(body.status)) return jsonError('Status tidak valid');

  const admin = createAdminClient();
  const { data: r, error } = await admin.from('reports').update({ status: body.status }).eq('id', body.id).select('type').maybeSingle();
  if (error) return jsonError(error.message, 500);
  if (!r) return jsonError('Laporan tidak ditemukan', 404);
  await logAudit(me, `mengubah laporan "${r.type}" menjadi ${body.status}`, body.status === 'selesai' ? 'ok' : 'info');
  return NextResponse.json({ ok: true });
}
