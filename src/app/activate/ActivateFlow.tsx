"use client"

import { useEffect, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup } from "./activateActions"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#111111"
const MIN_SPLASH_MS = 4500

const SPLASH_LINES = [
  "Getting your site ready…",
  "Securing your space…",
  "Locking in your rate…",
  "Almost ready…",
]

function planDetails(plan?: string | null) {
  if (plan === "found_business") return { price: 69, normal: 99 }
  if (plan === "found_pro")      return { price: 39, normal: 69 }
  return { price: 29, normal: 39 }
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

function CardForm({ slug, companyName, plan }: { slug: string; companyName: string; plan?: string | null }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { price, normal } = planDetails(plan)

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
      setError(stripeError.message ?? "Something went wrong — please try again.")
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
            Intro rate
          </span>
        </div>
        <p className="mb-1 text-2xl font-light leading-tight tracking-tight text-white">
          ${price}/month.
        </p>
        <p className="mb-6 text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
          Locked in for 12 months, then ${normal}/month. Cancel anytime.
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
          {error && (
            <p className="text-xs font-black" style={{ color: "#F43F5E" }}>{error}</p>
          )}
          <button type="submit" disabled={!stripe || loading}
            className="sticky bottom-0 z-10 w-full rounded-xl py-4 text-xs font-black uppercase tracking-[0.18em] shadow-[0_-14px_26px_rgba(22,22,22,0.92)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
            style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}>
            {loading ? "One moment…" : "Activate my site →"}
          </button>
          <p className="text-center text-[11px]" style={{ color: "rgba(255,255,255,0.22)" }}>
            {companyName} · Powered by Found
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ActivateFlow({
  slug,
  error,
  preloadedSecret,
  preloadedName,
}: {
  slug: string
  error?: string
  preloadedSecret?: string
  preloadedName?: string
}) {
  const [phase, setPhase] = useState<"splash" | "form">("splash")
  const [lineIdx, setLineIdx] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(preloadedSecret ?? null)
  const [companyName, setCompanyName] = useState<string>(preloadedName ?? "")
  const [plan, setPlan] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)
  const [stripeReady, setStripeReady] = useState(!!preloadedSecret)
  const [minTimeReady, setMinTimeReady] = useState(false)

  useEffect(() => {
    const iv = setInterval(() => setLineIdx((i) => (i + 1) % SPLASH_LINES.length), 2000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReady(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Fast path: secret arrived from banner via sessionStorage — no server call needed
    if (preloadedSecret) return

    // Fallback: call server action (direct URL navigation, or companies without pre-created intent)
    createActivationSetup(slug).then((result) => {
      if (!result) {
        setLoadError("This site is already activated or could not be found.")
        setMinTimeReady(true)
      } else {
        setClientSecret(result.clientSecret)
        if (!companyName) setCompanyName(result.companyName)
        if (result.plan) setPlan(result.plan)
      }
      setStripeReady(true)
    })
  }, [slug, preloadedSecret, companyName])

  useEffect(() => {
    if (minTimeReady && stripeReady) setPhase("form")
  }, [minTimeReady, stripeReady])

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-start overflow-y-auto px-5 pb-8 pt-24 md:justify-center md:py-12"
      style={{ minHeight: "100dvh", backgroundColor: FOUND_BLACK }}>

      <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
        style={{ backgroundColor: `${SIGNAL_GREEN}12` }} />

      {/* Wordmark */}
      <div className="absolute left-7 top-7" style={{ animation: "fade-in 0.5s ease-out both" }}>
        <svg viewBox="0 0 420 72" className="h-6 w-32 text-white" aria-label="Found">
          <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
        </svg>
      </div>

      {/* ── SPLASH ── */}
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

      {/* ── CARD FORM ── */}
      {phase === "form" && (
        loadError ? (
          <div className="text-center space-y-4">
            <p className="text-lg font-light text-white">{loadError}</p>
            <a href="/" className="block text-sm font-black uppercase tracking-widest"
              style={{ color: SIGNAL_GREEN }}>
              Back to Found →
            </a>
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: stripeAppearance }}>
            <CardForm slug={slug} companyName={companyName} plan={plan} />
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
        /* Neutralize Stripe test-mode badge link — popup is test-only, goes away in production */
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
