import Link from 'next/link';
import { Logo } from '@/components/Logo';

const tiles = [
  { name: 'Raka', bg: '#7C9BFF' }, { name: 'Sinta', bg: '#7FE3B8' },
  { name: 'Dewi', bg: '#E0A8FF' }, { name: 'Andi', bg: '#FFC98A' },
];

const features = [
  ['Rapat video jernih', 'Kamera dan mikrofon langsung dari peramban, tanpa unduh aplikasi. Bagikan layar, angkat tangan, dan chat selama rapat.'],
  ['Ruang tunggu dan sandi', 'Host memutuskan siapa yang boleh masuk. Ruang bisa dikunci dengan sandi dan kode unik.'],
  ['Izin yang jelas', 'Kamera, mikrofon, dan lokasi diminta satu per satu dengan penjelasan. Lokasi hanya dibagikan jika kamu setuju.'],
  ['Ruang kerja virtual', 'Papan tugas bersama selama rapat, jadi hasil rapat tidak berhenti di notulen.'],
  ['Game bareng', 'Main game bersama di dalam ruang, langsung dari project game yang kamu hubungkan.'],
  ['Konsol admin', 'Atur akun, tinjau pelanggaran, nyalakan atau matikan alat, dan kelola kunci API di satu tempat.'],
];

const faqs = [
  ['Apakah perlu memasang aplikasi?', 'Tidak. RuangRapat berjalan di peramban modern (Chrome, Edge, Firefox, Safari).'],
  ['Kenapa diminta izin kamera dan lokasi?', 'Kamera dan mikrofon untuk rapat video. Lokasi hanya diminta jika host mengaktifkannya, misalnya untuk absensi, dan kamu boleh menolak.'],
  ['Berapa peserta yang didukung?', 'Mode saat ini cocok untuk ruang kecil sampai sekitar enam peserta dengan video penuh. Chat, tugas, dan game tetap ringan untuk lebih banyak orang.'],
  ['Siapa yang mengatur game dan alat?', 'Admin. Tiap alat bisa Aktif, Maintenance, atau Nonaktif, dan statusnya langsung terlihat di dalam ruang.'],
  ['Bagaimana menghubungkan project lain?', 'Admin membuat kunci API, lalu project lain memakai API RuangRapat untuk membuat ruang dan membaca statusnya. Kamera, mikrofon, dan lokasi tidak pernah dibagikan lewat API.'],
];

export default function Home() {
  return (
    <>
      <header className="wrap topbar" style={{ padding: '18px 24px' }}>
        <Logo />
        <nav className="row nav-links" style={{ gap: 22, fontSize: 14, fontWeight: 600 }}>
          <a href="#fitur">Fitur</a>
          <a href="#koneksi">Koneksi</a>
          <a href="#ruang-virtual">Ruang virtual</a>
          <a href="#keamanan">Keamanan</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="row">
          <Link href="/masuk" className="btn btn-sm">Masuk</Link>
          <Link href="/masuk?daftar=1" className="btn btn-sm btn-primary">Daftar gratis</Link>
        </div>
      </header>

      <main>
        <section className="wrap hero">
          <div style={{ flex: '1 1 440px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <span className="chip info" style={{ alignSelf: 'flex-start' }}>Rapat, kerja bareng, dan main bareng</span>
            <h1>Ruang untuk berdiskusi, di mana pun kamu berada.</h1>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: 'var(--grey)', maxWidth: 520 }}>
              Rapat video, papan tugas bersama, dan game dalam satu ruang. Masuk dengan kode, tanpa memasang aplikasi.
            </p>
            <div><Link href="/gabung" className="btn btn-primary" style={{ height: 54, fontSize: 16, padding: '0 28px' }}>Masuk ke ruang meeting</Link></div>
          </div>
          <div className="mock" aria-hidden="true">
            {tiles.map((t) => <div key={t.name} className="mock-tile" style={{ background: t.bg }}>{t.name}</div>)}
          </div>
        </section>

        <section id="fitur" className="wrap section">
          <h2>Semua yang dibutuhkan satu rapat</h2>
          <p className="lead">Dari masuk ruang sampai hasil kerja, tanpa berpindah aplikasi.</p>
          <div className="cards">
            {features.map(([t, d]) => <div key={t}><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </section>

        <section id="koneksi" className="dark-sec">
          <div className="wrap section">
            <h2>Hubungkan dengan project lain</h2>
            <p className="lead">Game, kuis, atau papan tulis dari project lain tampil langsung di dalam ruang. Peserta tidak perlu pindah aplikasi.</p>
            <div className="cards">
              <div><h3>Game di dalam meet</h3><p>Mulai dari Tic-tac-toe. Project game milikmu bisa ditambahkan sebagai alat baru.</p></div>
              <div><h3>Kuis langsung</h3><p>Hubungkan platform kuis agar soal tampil bersama dengan video.</p></div>
              <div><h3>Data yang dibagikan</h3><p>Hanya nama, kode ruang, dan peran. Tidak pernah kamera, mikrofon, atau lokasi.</p></div>
            </div>
            <pre className="code" style={{ marginTop: 28, maxWidth: 640 }}>{`curl -X POST https://ruangrapat.id/api/v1/rooms \\
  -H "Authorization: Bearer rr_live_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Main bareng"}'
# contoh respons: { "code": "abc-defg-hij", "url": "..." }`}</pre>
          </div>
        </section>

        <section id="ruang-virtual" className="wrap section">
          <h2>Ruang virtual untuk kerja bersama</h2>
          <p className="lead">RuangRapat bukan hanya untuk belajar. Di dalam ruang ada papan tugas yang dikerjakan semua peserta selagi rapat berjalan.</p>
          <div className="cards">
            <div><h3>Tugas bersama</h3><p>Tambah dan centang tugas, semua peserta melihat perubahan seketika.</p></div>
            <div><h3>Dikendalikan admin</h3><p>Setiap alat punya status Aktif, Maintenance, atau Nonaktif agar perawatan tidak mengganggu rapat.</p></div>
            <div><h3>Segera hadir</h3><p>Papan tulis, breakout room, dan polling sudah disiapkan di konsol admin.</p></div>
          </div>
        </section>

        <section id="keamanan" className="dark-sec">
          <div className="wrap section">
            <h2>Privasi dan keamanan</h2>
            <p className="lead">RuangRapat menjelaskan untuk apa tiap izin dipakai sebelum memintanya, dan kamu bisa mencabutnya kapan saja dari pengaturan peramban.</p>
            <div className="cards">
              <div><h3>Kamera dan mikrofon</h3><p>Dimatikan saat masuk jika kebijakan ruang meminta begitu.</p></div>
              <div><h3>Lokasi opsional</h3><p>Hanya diminta bila host mengaktifkannya. Koordinat dibulatkan dan boleh kamu tolak.</p></div>
              <div><h3>Laporan pelanggaran</h3><p>Peserta bisa melapor dari dalam ruang, admin meninjau dan mencatat tindakannya.</p></div>
            </div>
          </div>
        </section>

        <section id="faq" className="wrap section">
          <h2>Pertanyaan umum</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28, maxWidth: 780 }}>
            {faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>

        <section className="wrap section" style={{ textAlign: 'center' }}>
          <h2>Siap berdiskusi?</h2>
          <p className="lead" style={{ margin: '14px auto 24px' }}>Buat akun gratis atau langsung masuk dengan kode ruang.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link href="/gabung" className="btn btn-primary">Masuk ke ruang meeting</Link>
            <Link href="/masuk?daftar=1" className="btn">Daftar gratis</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap row between">
          <Logo />
          <span>RuangRapat. Ruang untuk berdiskusi.</span>
        </div>
      </footer>
    </>
  );
}
