'use client';

// Perekam rapat di peramban host.
// Menggabungkan semua kotak video ruang ke satu kanvas dan mencampur semua suara peserta,
// lalu menyimpannya sebagai berkas .webm yang diunduh ke perangkat host. Tidak ada yang diunggah ke server.

type GetAudioStreams = () => MediaStream[];

export type RoomRecorder = { stop: () => Promise<Blob | null>; mimeType: string };

const W = 1280;
const H = 720;

function pickMime(): string {
  const options = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return options.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

export function startRoomRecorder(stageSelector: string, getAudioStreams: GetAudioStreams): RoomRecorder | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // ---- Suara: campur semua aliran audio ----
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const sources = new Map<string, MediaStreamAudioSourceNode>();
  const syncAudio = () => {
    const live = new Set<string>();
    getAudioStreams().forEach((s) => {
      if (!s.getAudioTracks().length) return;
      live.add(s.id);
      if (!sources.has(s.id)) {
        try {
          const node = audioCtx.createMediaStreamSource(s);
          node.connect(dest);
          sources.set(s.id, node);
        } catch { /* aliran belum siap */ }
      }
    });
    sources.forEach((node, id) => { if (!live.has(id)) { node.disconnect(); sources.delete(id); } });
  };
  syncAudio();
  const audioTimer = setInterval(syncAudio, 1000);

  // ---- Gambar: susun kotak video seperti tampilan ruang ----
  const draw = () => {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);
    const tiles = Array.from(document.querySelectorAll<HTMLElement>(`${stageSelector} .tile`));
    const n = tiles.length || 1;
    const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3;
    const rows = Math.ceil(n / cols);
    const gap = 12;
    const cw = (W - gap * (cols + 1)) / cols;
    const ch = (H - gap * (rows + 1)) / rows;
    tiles.forEach((tile, i) => {
      const x = gap + (i % cols) * (cw + gap);
      const y = gap + Math.floor(i / cols) * (ch + gap);
      ctx.fillStyle = '#17223a';
      ctx.fillRect(x, y, cw, ch);
      const video = tile.querySelector('video');
      const name = tile.querySelector('.name')?.textContent ?? '';
      if (video && video.style.display !== 'none' && video.videoWidth > 0) {
        const r = Math.min(cw / video.videoWidth, ch / video.videoHeight);
        const vw = video.videoWidth * r;
        const vh = video.videoHeight * r;
        ctx.drawImage(video, x + (cw - vw) / 2, y + (ch - vh) / 2, vw, vh);
      } else {
        ctx.fillStyle = '#7C9BFF';
        ctx.beginPath();
        ctx.arc(x + cw / 2, y + ch / 2, Math.min(cw, ch) * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0b1a2e';
        ctx.font = `800 ${Math.min(cw, ch) * 0.16}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((name.trim()[0] || '?').toUpperCase(), x + cw / 2, y + ch / 2);
      }
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x + 8, y + ch - 34, Math.min(cw - 16, ctx.measureText(name).width + 24 + name.length * 7), 26);
      ctx.fillStyle = '#fff';
      ctx.font = '600 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x + 16, y + ch - 21, cw - 32);
    });
  };
  draw();
  const drawTimer = setInterval(draw, 66);

  const stream = canvas.captureStream(15);
  dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));

  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : undefined);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  recorder.start(2000);

  return {
    mimeType: mimeType || 'video/webm',
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          clearInterval(drawTimer);
          clearInterval(audioTimer);
          sources.forEach((n) => n.disconnect());
          audioCtx.close().catch(() => {});
          resolve(chunks.length ? new Blob(chunks, { type: mimeType || 'video/webm' }) : null);
        };
        if (recorder.state !== 'inactive') recorder.stop(); else recorder.onstop?.(new Event('stop'));
      }),
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
