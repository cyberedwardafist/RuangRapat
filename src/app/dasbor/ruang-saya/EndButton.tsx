'use client';

import { useApi } from '@/components/useApi';

export function EndButton({ code }: { code: string }) {
  const { call, busy } = useApi();
  return (
    <button type="button" className="btn btn-sm btn-danger" disabled={busy}
      onClick={() => { if (confirm('Akhiri rapat ini untuk semua peserta?')) call(`/api/rooms/${code}/leave`, 'POST', { end: true }); }}>
      Akhiri
    </button>
  );
}
