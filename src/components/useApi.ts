'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Helper kecil untuk memanggil API internal dan menyegarkan halaman setelahnya
export function useApi() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function call<T = any>(url: string, method: string, body?: unknown, opts?: { refresh?: boolean }): Promise<T | null> {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || 'Terjadi kesalahan'); return null; }
      if (opts?.refresh !== false) router.refresh();
      return json as T;
    } catch {
      setError('Tidak bisa terhubung ke server');
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { call, busy, error, setError };
}
