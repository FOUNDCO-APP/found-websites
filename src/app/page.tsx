"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import OnboardingDrawer from "@/components/OnboardingDrawer"
import SiteNav from "@/components/SiteNav"
import SiteFooter from "@/components/SiteFooter"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"
const FOUNDING_CUTOFF = new Date('2026-07-15T07:00:00.000Z')

export default function Home() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("found")
  const [cinematic, setCinematic] = useState<"off" | "on" | "iris" | "fading">("off")
  const isFoundingPeriod = new Date() < FOUNDING_CUTOFF

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
      if (planParam) setSelectedPlan(planParam)
      setDrawerOpen(true)
      window.history.replaceState({}, "", "/")
    }
  }, [])

  function openDrawer() {
    if (drawerOpen || cinematic !== "off") return
    setCinematic("on")
    setTimeout(() => setCinematic("iris"), 3000)
    setTimeout(() => {
      setDrawerOpen(true)
      setCinematic("fading")
    }, 3300)
    setTimeout(() => setCinematic("off"), 4200)
  }

  return (
    <>
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
                  Get found.<br />Get hired.
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
                    onClick={openDrawer}
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#32D074] px-7 text-xs font-black uppercase tracking-widest text-[#080A09] shadow-[0_0_34px_rgba(50,208,116,0.22)] transition hover:bg-[#5DE894] md:min-h-14 md:px-8 md:text-sm"
                  >
                    Get my site
                  </button>
                  <a
                    href="#how-it-works"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-black/20 px-7 text-xs font-black uppercase tracking-widest text-white backdrop-blur-md transition hover:border-white/40 md:min-h-14 md:px-8 md:text-sm"
                  >
                    See how it works
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

        {/* ── How it works ── */}
        <section id="how-it-works" className="bg-[#080A09] px-6 py-24 md:px-10">
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
                onClick={openDrawer}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#32D074] px-8 text-sm font-black uppercase tracking-widest text-[#080A09] transition hover:bg-[#5DE894] md:min-h-14"
              >
                Get my site
              </button>
              <p className="mt-4 text-xs text-white/30 font-medium">Most sites are ready the same day.</p>
            </div>
          </div>
        </section>

        {/* ── Promo banner — only visible during founding period ── */}
        {isFoundingPeriod && (
          <section style={{ backgroundColor: SIGNAL_GREEN }}>
            <div className="px-6 py-20 md:px-10 md:py-28 max-w-7xl mx-auto">
              <div className="md:grid md:grid-cols-2 md:gap-20 md:items-center">

                {/* Left: headline */}
                <div className="mb-10 md:mb-0">
                  <h2
                    className="text-5xl font-light leading-[0.93] md:text-7xl lg:text-[5.5rem]"
                    style={{ color: FOUND_BLACK }}
                  >
                    Lock in your rate<br />before July 15.
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
                    onClick={openDrawer}
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
            {isFoundingPeriod ? "Intro rates expire July 15 — locked in for your first year." : "Simple, honest pricing. Cancel anytime."}
          </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  key: "found",
                  tagline: "Get online today.",
                  name: "Found",
                  price: isFoundingPeriod ? "$29" : "$39",
                  normalPrice: "$39",
                  features: [
                    "Complete website, five pages",
                    "Your own web address",
                    "Professional copy, written for you",
                    "Beautiful industry photos, built in",
                    "Leads come straight to you",
                    "Inquiries get an automatic reply the moment they arrive",
                    "Take a photo. It's on your site.",
                  ],
                },
                {
                  key: "found_pro",
                  tagline: "Follow up with every lead. Automatically.",
                  name: "Found Pro",
                  price: isFoundingPeriod ? "$39" : "$69",
                  normalPrice: "$69",
                  featured: true,
                  features: [
                    "Everything in the Found plan",
                    "Every lead followed up — automatically",
                    "See who's interested and ready to hire",
                    "All your leads in one place",
                    "Your entire contact list, organized",
                    "Your crew contributes from the field",
                    "Rewrite any page on your site, anytime",
                  ],
                },
                {
                  key: "found_business",
                  tagline: "Run your whole business.",
                  name: "Found Business",
                  price: isFoundingPeriod ? "$69" : "$99",
                  normalPrice: "$99",
                  features: [
                    "Everything in Found Pro",
                    "Clients book themselves",
                    "Send professional estimates, collect deposits",
                    "More five-star reviews, without asking",
                    "Reach your full client list",
                    "Your whole team, no extra charge",
                    "Show clients their finished job",
                  ],
                },
              ].map((plan) => (
                <div
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className="relative rounded-2xl p-10 cursor-pointer transition-all"
                  style={{
                    backgroundColor: plan.featured ? "rgba(50,208,116,0.06)" : "rgba(255,255,255,0.03)",
                    border: selectedPlan === plan.key
                      ? `2px solid ${SIGNAL_GREEN}`
                      : plan.featured
                      ? "2px solid rgba(50,208,116,0.3)"
                      : "2px solid rgba(255,255,255,0.07)",
                    transform: plan.featured ? "scale(1.02)" : "scale(1)",
                    boxShadow: plan.featured ? "inset 0 0 80px rgba(50,208,116,0.05)" : "none",
                  }}
                >
                  {plan.featured && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span
                        className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
                        style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                      >
                        Recommended
                      </span>
                    </div>
                  )}
                  <p className="text-base font-black text-white mb-1">
                    {plan.tagline}
                  </p>
                  <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: plan.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.4)" }}>{plan.name}</p>
                  <div className="mb-8">
                    {isFoundingPeriod && (
                      <p className="text-sm font-medium line-through" style={{ color: "rgba(255,255,255,0.25)" }}>{plan.normalPrice}/month</p>
                    )}
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-light text-white">{plan.price}</span>
                      <span className="text-sm text-white/40 font-medium">/month</span>
                    </div>
                    {isFoundingPeriod && (
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] mt-0.5" style={{ color: SIGNAL_GREEN }}>Intro rate</p>
                    )}
                  </div>
                  <ul className="space-y-3 mb-10">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                        <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.key); openDrawer() }}
                    className="w-full py-4 rounded-full text-xs font-black uppercase tracking-widest transition hover:opacity-90"
                    style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
                  >
                    Get started
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center mt-10 text-xs text-white/30 font-medium">
              {isFoundingPeriod
                ? <>Intro rates expire July 15 · locked for 12 months, then regular price · <a href="/plans" className="underline" style={{ color: SIGNAL_GREEN }}>Compare all plans</a></>
                : <a href="/plans" className="underline" style={{ color: SIGNAL_GREEN }}>Compare all plans →</a>
              }
            </p>
          </div>
        </section>

      </main>

      <SiteFooter />

      <OnboardingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} plan={selectedPlan} />

      {/* Cinematic overlay */}
      {cinematic !== "off" && (
        <div
          className="fixed inset-0 z-[45] flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: FOUND_BLACK,
            opacity: cinematic === "fading" ? 0 : 1,
            transition: cinematic === "fading" ? "opacity 700ms ease-out" : "none",
          }}
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
          className="fixed inset-0 z-[46] flex items-center justify-center pointer-events-none"
          style={{
            opacity: cinematic === "fading" ? 0 : 1,
            transition: cinematic === "fading" ? "opacity 700ms ease-out" : "none",
          }}
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

