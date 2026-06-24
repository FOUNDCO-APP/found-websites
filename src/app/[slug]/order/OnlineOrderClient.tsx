"use client"

import { useMemo, useState } from "react"
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

type OrderableItem = Omit<CartItem, "quantity">

type PaymentSetup = {
  clientSecret: string
  paymentIntentId: string
  leadId: string
  stripeAccountId: string
}

const FOUND_BLACK = "#0D0F0E"
const SIGNAL_GREEN = "#32D074"

const paymentAppearance: StripeElementsOptions["appearance"] = {
  theme: "night",
  variables: {
    colorPrimary: SIGNAL_GREEN,
    colorBackground: "#151716",
    colorText: "#ffffff",
    colorDanger: "#F43F5E",
    colorTextSecondary: "rgba(255,255,255,0.52)",
    colorTextPlaceholder: "rgba(255,255,255,0.28)",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSizeBase: "15px",
    borderRadius: "12px",
  },
  rules: {
    ".Input": {
      backgroundColor: "#101211",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "none",
      padding: "14px 16px",
    },
    ".Input:focus": {
      border: `1px solid ${SIGNAL_GREEN}`,
      boxShadow: `0 0 0 1px ${SIGNAL_GREEN}26`,
    },
    ".Label": {
      color: "rgba(255,255,255,0.52)",
      fontSize: "11px",
      fontWeight: "800",
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      marginBottom: "8px",
    },
    ".Error": { color: "#F43F5E", fontSize: "12px" },
    ".Tab": {
      backgroundColor: "#101211",
      border: "1px solid rgba(255,255,255,0.1)",
    },
    ".Tab--selected": {
      borderColor: SIGNAL_GREEN,
      boxShadow: `0 0 0 1px ${SIGNAL_GREEN}33`,
    },
  },
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

function pickupTimeOptions() {
  const options: { value: string; label: string }[] = []
  for (let hour = 10; hour <= 21; hour++) {
    for (const minute of [0, 15, 30, 45]) {
      if (hour === 21 && minute > 0) continue
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
      const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? "PM" : "AM"
      options.push({ value, label: `${hour12}:${String(minute).padStart(2, "0")} ${ampm}` })
    }
  }
  return options
}

function FoundPaymentElement({
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
    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: paymentAppearance }}>
      <FoundPaymentForm companyId={companyId} slug={slug} setup={setup} total={total} primary={primary} onPaid={onPaid} />
    </Elements>
  )
}

function FoundPaymentForm({
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
      confirmParams: {
        return_url: `${window.location.origin}/${slug}/order?ordered=1`,
      },
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
      body: JSON.stringify({
        companyId,
        leadId: setup.leadId,
        paymentIntentId: setup.paymentIntentId,
      }),
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
    <form onSubmit={submitPayment} className="mt-5 overflow-hidden" style={{ borderRadius: 16, backgroundColor: FOUND_BLACK }}>
      <div className="px-5 pt-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: SIGNAL_GREEN }}>Found secure checkout</p>
            <p className="mt-1 text-xl font-black text-white">{formatMoney(total)}</p>
          </div>
          <div className="text-right text-[11px] font-bold leading-snug" style={{ color: "rgba(255,255,255,0.42)" }}>
            Card payment<br />powered by Stripe
          </div>
        </div>
        <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
        {error && <p className="mt-4 text-sm font-bold" style={{ color: "#F43F5E" }}>{error}</p>}
      </div>
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-5 w-full py-4 text-sm font-black uppercase tracking-[0.16em] transition disabled:opacity-45"
        style={{ backgroundColor: primary, color: "#fff" }}
      >
        {loading ? "Processing..." : `Pay ${formatMoney(total)}`}
      </button>
    </form>
  )
}

export default function OnlineOrderClient({
  companyId,
  companyName,
  slug,
  primary,
  categories,
  paymentsReady,
  mode = "page",
}: {
  companyId: string
  companyName: string
  slug: string
  primary: string
  categories: MenuCategory[]
  paymentsReady: boolean
  mode?: "page" | "embedded"
}) {
  const items = useMemo(() => {
    const rows: OrderableItem[] = []
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
  const [pickupTime, setPickupTime] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)
  const [paid, setPaid] = useState(false)
  const pickupOptions = useMemo(() => pickupTimeOptions(), [])

  const isEmbedded = mode === "embedded"
  const cartItems = Object.values(cart)
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const canCheckout = paymentsReady && itemCount > 0 && name.trim() && phone.trim() && email.trim()

  function setQuantity(item: OrderableItem, nextQuantity: number) {
    setPaymentSetup(null)
    setPaid(false)
    setCart((current) => {
      const next = { ...current }
      if (nextQuantity <= 0) {
        delete next[item.key]
      } else {
        next[item.key] = { ...item, quantity: Math.min(nextQuantity, 20) }
      }
      return next
    })
  }

  async function startPayment() {
    if (!canCheckout) return
    setLoading(true)
    setError(null)
    setPaymentSetup(null)
    try {
      const res = await fetch("/api/online-order/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          slug,
          customer: { name, phone, email, pickupTime, notes },
          items: cartItems.map((item) => ({
            catIndex: item.catIndex,
            itemIndex: item.itemIndex,
            quantity: item.quantity,
          })),
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
  }

  return (
    <div className={isEmbedded ? "bg-white" : "min-h-screen bg-white"}>
      {!isEmbedded && (
        <section className="px-6 pt-12 pb-8" style={{ backgroundColor: FOUND_BLACK }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-xs font-black tracking-[0.22em] uppercase mb-4" style={{ color: primary }}>
              Order Online
            </p>
            <h1 className="text-4xl md:text-6xl font-black text-white leading-none mb-4">
              Order from {companyName}
            </h1>
            <p className="text-base md:text-lg max-w-xl" style={{ color: "rgba(255,255,255,0.68)" }}>
              Pick what you want, pay securely, and the order goes straight to the business.
            </p>
          </div>
        </section>
      )}

      {!paymentsReady && (
        <section className="px-6 py-8" style={{ backgroundColor: "#FFF7E8" }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-sm font-bold leading-relaxed" style={{ color: "#5C3A00" }}>
              Online payments are almost ready. This business still needs its Stripe payout account connected before customers can place paid orders.
            </p>
          </div>
        </section>
      )}

      <main className={`max-w-5xl mx-auto px-6 ${isEmbedded ? "py-0" : "py-10"} grid lg:grid-cols-[1fr_360px] gap-8 items-start`}>
        <section>
          {items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-2xl font-black mb-3" style={{ color: "#111" }}>No orderable items yet.</p>
              <p className="text-base" style={{ color: "#666" }}>Add prices to menu items before online ordering can accept payment.</p>
            </div>
          ) : (
            categories.map((cat, catIndex) => {
              const categoryItems = items.filter((item) => item.catIndex === catIndex)
              if (categoryItems.length === 0) return null
              return (
                <div key={cat.category} className={catIndex > 0 ? "mt-12" : ""}>
                  <h2 className="text-2xl font-black mb-5" style={{ color: "#111" }}>{cat.category}</h2>
                  <div className="flex flex-col gap-3">
                    {categoryItems.map((item) => {
                      const quantity = cart[item.key]?.quantity ?? 0
                      return (
                        <div key={item.key} className="flex gap-4 p-4 border border-neutral-200" style={{ borderRadius: 8 }}>
                          {item.photo_url && (
                            <img src={item.photo_url} alt={item.name} className="w-20 h-20 object-cover shrink-0" style={{ borderRadius: 8 }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="font-black text-lg leading-tight" style={{ color: "#111" }}>{item.name}</h3>
                                {item.description && <p className="text-sm mt-1 leading-relaxed" style={{ color: "#666" }}>{item.description}</p>}
                              </div>
                              <p className="font-black shrink-0" style={{ color: primary }}>{item.priceLabel}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setQuantity(item, quantity - 1)}
                                disabled={quantity === 0}
                                className="w-9 h-9 border border-neutral-200 font-black disabled:opacity-30"
                                style={{ borderRadius: 999, color: "#111" }}
                                aria-label={`Remove ${item.name}`}
                              >
                                -
                              </button>
                              <span className="w-6 text-center font-black" style={{ color: "#111" }}>{quantity}</span>
                              <button
                                type="button"
                                onClick={() => setQuantity(item, quantity + 1)}
                                className="w-9 h-9 font-black"
                                style={{ borderRadius: 999, backgroundColor: primary, color: "#fff" }}
                                aria-label={`Add ${item.name}`}
                              >
                                +
                              </button>
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

        <aside className="lg:sticky lg:top-6 border border-neutral-200 p-5" style={{ borderRadius: 8 }}>
          <h2 className="text-xl font-black mb-4" style={{ color: "#111" }}>Your order</h2>
          {paid && (
            <div className="mb-5 p-4" style={{ borderRadius: 12, backgroundColor: "#ECFDF3", color: "#05603A" }}>
              <p className="text-sm font-black">Order paid.</p>
              <p className="mt-1 text-sm font-medium">The restaurant has your order.</p>
            </div>
          )}
          {cartItems.length === 0 ? (
            <p className="text-sm mb-6" style={{ color: "#666" }}>Add items from the menu to start.</p>
          ) : (
            <div className="flex flex-col gap-3 mb-5">
              {cartItems.map((item) => (
                <div key={item.key} className="flex justify-between gap-3 text-sm">
                  <span style={{ color: "#333" }}>{item.quantity}x {item.name}</span>
                  <span className="font-bold" style={{ color: "#111" }}>{formatMoney(item.unitAmount * item.quantity)}</span>
                </div>
              ))}
              <div className="pt-4 mt-2 border-t border-neutral-200 flex justify-between">
                <span className="font-black" style={{ color: "#111" }}>Subtotal</span>
                <span className="font-black" style={{ color: "#111" }}>{formatMoney(subtotal)}</span>
              </div>
            </div>
          )}

          {cartItems.length > 0 && (
            <>
              <div className="flex flex-col gap-4">
                <label className="block">
                  <span className="block text-xs font-black uppercase tracking-[0.14em] mb-2" style={{ color: "#555" }}>Name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="w-full px-4 py-3 border border-neutral-200 text-base" style={{ borderRadius: 8, color: "#111" }} />
                </label>
                <label className="block">
                  <span className="block text-xs font-black uppercase tracking-[0.14em] mb-2" style={{ color: "#555" }}>Phone</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className="w-full px-4 py-3 border border-neutral-200 text-base" style={{ borderRadius: 8, color: "#111" }} />
                </label>
                <label className="block">
                  <span className="block text-xs font-black uppercase tracking-[0.14em] mb-2" style={{ color: "#555" }}>Email</span>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" type="email" className="w-full px-4 py-3 border border-neutral-200 text-base" style={{ borderRadius: 8, color: "#111" }} />
                </label>
                <label className="block">
                  <span className="block text-xs font-black uppercase tracking-[0.14em] mb-2" style={{ color: "#555" }}>Pickup time</span>
                  <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full px-4 py-3 border border-neutral-200 text-base bg-white" style={{ borderRadius: 8, color: pickupTime ? "#111" : "#777", appearance: "auto" }}>
                    <option value="">Select pickup time</option>
                    {pickupOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-black uppercase tracking-[0.14em] mb-2" style={{ color: "#555" }}>Notes</span>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-4 py-3 border border-neutral-200 text-base resize-none" style={{ borderRadius: 8, color: "#111" }} />
                </label>
              </div>

              {error && <p className="mt-4 text-sm font-bold" style={{ color: "#B42318" }}>{error}</p>}

              {!paymentSetup ? (
                <button
                  type="button"
                  disabled={!canCheckout || loading}
                  onClick={startPayment}
                  className="w-full mt-5 py-4 font-black text-base disabled:opacity-40"
                  style={{ borderRadius: 999, backgroundColor: primary, color: "#fff" }}
                >
                  {!paymentsReady ? "Payment setup needed" : loading ? "Preparing payment..." : `Continue to payment ${subtotal > 0 ? formatMoney(subtotal) : ""}`}
                </button>
              ) : (
                <FoundPaymentElement setup={paymentSetup} companyId={companyId} slug={slug} total={subtotal} primary={primary} onPaid={handlePaid} />
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  )
}