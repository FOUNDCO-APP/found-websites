"use client"

import { useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"

type PaymentSetup = {
  clientSecret: string
  paymentIntentId: string
  leadId: string
  stripeAccountId: string
}

const CHECKOUT_BLACK = "#0D0F0E"

function paymentAppearance(primary: string): StripeElementsOptions["appearance"] {
  return {
    theme: "night",
    variables: {
      colorPrimary: primary,
      colorBackground: "#151716",
      colorText: "#ffffff",
      colorDanger: "#F43F5E",
      colorTextSecondary: "#ffffff",
      colorTextPlaceholder: "rgba(255,255,255,0.28)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSizeBase: "16px",
      borderRadius: "12px",
    },
    rules: {
      ".Input": { backgroundColor: "#101211", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "none", padding: "14px 16px" },
      ".Input:focus": { border: `1px solid ${primary}`, boxShadow: `0 0 0 1px ${primary}26` },
      ".Label": { color: "#ffffff", fontSize: "11px", fontWeight: "800", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" },
      ".Error": { color: "#F43F5E", fontSize: "12px" },
      ".Tab": { backgroundColor: "#101211", border: "1px solid rgba(255,255,255,0.1)" },
      ".Tab--selected": { borderColor: primary, boxShadow: `0 0 0 1px ${primary}33` },
    },
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function ClientPaymentForm({ setup, companyId, slug, total, primary, onPaid }: { setup: PaymentSetup; companyId: string; slug: string; total: number; primary: string; onPaid: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError(null)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/${slug}/order?ordered=1` },
      redirect: "if_required",
    })

    if (stripeError) {
      setError(stripeError.message || "Payment did not go through. Please try again.")
      setLoading(false)
      return
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("Payment is still processing. Please wait a moment and try again.")
      setLoading(false)
      return
    }

    const res = await fetch("/api/online-order/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, leadId: setup.leadId, paymentIntentId: setup.paymentIntentId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || "Payment succeeded, but the order could not be finalized. Please contact the business.")
      setLoading(false)
      return
    }

    onPaid()
  }

  return (
    <>
      <form onSubmit={submitPayment} className="mt-5 overflow-hidden" style={{ borderRadius: 16, backgroundColor: CHECKOUT_BLACK }}>
        <div className="px-5 pt-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: primary }}>Checkout</p>
              <p className="mt-1 text-xl font-black text-white">{formatMoney(total)}</p>
            </div>
            <div className="text-right text-[11px] font-bold leading-snug" style={{ color: "#ffffff" }}>Card payment</div>
          </div>
          <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
          {error && <p className="mt-4 text-sm font-bold" style={{ color: "#F43F5E" }}>{error}</p>}
        </div>
        <button type="submit" disabled={!stripe || loading} className="mt-5 w-full py-4 text-sm font-black uppercase tracking-[0.16em] transition disabled:opacity-45" style={{ backgroundColor: primary, color: "#fff" }}>
          {loading ? "Processing..." : `Pay ${formatMoney(total)}`}
        </button>
      </form>
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

export default function ClientPaymentElement({ setup, companyId, slug, total, primary, onPaid }: { setup: PaymentSetup; companyId: string; slug: string; total: number; primary: string; onPaid: () => void }) {
  const stripePromise = useMemo(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, { stripeAccount: setup.stripeAccountId }), [setup.stripeAccountId])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: paymentAppearance(primary) }}>
      <ClientPaymentForm companyId={companyId} slug={slug} setup={setup} total={total} primary={primary} onPaid={onPaid} />
    </Elements>
  )
}
