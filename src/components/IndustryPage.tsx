"use client"

import { useState } from "react"
import Link from "next/link"
import OnboardingDrawer from "./OnboardingDrawer"
import SiteNav from "./SiteNav"
import SiteFooter from "./SiteFooter"
import PlanPicker from "./PlanPicker"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"
import { FOUND_PLAN_OPTIONS, type FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type IndustryPlanOption = {
  key: FoundPlanKey
  name: string
  label: string
  line: string
  bullets: string[]
  inherits?: string
  price: (intro: boolean) => number
}

const INDUSTRY_PLAN_OPTIONS: IndustryPlanOption[] = FOUND_PLAN_OPTIONS.map((plan) => ({
  key: plan.key,
  name: plan.name,
  label: plan.eyebrow,
  line: plan.shortLine,
  bullets: plan.industryBullets,
  inherits: plan.inherits,
  price: (intro) => (intro ? plan.price : plan.normalPrice),
}))

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
          <p className="text-base text-white/45 leading-8 max-w-2xl">{description}</p>
        </section>

        {/* Visual preview and plan choice */}
        <section className="px-6 pb-20 md:px-10 max-w-5xl mx-auto overflow-hidden">
          <div className="grid min-w-0 gap-5">
            <IndustryOutcomeProof
              industryLabel={industryLabel}
              subheadline={subheadline}
              features={features}
            />

            <div className="rounded-[2.25rem] border border-white/[0.08] bg-white/[0.035] p-7 md:p-9">
              <p className="text-xs font-black uppercase tracking-[0.22em] mb-5" style={{ color: SIGNAL_GREEN }}>
                What happens after launch
              </p>
              <h2 className="mb-7 text-3xl font-normal leading-tight text-white md:text-4xl">
                From invisible to ready for the next request.
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["1", "Customers find the site", "Your business has a clean place to send searchers, referrals, and repeat customers."],
                  ["2", "They ask for help", "Calls, estimate requests, and project details go into Found instead of getting lost."],
                  ["3", "You see the request", "The owner view shows what happened so you know who needs a response."],
                  ["4", "Pro/Business helps follow up", "Higher plans add the operating tools that keep new leads from going cold."],
                ].map(([step, label, detail]) => (
                  <div key={step} className="flex gap-4 rounded-[1.35rem] border border-white/[0.08] bg-[#0B0E0C] p-5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-black" style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>{step}</span>
                    <span>
                      <p className="text-base font-black text-white">{label}</p>
                      <p className="mt-2 text-sm leading-6 text-white/45">{detail}</p>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>
                Choose your path
              </p>
              <h2 className="text-4xl font-normal leading-tight text-white md:text-5xl">Start with the level that fits the business.</h2>
              <p className="mt-4 text-base leading-7 text-white/48">
                Pro opens first. Swipe the card to compare Starter and Business.
              </p>
              <div className="mt-8">
                <PlanPicker
                  plans={INDUSTRY_PLAN_OPTIONS.map((plan) => ({
                    key: plan.key,
                    name: plan.name,
                    shortName: plan.name.replace("Found ", ""),
                    headline: plan.line,
                    price: `$${plan.price(isIntroRatePeriod)}`,
                    normalPrice: `$${plan.price(false)}`,
                    featured: plan.key === "found_pro",
                    bullets: plan.bullets,
                    inherits: plan.inherits,
                  }))}
                  selectedPlan={selectedPlan}
                  onSelect={setSelectedPlan}
                  onCta={() => setDrawerOpen(true)}
                  intro={isIntroRatePeriod}
                />
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
            </p>
          </div>
        </section>
      </div>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={selectedPlan} />
    </>
  )
}
