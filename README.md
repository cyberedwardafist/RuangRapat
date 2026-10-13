# RuangRapat

Ruang untuk berdiskusi: rapat video, ruang kerja virtual, dan game bersama.

- **Frontend dan backend**: Next.js 14 (App Router, TypeScript), satu project.
- **Database**: PostgreSQL di Supabase (skema di `supabase/migrations/0001_init.sql`).
- **Login**: Supabase Auth (email dan kata sandi).
- **Mesin video**: WebRTC antar peserta, sinyal lewat Supabase Realtime (tanpa server video tambahan).
- **Deploy**: Vercel.

## 1. Siapkan Supabase

1. Buat project di <https://supabase.com>.
2. Buka **SQL Editor > New query**, tempel seluruh isi `supabase/migrations/0001_init.sql`, lalu **Run**. Setelah itu lakukan hal yang sama untuk `supabase/migrations/0002_webhook_recording.sql` (webhook dan perekaman).
3. Buka **Project Settings > API**, salin `Project URL`, `anon public key`, dan `service_role key`.
4. Buka **Authentication > URL Configuration**:
   - **Site URL**: alamat Vercel-mu (mis. `https://ruangrapat.vercel.app`).
   - **Redirect URLs**: tambahkan `https://ruangrapat.vercel.app/auth/callback` dan `http://localhost:3000/auth/callback`.
5. (Opsional) Di **Authentication > Providers > Email**, matikan "Confirm email" agar akun uji langsung bisa masuk.

Akun pertama yang mendaftar otomatis menjadi **admin**. Akun berikutnya menjadi anggota; admin bisa mengubah peran dari konsol admin.

## 2. Jalankan lokal

```bash
npm install
cp .env.example .env.local   # isi tiga kunci Supabase
npm run dev                  # http://localhost:3000
```

Kamera dan mikrofon di peramban hanya berfungsi di `localhost` atau HTTPS.

## 3. Deploy ke Vercel

1. Unggah folder ini ke repositori GitHub.
2. Di Vercel: **Add New > Project**, pilih repositori itu. Framework otomatis terdeteksi sebagai Next.js.
3. Isi **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (rahasia, jangan diberi awalan `NEXT_PUBLIC_`)
   - Opsional: `NEXT_PUBLIC_TURN_URL`, `NEXT_PUBLIC_TURN_USERNAME`, `NEXT_PUBLIC_TURN_CREDENTIAL`
4. Klik **Deploy**. Setelah selesai, perbarui **Site URL** di Supabase dengan alamat Vercel-mu.

## Peta halaman

| Alamat | Isi |
| --- | --- |
| `/` | Beranda |
| `/masuk` | Masuk / daftar |
| `/gabung` | Masuk ke ruang dengan kode, sandi, dan nama (tanpa akun) |
| `/buat` | Buat ruang (perlu akun) |
| `/ruang/[kode]/cek` | Cek kamera, mikrofon, dan lokasi |
| `/ruang/[kode]` | Ruang meeting |
| `/dasbor`, `/dasbor/kalender`, `/dasbor/ruang-saya`, `/dasbor/kontak`, `/dasbor/pengaturan` | Dasbor akun (dock) |
| `/admin`, `/admin/arus`, `/admin/pelanggaran`, `/admin/akun`, `/admin/integrasi`, `/admin/api`, `/admin/kebijakan`, `/admin/log` | Konsol admin (dock) |

## API publik untuk project lain

Admin membuat kunci di **Konsol admin > Atur API** (kunci lengkap hanya tampil sekali).

```bash
# buat ruang
curl -X POST https://DOMAIN/api/v1/rooms \
  -H "Authorization: Bearer rr_live_..." -H "Content-Type: application/json" \
  -d '{"name":"Main bareng"}'
# -> { "code": "abc-defg-hij", "url": "https://DOMAIN/ruang/abc-defg-hij/cek" }

curl https://DOMAIN/api/v1/rooms/abc-defg-hij -H "Authorization: Bearer rr_live_..."   # status + jumlah peserta
curl https://DOMAIN/api/v1/tools -H "Authorization: Bearer rr_live_..."               # status alat (scope "tools")
```

API tidak pernah mengembalikan kamera, mikrofon, atau lokasi peserta.

## Webhook

Isi alamat webhook di **Konsol admin > Atur API**, lalu tekan **Kirim event uji**. Event yang dikirim (POST JSON):
`room.created`, `room.started`, `room.ended`, `participant.joined`, `participant.left`, `report.created`, `recording.started`, `recording.stopped`, `webhook.test`.

```json
{ "event": "room.created", "createdAt": "2026-10-14T05:00:00.000Z", "data": { "code": "abc-defg-hij", "name": "Rapat", "via": "web" } }
```

Setiap permintaan ditandatangani. Verifikasi di penerima (Node.js):

```js
const expected = 'sha256=' + crypto.createHmac('sha256', RAHASIA).update(rawBody).digest('hex');
const ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-ruangrapat-signature']));
```

Rahasia ada di panel Webhook (bisa dibuat ulang). Batas waktu 4 detik per pengiriman, hasilnya tercatat di "Pengiriman terakhir". Alamat ke jaringan internal (localhost, 10.x, 192.168.x, dst) ditolak. Pengiriman tidak diulang otomatis jika gagal.

## Perekaman

1. Admin menyalakan **Izinkan host merekam rapat** di Konsol admin > Kebijakan.
2. Host menekan tombol rekam (titik merah) di bilah kontrol ruang. Semua peserta langsung melihat spanduk "Rapat ini sedang direkam".
3. Saat berhenti (atau host keluar/mengakhiri rapat), berkas `.webm` berisi tampilan ruang dan campuran semua suara diunduh ke perangkat host. Tidak ada rekaman yang diunggah ke server; server hanya mencatat mulai/berhenti di log aktivitas dan webhook.

Perekaman berjalan di peramban host (Chrome/Edge/Firefox desktop), jadi tab host harus tetap terbuka dan aktif.

## Cara kerja mesin meeting

`src/lib/meeting/useMeeting.ts`:

1. Mengambil kamera/mikrofon sesuai pilihan di halaman cek.
2. Masuk saluran Supabase Realtime `ruang:<kode>` (presence untuk daftar peserta, broadcast untuk sinyal, chat, game, dan tugas).
3. Membuat satu `RTCPeerConnection` per peserta (mesh) dengan teknik *perfect negotiation*.
4. Berbagi layar lewat `replaceTrack`; kamera dan mikrofon dimatikan lewat `track.enabled`.

## Batasan yang perlu kamu tahu

- **Mesh WebRTC** cocok untuk sekitar 2-6 peserta dengan video. Untuk ruang besar, ganti mesin dengan SFU (mis. LiveKit); lapisan lain (auth, ruang, admin, API) tidak perlu diubah.
- **TURN**: tanpa server TURN, sebagian jaringan ketat (kantor/kampus/seluler tertentu) tidak bisa tersambung. Isi `NEXT_PUBLIC_TURN_*` untuk produksi.
- **Ruang tunggu, "keluarkan", dan "akhiri untuk semua"** ditegakkan di sisi klien lewat saluran realtime. Kode ruang (dan sandi) adalah pengamannya; klien yang dimodifikasi bisa mengabaikan ruang tunggu. Untuk keamanan ketat, pindahkan sinyal ke server atau pakai SFU dengan token.
- **Webhook** dikirim saat permintaan berlangsung (maksimal 4 detik), tanpa antrean dan tanpa percobaan ulang. Untuk jaminan pengiriman, tambahkan antrean (mis. Supabase Queues atau Inngest).
- **Domain yang diizinkan** di pengaturan API baru tersimpan; belum dipakai untuk membatasi asal permintaan.
- **Batas permintaan API** dihitung di memori per instance serverless (kira-kira, bukan batas ketat).
- **Perekaman** hanya oleh host, disimpan di perangkat host, dan memakai tab host yang harus tetap aktif. Tidak ada penyimpanan rekaman di server.
- Alat selain Tic-tac-toe dan Tugas bersama menunjukkan status dari admin dan menunggu project yang terhubung lewat API.
# RuangRapat
