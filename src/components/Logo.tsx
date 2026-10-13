import Link from 'next/link';

// Logo: dua balon percakapan yang saling mengisi satu ruang = ruang untuk berdiskusi
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3 2.5V13H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M17 9.5h3a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5l-3-2.5h-5a2 2 0 0 1-2-2V15" />
    </svg>
  );
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="RuangRapat, ke beranda">
      <span className="logo-mark"><LogoMark /></span>
      <span className="logo-text">RuangRapat</span>
    </Link>
  );
}
