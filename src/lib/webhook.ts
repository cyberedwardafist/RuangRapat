import { createAdminClient } from '@/lib/supabase/admin';

export type WebhookEvent =
  | 'room.created' | 'room.started' | 'room.ended'
  | 'participant.joined' | 'participant.left'
  | 'report.created' | 'recording.started' | 'recording.stopped'
  | 'webhook.test';

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

// Mengirim event ke alamat webhook yang diatur admin. Tidak pernah melempar error
// (kegagalan hanya dicatat) dan tidak pernah memuat data kamera, mikrofon, atau lokasi.
//
// Penerima memverifikasi: header "X-RuangRapat-Signature: sha256=<hex>" = HMAC-SHA256(rahasia, badan mentah).
export async function sendWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<{ ok: boolean; status?: number; error?: string }> {
  const admin = createAdminClient();
  const { data: policy } = await admin.from('policies').select('api_webhook_url, api_webhook_secret').eq('id', 1).maybeSingle();
  const url = policy?.api_webhook_url?.trim();
  if (!url) return { ok: false, error: 'Alamat webhook belum diatur' };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'Alamat webhook harus diawali http:// atau https://' };

  // Cegah webhook diarahkan ke jaringan internal
  const host = new URL(url).hostname.toLowerCase();
  if (host === 'localhost' || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$)/.test(host)) {
    return { ok: false, error: 'Alamat webhook tidak boleh mengarah ke jaringan internal' };
  }

  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  const signature = await hmacHex(policy!.api_webhook_secret, body);
  const started = Date.now();
  let status: number | undefined;
  let error = '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RuangRapat-Webhook/1.0',
        'X-RuangRapat-Event': event,
        'X-RuangRapat-Signature': `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(4000),
      redirect: 'manual',
    });
    status = res.status;
    if (!res.ok) error = `Penerima membalas ${res.status}`;
  } catch (e) {
    error = e instanceof Error && e.name === 'TimeoutError' ? 'Waktu habis (4 detik)' : 'Tidak bisa menghubungi penerima';
  }
  const ok = !!status && status >= 200 && status < 300;
  await admin.from('webhook_deliveries').insert({ event, url: url.slice(0, 300), status_code: status ?? null, ok, error, duration_ms: Date.now() - started });
  return { ok, status, error };
}
