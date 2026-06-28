"use client"

import { useMemo, useRef, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import type { MenuCategory } from "@/types/company"

type CartItem = {
  key: string
  catIndex: number
  itemIndex: number
  name: string
  description?: string | null
  photo_url?: string | null
  priceLabel: string
  unitAmount: number
  quantity: number
}

type ProductItem = Omit<CartItem, "quantity">

type PaymentSetup = {
  clientSecret: string
  paymentIntentId: string
  leadId: string
  stripeAccountId: string
}

const SHOP_BLACK = "#0D0F0E"

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
      fontSizeBase: "15px",
      borderRadius: "12px",
    },
    rules: {
      ".Input": {
        border: "1px solid rgba(17,17,17,0.14)",
        boxShadow: "none",
        padding: "14px 16px",
      },
      ".Input:focus": {
        border: `1px solid ${primary}`,
        boxShadow: `0 0 0 1px ${primary}26`,
      },
      ".Label": {
        color: "#111111",
        fontSize: "11px",
        fontWeight: "800",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        marginBottom: "8px",
      },
      ".Error": { color: "#B42318", fontSize: "12px" },
    },
  }
}

function parsePriceCents(price: string | null | undefined) {
  if (!price) return null
  const match = price.replace(/,/g, "").match(/(\d+(?:\.\d{1,2})?)/)
  if (!match) return null
  const cents = Math.round(Number(match[1]) * 100)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function ClientPaymentElement({
  setup,
  companyId,
  slug,
  total,
  primary,
  onPaid,
}: {
  setup: PaymentSetup
  companyId: string
  slug: string
  total: number
  primary: string
  onPaid: () => void
}) {
  const stripePromise = useMemo(
    () => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, { stripeAccount: setup.stripeAccountId }),
    [setup.stripeAccountId],
  )

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: paymentAppearance(primary) }}>
      <ClientPaymentForm companyId={companyId} slug={slug} setup={setup} total={total} onPaid={onPaid} />
    </Elements>
  )
}

function ClientPaymentForm({
  setup,
  companyId,
  slug,
  total,
  onPaid,
}: {
  setup: PaymentSetup
  companyId: string
  slug: string
  total: number
  onPaid: () => void
}) {
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
    <form onSubmit={submitPayment} className="mt-5 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">Checkout</p>
          <p className="mt-1 text-xl font-black text-neutral-950">{formatMoney(total)}</p>
        </div>
        <p className="text-right text-[11px] font-bold leading-snug text-neutral-500">Card payment</p>
      </div>
      <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
      {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-5 w-full rounded-full bg-neutral-950 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition disabled:opacity-45"
      >
        {loading ? "Processing..." : `Pay ${formatMoney(total)}`}
      </button>
    </form>
  )
}

export default function ShopClient({
  companyId,
  companyName,
  slug,
  primary,
  categories,
  paymentsReady,
}: {
  companyId: string
  companyName: string
  slug: string
  primary: string
  categories: MenuCategory[]
  paymentsReady: boolean
}) {
  const items = useMemo(() => {
    const rows: ProductItem[] = []
    categories.forEach((cat, catIndex) => {
      cat.items.forEach((item, itemIndex) => {
        const unitAmount = parsePriceCents(item.price)
        if (!unitAmount) return
        rows.push({
          key: `${catIndex}:${itemIndex}`,
          catIndex,
          itemIndex,
          name: item.name,
          description: item.description,
          photo_url: item.photo_url,
          priceLabel: item.price || formatMoney(unitAmount),
          unitAmount,
        })
      })
    })
    return rows
  }, [categories])

  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [fulfillment, setFulfillment] = useState<"pickup" | "shipping">("pickup")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)
  const [paid, setPaid] = useState(false)
  const orderPanelRef = useRef<HTMLElement | null>(null)

  const cartItems = Object.values(cart)
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const shippingReady = fulfillment === "pickup" || address.trim().length > 5
  const canCheckout = paymentsReady && itemCount > 0 && name.trim() && phone.trim() && email.trim() && shippingReady

  function setQuantity(item: ProductItem, nextQuantity: number) {
    setPaymentSetup(null)
    setPaid(false)
    setCart((current) => {
      const next = { ...current }
      if (nextQuantity <= 0) delete next[item.key]
      else next[item.key] = { ...item, quantity: Math.min(nextQuantity, 20) }
      return next
    })
  }

  async function startPayment() {
    if (!canCheckout) return
    setLoading(true)
    setError(null)
    setPaymentSetup(null)
    try {
      const res = await fetch("/api/shopping-cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          slug,
          customer: { name, phone, email, fulfillment, address, notes },
          items: cartItems.map((item) => ({ catIndex: item.catIndex, itemIndex: item.itemIndex, quantity: item.quantity })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret || !data.paymentIntentId || !data.leadId || !data.stripeAccountId) {
        throw new Error(data.error || "Unable to prepare payment.")
      }
      setPaymentSetup(data as PaymentSetup)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to prepare payment.")
    } finally {
      setLoading(false)
    }
  }

  function handlePaid() {
    setPaid(true)
    setPaymentSetup(null)
    setCart({})
    window.setTimeout(() => orderPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pb-9 pt-12" style={{ backgroundColor: SHOP_BLACK }}>
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Shop Online</p>
          <h1 className="mb-4 text-4xl font-black leading-none text-white md:text-6xl">Shop {companyName}</h1>
          <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
            Buy products by card and send the order straight to the business.
          </p>
        </div>
      </section>

      {!paymentsReady && (
        <section className="bg-amber-50 px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-sm font-bold leading-relaxed text-amber-950">
              Online payments are almost ready. This business still needs its payout account connected before customers can place paid orders.
            </p>
          </div>
        </section>
      )}

      <main className="mx-auto grid max-w-5xl items-start gap-8 px-6 py-10 lg:grid-cols-[1fr_360px]">
        <section>
          {items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="mb-3 text-2xl font-black text-neutral-950">No products yet.</p>
              <p className="text-base text-neutral-600">Add priced products before the shop can accept orders.</p>
            </div>
          ) : (
            categories.map((cat, catIndex) => {
              const categoryItems = items.filter((item) => item.catIndex === catIndex)
              if (categoryItems.length === 0) return null
              return (
                <div key={cat.category} className={catIndex > 0 ? "mt-12" : ""}>
                  <h2 className="mb-5 text-2xl font-black text-neutral-950">{cat.category}</h2>
                  <div className="flex flex-col gap-3">
                    {categoryItems.map((item) => {
                      const quantity = cart[item.key]?.quantity ?? 0
                      return (
                        <div key={item.key} className="flex gap-4 rounded-lg border border-neutral-200 p-4">
                          {item.photo_url && <img src={item.photo_url} alt={item.name} className="h-20 w-20 shrink-0 rounded-lg object-cover" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-black leading-tight text-neutral-950">{item.name}</h3>
                                {item.description && <p className="mt-1 text-sm leading-relaxed text-neutral-600">{item.description}</p>}
                              </div>
                              <p className="shrink-0 font-black" style={{ color: primary }}>{item.priceLabel}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-3">
                              <button type="button" onClick={() => setQuantity(item, quantity - 1)} disabled={quantity === 0} className="h-9 w-9 rounded-full border border-neutral-200 font-black text-neutral-950 disabled:opacity-30" aria-label={`Remove ${item.name}`}>-</button>
                              <span className="w-6 text-center font-black text-neutral-950">{quantity}</span>
                              <button type="button" onClick={() => setQuantity(item, quantity + 1)} className="h-9 w-9 rounded-full font-black text-white" style={{ backgroundColor: primary }} aria-label={`Add ${item.name}`}>+</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </section>

        <aside ref={orderPanelRef} className="rounded-lg border border-neutral-200 p-5 lg:sticky lg:top-6">
          <h2 className="mb-4 text-xl font-black text-neutral-950">Your cart</h2>
          {paid ? (
            <div className="rounded-lg border p-5" style={{ borderColor: `${primary}33`, backgroundColor: "#F8FAF9" }}>
              <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primary }}>Order paid</p>
              <p className="mt-3 text-lg font-black leading-tight text-neutral-950">Your order was sent to {companyName}.</p>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">A confirmation email is on the way to {email}.</p>
            </div>
          ) : (
            <>
              {cartItems.length === 0 ? (
                <p className="mb-6 text-sm text-neutral-600">Add products to start.</p>
              ) : (
                <div className="mb-5 flex flex-col gap-3">
                  {cartItems.map((item) => (
                    <div key={item.key} className="flex justify-between gap-3 text-sm">
                      <span className="text-neutral-700">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-neutral-950">{formatMoney(item.unitAmount * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="mt-2 flex justify-between border-t border-neutral-200 pt-4">
                    <span className="font-black text-neutral-950">Subtotal</span>
                    <span className="font-black text-neutral-950">{formatMoney(subtotal)}</span>
                  </div>
                </div>
              )}

              {cartItems.length > 0 && (
                <>
                  <div className="flex flex-col gap-4">
                    <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                    <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" type="email" className="w-full rounded-lg border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                    <div>
                      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Delivery</span>
                      <div className="grid grid-cols-2 gap-2">
                        {(["pickup", "shipping"] as const).map((option) => (
                          <button key={option} type="button" onClick={() => { setFulfillment(option); setPaymentSetup(null) }} className="rounded-lg border px-3 py-3 text-sm font-black capitalize" style={{ borderColor: fulfillment === option ? primary : "#e5e5e5", color: fulfillment === option ? primary : "#555", backgroundColor: fulfillment === option ? `${primary}12` : "white" }}>{option}</button>
                        ))}
                      </div>
                    </div>
                    {fulfillment === "shipping" && <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Shipping address</span><textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>}
                    <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-lg border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                  </div>

                  {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}

                  {!paymentSetup ? (
                    <button type="button" disabled={!canCheckout || loading} onClick={startPayment} className="mt-5 w-full rounded-full py-4 text-base font-black text-white disabled:opacity-40" style={{ backgroundColor: primary }}>
                      {!paymentsReady ? "Payment setup needed" : loading ? "Preparing payment..." : `Continue to payment ${subtotal > 0 ? formatMoney(subtotal) : ""}`}
                    </button>
                  ) : (
                    <ClientPaymentElement setup={paymentSetup} companyId={companyId} slug={slug} total={subtotal} primary={primary} onPaid={handlePaid} />
                  )}
                </>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
