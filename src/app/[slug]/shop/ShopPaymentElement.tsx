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

function paymentAppearance(primary: string): StripeElementsOptions["appearance"] {
  return {
    theme: "stripe",
    variables: {
      colorPrimary: primary,
      colorBackground: "#ffffff",
      colorText: "#111111",
      colorDanger: "#B42318",
      colorTextSecondary: "#555555",
      colorTextPlaceholder: "rgba(17,17,17,0.38)",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSizeBase: "16px",
      borderRadius: "12px",
    },
    rules: {
      ".Input": { border: "1px solid rgba(17,17,17,0.14)", boxShadow: "none", padding: "14px 16px" },
      ".Input:focus": { border: `1px solid ${primary}`, boxShadow: `0 0 0 1px ${primary}26` },
      ".Label": { color: "#111111", fontSize: "11px", fontWeight: "800", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "8px" },
      ".Error": { color: "#B42318", fontSize: "12px" },
    },
  }
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function ClientPaymentForm({ setup, companyId, slug, total, onPaid }: { setup: PaymentSetup; companyId: string; slug: string; total: number; onPaid: () => void }) {
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
      confirmParams: { return_url: `${window.location.origin}/${slug}/shop?ordered=1` },
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

    const res = await fetch("/api/shopping-cart/complete", {
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
    <form onSubmit={submitPayment} className="mt-5 rounded-[22px] border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Checkout</p>
          <p className="mt-1 text-xl font-black text-neutral-950">{formatMoney(total)}</p>
        </div>
        <p className="text-right text-[11px] font-bold leading-snug text-neutral-500">Card payment</p>
      </div>
      <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
      {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}
      <button type="submit" disabled={!stripe || loading} className="mt-5 w-full rounded-full bg-neutral-950 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition disabled:opacity-45">
        {loading ? "Processing..." : `Pay ${formatMoney(total)}`}
      </button>
    </form>
  )
}

export default function ClientPaymentElement({ setup, companyId, slug, total, primary, onPaid }: { setup: PaymentSetup; companyId: string; slug: string; total: number; primary: string; onPaid: () => void }) {
  const stripePromise = useMemo(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, { stripeAccount: setup.stripeAccountId }), [setup.stripeAccountId])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: paymentAppearance(primary) }}>
      <ClientPaymentForm companyId={companyId} slug={slug} setup={setup} total={total} onPaid={onPaid} />
    </Elements>
  )
}
