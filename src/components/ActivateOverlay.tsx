"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup } from "@/app/activate/activateActions"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"
const MIN_SPLASH_MS = 4500

const SPLASH_LINES = [
  "Building your site.",
  "Setting up your free trial.",
  "Almost ready.",
]

// Module-level: Stripe.js starts loading the moment this chunk is prefetched —
// so it's ready before the user ever taps the button.
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

function CardForm({
  slug,
  companyName,
}: {
  slug: string
  companyName: string
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)
    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `https://${rootDomain}/activate/confirm?slug=${slug}`,
      },
    })
    if (stripeError) {
      setError(stripeError.message ?? "Something went wrong — please try again.")
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 448,
        overflow: "hidden",
        borderRadius: 24,
        backgroundColor: "#161616",
        border: "1px solid rgba(255,255,255,0.07)",
        animation: "ao-fade-up 0.7s ease-out both",
      }}>
      <div style={{ height: 1, backgroundColor: SIGNAL_GREEN }} />
      <div style={{ padding: "24px 28px 28px" }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 6px ${SIGNAL_GREEN}`, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.22em", color: SIGNAL_GREEN }}>
            Your free trial
          </span>
        </div>
        <p style={{ fontSize: 24, fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: "white", marginBottom: 4 }}>
          14 days free.
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          No charge today. Cancel anytime.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PaymentElement options={{ layout: "tabs" }} />
          {error && (
            <p style={{ fontSize: 12, fontWeight: 900, color: "#F43F5E", margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={!stripe || loading}
            style={{
              width: "100%",
              borderRadius: 12,
              padding: "16px 0",
              fontSize: 12,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              backgroundColor: SIGNAL_GREEN,
              color: FOUND_BLACK,
              border: "none",
              cursor: loading ? "default" : "pointer",
              opacity: (!stripe || loading) ? 0.4 : 1,
              transition: "opacity 150ms",
            }}>
            {loading ? "One moment…" : "Activate free trial →"}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.22)", margin: 0 }}>
            {companyName} · Powered by Found
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ActivateOverlay({
  slug,
  companyName: initialName,
  setupIntentSecret,
  onClose,
}: {
  slug: string
  companyName: string
  setupIntentSecret?: string | null
  onClose: () => void
}) {
  const [phase, setPhase] = useState<"splash" | "form">("splash")
  const [lineIdx, setLineIdx] = useState(0)
  const [clientSecret, setClientSecret] = useState<string | null>(setupIntentSecret ?? null)
  const [companyName, setCompanyName] = useState(initialName)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [stripeReady, setStripeReady] = useState(!!setupIntentSecret)
  const [minTimeReady, setMinTimeReady] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    const iv = setInterval(() => setLineIdx((i) => (i + 1) % SPLASH_LINES.length), 2000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setMinTimeReady(true), MIN_SPLASH_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (setupIntentSecret) return // fast path — secret in hand, no server call

    createActivationSetup(slug).then((result) => {
      if (!result) {
        setLoadError("This site is already activated or could not be found.")
        setMinTimeReady(true)
      } else {
        setClientSecret(result.clientSecret)
        if (!companyName) setCompanyName(result.companyName)
      }
      setStripeReady(true)
    })
  }, [slug, setupIntentSecret, companyName])

  useEffect(() => {
    if (minTimeReady && stripeReady) setPhase("form")
  }, [minTimeReady, stripeReady])

  return createPortal(
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 99999,
      backgroundColor: FOUND_BLACK,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 20px 48px",
      overflowY: "auto",
      animation: "ao-fade-in 0.2s ease-out both",
    }}>
      {/* Glow circle — same formula as RevealScreen (top-anchored, SIGNAL_GREEN at 1a opacity, 120px blur) */}
      <div style={{
        position: "absolute",
        left: "50%", top: 0,
        width: 384, height: 384,
        borderRadius: "50%",
        backgroundColor: `${SIGNAL_GREEN}1a`,
        filter: "blur(120px)",
        transform: "translateX(-50%)",
        pointerEvents: "none",
      }} />

      {/* FOUND wordmark */}
      <div style={{ position: "absolute", left: 28, top: 28, animation: "ao-fade-in 0.5s ease-out both" }}>
        <svg viewBox="0 0 420 72" style={{ height: 24, width: 128, color: "white" }} aria-label="Found">
          <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
        </svg>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute", right: 24, top: 24,
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 28, lineHeight: 1, padding: 4,
        }}>
        ×
      </button>

      {/* SPLASH — mirrors onboarding GeneratingScreen (spinner + text) + RevealScreen (glow, label, company name) */}
      {phase === "splash" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 32 }}>
          {/* 52px spinner — exact match with onboarding GeneratingScreen */}
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.07)",
            borderTop: `1.5px solid ${SIGNAL_GREEN}`,
            animation: "ao-spin 1s linear infinite",
          }} />

          {companyName && (
            <h1 style={{
              fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "white",
              margin: 0,
              animation: "ao-fade-up 0.6s 0.3s ease-out both",
              opacity: 0,
            }}>
              {companyName}<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>is going live.</span>
            </h1>
          )}

          {/* Cycling text — same style as GeneratingScreen (text-xl font-light tracking-wide text-white/75) */}
          <p key={lineIdx} style={{
            fontSize: 20, fontWeight: 300, letterSpacing: "0.025em",
            color: "rgba(255,255,255,0.75)",
            animation: "ao-fade-up 0.5s ease-out both",
            margin: 0,
          }}>
            {SPLASH_LINES[lineIdx]}
          </p>
        </div>
      )}

      {/* FORM */}
      {phase === "form" && (
        loadError ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 300, color: "white", marginBottom: 16 }}>{loadError}</p>
            <button onClick={onClose} style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: SIGNAL_GREEN, background: "none", border: "none", cursor: "pointer" }}>
              Go back →
            </button>
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
            <CardForm slug={slug} companyName={companyName} />
          </Elements>
        ) : null
      )}

      <style>{`
        @keyframes ao-spin    { to { transform: rotate(360deg); } }
        @keyframes ao-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ao-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        /* Neutralize Stripe test-mode badge link — popup is test-only, goes away in production */
        a[href*="stripe.com"],
        [class*="StripeElement-badge"],
        [class*="powered-by"],
        [class*="PoweredBy"] {
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `}</style>
    </div>,
    document.body
  )
}
