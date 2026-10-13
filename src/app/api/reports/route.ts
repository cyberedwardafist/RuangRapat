import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { jsonError } from '@/lib/api';
import { sendWebhook } from '@/lib/webhook';

const TYPES = ['Konten tidak pantas', 'Peserta mengganggu rapat', 'Penyalahgunaan izin lokasi', 'Spam undangan', 'Lainnya'];

// Peserta melaporkan pelanggaran dari dalam ruang
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = TYPES.includes(body.type) ? body.type : 'Lainnya';
  const severity = ['Tinggi', 'Sedang', 'Rendah'].includes(body.severity) ? body.severity : 'Sedang';
  const me = await getProfile();

  const admin = createAdminClient();
  let roomId: string | null = null;
  if (body.roomCode) {
    const { data } = await admin.from('rooms').select('id').eq('code', body.roomCode).maybeSingle();
    roomId = data?.id ?? null;
  }
  const { error } = await admin.from('reports').insert({
    room_id: roomId,
    reporter_id: me?.id ?? null,
    reporter_name: me?.full_name || String(body.reporterName || 'Tamu').slice(0, 60),
    type,
    severity,
    note: String(body.note || '').slice(0, 500),
  });
  if (error) return jsonError(error.message, 500);
  await sendWebhook('report.created', { code: body.roomCode ?? null, type, severity });
  return NextResponse.json({ ok: true });
}
