"use client"
import { useState } from "react"
import Link from "next/link"
import type { Company } from "@/types/company"
import { intentLabel, intentHref } from "@/types/company"

function BrandMark({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="font-black uppercase text-2xl md:text-base"
      style={{
        color,
        fontFamily: "var(--font-heading, inherit)",
        letterSpacing: "0.12em",
        lineHeight: 1,
      }}
    >
      {name}
    </span>
  )
}

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
]

export default function Navbar({ company }: { company: Company }) {
  const [open, setOpen] = useState(false)
  const primary = company.primary_color
  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <>
      <header className="sticky top-0 z-50 bg-white" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-9 w-auto" />
            ) : (
              <BrandMark name={company.name} color={primary} />
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold tracking-widest uppercase">
            {navLinks.map((item) => (
              <Link key={item.label} href={item.href}
                className="text-gray-400 hover:text-gray-900 transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-5">
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="text-sm font-semibold" style={{ color: "#776F6F" }}>
                {company.phone}
              </a>
            )}
            <Link href={ctaHref}
              className="text-xs font-black text-white px-6 py-2.5 tracking-widest uppercase"
              style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}>
              {ctaLabel}
            </Link>
          </div>

          {/* Hamburger */}
          <button className="md:hidden flex flex-col justify-center items-end gap-1.5 w-10 h-10"
            onClick={() => setOpen(true)} aria-label="Open menu">
            <span className="block w-6 h-0.5 bg-gray-800" />
            <span className="block w-4 h-0.5 bg-gray-800" />
            <span className="block w-6 h-0.5 bg-gray-800" />
          </button>
        </div>
      </header>

      {/* Full-screen overlay */}
      <div
        className="fixed inset-0 z-[100] flex flex-col"
        style={{
          backgroundColor: "#111111",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 320ms cubic-bezier(0.4, 0, 0.2, 1)",
          visibility: open ? "visible" : "hidden",
          borderLeft: `3px solid ${primary}`,
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6">
          <Link href="/" onClick={() => setOpen(false)}>
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-auto brightness-0 invert" />
            ) : (
              <BrandMark name={company.name} color="#ffffff" />
            )}
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close menu"
            className="w-12 h-12 flex items-center justify-center border border-white/20 hover:border-white/60 transition-colors"
            style={{ borderRadius: "var(--button-radius, 6px)" }}>
            <svg width="18" height="18" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col justify-center px-8 gap-0">
          {navLinks.map((item, i) => (
            <Link key={item.label} href={item.href} onClick={() => setOpen(false)}
              className="flex items-baseline gap-5 py-5 border-b border-white/10 group hover:pl-2 transition-all duration-200">
              <span className="text-xs font-black tabular-nums" style={{ color: primary, letterSpacing: "0.1em" }}>
                0{i + 1}
              </span>
              <span className="text-3xl font-black text-white group-hover:text-gray-300 transition-colors"
                style={{ fontFamily: "var(--font-heading, inherit)" }}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-8 py-10 flex flex-col gap-5">
          {company.phone && (
            <a href={`tel:${company.phone.replace(/\D/g, "")}`}
              className="text-xl font-black" style={{ color: primary }}
              onClick={() => setOpen(false)}>
              {company.phone}
            </a>
          )}
          <Link href={ctaHref} onClick={() => setOpen(false)}
            className="text-center font-black text-white py-5 text-xs tracking-widest uppercase"
            style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}>
            {ctaLabel}
          </Link>
        </div>
      </div>
    </>
  )
}
