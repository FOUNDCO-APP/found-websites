"use client"

import { useState } from "react"
import Link from "next/link"
import OnboardingDrawer from "./OnboardingDrawer"
import SiteNav from "./SiteNav"
import SiteFooter from "./SiteFooter"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

interface Feature { label: string; desc: string }
interface FAQ { q: string; a: string }

interface Props {
  industry: string
  eyebrow: string
  headline: string
  subheadline: string
  description: string
  features: Feature[]
  faqs: FAQ[]
  closingLine: string
}

export default function IndustryPage({ industry, eyebrow, headline, subheadline, description, features, faqs, closingLine }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isIntroRatePeriod = new Date() < INTRO_RATE_CUTOFF
  const proPrice = isIntroRatePeriod ? 39 : 69
  const businessPrice = isIntroRatePeriod ? 69 : 99
  const industryLabel = industry.replace(/-/g, " ")

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
        <SiteNav onCta={() => setDrawerOpen(true)} />

        {/* Hero */}
        <section className="px-6 pt-32 pb-16 md:px-10 md:pt-40 md:pb-24 max-w-4xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-5" style={{ color: SIGNAL_GREEN }}>
            {eyebrow}
          </p>
          <h1 className="text-5xl font-normal leading-tight md:text-7xl text-white mb-6">{headline}</h1>
          <p className="text-lg font-medium text-white/60 leading-8 max-w-2xl mb-4">{subheadline}</p>
          <p className="text-base text-white/45 leading-8 max-w-2xl mb-10">{description}</p>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Build my business site
            </button>
            {isIntroRatePeriod && (
              <div className="flex items-center gap-3 pt-1">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: SIGNAL_GREEN }}>
                    Most owners start with Pro
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-2xl font-black text-white">Pro ${proPrice}/mo</span>
                    <span className="text-sm text-white/45">Business ${businessPrice}/mo</span>
                  </div>
                  <p className="mt-1 text-xs text-white/35">Starter is available for simple website-only launches.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Proof */}
        <section className="px-6 pb-20 md:px-10 max-w-5xl mx-auto">
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <div
              className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] p-6 md:p-8"
              style={{ background: "linear-gradient(145deg, rgba(50,208,116,0.13), rgba(255,255,255,0.035) 42%, rgba(255,255,255,0.02))" }}
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] mb-5" style={{ color: SIGNAL_GREEN }}>
                Proof of concept
              </p>
              <div className="rounded-[1.55rem] border border-white/10 bg-[#F5F4EF] p-3 shadow-2xl shadow-black/30">
                <div className="overflow-hidden rounded-[1.2rem] bg-white text-[#101312]">
                  <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/35">Generated site</p>
                      <p className="text-sm font-black capitalize">{industryLabel} business</p>
                    </div>
                    <span className="rounded-full bg-[#32D074] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#080A09]">Live</span>
                  </div>
                  <div className="grid gap-3 p-4 sm:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-2xl bg-[#101312] p-5 text-white">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#32D074]">Homepage hero</p>
                      <p className="text-2xl font-black leading-tight">Built around how this business wins customers.</p>
                      <div className="mt-5 h-10 w-36 rounded-full bg-[#32D074]" />
                    </div>
                    <div className="space-y-2">
                      {["Services", "Gallery", "Contact"].map((label) => (
                        <div key={label} className="rounded-2xl border border-black/10 p-4">
                          <p className="text-xs font-black">{label}</p>
                          <div className="mt-2 h-2 w-4/5 rounded-full bg-black/10" />
                          <div className="mt-2 h-2 w-2/3 rounded-full bg-black/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-white/50">
                Found should show what it makes, not just describe it. This gives visitors a concrete picture before they start.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-6 md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.22em] mb-5" style={{ color: SIGNAL_GREEN }}>
                  What happens after launch
                </p>
                <div className="space-y-3">
                  {[
                    ["1", "A visitor finds the site"],
                    ["2", "They request help"],
                    ["3", "Found puts the lead in your dashboard"],
                    ["4", "Pro/Business helps you follow up"],
                  ].map(([step, label]) => (
                    <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0B0E0C] p-4">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>{step}</span>
                      <p className="text-sm font-bold text-white/78">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/[0.08] bg-[#0B0E0C] p-6 md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.22em] mb-3" style={{ color: SIGNAL_GREEN }}>
                  Plan guidance
                </p>
                <h2 className="text-2xl font-normal leading-tight text-white">Starter is a website. Pro and Business are the growth path.</h2>
                <p className="mt-4 text-sm leading-7 text-white/48">
                  Industry visitors should leave thinking, “Found can help me get and handle customers,” not just “Found is a cheap website.”
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 pb-20 md:px-10 max-w-4xl mx-auto">
          <p className="text-xs font-black uppercase tracking-[0.22em] mb-10" style={{ color: SIGNAL_GREEN }}>
            What Found does for you
          </p>
          <div className="grid gap-px bg-white/[0.06] rounded-2xl overflow-hidden border border-white/[0.06]">
            {features.map((f, i) => (
              <div key={i} className="px-7 py-6" style={{ backgroundColor: "#0B0E0C" }}>
                <div className="flex items-start gap-3">
                  <svg className="shrink-0 mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-base font-black text-white mb-1">{f.label}</p>
                    <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Mid CTA */}
        <section className="px-6 py-16 md:px-10 max-w-4xl mx-auto text-center">
          <div
            className="rounded-2xl px-8 py-12"
            style={{ backgroundColor: "rgba(50,208,116,0.06)", border: "2px solid rgba(50,208,116,0.3)" }}
          >
            {isIntroRatePeriod && (
              <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
                Pro-first launch offer
              </p>
            )}
            <h2 className="text-3xl font-normal text-white mb-3 md:text-4xl">Your site. Your leads. Your follow-up.</h2>
            <p className="text-white/50 mb-8 font-medium">
              Most owners choose Found Pro for automatic follow-up, or Business when they want bookings, estimates, orders, and customer tools.
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Start with Found Pro
            </button>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-20 md:px-10 max-w-3xl mx-auto">
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
            <h2 className="text-3xl font-normal text-white mb-4">{closingLine}</h2>
            <p className="text-white/45 mb-8 font-medium">
              {isIntroRatePeriod ? `Found Pro starts at $${proPrice}/mo during the launch offer. Business starts at $${businessPrice}/mo when you want the full operating system.` : "Found Pro and Business help turn the site into a customer system."}
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Build my business site
            </button>
            <p className="mt-6 text-xs text-white/25">
              {isIntroRatePeriod
                ? <>Starter is still available on the plans page for website-only launches.{" "}
                    <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Compare all plans
                    </Link></>
                : <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>Compare all plans →</Link>
              }
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan="found_pro" />
    </>
  )
}
