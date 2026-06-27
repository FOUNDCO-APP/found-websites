"use client"

import { useState, useMemo } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"

type PaymentSetup = {
  clientSecret: string
  stripeAccountId: string
  depositAmount: number
  depositPct: number
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#000000" : "#ffffff"
}

function stripeAppearance(color: string): StripeElementsOptions["appearance"] {
  return {
    theme: "night",
    variables: {
      colorPrimary: color,
      colorBackground: "#0F1211",
      colorText: "#ffffff",
      colorDanger: "#FF453A",
      colorTextSecondary: "rgba(255,255,255,0.55)",
      colorTextPlaceholder: "rgba(255,255,255,0.25)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSizeBase: "15px",
      borderRadius: "14px",
    },
    rules: {
      ".Input": {
        backgroundColor: "#080A09",
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "none",
        padding: "14px 16px",
      },
      ".Input:focus": {
        border: `1px solid ${color}`,
        boxShadow: `0 0 0 2px ${color}22`,
      },
      ".Label": {
        color: "rgba(255,255,255,0.4)",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: "8px",
      },
      ".Error": { color: "#FF453A", fontSize: "13px" },
      ".Tab": { backgroundColor: "#0A0C0B", border: "1px solid rgba(255,255,255,0.08)" },
      ".Tab--selected": { borderColor: color, boxShadow: `0 0 0 1px ${color}44` },
    },
  }
}

// ── Payment form (inside Elements) ─────────────────────────────────────────────

function PaymentForm({
  estimateId,
  depositAmount,
  depositPct,
  total,
  color,
  companyName,
  onPaid,
  onClose,
}: {
  estimateId: string
  depositAmount: number
  depositPct: number
  total: number
  color: string
  companyName: string
  onPaid: () => void
  onClose: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handlePay() {
    if (!stripe || !elements || paying) return
    setError(null)
    setPaying(true)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    })

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please try again.")
      setPaying(false)
      return
    }

    try {
      await fetch(`/api/accept-estimate/${estimateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      })
    } catch {}

    setSuccess(true)
    setTimeout(onPaid, 2200)
  }

  const remaining = total - depositAmount

  if (success) {
    return (
      <div style={{ padding: "32px 0 16px", textAlign: "center" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: `radial-gradient(circle, ${color}28 0%, transparent 70%)`,
          border: `2px solid ${color}50`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          animation: "pop-in 0.3s ease",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h3 style={{ margin: "0 0 8px", color: "white", fontSize: "1.625rem", fontWeight: 300, letterSpacing: "-0.03em" }}>
          You&apos;re all set!
        </h3>
        <p style={{ margin: "0 0 6px", color: "rgba(255,255,255,0.6)", fontSize: 15, lineHeight: 1.6 }}>
          {fmt(depositAmount)} deposit received.
        </p>
        <p style={{ margin: "0 0 4px", color: "rgba(255,255,255,0.3)", fontSize: 14, lineHeight: 1.6 }}>
          {companyName} has been notified and will be in touch to schedule your project.
        </p>
        {remaining > 0 && (
          <p style={{ margin: "16px 0 0", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            {fmt(remaining)} remaining due at completion.
          </p>
        )}
        <style>{`@keyframes pop-in { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
      </div>
    )
  }

  return (
    <>
      {/* Deposit breakdown */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
          {depositPct}% Deposit Due Now
        </div>
        <div style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.04em", color, lineHeight: 1 }}>
          {fmt(depositAmount)}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", marginTop: 8 }}>
          Full estimate: {fmt(total)} &nbsp;·&nbsp; {fmt(remaining)} at completion
        </div>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div style={{ marginTop: 14, padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)" }}>
          <p style={{ margin: 0, color: "#FF453A", fontSize: 13, lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={!stripe || paying}
        style={{
          width: "100%", marginTop: 22, padding: "18px 0",
          borderRadius: 18, border: "none",
          backgroundColor: (!stripe || paying) ? "rgba(255,255,255,0.08)" : color,
          color: (!stripe || paying) ? "rgba(255,255,255,0.3)" : contrastColor(color),
          fontSize: 17, fontWeight: 800, cursor: (!stripe || paying) ? "default" : "pointer",
          letterSpacing: "-0.01em", transition: "all 0.15s ease",
        }}
      >
        {paying ? "Processing…" : `Pay ${fmt(depositAmount)} Now`}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, marginBottom: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 12 }}>Secured by Stripe</span>
      </div>

      <button
        onClick={onClose}
        style={{ width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
      >
        Cancel
      </button>
    </>
  )
}

// ── Payment sheet wrapper ───────────────────────────────────────────────────────

function PaymentSheet({
  setup,
  color,
  estimateId,
  total,
  companyName,
  onPaid,
  onClose,
}: {
  setup: PaymentSetup
  color: string
  estimateId: string
  total: number
  companyName: string
  onPaid: () => void
  onClose: () => void
}) {
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, { stripeAccount: setup.stripeAccountId }),
    [setup.stripeAccountId]
  )

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.8)" }} />
      <div style={{
        position: "relative", zIndex: 1, width: "100%",
        backgroundColor: "#0C0E0D",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "28px 28px 0 0",
        padding: `14px 24px max(env(safe-area-inset-bottom, 0px), 40px)`,
        maxHeight: "96dvh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", margin: "0 auto 22px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: "0 0 3px", color: "white", fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              Complete Your Deposit
            </h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{companyName}</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
        <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: stripeAppearance(color) }}>
          <PaymentForm
            estimateId={estimateId}
            depositAmount={setup.depositAmount}
            depositPct={setup.depositPct}
            total={total}
            color={color}
            companyName={companyName}
            onPaid={onPaid}
            onClose={onClose}
          />
        </Elements>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export default function AcceptButton({
  estimateId,
  color,
  stripeAccountId,
  total,
  depositPct,
  companyName,
}: {
  estimateId: string
  color: string
  stripeAccountId?: string | null
  total: number
  depositPct: number
  companyName: string
}) {
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)

  const hasStripe = Boolean(stripeAccountId)
  const depositAmount = total * (depositPct / 100)

  async function handleSimpleAccept() {
    if (loading || accepted) return
    setLoading(true)
    try {
      await fetch(`/api/accept-estimate/${estimateId}`, { method: "POST" })
      setAccepted(true)
    } catch { setLoading(false) }
  }

  async function handleOpenPayment() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pay-estimate/${estimateId}`, { method: "POST" })
      const data = await res.json()
      if (data.clientSecret) {
        setPaymentSetup(data)
      } else {
        // Stripe not ready on server — fall back to plain accept
        await handleSimpleAccept()
        return
      }
    } catch {
      setLoading(false)
      return
    }
    setLoading(false)
  }

  if (accepted) {
    return (
      <div style={{ borderRadius: 20, backgroundColor: `${color}12`, border: `1px solid ${color}30`, padding: "24px 22px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ marginBottom: 10 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div style={{ color, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Estimate Accepted</div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Thank you! We&apos;ll be in touch shortly.</div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {hasStripe ? (
        <>
          <button
            onClick={handleOpenPayment}
            disabled={loading}
            style={{
              width: "100%", padding: "18px 0", borderRadius: 18, border: "none",
              backgroundColor: color,
              color: contrastColor(color),
              fontSize: 17, fontWeight: 800, cursor: loading ? "default" : "pointer",
              letterSpacing: "-0.01em", opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
            }}
          >
            {loading ? "Loading…" : `Accept & Pay ${fmt(depositAmount)} Deposit`}
          </button>
          <p style={{ margin: "10px 0 0", textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
            {depositPct}% deposit now &nbsp;·&nbsp; {fmt(total - depositAmount)} due at completion
          </p>
        </>
      ) : (
        <>
          <button
            onClick={handleSimpleAccept}
            disabled={loading}
            style={{
              width: "100%", padding: "18px 0", borderRadius: 18, border: "none",
              backgroundColor: color,
              color: contrastColor(color),
              fontSize: 17, fontWeight: 800, cursor: loading ? "default" : "pointer",
              letterSpacing: "-0.01em", opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
            }}
          >
            {loading ? "Confirming…" : "Accept This Estimate"}
          </button>
          <p style={{ margin: "10px 0 0", textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
            By accepting, you agree to proceed with the work as described above.
          </p>
        </>
      )}

      {paymentSetup && (
        <PaymentSheet
          setup={paymentSetup}
          color={color}
          estimateId={estimateId}
          total={total}
          companyName={companyName}
          onPaid={() => { setAccepted(true); setPaymentSetup(null) }}
          onClose={() => setPaymentSetup(null)}
        />
      )}
    </div>
  )
}
