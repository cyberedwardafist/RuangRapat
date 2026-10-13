'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RoomClient, type RoomData } from './RoomClient';

// Memuat info ruang dan sesi masuk, lalu menyalakan mesin meeting
export function RoomLoader({ code }: { code: string }) {
  const router = useRouter();
  const [data, setData] = useState<RoomData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let session: { code: string; participantId: string; name: string } | null = null;
    try { session = JSON.parse(sessionStorage.getItem('rr_session') || 'null'); } catch { /* abaikan */ }
    if (!session || session.code !== code) { router.replace(`/gabung?kode=${code}`); return; }
    const s = session;
    fetch(`/api/rooms/${code}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Ruang tidak ditemukan'); return; }
      if (j.room.status === 'selesai') { setError('Rapat ini sudah selesai'); return; }
      setData({ ...j, participantId: s.participantId, name: s.name });
    }).catch(() => setError('Tidak bisa terhubung ke server'));
  }, [code, router]);

  if (error) return <div className="center-body"><div className="panel"><h1>Ruang tidak tersedia</h1><div className="notice err">{error}</div><a className="btn" href="/gabung">Kembali</a></div></div>;
  if (!data) return <div className="center-body"><span className="muted">Menyiapkan ruang...</span></div>;
  return <RoomClient code={code} data={data} />;
}
