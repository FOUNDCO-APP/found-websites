"use client"

import { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup } from "./activateActions"
import FoundWordmark from "@/components/FoundWordmark"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#111111"
const MIN_SPLASH_MS = 4500

const SPLASH_LINES = [
  "Getting your site ready...",
  "Securing your space...",
  "Locking in your rate...",
  "Almost ready...",
]

type PromoSummary = {
  code: string
  promotionCodeId: string
  couponId: string
  couponName: string | null
  discountLabel: string
  originalAmount: number
  discountedAmount: number
  currency: string
  duration: string
}

type ActivationPriceSummary = {
  originalAmount: number
  discountedAmount: number
  currency: string
  promo: PromoSummary | null
}

type ActivationSetupResult = {
  clientSecret: string
  companyName: string
  plan: string | null
  price: ActivationPriceSummary | null
  promoError?: string
}

function fallbackPlanDetails(plan?: string | null): ActivationPriceSummary {
  if (plan === "found_business") return { originalAmount: 6900, discountedAmount: 6900, currency: "usd", promo: null }
  if (plan === "found_pro") return { originalAmount: 3900, discountedAmount: 3900, currency: "usd", promo: null }
  return { originalAmount: 2900, discountedAmount: 2900, currency: "usd", promo: null }
}

function normalPriceForPlan(plan?: string | null) {
  if (plan === "found_business") return 9900
  if (plan === "found_pro") return 6900
  return 3900
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function promoDurationLabel(duration?: string) {
  if (duration === "once") return "first invoice"
  if (duration === "repeating") return "promo period"
  if (duration === "forever") return "every invoice"
  return "this subscription"
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const stripeAppearance = {
  theme: "night" as const,
  variables: {
    colorPrimary: SIGNAL_GREEN,
    colorBackground: "#161616",
    colorText: "#ffffff",
    colorDanger: "#F43F5E",
    colorTextSecondary: "rgba(255,255,255,0.45)",
    colorTextPlaceholder: "rgba(255,255,255,0.2)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSizeBase: "14px",
    borderRadius: "12px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#111111",
      border: "1px solid rgba(255,255,255,0.1)",
      boxShadow: "none",
      padding: "14px 16px",
    },
    ".Input:focus": {
      border: `1px solid ${SIGNAL_GREEN}`,
      boxShadow: `0 0 0 1px ${SIGNAL_GREEN}20`,
      outline: "none",
    },
    ".Label": {
      color: "rgba(255,255,255,0.4)",
      fontSize: "10px",
      fontWeight: "800",
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    ".Error": { color: "#F43F5E", fontSize: "12px" },
    ".Badge": { display: "none" },
  },
}

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function CardForm({
  slug,
  companyName,
  plan,
  priceSummary,
  onSetupUpdated,
}: {
  slug: string
  companyName: string
  plan?: string | null
  priceSummary: ActivationPriceSummary | null
  onSetupUpdated: (result: ActivationSetupResult) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoDraft, setPromoDraft] = useState(priceSummary?.promo?.code ?? "")
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const summary = priceSummary ?? fallbackPlanDetails(plan)
  const normal = normalPriceForPlan(plan)
  const hasPromo = !!summary.promo

  async function handlePromoApply(e: React.FormEvent) {
    e.preventDefault()
    const code = promoDraft.trim()
    if (!code) {
      setPromoMessage("Enter a promo code first.")
      return
    }

    setPromoLoading(true)
    setPromoMessage(null)
    setError(null)

    const result = await createActivationSetup(slug, plan, null, code)
    setPromoLoading(false)

    if (!result) {
      setPromoMessage("Could not check that promo code. Try again.")
      return
    }

    if (result.promoError || !result.price?.promo) {
      setPromoMessage(result.promoError ?? "That promo code is not active.")
      return
    }

    onSetupUpdated(result)
    setPromoDraft(result.price.promo.code)
    setPromoMessage(`${result.price.promo.code} applied.`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `https://${ROOT_DOMAIN}/activate/confirm?slug=${slug}`,
      },
    })

    if (stripeError) {
      setError(stripeError.message ?? "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div
      className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl"
      style={{
        backgroundColor: "#161616",
        maxHeight: "min(760px, calc(100dvh - 112px))",
        border: "1px solid rgba(255,255,255,0.07)",
        animation: "fade-up 0.7s ease-out both",
      }}>
      <div className="h-px w-full" style={{ backgroundColor: SIGNAL_GREEN }} />
      <div className="overflow-y-auto px-7 pb-7 pt-6" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="mb-5 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 6px ${SIGNAL_GREEN}` }} />
          <span className="text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ color: SIGNAL_GREEN }}>
            {hasPromo ? "Promo applied" : "Intro rate"}
          </span>
        </div>
        <div className="mb-6">
          <p className="mb-1 text-2xl font-light leading-tight tracking-tight text-white">
            {formatCurrency(summary.discountedAmount, summary.currency)}/month.
          </p>
          {hasPromo ? (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.42)" }}>
              <span className="line-through">{formatCurrency(summary.originalAmount, summary.currency)}/month</span>
              {" "}with {summary.promo?.discountLabel} for {promoDurationLabel(summary.promo?.duration)}.
            </p>
          ) : (
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
              Locked in for 12 months, then {formatCurrency(normal, summary.currency)}/month. Cancel anytime.
            </p>
          )}
        </div>

        <form onSubmit={handlePromoApply} className="mb-5 flex gap-2">
          <input
            value={promoDraft}
            onChange={(e) => setPromoDraft(e.target.value.toUpperCase())}
            placeholder="Promo code"
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-xl px-4 py-3 text-[16px] font-semibold uppercase text-white outline-none"
            style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)" }}
          />
          <button
            type="submit"
            disabled={promoLoading}
            className="rounded-xl px-4 text-xs font-black uppercase tracking-[0.12em] transition active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
            {promoLoading ? "..." : "Apply"}
          </button>
        </form>
        {promoMessage && (
          <p className="mb-5 text-xs font-bold" style={{ color: hasPromo ? SIGNAL_GREEN : "rgba(255,255,255,0.45)" }}>
            {promoMessage}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <PaymentElement options={{ layout: "tabs" }} />
          {error && (
            <p className="text-xs font-black" style={{ color: "#F43F5E" }}>{error}</p>
          )}
          <button type="submit" disabled={!stripe || loading}
            className="sticky bottom-0 z-10 w-full rounded-xl py-4 text-xs font-black uppercase tracking-[0.18em] shadow-[0_-14px_26px_rgba(22,22,22,0.92)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
            {loading ? "One moment..." : "Activate my site"}
          </button>
          <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {companyName} - Powered by Found
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ActivateFlow({
  slug,
  error,
  preloadedName,
}: {
  slug: string
  error?: string
  preloadedName?: string
}) {
  const [phase, setPhase] = useState<"splash" | "form">("splash")
  const [lineIdx, setLineIdx] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string>(preloadedName ?? "")
  const [plan, setPlan] = useState<string | null>(null)
  const [priceSummary, setPriceSummary] = useState<ActivationPriceSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)
  const [stripeReady, setStripeReady] = useState(false)
  const [minTimeReady, setMinTimeReady] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setLineIdx((i) => (i + 1) % SPLASH_LINES.length), 2000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReady(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  function applySetupResult(result: ActivationSetupResult) {
    setClientSecret(result.clientSecret)
    if (!companyName) setCompanyName(result.companyName)
    if (result.plan) setPlan(result.plan)
    if (result.price) setPriceSummary(result.price)
  }

  useEffect(() => {
    // Fallback: call server action (direct URL navigation, or companies without pre-created intent)
    createActivationSetup(slug).then((result) => {
      if (!result) {
        setLoadError("This site is already activated or could not be found.")
        setMinTimeReady(true)
      } else {
        applySetupResult(result)
      }
      setStripeReady(true)
    })
  }, [slug])

  useEffect(() => {
    if (minTimeReady && stripeReady) setPhase("form")
  }, [minTimeReady, stripeReady])

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-start overflow-y-auto px-5 pb-8 pt-24 md:justify-center md:py-12"
      style={{ minHeight: "100dvh", backgroundColor: FOUND_BLACK }}>

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        style={{ backgroundColor: `${SIGNAL_GREEN}12` }} />

      <div className="absolute left-7 top-7" style={{ animation: "fade-in 0.5s ease-out both" }}>
        <FoundWordmark height={24} className="text-white" />
      </div>

      {phase === "splash" && (
        <div className="flex flex-col items-center text-center">
          <div className="mb-10" style={{
            width: 44, height: 44, borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.07)",
            borderTop: `1.5px solid ${SIGNAL_GREEN}`,
            animation: "spin 1s linear infinite",
          }} />

          {companyName && (
            <h1 className="mb-4 text-4xl font-light leading-[1.1] tracking-tight text-white md:text-5xl"
              style={{ animation: "fade-up 0.6s 0.3s ease-out both", opacity: 0 }}>
              {companyName}<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>is going live.</span>
            </h1>
          )}

          <p
            key={lineIdx}
            className="text-base font-light tracking-wide"
            style={{ color: "rgba(255,255,255,0.5)", animation: "fade-up 0.5s ease-out both" }}>
            {SPLASH_LINES[lineIdx]}
          </p>
        </div>
      )}

      {phase === "form" && (
        loadError ? (
          <div className="text-center space-y-4">
            <p className="text-lg font-light text-white">{loadError}</p>
            <a href="/" className="block text-sm font-black uppercase tracking-widest"
              style={{ color: SIGNAL_GREEN }}>
              Back to Found
            </a>
          </div>
        ) : clientSecret ? (
          <Elements
            key={clientSecret}
            stripe={stripePromise}
            options={{ clientSecret, appearance: stripeAppearance }}>
            <CardForm
              slug={slug}
              companyName={companyName}
              plan={plan}
              priceSummary={priceSummary}
              onSetupUpdated={applySetupResult}
            />
          </Elements>
        ) : null
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        /* Neutralize Stripe test-mode badge link - popup is test-only, goes away in production */
        a[href*="stripe.com"],
        [class*="StripeElement-badge"],
        [class*="powered-by"],
        [class*="PoweredBy"] {
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `}</style>
    </main>
  )
}
