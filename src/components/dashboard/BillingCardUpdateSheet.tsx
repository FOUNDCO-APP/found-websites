"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import { GREEN } from "@/lib/dashboard/typography"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function appearance(): StripeElementsOptions["appearance"] {
  return {
    theme: "night",
    variables: {
      colorPrimary: GREEN,
      colorBackground: "#101413",
      colorText: "#ffffff",
      colorDanger: "#ff453a",
      borderRadius: "12px",
      fontFamily: "Inter, system-ui, sans-serif",
    },
  }
}

function CardForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveCard() {
    if (!stripe || !elements || saving) return
    setSaving(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) {
      setError(submitError.message || "Check the card details and try again.")
      setSaving(false)
      return
    }

    const { error: setupError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/billing?billing_task=card`,
      },
      redirect: "if_required",
    })

    if (setupError || !setupIntent) {
      setError(setupError?.message || "Card could not be updated.")
      setSaving(false)
      return
    }

    const res = await fetch("/api/billing/card-setup", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setupIntentId: setupIntent.id }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      setError(data.error || "Card saved, but Found could not finish the update. Contact support.")
      setSaving(false)
      return
    }

    onDone()
  }

  return (
    <>
      <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { applePay: "never", googlePay: "never" } }} />
      {error && (
        <p style={{ margin: "12px 0 0", color: "#ff453a", fontSize: 13, lineHeight: 1.4, fontWeight: 650 }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={saveCard}
        disabled={!stripe || saving}
        style={{
          width: "100%",
          minHeight: 52,
          marginTop: 18,
          borderRadius: 999,
          border: `1px solid ${GREEN}`,
          backgroundColor: GREEN,
          color: "#080A09",
          fontSize: 16,
          fontWeight: 850,
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.72 : 1,
        }}
      >
        {saving ? "Saving card..." : "Save card"}
      </button>
    </>
  )
}

export default function BillingCardUpdateSheet({ currentCard }: { currentCard: string | null }) {
  const [open, setOpen] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadPromiseRef = useRef<Promise<string | null> | null>(null)

  const loadCardForm = useCallback(async () => {
    if (clientSecret) return
    if (loadPromiseRef.current) return loadPromiseRef.current

    setLoading(true)
    setError(null)
    loadPromiseRef.current = fetch("/api/billing/card-setup", { method: "POST" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({})) as { clientSecret?: string; error?: string }
        if (!res.ok || !data.clientSecret) {
          throw new Error(data.error || "Card update could not start.")
        }
        setClientSecret(data.clientSecret)
        return data.clientSecret
      })
      .catch((err: unknown) => {
        loadPromiseRef.current = null
        setError(err instanceof Error ? err.message : "Card update could not start.")
        return null
      })
      .finally(() => {
        setLoading(false)
      })

    return loadPromiseRef.current
  }, [clientSecret])

  useEffect(() => {
    if (clientSecret || open) return

    const preload = () => {
      void loadCardForm()
    }
    const win = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(preload, { timeout: 1800 })
      return () => win.cancelIdleCallback?.(id)
    }

    const id = window.setTimeout(preload, 500)
    return () => window.clearTimeout(id)
  }, [clientSecret, loadCardForm, open])

  async function openSheet() {
    setOpen(true)
    setError(null)
    await loadCardForm()
  }

  function closeSheet() {
    setOpen(false)
  }

  function done() {
    setOpen(false)
    window.location.href = "/billing?billing_task=card"
  }

  return (
    <>
      <button type="button" onClick={openSheet} style={{ width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <div style={{ minHeight: 70, padding: "14px 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span>
            <span style={{ display: "block", fontSize: 15, lineHeight: 1.25, fontWeight: 700, color: "white" }}>{currentCard ? "Update card" : "Add card"}</span>
            <span style={{ display: "block", marginTop: 2, fontSize: 13, lineHeight: 1.35, fontWeight: 400, color: "rgba(255,255,255,0.36)" }}>Securely update the card used for Found</span>
          </span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-update-title"
          onClick={closeSheet}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            backgroundColor: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px 14px calc(18px + env(safe-area-inset-bottom))",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 440,
              maxHeight: "min(760px, calc(100dvh - 34px))",
              overflowY: "auto",
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(180deg, #101413 0%, #080A09 100%)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.48)",
              padding: "22px 20px 18px",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <p style={{ margin: "0 0 6px", color: GREEN, fontSize: 12, lineHeight: 1.2, fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  Found billing
                </p>
                <h2 id="card-update-title" style={{ margin: 0, fontSize: 26, lineHeight: 1.08, fontWeight: 760, letterSpacing: 0 }}>
                  {currentCard ? "Update card" : "Add card"}
                </h2>
              </div>
              <button type="button" onClick={closeSheet} style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.7)", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>
                x
              </button>
            </div>
            <p style={{ margin: "0 0 18px", color: "rgba(255,255,255,0.62)", fontSize: 14, lineHeight: 1.5, fontWeight: 500 }}>
              This card is used for your Found plan. Your full card number is never stored by Found.
            </p>

            {loading && !clientSecret && (
              <div style={{ borderRadius: 16, padding: "16px 14px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ margin: "0 0 4px", color: "white", fontSize: 14, lineHeight: 1.35, fontWeight: 780 }}>
                  Preparing secure card form...
                </p>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.56)", fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}>
                  This usually takes a moment on mobile.
                </p>
              </div>
            )}
            {error && <p style={{ margin: 0, color: "#ff453a", fontSize: 14, lineHeight: 1.45, fontWeight: 650 }}>{error}</p>}
            {clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: appearance() }}>
                <CardForm onDone={done} />
              </Elements>
            )}
          </div>
        </div>
      )}
    </>
  )
}
