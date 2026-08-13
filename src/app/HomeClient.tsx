"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import PlanPicker from "@/components/PlanPicker"
import OnboardingDrawer from "@/components/OnboardingDrawer"
import SiteNav from "@/components/SiteNav"
import SiteFooter from "@/components/SiteFooter"
import { INTRO_RATE_CUTOFF } from "@/lib/introRate"
import type { FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

// Found's own verbs, not DripJobs' contractor-specific ones - mirrors the
// real feature blocks in the "What's actually different" section below.
const ROTATING_WORDS = ["get found", "share photos", "send quotes", "take orders", "sell online", "collect reviews"]

// "Get found." stays fixed (it's the company name) - only the outcome
// rotates, so every industry gets equal billing instead of "hired" quietly
// assuming every customer is a contractor. Order matters here: even
// distribution, no phrase treated as the default.
const HERO_OUTCOMES = ["Get hired.", "Get booked.", "Get jobs.", "Get orders.", "Get calls."]

const HOME_FAQS: { q: string; a: string }[] = [
  { q: "How fast can I actually get a site?", a: "Most owners are live the same day. Answer a few questions, and Found writes your copy, picks your photos, and builds every page for you." },
  { q: "Do I need any design experience?", a: "No. There's no editor to learn - you answer questions, Found builds the site." },
  { q: "What if I already have a website?", a: "Point your existing domain to Found and you're live with a new site today. No agency, no waiting weeks for a redesign." },
  { q: "What's the camera thing everyone mentions?", a: "Every plan includes it. Finish a job, take a photo, tap the heart - it's live on your site and ready to become a social post." },
  { q: "Can I cancel anytime?", a: "Yes. No contracts." },
]

// Types each word out, pauses, deletes it, moves to the next - loops
// forever. Same mechanic everywhere it's used (hero + feature headline) so
// the whole page reads as one consistent animation, not two different ones.
function useTypewriter(words: string[], typingSpeed = 55, deletingSpeed = 30, pauseMs = 1400) {
  const [display, setDisplay] = useState("")
  const [wordIndex, setWordIndex] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = words[wordIndex % words.length]
    let timeout: ReturnType<typeof setTimeout>

    if (!deleting && display.length < current.length) {
      timeout = setTimeout(() => setDisplay(current.slice(0, display.length + 1)), typingSpeed)
    } else if (!deleting && display.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), pauseMs)
    } else if (deleting && display.length > 0) {
      timeout = setTimeout(() => setDisplay(display.slice(0, -1)), deletingSpeed)
    } else {
      setDeleting(false)
      setWordIndex(i => (i + 1) % words.length)
    }

    return () => clearTimeout(timeout)
  }, [display, deleting, wordIndex, words, typingSpeed, deletingSpeed, pauseMs])

  return display
}

function TypedCursor() {
  return (
    <span
      aria-hidden="true"
      className="inline-block align-middle"
      style={{ width: "3px", height: "0.85em", marginLeft: "3px", backgroundColor: SIGNAL_GREEN, animation: "cursor-blink 1s step-end infinite" }}
    />
  )
}

export default function HomeClient() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("found_pro")
  const [showPlanChoice, setShowPlanChoice] = useState(true)
  const [cinematic, setCinematic] = useState<"off" | "on" | "iris" | "fading">("off")
  const cinematicTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const isIntroRatePeriod = new Date() < INTRO_RATE_CUTOFF
  const typedHeroOutcome = useTypewriter(HERO_OUTCOMES)
  const typedFeature = useTypewriter(ROTATING_WORDS)

  useEffect(() => {
    document.documentElement.style.backgroundColor = FOUND_BLACK
    document.body.style.backgroundColor = FOUND_BLACK
    return () => {
      document.documentElement.style.backgroundColor = ""
      document.body.style.backgroundColor = ""
    }
  }, [])

  useEffect(() => {
    if (window.location.search.includes("start=1")) {
      const params = new URLSearchParams(window.location.search)
      const planParam = params.get("plan")
      if (planParam) {
        setSelectedPlan(planParam)
        setShowPlanChoice(false)
      } else {
        setSelectedPlan("found_pro")
        setShowPlanChoice(true)
      }
      setDrawerOpen(true)
      window.history.replaceState({}, "", "/")
    }
  }, [])

  useEffect(() => {
    return () => { cinematicTimers.current.forEach(clearTimeout) }
  }, [])

  // useCallback with real deps (not []) - openDrawer reads drawerOpen and
  // cinematic via closure, so it still needs to update when those change.
  // The point isn't "never changes," it's "doesn't change on every
  // typewriter tick," which is what lets SiteNav's memo actually skip
  // re-rendering while the hero/headline are typing.
  const openDrawer = useCallback((nextPlan?: string, requirePlanChoice = true) => {
    if (drawerOpen || cinematic !== "off") return
    setSelectedPlan(nextPlan ?? "found_pro")
    setShowPlanChoice(requirePlanChoice)
    setCinematic("on")
    // Shortened from the original 3.3s hold (was 3000/3300/4200) - the word
    // reveal itself finishes around 1.9s, so the iris only needs to start
    // shortly after that instead of holding on a static black screen.
    // Tapping anywhere during "on"/"iris" also skips straight to the drawer
    // (skipCinematic below) - there was previously no way to skip this at all.
    cinematicTimers.current = [
      setTimeout(() => setCinematic("iris"), 2000),
      setTimeout(() => { setDrawerOpen(true); setCinematic("fading") }, 2300),
      setTimeout(() => setCinematic("off"), 3200),
    ]
  }, [drawerOpen, cinematic])

  function skipCinematic() {
    if (cinematic !== "on" && cinematic !== "iris") return
    cinematicTimers.current.forEach(clearTimeout)
    setDrawerOpen(true)
    setCinematic("fading")
    setTimeout(() => setCinematic("off"), 400)
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQS.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteNav transparent onCta={openDrawer} />

      <main className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: FOUND_BLACK }}>

        {/* ── Hero ── */}
        <section className="found-home-hero relative min-h-[100dvh] overflow-hidden">
          <Image
            src="/images/found-hero-mobile-v3.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="found-hero-mobile-img object-cover object-center md:hidden"
          />
          <Image
            src="/images/found-hero-desktop-v3.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="found-hero-desktop-img hidden object-cover object-center md:block"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,9,0.42)_0%,rgba(8,10,9,0.12)_38%,rgba(8,10,9,0.78)_100%)] md:bg-[radial-gradient(circle_at_22%_48%,rgba(8,10,9,0.05)_0%,rgba(8,10,9,0.2)_36%,rgba(8,10,9,0.56)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#080A09] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#080A09] to-transparent" />

          <div className="found-hero-shell relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[1500px] flex-col px-6 py-7 md:px-10">
            {/* Spacer for fixed nav */}
            <div className="h-16 shrink-0" />

            <div className="found-hero-content flex flex-1 items-start pt-8 md:items-center md:pt-0">
              <div className="found-hero-copy max-w-[350px] md:max-w-[590px]">
                <h1 className="found-hero-title text-[2.65rem] font-normal leading-[0.98] tracking-normal text-white md:text-7xl">
                  <span className="block">Get found.</span>
                  <span className="block" style={{ color: SIGNAL_GREEN, minHeight: "1em" }}>
                    {typedHeroOutcome}
                    <TypedCursor />
                  </span>
                </h1>
                <p className="found-hero-mobile-copy mt-5 max-w-[310px] text-sm font-medium leading-6 text-white/72 md:hidden">
                  Found builds your site.<br />You get the calls.
                </p>
                <p className="found-hero-desktop-copy mt-7 hidden max-w-md text-base font-medium leading-8 text-white/70 md:block md:text-lg">
                  Found writes your copy, picks your photos, and builds your pages — around your trade, your town, and your voice. Most owners are live before they finish their second cup of coffee.
                </p>
                <div className="found-hero-actions absolute inset-x-6 bottom-8 flex flex-col gap-3 sm:flex-row md:static md:inset-auto md:mt-9">
                  <button
                    type="button"
                    onClick={() => openDrawer()}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#32D074] px-7 text-xs font-black uppercase tracking-widest text-[#080A09] shadow-[0_0_34px_rgba(50,208,116,0.22)] transition hover:bg-[#5DE894] md:min-h-14 md:px-8 md:text-sm"
                  >
                    Get my site
                  </button>
                  <a
                    href="/how-it-works"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-black/20 px-7 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md transition hover:border-white/40 md:min-h-14 md:px-8 md:text-sm"
                  >
                    See how Found works
                  </a>
                </div>

                <div className="found-hero-categories mt-8 hidden items-center gap-4 text-[11px] font-black uppercase tracking-[0.2em] text-white/60 md:flex">
                  <span>Websites</span>
                  <span className="text-[#32D074]">•</span>
                  <span>Bookings</span>
                  <span className="text-[#32D074]">•</span>
                  <span>Quotes</span>
                  <span className="text-[#32D074]">•</span>
                  <span>Social</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Who's it for ── */}
        <section className="bg-[#0B0E0C] px-6 py-16 md:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              Who it&apos;s for
            </p>
            <h2 className="max-w-2xl text-2xl font-light leading-tight md:text-4xl mb-8">
              Built for the businesses that run on word of mouth and a phone number.
            </h2>
            <div className="flex flex-wrap gap-3">
              {[
                ["Contractors", "/industries/contractors"],
                ["Salons & Spas", "/industries/salons"],
                ["Restaurants", "/industries/restaurants"],
                ["Photographers", "/industries/photographers"],
                ["Real Estate", "/industries/real-estate"],
                ["Retail", "/industries/retail"],
                ["Cleaning", "/industries/cleaning"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white"
                >
                  {label}
                </a>
              ))}
              <a
                href="/industries"
                className="rounded-full px-5 py-2.5 text-sm font-black transition hover:opacity-80"
                style={{ color: SIGNAL_GREEN }}
              >
                And more →
              </a>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="bg-[#080A09] px-6 py-24 md:px-10" style={{ scrollMarginTop: 80 }}>
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
                  Three minutes.
                </p>
                <h2 className="max-w-xl text-4xl font-light leading-tight md:text-6xl">
                  Your whole business, ready to meet the world.
                </h2>
              </div>
              <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
                {[
                  ["01", "You talk. We listen.", "A few questions about your work, your town, and what makes you different. That's the whole conversation."],
                  ["02", "Your site writes itself.", "Found picks your photos, writes your copy, and builds every page — tuned to your industry and your neighborhood."],
                  ["03", "Go live today.", "A real site. Your web address. Ready to share and start booking clients — today."],
                ].map(([step, title, body]) => (
                  <div key={step} className="bg-[#0B0E0C] p-7" style={{ borderTop: `2px solid ${SIGNAL_GREEN}` }}>
                    <div className="mb-6 text-xs font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>{step}</div>
                    <h3 className="text-xl font-normal leading-tight">{title}</h3>
                    <p className="mt-4 text-sm font-medium leading-7 text-white/60">{body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-16 text-center">
              <button
                type="button"
                onClick={() => openDrawer()}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#32D074] px-8 text-sm font-black uppercase tracking-widest text-[#080A09] transition hover:bg-[#5DE894] md:min-h-14"
              >
                Get my site
              </button>
              <p className="mt-4 text-xs text-white/30 font-medium">Most sites are ready the same day.</p>
            </div>
          </div>
        </section>

        {/* ── What's actually different ── */}
        <section className="bg-[#0B0E0C] px-6 py-24 md:px-10">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              What&apos;s actually different
            </p>
            <h2 className="max-w-2xl text-4xl font-light leading-tight md:text-6xl">
              <span className="block">One app for your whole business —</span>
              <span className="block" style={{ color: SIGNAL_GREEN, minHeight: "1.1em" }}>
                {typedFeature}
                <TypedCursor />
              </span>
            </h2>

            {/* Camera system — the lead feature, real narrative treatment */}
            <div className="mt-16 grid gap-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080A09] p-8 md:grid-cols-2 md:gap-16 md:p-14">
              <div className="flex flex-col justify-center">
                <h3 className="text-3xl font-normal leading-tight text-white md:text-4xl">
                  Take a photo. It&apos;s on your site.
                </h3>
                <p className="mt-5 text-base leading-8 text-white/55 font-medium">
                  Finish a job, snap a photo on your phone, tap the heart in Found — it&apos;s already live on your website, ready to become your next social post. Built the way CompanyCam works for contractors, except Found built it for every business, not just one trade.
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                  <div className="flex-1">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-white/30">Your phone</div>
                    <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02]">
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8a2 2 0 012-2h1.5l1-1.5h7l1 1.5H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
                        <circle cx="12" cy="13" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" className="shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                  <div className="flex-1">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: SIGNAL_GREEN }}>Your site</div>
                    <div className="flex h-24 flex-col justify-end gap-1.5 rounded-xl p-3" style={{ backgroundColor: "rgba(50,208,116,0.08)" }}>
                      <div className="h-2 w-3/4 rounded" style={{ backgroundColor: SIGNAL_GREEN, opacity: 0.9 }} />
                      <div className="h-2 w-1/2 rounded bg-white/25" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Three lighter blocks — simple, small-business scale, not a Shopify/Toast pitch */}
            <div className="mt-10 grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
              {[
                ["Send a quote. Get paid.", "Quotes and deposits from your phone — without learning QuickBooks."],
                ["Take orders, right from your site.", "Built for restaurants. No extra software, no separate login."],
                ["Sell without a separate store.", "Simple product sales with real checkout — no Shopify subscription required."],
              ].map(([title, body]) => (
                <div key={title} className="bg-[#080A09] p-7">
                  <h3 className="text-lg font-normal leading-tight text-white">{title}</h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-white/55">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <a href="/compare" className="text-xs font-black uppercase tracking-[0.16em] transition hover:opacity-80" style={{ color: SIGNAL_GREEN }}>
                See everything that makes Found different →
              </a>
            </div>
          </div>
        </section>

        {/* ── Promo banner — only visible during intro-rate period ── */}
        {isIntroRatePeriod && (
          <section style={{ backgroundColor: SIGNAL_GREEN }}>
            <div className="px-6 py-20 md:px-10 md:py-28 max-w-7xl mx-auto">
              <div className="md:grid md:grid-cols-2 md:gap-20 md:items-center">

                {/* Left: headline */}
                <div className="mb-10 md:mb-0">
                  <h2
                    className="text-5xl font-light leading-[0.93] md:text-7xl lg:text-[5.5rem]"
                    style={{ color: FOUND_BLACK }}
                  >
                    Lock in your rate<br />before August 15.
                  </h2>
                </div>

                {/* Right: subtext + CTA */}
                <div>
                  <p
                    className="text-lg font-medium leading-relaxed mb-10 md:text-xl"
                    style={{ color: "rgba(8,10,9,0.58)" }}
                  >
                    Start today at $29, $39, or $69/month —<br className="hidden md:block" />
                    your price, locked in for a full year.
                  </p>
                  <button
                    type="button"
                    onClick={() => openDrawer()}
                    className="inline-flex min-h-14 items-center justify-center rounded-full px-10 text-sm font-black uppercase tracking-widest transition hover:opacity-80"
                    style={{ backgroundColor: FOUND_BLACK, color: "white" }}
                  >
                    Get my site
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Pricing ── */}
        <section id="pricing" className="bg-[#080A09] px-6 py-24 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="text-center mb-16">
              <p className="text-xs font-black uppercase tracking-[0.22em] mb-4" style={{ color: SIGNAL_GREEN }}>Pricing</p>
              <h2 className="text-4xl font-light leading-tight md:text-6xl text-white">Simple, honest pricing.</h2>
              <p className="mt-5 text-base text-white/50 font-medium">
            {isIntroRatePeriod ? "Intro rates expire August 15 — locked in for your first year." : "Simple, honest pricing. Cancel anytime."}
          </p>
            </div>

            <div className="max-w-5xl mx-auto">
              <PlanPicker
                plans={[
                  {
                    key: "found",
                    shortName: "Starter",
                    headline: "Get online today.",
                    name: "Found Starter",
                    price: isIntroRatePeriod ? "$29" : "$39",
                    normalPrice: "$39",
                    bullets: [
                      "Complete website, five pages",
                      "Your own web address",
                      "Professional copy, written for you",
                      "Beautiful industry photos, built in",
                      "Leads come straight to you",
                      "New leads get an automatic reply from your business",
                      "Take a photo. It's on your site.",
                    ],
                  },
                  {
                    key: "found_pro",
                    shortName: "Pro",
                    headline: "Automatic follow-ups with every lead.",
                    name: "Found Pro",
                    price: isIntroRatePeriod ? "$39" : "$69",
                    normalPrice: "$69",
                    featured: true,
                    inherits: "Everything in Starter",
                    bullets: [
                      "Automatic lead follow-up",
                      "Drip-style messages keep new leads from going cold",
                      "See who's interested and ready to hire",
                      "All your leads in one place",
                      "Your entire contact list, organized",
                      "Your crew contributes from the field",
                      "Rewrite any page on your site, anytime",
                      "Choose one growth tool: online ordering, booking calendar, estimates and deposits, or email marketing",
                    ],
                  },
                  {
                    key: "found_business",
                    shortName: "Business",
                    headline: "Run your whole business.",
                    name: "Found Business",
                    price: isIntroRatePeriod ? "$69" : "$99",
                    normalPrice: "$99",
                    inherits: "Everything in Pro",
                    bullets: [
                      "Bookings, estimates, payments, and email marketing",
                      "Payment setup where it matters",
                      "More five-star reviews, without asking",
                      "Reach your full client list",
                      "Your whole team, no extra charge",
                      "Show clients their finished job",
                    ],
                  },
                ]}
                selectedPlan={selectedPlan as FoundPlanKey}
                onSelect={(key) => setSelectedPlan(key)}
                onCta={(key) => openDrawer(key, false)}
                intro={isIntroRatePeriod}
              />
            </div>

            <p className="text-center mt-10 text-xs text-white/30 font-medium">
              {isIntroRatePeriod
                ? <>Intro rates expire August 15 · locked for 12 months, then regular price · <a href="/plans" className="underline" style={{ color: SIGNAL_GREEN }}>Compare all plans</a></>
                : <a href="/plans" className="underline" style={{ color: SIGNAL_GREEN }}>Compare all plans →</a>
              }
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-[#0B0E0C] px-6 py-24 md:px-10">
          <div className="mx-auto max-w-3xl">
            <p className="mb-10 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
              Questions
            </p>
            <div className="space-y-2">
              {HOME_FAQS.map((faq, i) => (
                <div key={faq.q} className="rounded-xl overflow-hidden border border-white/[0.07]" style={{ backgroundColor: "#080A09" }}>
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
          </div>
        </section>

      </main>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={selectedPlan} showPlanChoice={showPlanChoice} />

      {/* Cinematic overlay - tap anywhere to skip straight to the drawer */}
      {cinematic !== "off" && (
        <div
          className="fixed inset-0 z-[45] flex items-center justify-center"
          style={{
            backgroundColor: FOUND_BLACK,
            opacity: cinematic === "fading" ? 0 : 1,
            transition: cinematic === "fading" ? "opacity 700ms ease-out" : "none",
            cursor: cinematic === "fading" ? "default" : "pointer",
            pointerEvents: cinematic === "fading" ? "none" : "auto",
          }}
          onClick={skipCinematic}
          aria-hidden="true"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              style={{
                width: "480px",
                height: "480px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(50,208,116,0.32) 0%, rgba(50,208,116,0.1) 50%, transparent 70%)",
                animation: "cinematic-breathe 2s ease-in-out infinite",
              }}
            />
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "clamp(1rem, 3vw, 1.4rem)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-dm-sans), Arial, sans-serif",
                fontSize: "clamp(3.2rem, 11vw, 5rem)",
                fontWeight: 300,
                letterSpacing: "0.32em",
                paddingLeft: "0.32em",
                textTransform: "uppercase",
                color: "white",
                display: "block",
                animation: "cinematic-word-in 500ms ease-out 200ms both",
              }}
            >
              Finally
            </span>
            <span
              style={{
                fontFamily: "var(--font-dm-sans), Arial, sans-serif",
                fontSize: "clamp(1.3rem, 4.5vw, 1.75rem)",
                fontWeight: 400,
                letterSpacing: "0.14em",
                paddingLeft: "0.14em",
                textTransform: "uppercase",
                color: SIGNAL_GREEN,
                display: "block",
                animation: "cinematic-word-in 500ms ease-out 1400ms both",
              }}
            >
              Let&apos;s build your site
            </span>
          </div>
        </div>
      )}

      {/* Iris */}
      {(cinematic === "iris" || cinematic === "fading") && (
        <div
          className="fixed inset-0 z-[46] flex items-center justify-center"
          style={{
            opacity: cinematic === "fading" ? 0 : 1,
            transition: cinematic === "fading" ? "opacity 700ms ease-out" : "none",
            pointerEvents: cinematic === "iris" ? "auto" : "none",
            cursor: cinematic === "iris" ? "pointer" : "default",
          }}
          onClick={skipCinematic}
          aria-hidden="true"
        >
          <div
            style={{
              width: "150vmax",
              height: "150vmax",
              minWidth: "150vmax",
              minHeight: "150vmax",
              flexShrink: 0,
              borderRadius: "50%",
              backgroundColor: SIGNAL_GREEN,
              animation: "iris-open 250ms cubic-bezier(0.4, 0, 0.6, 1) forwards",
            }}
          />
        </div>
      )}
    </>
  )
}
