"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup } from "@/app/activate/activateActions"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

// Module-level: Stripe.js starts loading the moment this chunk is prefetched.
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

function CardForm({ slug, companyName }: { slug: string; companyName: string }) {
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
    <div style={{
      width: "100%",
      maxWidth: 448,
      overflow: "hidden",
      borderRadius: 24,
      backgroundColor: "#161616",
      border: "1px solid rgba(255,255,255,0.07)",
      animation: "cinematic-word-in 600ms ease-out both",
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

// Cinematic phases mirror page.tsx exactly:
// "text" → glow + FINALLY + name fades in
// "iris" → green circle expands from center (250ms)
// "fading" → both layers fade out (700ms) — gated on stripeReady + minTimeReady
// "done" → Stripe form shown
type CinPhase = "text" | "iris" | "fading" | "done"

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
  const [cinPhase, setCinPhase] = useState<CinPhase>("text")
  const [clientSecret, setClientSecret] = useState<string | null>(setupIntentSecret ?? null)
  const [companyName, setCompanyName] = useState(initialName)
  const [loadError, setLoadError] = useState<string | null>(null)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  // Fetch Stripe secret if not pre-created — runs in parallel with cinematic
  useEffect(() => {
    if (setupIntentSecret) return
    createActivationSetup(slug).then((result) => {
      if (!result) {
        setLoadError("This site is already activated or could not be found.")
      } else {
        setClientSecret(result.clientSecret)
        if (!companyName) setCompanyName(result.companyName)
      }
    })
  }, [slug, setupIntentSecret, companyName])

  // Mirror page.tsx timing exactly: iris 3000ms, fading 3300ms, done 4000ms
  useEffect(() => {
    const t1 = setTimeout(() => setCinPhase("iris"),   3000)
    const t2 = setTimeout(() => setCinPhase("fading"), 3300)
    const t3 = setTimeout(() => setCinPhase("done"),   4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>

      {/* ── CINEMATIC LAYERS (text + iris) — mirrors page.tsx ── */}
      {cinPhase !== "done" && (
        <>
          {/* Layer 1: black screen + breathing glow + text */}
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundColor: FOUND_BLACK,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: cinPhase === "fading" ? 0 : 1,
              transition: cinPhase === "fading" ? "opacity 700ms ease-out" : "none",
            }}
            aria-hidden="true"
          >
            {/* Breathing SIGNAL_GREEN radial glow — exact copy from page.tsx */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                width: 480, height: 480,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(50,208,116,0.32) 0%, rgba(50,208,116,0.1) 50%, transparent 70%)",
                animation: "cinematic-breathe 2s ease-in-out infinite",
              }} />
            </div>

            {/* Text — centered, scale contrast */}
            <div style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "clamp(1rem, 3vw, 1.4rem)",
              textAlign: "center",
            }}>
              {/* FINALLY */}
              <span style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: "clamp(3.2rem, 11vw, 5rem)",
                fontWeight: 300,
                letterSpacing: "0.32em",
                paddingLeft: "0.32em",
                textTransform: "uppercase",
                color: "white",
                display: "block",
                animation: "cinematic-word-in 500ms ease-out 200ms both",
              }}>
                Finally
              </span>

              {/* [COMPANY NAME] IS READY! */}
              <span style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: "clamp(1.3rem, 4.5vw, 1.75rem)",
                fontWeight: 400,
                letterSpacing: "0.14em",
                paddingLeft: "0.14em",
                textTransform: "uppercase",
                color: SIGNAL_GREEN,
                display: "block",
                animation: "cinematic-word-in 500ms ease-out 1400ms both",
              }}>
                {companyName} is ready!
              </span>
            </div>

            {/* Close — subtle, always available */}
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", right: 24, top: 24,
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.2)", fontSize: 28, lineHeight: 1, padding: 4,
                zIndex: 2,
              }}>
              ×
            </button>
          </div>

          {/* Layer 2: SIGNAL_GREEN iris — expands from center, mirrors page.tsx exactly */}
          {(cinPhase === "iris" || cinPhase === "fading") && (
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
                opacity: cinPhase === "fading" ? 0 : 1,
                transition: cinPhase === "fading" ? "opacity 700ms ease-out" : "none",
              }}
              aria-hidden="true"
            >
              <div style={{
                width: "150vmax", height: "150vmax",
                minWidth: "150vmax", minHeight: "150vmax",
                flexShrink: 0,
                borderRadius: "50%",
                backgroundColor: SIGNAL_GREEN,
                animation: "iris-open 250ms cubic-bezier(0.4, 0, 0.6, 1) forwards",
              }} />
            </div>
          )}
        </>
      )}

      {/* ── STRIPE FORM — fades in after cinematic done ── */}
      {cinPhase === "done" && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: FOUND_BLACK,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "20px 20px 48px",
          overflowY: "auto",
          animation: "cinematic-word-in 600ms ease-out both",
        }}>
          {/* FOUND wordmark */}
          <div style={{ position: "absolute", left: 28, top: 28 }}>
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
              color: "rgba(255,255,255,0.25)", fontSize: 28, lineHeight: 1, padding: 4,
            }}>
            ×
          </button>

          {loadError ? (
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
          ) : null}
        </div>
      )}

      <style>{`
        /* Neutralize Stripe test-mode badge — goes away in production with live keys */
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
