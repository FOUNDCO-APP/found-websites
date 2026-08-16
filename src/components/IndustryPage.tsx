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
  const isContractorShowroom = ["contractors", "home services", "home-services"].includes(industryLabel)

  if (isContractorShowroom) {
    return (
      <div className="relative w-full max-w-full min-w-0 overflow-hidden py-3 md:py-8">
        <div className="mb-6 px-1 md:mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
            What Found builds
          </p>
          <h2 className="mt-4 max-w-2xl text-3xl font-normal leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
            A site that looks ready to win work.
          </h2>
        </div>

        <div className="-mx-6 overflow-hidden bg-[#050706] shadow-[0_28px_90px_rgba(0,0,0,0.42)] sm:mx-0 sm:rounded-[2rem] md:-mx-10 lg:-mx-16">
          <img
            src="/marketing/found-contractor-site-preview-v1.png"
            alt="Finished Found contractor website shown across devices"
            className="block h-auto w-full"
          />
        </div>

        {false && (
        <div className="hidden overflow-hidden rounded-[1.75rem] bg-[#EEE9DC] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-3">
          <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 text-[#080A09]/45 md:px-4">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#FF6B57]" />
              <span className="size-2.5 rounded-full bg-[#F6C85F]" />
              <span className="size-2.5 rounded-full bg-[#32D074]" />
            </div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] md:text-[9px]">Example site preview</p>
          </div>

          <div className="relative overflow-hidden rounded-b-[1.35rem] bg-[#090D0A] text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgba(50,208,116,0.32),transparent_34%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-white/10" />

            <div className="relative grid min-h-[540px] content-between gap-8 p-6 md:min-h-[500px] md:grid-cols-[1.04fr_0.96fr] md:p-9">
              <div className="flex min-w-0 flex-col justify-between gap-10">
                <div>
                  <div className="mb-12 flex items-center justify-between gap-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.34em] text-white/78">
                      Canyon Ridge Builders
                    </p>
                    <p className="shrink-0 text-[9px] font-black uppercase tracking-[0.2em] text-white/36">
                      Tucson, AZ
                    </p>
                  </div>

                  <p className="mb-5 text-[9px] font-black uppercase tracking-[0.26em]" style={{ color: SIGNAL_GREEN }}>
                    Remodels · Roofing · Outdoor living
                  </p>
                  <h3 className="max-w-[11ch] text-[3.15rem] font-normal leading-[0.96] tracking-[-0.045em] text-white md:text-7xl">
                    Built work. Shown beautifully.
                  </h3>
                  <p className="mt-6 max-w-md text-base leading-7 text-white/58">
                    Premium remodeling and home improvement work presented with clear services, recent projects, and a simple way to request an estimate.
                  </p>
                  <div className="mt-8 inline-flex rounded-full bg-[#32D074] px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#080A09]">
                    Request an estimate
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["Remodeling", "Roofing", "Painting"].map((service) => (
                    <div key={service} className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-3">
                      <div className="mb-5 h-1.5 w-8 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
                      <p className="text-[11px] font-black leading-snug text-white">{service}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid min-w-0 content-end gap-3 md:gap-4">
                <div className="overflow-hidden rounded-[1.55rem] border border-white/[0.1] bg-[#151A15] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
                  <div className="h-48 bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(50,208,116,0.12)_38%,rgba(0,0,0,0.35)),radial-gradient(circle_at_24%_18%,rgba(245,247,244,0.34),transparent_18%),linear-gradient(145deg,#253026,#0E130F)] md:h-60" />
                  <div className="bg-[#F7F3EA] p-5 text-[#080A09]">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/36">Featured project</p>
                    <p className="mt-3 text-xl font-black leading-tight">Backyard patio and exterior refresh</p>
                    <p className="mt-3 text-sm leading-6 text-black/55">
                      Recent work appears with clean project copy, strong photography, and a direct estimate path.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {["Recent work", "Services"].map((label, index) => (
                    <div key={label} className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.07] p-4">
                      <div
                        className={[
                          "mb-4 h-20 rounded-xl",
                          index === 0
                            ? "bg-[linear-gradient(135deg,rgba(50,208,116,0.18),rgba(255,255,255,0.1)),linear-gradient(145deg,#19251C,#0D120F)]"
                            : "bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(50,208,116,0.1)),linear-gradient(145deg,#20251F,#0E120F)]",
                        ].join(" ")}
                      />
                      <p className="text-sm font-black text-white">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

      </div>
    )
  }

  const previewFeatures = features.slice(0, 3)
  const industryTitle = industryLabel
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
  const primaryFeature = previewFeatures[0]
  const secondaryFeature = previewFeatures[1]
  const tertiaryFeature = previewFeatures[2]

  return (
    <div className="relative w-full max-w-full min-w-0 overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.035] p-4 shadow-[0_32px_90px_rgba(0,0,0,0.28)] md:p-7">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
          What Found builds
        </p>
        <span className="shrink-0 rounded-full bg-[#32D074] px-3 py-1 text-[9px] font-black uppercase tracking-wider text-[#080A09] md:text-[10px]">
          Lead-ready
        </span>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] bg-[#EEE9DC] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-3">
        <div className="flex items-center justify-between border-b border-black/10 px-3 py-2 text-[#080A09]/45 md:px-4">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#FF6B57]" />
            <span className="size-2.5 rounded-full bg-[#F6C85F]" />
            <span className="size-2.5 rounded-full bg-[#32D074]" />
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.22em] md:text-[9px]">Found-built site</p>
        </div>

        <div className="relative overflow-hidden rounded-b-[1.35rem] bg-[#0B0E0C]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_8%,rgba(50,208,116,0.3),transparent_34%)]" />

          <div className="relative grid gap-4 p-5 md:grid-cols-[1.05fr_0.95fr] md:p-7">
            <div className="min-w-0">
              <p className="mb-4 text-[9px] font-black uppercase tracking-[0.24em] text-white/38">
                {industryLabel}
              </p>
              <h2 className="max-w-[13ch] [overflow-wrap:anywhere] text-[2.35rem] font-normal leading-[1.02] tracking-tight text-white md:text-6xl">
                {industryTitle} site, ready for the next request.
              </h2>
              <p className="mt-5 max-w-xl break-words text-sm leading-7 text-white/58 md:text-base">
                {subheadline}
              </p>
              <div className="mt-7 inline-flex rounded-full bg-[#32D074] px-6 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#080A09]">
                Request help
              </div>
            </div>

            <div className="grid min-w-0 content-start gap-3">
              <div className="rounded-[1.35rem] border border-white/[0.1] bg-white/[0.08] p-4 backdrop-blur">
                <div className="mb-3 flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#32D074]" />
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">New request</p>
                </div>
                <p className="text-base font-black text-white">A customer asks for help.</p>
                <p className="mt-2 text-sm leading-6 text-white/52">
                  Name, phone, and project details come through the site instead of getting lost.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[primaryFeature, secondaryFeature, tertiaryFeature].filter(Boolean).map((feature, index) => (
                  <div key={feature!.label} className="min-h-24 rounded-[1rem] border border-white/[0.08] bg-white/[0.06] p-3">
                    <div className="mb-3 h-1.5 w-8 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
                    <p className="break-words text-[11px] font-black leading-snug text-white">
                      {index === 0 ? "Services" : index === 1 ? "Gallery" : "Contact"}
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-[10px] leading-4 text-white/42">
                      {feature!.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative grid gap-px bg-white/[0.08] text-[#080A09] md:grid-cols-3">
            {previewFeatures.map((feature) => (
              <div key={feature.label} className="bg-[#F7F3EA] p-4 md:p-5">
                <p className="break-words text-sm font-black">{feature.label}</p>
                <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-black/55">{feature.desc}</p>
              </div>
            ))}
          </div>
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
