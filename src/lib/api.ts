import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { makeRoomCode, sha256Hex } from '@/lib/utils';
import { sendWebhook } from '@/lib/webhook';

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export type Policy = {
  require_waiting_room: boolean;
  cam_mic_off_on_join: boolean;
  host_may_ask_location: boolean;
  allow_recording: boolean;
  org_only_create: boolean;
  org_domain: string;
  max_minutes: number;
  api_webhook_url: string;
  api_allowed_origins: string;
  api_rate_limit: number;
  api_webhook_secret: string;
};

export async function getPolicy(): Promise<Policy> {
  const admin = createAdminClient();
  const { data } = await admin.from('policies').select('*').eq('id', 1).maybeSingle();
  return (data as Policy) ?? {
    require_waiting_room: true, cam_mic_off_on_join: true, host_may_ask_location: true,
    allow_recording: false, org_only_create: false, org_domain: '', max_minutes: 120,
    api_webhook_url: '', api_allowed_origins: '', api_rate_limit: 300, api_webhook_secret: '',
  };
}

export type NewRoom = {
  name: string;
  hostId: string | null;
  startsAt?: string | null;
  max?: number;
  waitingRoom?: boolean;
  micOff?: boolean;
  camOff?: boolean;
  askLocation?: boolean;
  password?: string;
  via?: string;
};

// Membuat ruang dengan kode unik dan menerapkan kebijakan admin
export async function createRoomRecord(input: NewRoom) {
  const admin = createAdminClient();
  const policy = await getPolicy();
  const name = (input.name || '').trim().slice(0, 120);
  if (!name) throw new Error('Nama ruang wajib diisi');

  for (let i = 0; i < 6; i++) {
    const code = makeRoomCode();
    const { data, error } = await admin
      .from('rooms')
      .insert({
        code,
        name,
        host_id: input.hostId,
        starts_at: input.startsAt || null,
        max_participants: Math.min(Math.max(input.max ?? 50, 2), 300),
        waiting_room: policy.require_waiting_room ? true : !!input.waitingRoom,
        mic_off_on_join: policy.cam_mic_off_on_join ? true : input.micOff ?? true,
        cam_off_on_join: policy.cam_mic_off_on_join ? true : input.camOff ?? true,
        ask_location: policy.host_may_ask_location ? !!input.askLocation : false,
        created_via: input.via ?? 'web',
      })
      .select('id, code, name, starts_at, status')
      .single();
    if (error) {
      if (error.code === '23505') continue; // kode bentrok, coba lagi
      throw new Error(error.message);
    }
    if (input.password) {
      await admin.rpc('set_room_password', { p_room: data.id, p_password: input.password });
    }
    await sendWebhook('room.created', { code: data.code, name: data.name, via: input.via ?? 'web' });
    return data;
  }
  throw new Error('Gagal membuat kode ruang, coba lagi');
}

// ===== Kunci API =====
export function generateApiKey(): { key: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const key = `rr_live_${body}`;
  return { key, prefix: `${key.slice(0, 12)}…${key.slice(-4)}` };
}

const windowHits = new Map<string, { n: number; t: number }>();

// Memeriksa header Authorization: Bearer <kunci> dan batas permintaan
export async function authenticateKey(request: Request, scope: string) {
  const header = request.headers.get('authorization') || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!key) return { error: jsonError('Kunci API tidak ada. Kirim header Authorization: Bearer <kunci>', 401) };

  const admin = createAdminClient();
  const hash = await sha256Hex(key);
  const { data: row } = await admin
    .from('api_keys')
    .select('id, status, scopes, request_count')
    .eq('key_hash', hash)
    .maybeSingle();
  if (!row || row.status !== 'aktif') return { error: jsonError('Kunci API tidak valid atau sudah dicabut', 401) };
  if (!(row.scopes as string[]).includes(scope)) return { error: jsonError(`Kunci ini tidak punya akses "${scope}"`, 403) };

  const policy = await getPolicy();
  const now = Date.now();
  const hit = windowHits.get(row.id);
  if (!hit || now - hit.t > 60_000) windowHits.set(row.id, { n: 1, t: now });
  else if (++hit.n > policy.api_rate_limit) return { error: jsonError('Batas permintaan terlampaui, coba lagi sebentar', 429) };

  await admin.from('api_keys').update({ last_used_at: new Date().toISOString(), request_count: row.request_count + 1 }).eq('id', row.id);
  return { keyId: row.id as string };
}
