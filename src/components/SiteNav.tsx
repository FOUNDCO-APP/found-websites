"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

interface Props {
  transparent?: boolean
  onCta?: () => void
}

export default function SiteNav({ transparent = false, onCta }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!transparent) return
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [transparent])

  const showBg = !transparent || scrolled

  const CtaEl = () => onCta ? (
    <button
      onClick={onCta}
      className="rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition hover:opacity-90"
      style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
    >
      Get Started
    </button>
  ) : (
    <Link
      href="/?start=1"
      className="rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition hover:opacity-90"
      style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
    >
      Get Started
    </Link>
  )

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: showBg ? FOUND_BLACK : "transparent",
        borderBottom: showBg ? "1px solid rgba(255,255,255,0.06)" : "none",
      }}
    >
      <div className="flex items-center justify-between px-6 py-4 md:px-10 max-w-[1500px] mx-auto">

        {/* Logo */}
        <Link href="/" className="text-white shrink-0">
          <svg viewBox="0 0 420 72" className="h-7 w-36" role="img" aria-label="Found">
            <text x="0" y="56" fill="currentColor" fontFamily="var(--font-dm-sans), Arial, sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
          </svg>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/#how-it-works" className="text-xs font-black uppercase tracking-[0.16em] text-white/60 hover:text-white transition">
            How it works
          </Link>
          <Link href="/plans" className="text-xs font-black uppercase tracking-[0.16em] text-white/60 hover:text-white transition">
            Plans
          </Link>
          <Link href="#" className="text-xs font-black uppercase tracking-[0.16em] text-white/60 hover:text-white transition">
            Industries
          </Link>
        </div>

        {/* CTA + mobile hamburger */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <CtaEl />
          </div>
          <button
            className="md:hidden text-white/70 hover:text-white transition p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          className="md:hidden border-t border-white/[0.06] px-6 py-6 flex flex-col gap-5"
          style={{ backgroundColor: FOUND_BLACK }}
        >
          <Link href="/#how-it-works" onClick={() => setMenuOpen(false)} className="text-sm font-black uppercase tracking-[0.16em] text-white/70 hover:text-white transition">
            How it works
          </Link>
          <Link href="/plans" onClick={() => setMenuOpen(false)} className="text-sm font-black uppercase tracking-[0.16em] text-white/70 hover:text-white transition">
            Plans
          </Link>
          <Link href="#" onClick={() => setMenuOpen(false)} className="text-sm font-black uppercase tracking-[0.16em] text-white/70 hover:text-white transition">
            Industries
          </Link>
          <div className="pt-2">
            <CtaEl />
          </div>
        </div>
      )}
    </nav>
  )
}
