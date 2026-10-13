// Kode ruang format abc-defg-hij (huruf kecil, tanpa huruf yang membingungkan)
export function makeRoomCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz';
  const pick = (n: number) => {
    const bytes = crypto.getRandomValues(new Uint8Array(n));
    return Array.from(bytes, (b) => chars[b % chars.length]).join('');
  };
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

export function normalizeCode(input: string): string {
  const raw = input.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (raw.length === 10) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  return input.trim().toLowerCase();
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return 'Tanpa jadwal';
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function formatTime(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function initials(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
