'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from './Logo';

export type DockEntry = {
  href: string;
  label: string;
  color: string;
  icon?: string; // path svg (stroke), tanpa ikon = inisial/logo
  letter?: string;
  logo?: boolean;
  separatorBefore?: boolean;
  post?: boolean; // tombol form POST (keluar)
};

// Dock ala macOS: tiap item membuka halamannya sendiri. Di layar kecil pindah ke bawah.
export function Dock({ items, exact }: { items: DockEntry[]; exact?: string[] }) {
  const path = usePathname();
  return (
    <div className="dock-rail">
      <nav className="dock" aria-label="Navigasi utama">
        {items.map((it) => {
          const active = exact?.includes(it.href) ? path === it.href : path === it.href || path.startsWith(it.href + '/');
          const inner = (
            <>
              <span className="dock-icon" style={{ background: it.color, color: '#fff' }}>
                {it.logo ? (
                  <LogoMark size={22} />
                ) : it.letter ? (
                  <span style={{ fontSize: 16, color: '#0B1A2E' }}>{it.letter}</span>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {it.icon!.split('|').map((d, i) => <path key={i} d={d} />)}
                  </svg>
                )}
              </span>
              <span className="dock-label">{it.label}</span>
            </>
          );
          return (
            <span key={it.href + it.label} style={{ display: 'contents' }}>
              {it.separatorBefore && <span className="dock-sep" />}
              {it.post ? (
                <form action={it.href} method="post" style={{ display: 'contents' }}>
                  <button type="submit" className="dock-item" aria-label={it.label}>{inner}</button>
                </form>
              ) : (
                <Link href={it.href} className={`dock-item${active ? ' active' : ''}`} aria-label={it.label} aria-current={active ? 'page' : undefined}>
                  {inner}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
