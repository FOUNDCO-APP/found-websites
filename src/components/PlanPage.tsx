"use client"

import { useState } from "react"
import Link from "next/link"
import OnboardingDrawer from "./OnboardingDrawer"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

interface Feature { label: string; desc: string }
interface FAQ { q: string; a: string }

interface Props {
  plan: string
  name: string
  identity: string
  price: number
  featured?: boolean
  tagline: string
  description: string
  features: Feature[]
  faqs: FAQ[]
}

export default function PlanPage({ plan, name, identity, price, featured, tagline, description, features, faqs }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  // FAQ schema for AEO/GEO
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="min-h-screen text-white" style={{ backgroundColor: FOUND_BLACK }}>

        {/* Nav */}
        <nav className="flex items-center justify-between px-6 py-5 md:px-10 border-b border-white/[0.06]">
          <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-white/60 hover:text-white transition">
            ← Found
          </Link>
          <Link href="/plans" className="text-xs font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition">
            Compare plans
          </Link>
        </nav>

        {/* Hero */}
        <section className="px-6 py-20 md:px-10 md:py-28 max-w-4xl mx-auto text-center">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-5" style={{ color: SIGNAL_GREEN }}>
            {identity}
          </p>
          <h1 className="text-5xl font-light leading-tight md:text-7xl text-white mb-6">{tagline}</h1>
          <p className="text-base md:text-lg text-white/55 font-medium leading-8 max-w-2xl mx-auto mb-10">{description}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Start free trial — {name}
            </button>
            <div className="text-center">
              <span className="text-3xl font-black text-white">${price}</span>
              <span className="text-sm text-white/40 font-medium">/month</span>
              <p className="text-xs text-white/30 mt-0.5">after 14-day free trial</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 pb-24 md:px-10 max-w-4xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-10" style={{ color: SIGNAL_GREEN }}>
            What&apos;s included
          </p>
          <div className="grid gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {features.map((f, i) => (
              <div key={i} className="px-7 py-6" style={{ backgroundColor: "#0B0E0C" }}>
                <div className="flex items-start gap-3">
                  <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-sm font-black text-white mb-1">{f.label}</p>
                    <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-24 md:px-10 max-w-3xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-10" style={{ color: SIGNAL_GREEN }}>
            Questions
          </p>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/[0.07]" style={{ backgroundColor: "#0B0E0C" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-sm font-black text-white pr-4">{faq.q}</span>
                  <svg
                    className="shrink-0 transition-transform"
                    style={{ transform: openFaq === i ? "rotate(45deg)" : "rotate(0)" }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5">
                    <p className="text-sm text-white/55 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 pb-24 md:px-10 text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-3xl font-light text-white mb-4">Ready to get started?</h2>
            <p className="text-white/45 mb-8 font-medium">14-day free trial. No charge today. Your site goes live in minutes.</p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Start building — {name}
            </button>
            <p className="mt-6 text-xs text-white/25">
              Want to compare?{" "}
              <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                See all plans
              </Link>
            </p>
          </div>
        </section>

      </div>

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={plan} />
    </>
  )
}
