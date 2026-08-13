"use client"

import { useRef, useState } from "react"
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
  bullets: string[]
  price: (intro: boolean) => number
}

const INDUSTRY_PLAN_OPTIONS: IndustryPlanOption[] = [
  {
    key: "found",
    name: "Found Starter",
    label: "Get online",
    line: "Your site, photos, gallery, and leads - easy to update from your phone.",
    bullets: ["Camera system", "Photo/video gallery", "Lead form"],
    price: (intro) => (intro ? 29 : 39),
  },
  {
    key: "found_pro",
    name: "Found Pro",
    label: "Recommended",
    line: "Everything in Starter, plus one included growth tool for how your business works.",
    bullets: ["Everything in Starter", "One included add-on", "Built for follow-up"],
    price: (intro) => (intro ? 39 : 69),
  },
  {
    key: "found_business",
    name: "Found Business",
    label: "Full system",
    line: "The full Found system for customers, tools, team, and growth.",
    bullets: ["Includes Pro", "More business tools", "Team/workers"],
    price: (intro) => (intro ? 69 : 99),
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

function PlanCarousel({
  selectedPlan,
  onSelect,
  intro,
}: {
  selectedPlan: FoundPlanKey
  onSelect: (plan: FoundPlanKey) => void
  intro: boolean
}) {
  const touchStartX = useRef<number | null>(null)
  const selectedIndex = Math.max(0, INDUSTRY_PLAN_OPTIONS.findIndex((plan) => plan.key === selectedPlan))
  const selected = INDUSTRY_PLAN_OPTIONS[selectedIndex] ?? INDUSTRY_PLAN_OPTIONS[1]
  const previous = INDUSTRY_PLAN_OPTIONS[Math.max(0, selectedIndex - 1)]
  const next = INDUSTRY_PLAN_OPTIONS[Math.min(INDUSTRY_PLAN_OPTIONS.length - 1, selectedIndex + 1)]

  const selectPrevious = () => {
    if (selectedIndex > 0) onSelect(previous.key)
  }

  const selectNext = () => {
    if (selectedIndex < INDUSTRY_PLAN_OPTIONS.length - 1) onSelect(next.key)
  }

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - clientX
    touchStartX.current = null

    if (Math.abs(delta) < 40) return
    if (delta > 0) selectNext()
    else selectPrevious()
  }

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      <div className="grid w-full min-w-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] sm:gap-3">
        <button
          type="button"
          onClick={selectPrevious}
          disabled={selectedIndex === 0}
          aria-label="Previous plan"
          className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-lg font-black text-white/70 transition disabled:opacity-25 sm:size-11"
        >
          &lsaquo;
        </button>

        <button
          type="button"
          onClick={() => onSelect(selected.key)}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
          className="min-h-[300px] w-full min-w-0 max-w-full rounded-[2rem] border p-6 text-left transition"
          style={{
            borderColor: SIGNAL_GREEN,
            background: "linear-gradient(180deg, rgba(50,208,116,0.18), rgba(50,208,116,0.06))",
            boxShadow: "0 24px 70px rgba(50,208,116,0.12)",
          }}
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>
            {selected.label}
          </span>
          <span className="mt-5 block break-words text-xl font-black text-white">{selected.name}</span>
          <span className="mt-3 block text-5xl font-black tracking-tight text-white">${selected.price(intro)}</span>
          <span className="mt-1 block text-sm font-bold text-white/45">per month</span>
          <span className="mt-6 block text-sm leading-6 text-white/58">{selected.line}</span>
          <span className="mt-5 block space-y-2">
            {selected.bullets.map((bullet) => (
              <span key={bullet} className="flex items-center gap-2 text-xs font-bold text-white/54">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
                {bullet}
              </span>
            ))}
          </span>
        </button>

        <button
          type="button"
          onClick={selectNext}
          disabled={selectedIndex === INDUSTRY_PLAN_OPTIONS.length - 1}
          aria-label="Next plan"
          className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-lg font-black text-white/70 transition disabled:opacity-25 sm:size-11"
        >
          &rsaquo;
        </button>
      </div>

      <div className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full bg-white/[0.07] px-4 py-3">
        {INDUSTRY_PLAN_OPTIONS.map((plan) => {
          const isSelected = selectedPlan === plan.key
          return (
            <button
              key={plan.key}
              type="button"
              onClick={() => onSelect(plan.key)}
              aria-label={`Choose ${plan.name}`}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: isSelected ? 34 : 9,
                backgroundColor: isSelected ? SIGNAL_GREEN : "rgba(255,255,255,0.3)",
              }}
            />
          )
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/32">
        {INDUSTRY_PLAN_OPTIONS.map((plan) => (
          <button
            key={plan.key}
            type="button"
            onClick={() => onSelect(plan.key)}
            className="truncate rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-2 transition"
            style={{ color: selectedPlan === plan.key ? SIGNAL_GREEN : undefined }}
          >
            {plan.name.replace("Found ", "")}
          </button>
        ))}
      </div>
    </div>
  )
}

function IndustryOutcomeProof({
  industryLabel,
  subheadline,
  features,
}: {
  industryLabel: string
  subheadline: string
  features: Feature[]
}) {
  const previewFeatures = features.slice(0, 3)
  const industryTitle = industryLabel
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")

  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-4 md:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
          What Found builds
        </p>
        <span className="shrink-0 rounded-full bg-[#32D074] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#080A09] md:text-[10px]">
          Lead-ready
        </span>
      </div>

      <div className="grid w-full min-w-0 max-w-full gap-4 md:grid-cols-[1.08fr_0.92fr]">
        <div className="relative w-full min-w-0 overflow-hidden rounded-[1.55rem] border border-white/[0.08] bg-[#0B0E0C] p-6 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(50,208,116,0.2),transparent_32%)]" />
          <p className="relative mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-white/38">
            {industryLabel}
          </p>
          <h2 className="relative max-w-[12ch] [overflow-wrap:anywhere] text-[2.2rem] font-normal leading-[1.02] tracking-tight text-white md:text-6xl">
            A better {industryTitle.toLowerCase()} site, built to get the request.
          </h2>
          <p className="relative mt-5 max-w-xl break-words text-sm leading-7 text-white/58 md:text-base">
            {subheadline}
          </p>
          <div className="relative mt-7 inline-flex rounded-full bg-[#32D074] px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#080A09]">
            Request help
          </div>
        </div>

        <div className="grid w-full min-w-0 max-w-full gap-3">
          {previewFeatures.map((feature) => (
            <div key={feature.label} className="w-full min-w-0 rounded-[1.35rem] border border-white/[0.08] bg-[#101411] p-5">
              <div className="mb-4 h-1.5 w-10 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
              <p className="break-words text-base font-black text-white">{feature.label}</p>
              <p className="mt-2 break-words text-sm leading-6 text-white/48">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function IndustryPage({ industry, eyebrow, headline, subheadline, description, features, faqs, closingLine }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<FoundPlanKey>("found_pro")
  const isIntroRatePeriod = new Date() < INTRO_RATE_CUTOFF
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

      <div className="min-h-screen overflow-x-hidden text-white" style={{ backgroundColor: FOUND_BLACK }}>
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
          </div>
        </section>

        {/* Visual preview and plan choice */}
        <section className="px-6 pb-20 md:px-10 max-w-5xl mx-auto overflow-hidden">
          <div className="grid min-w-0 gap-5">
            <IndustryOutcomeProof
              industryLabel={industryLabel}
              subheadline={subheadline}
              features={features}
            />

            <div className="grid min-w-0 gap-5 lg:grid-cols-[0.86fr_1.14fr]">
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
                <h2 className="text-2xl font-normal leading-tight text-white">Starter, Pro, or Business. Pro is centered first.</h2>
                <p className="mt-3 text-sm leading-6 text-white/48">
                  Most owners start with Pro. Swipe left for Starter or right for Business.
                </p>
                <div className="mt-5">
                  <PlanCarousel selectedPlan={selectedPlan} onSelect={setSelectedPlan} intro={isIntroRatePeriod} />
                </div>
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-xs font-black uppercase tracking-widest transition hover:opacity-90"
                  style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                >
                  Start with {selectedPlanOption.name.replace("Found ", "")}
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
              Pick the level that fits today. Starter gets your site, photos, gallery, and leads moving. Pro adds one included growth tool. Business opens the fuller operating system.
            </p>
            <button
              onClick={() => setDrawerOpen(true)}
              className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
              style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
            >
              Start with {selectedPlanOption.name.replace("Found ", "")}
            </button>
            <p className="mt-6 text-xs text-white/25">
              <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                Compare all plans
              </Link>
              {false && (isIntroRatePeriod
                ? <>Starter is still available for website-only launches. Use the plan cards above or{" "}
                    <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>
                      compare all plans
                    </Link>.</>
                : <Link href="/plans" className="underline" style={{ color: "rgba(255,255,255,0.4)" }}>Compare all plans</Link>
              )}
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={selectedPlan} />
    </>
  )
}
