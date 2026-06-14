"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Plans",        href: "/plans" },
  { label: "Industries",   href: "#" },
]

interface Props {
  transparent?: boolean
  onCta?: () => void
}

export default function SiteNav({ transparent = false, onCta }: Props) {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)

  useEffect(() => {
    if (!transparent) return
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [transparent])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuOpen])

  const showBg = !transparent || scrolled

  function handleCta() {
    setMenuOpen(false)
    onCta?.()
  }

  const CtaEl = () => onCta ? (
    <button
      onClick={handleCta}
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
    <>
      {/* ── Top bar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: showBg && !menuOpen ? FOUND_BLACK : menuOpen ? FOUND_BLACK : "transparent",
          borderBottom: (showBg && !menuOpen) ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 md:px-10 max-w-[1500px] mx-auto">
          <Link href="/" onClick={() => setMenuOpen(false)} className="text-white shrink-0">
            <svg viewBox="0 0 420 72" className="h-7 w-36" role="img" aria-label="Found">
              <text x="0" y="56" fill="currentColor" fontFamily="var(--font-dm-sans), Arial, sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
            </svg>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ label, href }) => (
              <Link key={label} href={href} className="text-xs font-black uppercase tracking-[0.16em] text-white/60 hover:text-white transition">
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block"><CtaEl /></div>

            {/* Hamburger / close */}
            <button
              className="md:hidden text-white p-1 transition"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Full-screen mobile menu ── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{ backgroundColor: FOUND_BLACK }}
        >
          {/* Spacer for the top bar */}
          <div className="h-[60px] shrink-0" />

          {/* Large nav links */}
          <div className="flex-1 flex flex-col justify-center px-8 overflow-y-auto">
            <div>
              {NAV_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between py-6 group"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span
                    className="text-[2.4rem] font-light leading-none text-white transition-colors group-hover:text-white/60"
                  >
                    {label}
                  </span>
                  <svg
                    className="shrink-0 transition-colors text-white/20 group-hover:text-white/50"
                    width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="px-8 pb-12 pt-8 shrink-0">
            {onCta ? (
              <button
                onClick={handleCta}
                className="w-full min-h-[60px] rounded-full text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                Get Started
              </button>
            ) : (
              <Link
                href="/?start=1"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center w-full min-h-[60px] rounded-full text-sm font-black uppercase tracking-widest transition hover:opacity-90"
                style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
              >
                Get Started
              </Link>
            )}
            <p className="text-center text-xs text-white/25 mt-5 font-medium tracking-wide">
              Your business, beautifully online.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
