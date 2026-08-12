"use client"

import { useState } from "react"
import Link from "next/link"
import OnboardingDrawer from "./OnboardingDrawer"
import SiteNav from "./SiteNav"
import SiteFooter from "./SiteFooter"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"
import type { FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type IndustryPlanOption = {
  key: FoundPlanKey
  name: string
  label: string
  line: string
  price: (intro: boolean) => number
}

const INDUSTRY_PLAN_OPTIONS: IndustryPlanOption[] = [
  {
    key: "found_pro",
    name: "Found Pro",
    label: "Recommended",
    line: "Website plus follow-up so leads do not go cold.",
    price: (intro) => (intro ? 39 : 69),
  },
  {
    key: "found_business",
    name: "Found Business",
    label: "Most complete",
    line: "Bookings, estimates, payments, campaigns, and team tools.",
    price: (intro) => (intro ? 69 : 99),
  },
  {
    key: "found",
    name: "Found Starter",
    label: "Website only",
    line: "A clean site, lead capture, and instant replies.",
    price: (intro) => (intro ? 29 : 39),
  },
]

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

function PlanSwiper({
  selectedPlan,
  onSelect,
  intro,
}: {
  selectedPlan: FoundPlanKey
  onSelect: (plan: FoundPlanKey) => void
  intro: boolean
}) {
  return (
    <div className="-mx-1 flex snap-x gap-3 overflow-x-auto pb-2">
      {INDUSTRY_PLAN_OPTIONS.map((plan) => {
        const selected = selectedPlan === plan.key
        return (
          <button
            key={plan.key}
            type="button"
            onClick={() => onSelect(plan.key)}
            className="min-w-[222px] snap-start rounded-2xl border p-4 text-left transition"
            style={{
              borderColor: selected ? SIGNAL_GREEN : "rgba(255,255,255,0.09)",
              background: selected ? "rgba(50,208,116,0.12)" : "rgba(255,255,255,0.035)",
            }}
          >
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: selected ? SIGNAL_GREEN : "rgba(255,255,255,0.35)" }}>
              {plan.label}
            </span>
            <span className="mt-2 block text-sm font-black text-white">{plan.name}</span>
            <span className="mt-1 block text-2xl font-black text-white">${plan.price(intro)}/mo</span>
            <span className="mt-2 block text-xs leading-5 text-white/48">{plan.line}</span>
          </button>
        )
      })}
    </div>
  )
}

function IndustryDevicePreview({
  industryLabel,
  headline,
  subheadline,
  features,
}: {
  industryLabel: string
  headline: string
  subheadline: string
  features: Feature[]
}) {
  const previewFeatures = features.slice(0, 3)

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-5 md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
          Example site preview
        </p>
        <span className="rounded-full bg-[#32D074] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#080A09]">
          Live-ready
        </span>
      </div>

      <div className="relative min-h-[420px] md:min-h-[470px]">
        <div className="absolute right-0 top-0 hidden w-[82%] rounded-[1.4rem] border border-white/12 bg-[#171B18] p-3 shadow-2xl shadow-black/45 md:block">
          <div className="overflow-hidden rounded-[1rem] bg-[#F4F1EA] text-[#111312]">
            <div className="relative min-h-[240px] bg-[#121613] p-7 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(50,208,116,0.28),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_46%)]" />
              <div className="relative max-w-[75%]">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-white/40">
                  {industryLabel}
                </p>
                <p className="text-4xl font-normal leading-[0.96] tracking-tight text-white">
                  {headline}
                </p>
                <p className="mt-5 max-w-sm text-sm leading-6 text-white/58">
                  {subheadline}
                </p>
                <div className="mt-7 inline-flex rounded-full bg-[#32D074] px-5 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#080A09]">
                  Request help
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-black/10">
              {previewFeatures.map((feature) => (
                <div key={feature.label} className="bg-[#F4F1EA] p-4">
                  <p className="text-[10px] font-black text-[#111312]">{feature.label}</p>
                  <p className="mt-2 line-clamp-3 text-[10px] leading-4 text-black/45">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-[245px] rounded-[42px] border border-white/12 bg-[#151916] p-[9px] shadow-2xl shadow-black/55 md:absolute md:bottom-0 md:left-0 md:mx-0">
          <div className="absolute left-1/2 top-[17px] h-5 w-[76px] -translate-x-1/2 rounded-full bg-[#090B0A]" />
          <div className="h-[500px] overflow-hidden rounded-[34px] bg-[#F5F3ED] text-[#111312]">
            <div className="relative flex h-[235px] flex-col justify-end bg-[#101411] p-5 text-white">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(50,208,116,0.3),transparent_34%)]" />
              <div className="relative">
                <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{industryLabel}</p>
                <p className="text-[2.15rem] font-normal leading-[0.95] tracking-tight">{headline}</p>
                <p className="mt-4 text-[11px] leading-5 text-white/52">{subheadline}</p>
              </div>
            </div>
            <div className="space-y-2 p-4">
              {previewFeatures.map((feature) => (
                <div key={feature.label} className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-[11px] font-black">{feature.label}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-black/45">{feature.desc}</p>
                </div>
              ))}
              <div className="mt-3 flex h-10 items-center justify-center rounded-full bg-[#32D074] text-[9px] font-black uppercase tracking-[0.16em] text-[#080A09]">
                Get a quote
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-sm leading-7 text-white/50">
        The page should feel like a real finished site, not a worksheet or placeholder template.
      </p>
    </div>
  )
}

export default function IndustryPage({ industry, eyebrow, headline, subheadline, description, features, faqs, closingLine }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<FoundPlanKey>("found_pro")
  const isIntroRatePeriod = new Date() < INTRO_RATE_CUTOFF
  const proPrice = isIntroRatePeriod ? 39 : 69
  const businessPrice = isIntroRatePeriod ? 69 : 99
  const industryLabel = industry.replace(/-/g, " ")
  const selectedPlanOption = INDUSTRY_PLAN_OPTIONS.find((plan) => plan.key === selectedPlan) ?? INDUSTRY_PLAN_OPTIONS[0]

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

        {/* Visual preview and plan choice */}
        <section className="px-6 pb-20 md:px-10 max-w-5xl mx-auto">
          <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
            <IndustryDevicePreview
              industryLabel={industryLabel}
              headline={headline}
              subheadline={subheadline}
              features={features}
            />

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
                  Choose your path
                </p>
                <h2 className="text-2xl font-normal leading-tight text-white">Pro is recommended. You still choose the plan.</h2>
                <div className="mt-5">
                  <PlanSwiper selectedPlan={selectedPlan} onSelect={setSelectedPlan} intro={isIntroRatePeriod} />
                </div>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-xs font-black uppercase tracking-widest transition hover:opacity-90"
                  style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                >
                  Continue with {selectedPlanOption.name}
                </button>
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
              Continue with {selectedPlanOption.name}
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
              Continue with {selectedPlanOption.name}
            </button>
            <p className="mt-6 text-xs text-white/25">
              {isIntroRatePeriod
                ? <>Starter is still available for website-only launches. Use the plan cards above or{" "}
                    <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                      compare all plans
                    </Link>.</>
                : <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>Compare all plans →</Link>
              }
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={selectedPlan} />
    </>
  )
}
