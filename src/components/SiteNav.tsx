"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

const NAV_LINKS = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Plans",        href: "/plans" },
  { label: "Industries",   href: "/industries" },
]

interface Props {
  transparent?: boolean
  onCta?: () => void
}

export default function SiteNav({ transparent = false, onCta }: Props) {
  const [scrolled, setScrolled]     = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)   // drives animation state
  const [menuMounted, setMenuMounted] = useState(false) // drives DOM presence
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!transparent) return
    const handler = () => setScrolled(window.scrollY > 60)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [transparent])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuMounted ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuMounted])

  function openMenu() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMenuMounted(true)
    // Two frames so CSS transition has a starting point
    requestAnimationFrame(() => requestAnimationFrame(() => setMenuOpen(true)))
  }

  function closeMenu() {
    setMenuOpen(false)
    closeTimer.current = setTimeout(() => setMenuMounted(false), 320)
  }

  const showBg = (!transparent || scrolled) && !menuMounted

  function handleCta() {
    closeMenu()
    onCta?.()
  }

  const CtaEl = ({ fullWidth = false }: { fullWidth?: boolean }) => {
    const base = `${fullWidth ? "w-full min-h-[60px]" : "px-5 py-2.5"} rounded-full text-xs font-black uppercase tracking-[0.16em] transition hover:opacity-90`
    return onCta ? (
      <button onClick={handleCta} className={base} style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
        Get my site
      </button>
    ) : (
      <Link href="/?start=1" onClick={closeMenu} className={`inline-flex items-center justify-center ${base}`} style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
        Get my site
      </Link>
    )
  }

  return (
    <>
      {/* ── Top bar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: showBg ? FOUND_BLACK : menuMounted ? FOUND_BLACK : "transparent",
          borderBottom: showBg ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 md:px-10 max-w-[1500px] mx-auto">

          {/* Logo */}
          <Link href="/" className="text-white shrink-0 z-10">
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
              className="md:hidden text-white p-1 z-10 relative"
              onClick={menuMounted ? closeMenu : openMenu}
              aria-label={menuMounted ? "Close menu" : "Open menu"}
            >
              <div style={{ transition: "transform 250ms ease, opacity 250ms ease" }}>
                {menuMounted ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Full-screen mobile menu ── */}
      {menuMounted && (
        <div
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{
            backgroundColor: FOUND_BLACK,
            opacity: menuOpen ? 1 : 0,
            transition: "opacity 280ms ease",
          }}
        >
          {/* Spacer for top bar */}
          <div className="h-[60px] shrink-0" />

          {/* Signal Green ambient glow */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{ background: "radial-gradient(ellipse 90% 55% at 50% 110%, rgba(50,208,116,0.18) 0%, transparent 70%)" }}
          />

          {/* Large nav links */}
          <div className="flex-1 flex flex-col justify-center px-8 relative">
            {NAV_LINKS.map(({ label, href }, i) => (
              <Link
                key={label}
                href={href}
                onClick={closeMenu}
                className="flex items-center justify-between py-6 group"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.07)",
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? "translateY(0)" : "translateY(14px)",
                  transition: menuOpen
                    ? `opacity 420ms ease ${i * 80 + 120}ms, transform 420ms ease ${i * 80 + 120}ms`
                    : "none",
                }}
              >
                <span className="text-[2.4rem] font-light leading-none text-white transition-opacity group-hover:opacity-50">
                  {label}
                </span>
                <svg
                  className="shrink-0 text-white/20 group-hover:text-white/50 transition-colors"
                  width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>

          {/* Bottom CTA */}
          <div
            className="px-8 pb-12 pt-6 shrink-0"
            style={{
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? "translateY(0)" : "translateY(14px)",
              transition: menuOpen
                ? `opacity 420ms ease ${NAV_LINKS.length * 80 + 180}ms, transform 420ms ease ${NAV_LINKS.length * 80 + 180}ms`
                : "none",
            }}
          >
            <CtaEl fullWidth />
            <p className="text-center text-xs text-white/25 mt-5 font-medium tracking-wide">
              Get found. Get hired.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
