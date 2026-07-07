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
    theme: "stripe",
    variables: {
      colorPrimary: color,
      colorBackground: "#ffffff",
      colorText: "#111111",
      colorDanger: "#FF453A",
      colorTextSecondary: "#666666",
      colorTextPlaceholder: "#999999",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSizeBase: "15px",
      borderRadius: "14px",
    },
    rules: {
      ".Input": {
        backgroundColor: "#ffffff",
        border: "1px solid #E8E8E2",
        boxShadow: "none",
        padding: "14px 16px",
      },
      ".Input:focus": {
        border: `1px solid ${color}`,
        boxShadow: `0 0 0 2px ${color}22`,
      },
      ".Label": {
        color: "#777772",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: "8px",
      },
      ".Error": { color: "#FF453A", fontSize: "13px" },
      ".Tab": { backgroundColor: "#F7F7F5", border: "1px solid #E8E8E2" },
      ".Tab--selected": { borderColor: color, boxShadow: `0 0 0 1px ${color}44` },
    },
  }
}

// Payment form inside Elements

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
        <h3 style={{ margin: "0 0 8px", color: "#111", fontSize: "1.625rem", fontWeight: 300, letterSpacing: "-0.03em" }}>
          You&apos;re all set!
        </h3>
        <p style={{ margin: "0 0 6px", color: "#5F5F5A", fontSize: 15, lineHeight: 1.6 }}>
          {remaining > 0 ? `${fmt(depositAmount)} deposit received.` : `${fmt(depositAmount)} payment received.`}
        </p>
        <p style={{ margin: "0 0 4px", color: "#777772", fontSize: 14, lineHeight: 1.6 }}>
          {companyName} has been notified and will be in touch to schedule your project.
        </p>
        {remaining > 0 && (
          <p style={{ margin: "16px 0 0", color: "#8A8A84", fontSize: 13 }}>
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
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8A84", marginBottom: 10 }}>
          {depositPct}% Deposit Due Now
        </div>
        <div style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.04em", color, lineHeight: 1 }}>
          {fmt(depositAmount)}
        </div>
        <div style={{ fontSize: 13, color: "#777772", marginTop: 8 }}>
          Full estimate: {fmt(total)} &nbsp;-&nbsp; {fmt(remaining)} at completion
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
          backgroundColor: (!stripe || paying) ? "#E8E8E2" : color,
          color: (!stripe || paying) ? "#8A8A84" : contrastColor(color),
          fontSize: 17, fontWeight: 800, cursor: (!stripe || paying) ? "default" : "pointer",
          letterSpacing: "-0.01em", transition: "all 0.15s ease",
        }}
      >
        {paying ? "Processing..." : `Pay ${fmt(depositAmount)} Now`}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, marginBottom: 4 }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#B8B8B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        <span style={{ color: "#9A9A94", fontSize: 12 }}>Secure card payment</span>
      </div>

      <button
        onClick={onClose}
        style={{ width: "100%", marginTop: 12, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "#777772", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
      >
        Cancel
      </button>
      <style>{`
        a[href*="stripe.com"],
        [class*="StripeElement-badge"],
        [class*="powered-by"],
        [class*="PoweredBy"] {
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `}</style>
    </>
  )
}

// Payment sheet wrapper

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
        backgroundColor: "#F7F7F5",
        borderTop: "1px solid #E8E8E2",
        borderRadius: "28px 28px 0 0",
        padding: `14px 24px max(env(safe-area-inset-bottom, 0px), 40px)`,
        maxHeight: "96dvh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#D9D9D2", margin: "0 auto 22px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: "0 0 3px", color: "#111", fontSize: "1.125rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {setup.depositPct >= 100 ? "Complete Your Payment" : "Complete Your Deposit"}
            </h2>
            <p style={{ margin: 0, color: "#777772", fontSize: 13 }}>{companyName}</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 10, border: "1px solid #E8E8E2", backgroundColor: "white", color: "#777772", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, lineHeight: 1 }}
          >
            x
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

// Main export

export default function AcceptButton({
  estimateId,
  color,
  stripeAccountId,
  total,
  subtotal,
  taxAmount,
  taxRate,
  depositPct,
  companyName,
  logoUrl,
  acceptedAlready = false,
}: {
  estimateId: string
  color: string
  stripeAccountId?: string | null
  total: number
  subtotal?: number
  taxAmount?: number
  taxRate?: number
  depositPct: number
  companyName: string
  logoUrl?: string | null
  acceptedAlready?: boolean
}) {
  const [accepted, setAccepted] = useState(acceptedAlready)
  const [loading, setLoading] = useState(false)
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)
  const [payLaterAccepted, setPayLaterAccepted] = useState(false)

  const hasStripe = Boolean(stripeAccountId)
  const depositCents = depositPct >= 100 ? Math.round(total * 100) : Math.round(total * depositPct)
  const totalCents = Math.round(total * 100)
  const depositAmount = depositCents / 100
  const remainingAmount = Math.max(totalCents - depositCents, 0) / 100
  const depositPctLabel = `${Math.round(depositPct)}%`
  const primaryLabel = remainingAmount > 0 ? `Pay ${fmt(depositAmount)} deposit` : `Pay ${fmt(depositAmount)} now`
  const paymentSummary = remainingAmount > 0
    ? `${depositPctLabel} today. The rest is due when the work is complete.`
    : "Pay securely now."

  async function handleSimpleAccept() {
    if (loading || accepted) return
    setLoading(true)
    try {
      const res = await fetch(`/api/accept-estimate/${estimateId}`, { method: "POST" })
      if (!res.ok) throw new Error("Accept failed")
      setAccepted(true)
    } catch { setLoading(false) }
  }

  async function handlePayLater() {
    if (loading || accepted || payLaterAccepted) return
    setLoading(true)
    try {
      const res = await fetch(`/api/accept-estimate/${estimateId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pay_later: true }),
      })
      if (!res.ok) throw new Error("Accept failed")
      setPayLaterAccepted(true)
    } catch {
      setLoading(false)
    }
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
        // Stripe not ready on server; fall back to plain accept.
        await handleSimpleAccept()
        return
      }
    } catch {
      setLoading(false)
      return
    }
    setLoading(false)
  }

  if (payLaterAccepted) {
    return (
      <div style={{ borderRadius: 20, backgroundColor: `${color}12`, border: `1px solid ${color}30`, padding: "24px 22px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ color, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Estimate Accepted</div>
        <div style={{ color: "#777772", fontSize: 14, lineHeight: 1.55 }}>We sent a secure payment link to your email. You can still pay from this page when you&apos;re ready.</div>
      </div>
    )
  }

  if (accepted && !acceptedAlready) {
    return (
      <div style={{
        position: "relative", overflow: "hidden",
        borderRadius: 24, backgroundColor: "white",
        border: `1px solid ${color}30`,
        padding: "36px 26px 30px",
        textAlign: "center", marginBottom: 16,
        boxShadow: `0 20px 60px ${color}14`,
      }}>
        {/* Ambient brand-color wash - the client's own color, not a generic green */}
        <div style={{
          position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
          width: 280, height: 200, borderRadius: "50%",
          background: `radial-gradient(ellipse, ${color}20 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative" }}>
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} style={{ height: 28, maxWidth: 160, objectFit: "contain", margin: "0 auto 22px", display: "block" }} />
          ) : (
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em", color: "#333", marginBottom: 22 }}>{companyName}</div>
          )}

          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `radial-gradient(circle, ${color}22 0%, transparent 72%)`,
            border: `2px solid ${color}55`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            animation: "accept-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h3 style={{ margin: "0 0 6px", color: "#111", fontSize: "1.5rem", fontWeight: 300, letterSpacing: "-0.03em" }}>
            You&apos;re all set!
          </h3>
          <p style={{ margin: "0 0 22px", color: "#5F5F5A", fontSize: 14, lineHeight: 1.6 }}>
            {companyName} has been notified and will be in touch to schedule your project.
          </p>

          <div style={{ borderRadius: 16, backgroundColor: "#FAFAF8", border: "1px solid #EFEFEB", padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <span style={{ color: "#8A8A84", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {remainingAmount > 0 ? "Deposit paid" : "Amount paid"}
              </span>
              <span style={{ color, fontSize: 20, fontWeight: 850, letterSpacing: "-0.02em" }}>{fmt(depositAmount)}</span>
            </div>
            {remainingAmount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 8, paddingTop: 8, borderTop: "1px solid #EFEFEB" }}>
                <span style={{ color: "#8A8A84", fontSize: 12, fontWeight: 700 }}>Due at completion</span>
                <span style={{ color: "#444", fontSize: 14, fontWeight: 700 }}>{fmt(remainingAmount)}</span>
              </div>
            )}
          </div>

          <p style={{ margin: "16px 0 0", color: "#B8B8B2", fontSize: 12 }}>
            A receipt has been sent to your email.
          </p>
        </div>

        <style>{`@keyframes accept-pop { from { transform: scale(0.7); opacity: 0 } to { transform: scale(1); opacity: 1 } }`}</style>
      </div>
    )
  }

  if (!hasStripe) {
    return (
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleSimpleAccept}
          disabled={loading || acceptedAlready}
          style={{ width: "100%", padding: "18px 0", borderRadius: 18, border: "none", backgroundColor: color, color: contrastColor(color), fontSize: 17, fontWeight: 800, cursor: loading || acceptedAlready ? "default" : "pointer", letterSpacing: "-0.01em", opacity: loading || acceptedAlready ? 0.7 : 1 }}
        >
          {loading ? "Confirming..." : acceptedAlready ? "Estimate Accepted" : "Accept Estimate"}
        </button>
        <p style={{ margin: "10px 0 0", textAlign: "center", color: "#777772", fontSize: 13 }}>
          {acceptedAlready ? "Thank you. The business has been notified." : "By accepting, you agree to proceed with the work as described above."}
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: 16 }}>
      {hasStripe ? (
        <>
          <section style={{
            borderRadius: 22,
            background: "white",
            border: "1px solid #E5E5E0",
            padding: "20px 22px",
            marginBottom: 14,
          }}>
            <div style={{ fontSize: 10, fontWeight: 850, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B8B8B2", marginBottom: 14 }}>
              Payment
            </div>
            {typeof subtotal === "number" && taxRate && taxRate > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 8 }}>
                  <span style={{ color: "#888", fontSize: 14, fontWeight: 600 }}>Subtotal</span>
                  <span style={{ color: "#444", fontSize: 14, fontWeight: 700 }}>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 12 }}>
                  <span style={{ color: "#888", fontSize: 14, fontWeight: 600 }}>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                  <span style={{ color: "#444", fontSize: 14, fontWeight: 700 }}>{fmt(taxAmount ?? 0)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, paddingTop: typeof subtotal === "number" && taxRate && taxRate > 0 ? 12 : 0, borderTop: typeof subtotal === "number" && taxRate && taxRate > 0 ? "1px solid #EFEFEB" : "none", marginBottom: 12 }}>
              <span style={{ color: "#777772", fontSize: 14, fontWeight: 650 }}>Total estimate</span>
              <span style={{ color: "#111", fontSize: 20, fontWeight: 850, letterSpacing: "-0.02em" }}>{fmt(total)}</span>
            </div>
            {remainingAmount > 0 ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, padding: "15px 0", borderTop: "1px solid #EFEFEB", borderBottom: "1px solid #EFEFEB" }}>
                  <div>
                    <div style={{ color: "#111", fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>{depositPctLabel} deposit</div>
                    <div style={{ color: "#777772", fontSize: 13, marginTop: 4 }}>Due today to start the job</div>
                  </div>
                  <div style={{ color, fontSize: 30, fontWeight: 900, letterSpacing: "-0.045em", whiteSpace: "nowrap", lineHeight: 1 }}>{fmt(depositAmount)}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, paddingTop: 12 }}>
                  <span style={{ color: "#777772", fontSize: 14, fontWeight: 650 }}>Balance after completion</span>
                  <span style={{ color: "#333", fontSize: 16, fontWeight: 800 }}>{fmt(remainingAmount)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, paddingTop: 15, borderTop: "1px solid #EFEFEB" }}>
                <div>
                  <div style={{ color: "#111", fontSize: 20, fontWeight: 900, letterSpacing: "-0.03em" }}>Due today</div>
                  <div style={{ color: "#777772", fontSize: 13, marginTop: 4 }}>Secure payment</div>
                </div>
                <span style={{ color, fontSize: 30, fontWeight: 900, letterSpacing: "-0.045em", whiteSpace: "nowrap", lineHeight: 1 }}>{fmt(depositAmount)}</span>
              </div>
            )}
          </section>
          <button
            onClick={handleOpenPayment}
            disabled={loading}
            style={{
              width: "100%", padding: "18px 0", borderRadius: 18, border: "none",
              backgroundColor: color,
              color: contrastColor(color),
              fontSize: 17, fontWeight: 850, cursor: loading ? "default" : "pointer",
              letterSpacing: "-0.01em", opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
            }}
          >
            {loading ? "Loading..." : primaryLabel}
          </button>
          <p style={{ margin: "11px 0 0", textAlign: "center", color: "#666", fontSize: 14, lineHeight: 1.45, fontWeight: 600 }}>
            {paymentSummary}
          </p>
          {!acceptedAlready && (
            <button
              onClick={handlePayLater}
              disabled={loading || payLaterAccepted}
              style={{ display: "block", width: "100%", marginTop: 12, border: "none", background: "transparent", color: "#777772", fontSize: 13, fontWeight: 600, cursor: loading ? "default" : "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Accept now, pay later
            </button>
          )}
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
            {loading ? "Confirming..." : "Accept This Estimate"}
          </button>
          <p style={{ margin: "10px 0 0", textAlign: "center", color: "#666", fontSize: 13 }}>
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
