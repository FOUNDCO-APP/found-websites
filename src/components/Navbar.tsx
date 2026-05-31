"use client"
import { useState } from "react"
import Link from "next/link"
import type { Company } from "@/types/company"
import { intentLabel, intentHref } from "@/types/company"

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
          <Link href="/" className="flex items-center gap-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-9 w-auto" />
            ) : (
              <span
                className="text-lg font-black tracking-tight"
                style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}
              >
                {company.name}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {["Home", "About", "Services", "Gallery", "Contact"].map((item) => (
              <Link
                key={item}
                href={item === "Home" ? "/" : `/${item.toLowerCase()}`}
                className="text-gray-500 hover:text-gray-900 transition-colors tracking-wide"
              >
                {item}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-5">
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="text-sm font-semibold"
                style={{ color: "#776F6F" }}>
                {company.phone}
              </a>
            )}
            <Link
              href={ctaHref}
              className="text-sm font-black text-white px-6 py-2.5 tracking-wide uppercase"
              style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}
            >
              {ctaLabel}
            </Link>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col justify-center items-center gap-1.5 w-10 h-10"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <span className="block w-6 h-0.5 bg-gray-800" />
            <span className="block w-4 h-0.5 bg-gray-800" />
            <span className="block w-6 h-0.5 bg-gray-800" />
          </button>

        </div>
      </header>

      {/* Full-screen overlay menu */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ backgroundColor: "#111111" }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-5">
            <Link href="/" onClick={() => setOpen(false)}>
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-8 w-auto brightness-0 invert" />
              ) : (
                <span
                  className="text-xl font-black tracking-tight"
                  style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}
                >
                  {company.name}
                </span>
              )}
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="w-10 h-10 flex items-center justify-center text-white"
              aria-label="Close menu"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 flex flex-col justify-center px-8 gap-2">
            {[
              { label: "Home", href: "/" },
              { label: "About", href: "/about" },
              { label: "Services", href: "/services" },
              { label: "Gallery", href: "/gallery" },
              { label: "Contact", href: "/contact" },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-4xl font-black text-white py-3 border-b border-white/10 hover:pl-4 transition-all"
                style={{ fontFamily: "var(--font-heading, inherit)" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom — phone + CTA */}
          <div className="px-8 py-10 flex flex-col gap-4">
            {company.phone && (
              <a
                href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="text-xl font-black"
                style={{ color: primary }}
                onClick={() => setOpen(false)}
              >
                {company.phone}
              </a>
            )}
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="text-center font-black text-white py-5 text-base tracking-wide uppercase"
              style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}
            >
              {ctaLabel}
            </Link>
          </div>

        </div>
      )}
    </>
  )
}
