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
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="h-10 w-auto" />
          ) : (
            <div className="flex items-center gap-1">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg"
                style={{ backgroundColor: primary }}
              >
                {company.name.charAt(0)}
              </div>
              <span className="font-black text-sm tracking-wide uppercase" style={{ color: primary }}>
                {company.name}
              </span>
            </div>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-gray-700 hover:text-gray-900">Home</Link>
          <Link href="/about" className="text-gray-700 hover:text-gray-900">About</Link>
          <Link href="/services" className="text-gray-700 hover:text-gray-900">Services</Link>
          <Link href="/gallery" className="text-gray-700 hover:text-gray-900">Gallery</Link>
          <Link href="/contact" className="text-gray-700 hover:text-gray-900">Contact</Link>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          {company.phone && (
            <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="text-sm font-semibold text-gray-700">
              {company.phone}
            </a>
          )}
          <Link
            href={ctaHref}
            className="text-sm font-bold text-white px-5 py-2 rounded-full"
            style={{ backgroundColor: primary }}
          >
            {ctaLabel}
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-gray-700"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-4">
          <Link href="/" className="text-gray-700 font-medium" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/about" className="text-gray-700 font-medium" onClick={() => setOpen(false)}>About</Link>
          <Link href="/services" className="text-gray-700 font-medium" onClick={() => setOpen(false)}>Services</Link>
          <Link href="/gallery" className="text-gray-700 font-medium" onClick={() => setOpen(false)}>Gallery</Link>
          <Link href="/contact" className="text-gray-700 font-medium" onClick={() => setOpen(false)}>Contact</Link>
          {company.phone && (
            <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="font-semibold" style={{ color: primary }}>
              {company.phone}
            </a>
          )}
          <Link
            href={ctaHref}
            className="text-center font-bold text-white py-3 rounded-full"
            style={{ backgroundColor: primary }}
            onClick={() => setOpen(false)}
          >
            {ctaLabel}
          </Link>
        </div>
      )}
    </header>
  )
}
