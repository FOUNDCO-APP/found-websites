"use client"

import { useEffect, useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import type { StripeElementsOptions } from "@stripe/stripe-js"
import type { MenuCategory } from "@/types/company"

type ProductDetail = { label: string; value: string }
type ProductOption = { label: string; choices: string[] }
type ProductVariant = { id: string; options: Record<string, string>; stock: number | null }
type CartItem = {
  key: string
  catIndex: number
  itemIndex: number
  name: string
  description?: string | null
  photo_url?: string | null
  images?: string[] | null
  details?: ProductDetail[] | null
  options?: ProductOption[] | null
  selectedOptions?: Record<string, string> | null
  variantId?: string | null
  variants?: ProductVariant[] | null
  inventory_tracking?: boolean | null
  availability?: "active" | "hidden" | "sold_out" | null
  sizes?: string | null
  materials?: string | null
  shipping_note?: string | null
  priceLabel: string
  unitAmount: number
  quantity: number
}

type ProductItem = Omit<CartItem, "quantity" | "selectedOptions">

type PaymentSetup = {
  clientSecret: string
  paymentIntentId: string
  leadId: string
  stripeAccountId: string
}

type ShippingAddress = {
  line1: string
  line2: string
  city: string
  region: string
  postalCode: string
  country: string
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

function emptyShippingAddress(): ShippingAddress {
  return { line1: "", line2: "", city: "", region: "", postalCode: "", country: "United States" }
}

function formatShippingAddress(address: ShippingAddress) {
  const cityLine = [address.city.trim(), address.region.trim(), address.postalCode.trim()].filter(Boolean).join(", ").replace(/, ([^,]*)$/, " $1")
  return [address.line1.trim(), address.line2.trim(), cityLine, address.country.trim()].filter(Boolean).join("\n")
}

function productImages(item: Pick<ProductItem, "photo_url" | "images">) {
  return Array.from(new Set([item.photo_url || "", ...(item.images ?? [])].filter(Boolean))).slice(0, 6)
}

function normalizeProductOptions(options: ProductOption[] | null | undefined) {
  const map = new Map<string, { label: string; choices: string[] }>()
  for (const option of options ?? []) {
    const label = String(option.label || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, char => char.toUpperCase())
    if (!label) continue
    const key = label.toLowerCase()
    const current = map.get(key) ?? { label, choices: [] }
    for (const choice of option.choices ?? []) {
      const clean = String(choice || "").trim().replace(/\s+/g, " ")
      if (clean && !current.choices.some(existing => existing.toLowerCase() === clean.toLowerCase())) current.choices.push(clean)
    }
    map.set(key, current)
  }
  return Array.from(map.values()).filter(option => option.choices.length).slice(0, 4)
}
function selectedOptionPairs(item: ProductItem, selectedOptions: Record<string, string>) {
  return normalizeProductOptions(item.options)
    .map((option) => ({ label: option.label, value: selectedOptions[option.label]?.trim() || "" }))
    .filter((option) => option.value)
}

function selectedOptionLabel(selectedOptions: Record<string, string> | null | undefined) {
  const entries = Object.entries(selectedOptions ?? {}).filter(([, value]) => value)
  return entries.map(([label, value]) => `${label}: ${value}`).join(" - ")
}

function cartKeyFor(item: ProductItem, selectedOptions: Record<string, string> = {}) {
  const optionKey = selectedOptionPairs(item, selectedOptions)
    .map((option) => `${option.label}:${option.value}`)
    .join("|")
  return optionKey ? `${item.key}::${optionKey}` : item.key
}

function variantId(options: Record<string, string>) {
  return Object.entries(options).map(([label, value]) => `${label}:${value}`).join("|")
}

function selectedVariant(item: ProductItem, selectedOptions: Record<string, string>) {
  const cleanOptions = Object.fromEntries(selectedOptionPairs(item, selectedOptions).map((option) => [option.label, option.value]))
  const id = variantId(cleanOptions)
  return (item.variants ?? []).find((variant) => variant.id === id || variantId(variant.options) === id) ?? null
}

function variantStock(item: ProductItem, selectedOptions: Record<string, string>) {
  if (!item.inventory_tracking) return null
  const variant = selectedVariant(item, selectedOptions)
  return variant?.stock ?? null
}
function choiceSoldOut(item: ProductItem, optionLabel: string, choice: string, selectedOptions: Record<string, string>) {
  if (!item.inventory_tracking || !(item.variants ?? []).length) return false
  const candidates = (item.variants ?? []).filter((variant) => {
    if (variant.options?.[optionLabel] !== choice) return false
    return Object.entries(selectedOptions).every(([label, value]) => {
      if (!value || label === optionLabel) return true
      return variant.options?.[label] === value
    })
  })
  if (!candidates.length) return false
  return candidates.every((variant) => variant.stock === 0)
}
function ClientPaymentElement({ setup, companyId, slug, total, primary, onPaid }: { setup: PaymentSetup; companyId: string; slug: string; total: number; primary: string; onPaid: () => void }) {
  const stripePromise = useMemo(() => loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, { stripeAccount: setup.stripeAccountId }), [setup.stripeAccountId])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret, appearance: paymentAppearance(primary) }}>
      <ClientPaymentForm companyId={companyId} slug={slug} setup={setup} total={total} onPaid={onPaid} />
    </Elements>
  )
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

export default function ShopClient({ companyId, companyName, slug, primary, categories, paymentsReady }: { companyId: string; companyName: string; slug: string; primary: string; categories: MenuCategory[]; paymentsReady: boolean }) {
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
          images: item.images,
          details: item.details,
          options: normalizeProductOptions(item.options),
          variants: item.variants ?? null,
          inventory_tracking: Boolean(item.inventory_tracking),
          availability: item.availability ?? "active",
          sizes: item.sizes,
          materials: item.materials,
          shipping_note: item.shipping_note,
          priceLabel: item.price || formatMoney(unitAmount),
          unitAmount,
        })
      })
    })
    return rows
  }, [categories])

  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [fulfillment, setFulfillment] = useState<"pickup" | "shipping">("pickup")
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>(() => emptyShippingAddress())
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSetup, setPaymentSetup] = useState<PaymentSetup | null>(null)
  const [paid, setPaid] = useState(false)

  const cartItems = Object.values(cart)
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const shippingReady = fulfillment === "pickup" || Boolean(shippingAddress.line1.trim() && shippingAddress.city.trim() && shippingAddress.region.trim() && shippingAddress.postalCode.trim())
  const shopReady = paymentsReady && items.length > 0
  const canCheckout = shopReady && itemCount > 0 && name.trim() && phone.trim() && email.trim() && shippingReady
  const checkoutActionLabel = loading
    ? "Preparing payment..."
    : !shopReady
      ? "Shop coming soon"
      : !name.trim()
        ? "Add your name"
        : !phone.trim()
          ? "Add your phone"
          : !email.trim()
            ? "Add your email"
            : !shippingReady
              ? "Add shipping address"
              : `Continue to payment ${subtotal > 0 ? formatMoney(subtotal) : ""}`
  const selectedProductOptions = selectedProduct ? normalizeProductOptions(selectedProduct.options) : []
  const missingSelectedOption = selectedProductOptions.find((option) => !selectedOptions[option.label])
  const selectedProductCartKey = selectedProduct ? cartKeyFor(selectedProduct, selectedOptions) : ""
  const selectedProductQuantity = selectedProductCartKey ? cart[selectedProductCartKey]?.quantity ?? 0 : 0
  const selectedProductStock = selectedProduct ? variantStock(selectedProduct, selectedOptions) : null
  const selectedProductSoldOut = selectedProduct?.inventory_tracking && selectedProductStock === 0
  const selectedProductAtLimit = selectedProduct?.inventory_tracking && selectedProductStock !== null && selectedProductQuantity >= selectedProductStock

  function updateShippingAddress(field: keyof ShippingAddress, value: string) {
    setPaymentSetup(null)
    setShippingAddress((current) => ({ ...current, [field]: value }))
  }

  function productQuantity(item: ProductItem) {
    return cartItems
      .filter((cartItem) => cartItem.catIndex === item.catIndex && cartItem.itemIndex === item.itemIndex)
      .reduce((sum, cartItem) => sum + cartItem.quantity, 0)
  }

  function setQuantity(item: ProductItem, nextQuantity: number, options: Record<string, string> = {}) {
    setPaymentSetup(null)
    setPaid(false)
    const key = cartKeyFor(item, options)
    const cleanOptions = Object.fromEntries(selectedOptionPairs(item, options).map((option) => [option.label, option.value]))
    const variant = selectedVariant(item, cleanOptions)
    const stock = item.inventory_tracking ? variant?.stock ?? null : null
    const cappedQuantity = stock === null ? Math.min(nextQuantity, 20) : Math.min(nextQuantity, stock)
    setCart((current) => {
      const next = { ...current }
      if (cappedQuantity <= 0) delete next[key]
      else next[key] = { ...item, key, selectedOptions: Object.keys(cleanOptions).length ? cleanOptions : null, variantId: variant?.id ?? null, quantity: cappedQuantity }
      return next
    })
  }
  function openProduct(item: ProductItem) {
    const images = productImages(item)
    const defaultOptions = Object.fromEntries(normalizeProductOptions(item.options).map((option) => [option.label, ""]))
    setSelectedImage(images[0] ?? null)
    setSelectedOptions(defaultOptions)
    setSelectedProduct(item)
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
          customer: { name, phone, email, fulfillment, shippingAddress, address: formatShippingAddress(shippingAddress), notes },
          items: cartItems.map((item) => ({ catIndex: item.catIndex, itemIndex: item.itemIndex, quantity: item.quantity, selectedOptions: item.selectedOptions ?? null, variantId: item.variantId ?? null })),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.clientSecret || !data.paymentIntentId || !data.leadId || !data.stripeAccountId) throw new Error(data.error || "Unable to prepare payment.")
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
    setCheckoutOpen(true)
  }

  function closeCheckout() {
    if (loading) return
    setCheckoutOpen(false)
    setPaid(false)
  }

  useEffect(() => {
    if (!checkoutOpen && !paid && !selectedProduct) return
    const scrollY = window.scrollY
    const root = document.documentElement
    const previous = {
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyWidth: document.body.style.width,
      bodyOverflow: document.body.style.overflow,
      bodyOverscroll: document.body.style.overscrollBehavior,
      htmlOverflow: root.style.overflow,
      htmlOverflowX: root.style.overflowX,
      htmlOverscroll: root.style.overscrollBehavior,
    }

    // Keeps the checkout sheet's max-height tied to the real visible
    // viewport (var(--found-visual-height), consumed below), not a static
    // CSS unit that never shrinks for the on-screen keyboard - this is the
    // same pattern SiteEditor/CatalogManager use for their own sheets.
    const updateVisualHeight = () => {
      root.style.setProperty("--found-visual-height", `${window.visualViewport?.height ?? window.innerHeight}px`)
    }

    updateVisualHeight()
    root.style.overflow = "hidden"
    root.style.overflowX = "hidden"
    root.style.overscrollBehavior = "none"
    document.body.style.position = "fixed"
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = "100%"
    document.body.style.overflow = "hidden"
    document.body.style.overscrollBehavior = "none"
    window.visualViewport?.addEventListener("resize", updateVisualHeight)
    window.visualViewport?.addEventListener("scroll", updateVisualHeight)

    return () => {
      root.style.overflow = previous.htmlOverflow
      root.style.overflowX = previous.htmlOverflowX
      root.style.overscrollBehavior = previous.htmlOverscroll
      document.body.style.position = previous.bodyPosition
      document.body.style.top = previous.bodyTop
      document.body.style.width = previous.bodyWidth
      document.body.style.overflow = previous.bodyOverflow
      document.body.style.overscrollBehavior = previous.bodyOverscroll
      root.style.removeProperty("--found-visual-height")
      window.visualViewport?.removeEventListener("resize", updateVisualHeight)
      window.visualViewport?.removeEventListener("scroll", updateVisualHeight)
      window.scrollTo(0, scrollY)
    }
  }, [checkoutOpen, paid, selectedProduct])

  if (!shopReady) {
    return (
      <div className="min-h-screen bg-white">
        <section className="px-6 pb-9 pt-12" style={{ backgroundColor: SHOP_BLACK }}>
          <div className="mx-auto max-w-5xl">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Shop</p>
            <h1 className="mb-4 text-4xl font-black leading-none text-white md:text-6xl">Shop {companyName}</h1>
            <p className="max-w-xl text-base leading-relaxed text-white/70 md:text-lg">Online shopping is coming soon. Reach out directly and the team will help with availability, sizing, and orders.</p>
          </div>
        </section>

        <main className="mx-auto max-w-5xl px-6 py-16">
          <section className="rounded-[28px] border border-neutral-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>Coming soon</p>
            <h2 className="mx-auto max-w-xl text-3xl font-black leading-tight text-neutral-950 md:text-4xl">Online shopping is almost ready.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-neutral-600">{companyName} is getting the shop ready. Contact the business directly and they will help with what is available now.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a href={`/${slug}/contact`} className="rounded-full px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white" style={{ backgroundColor: primary }}>Contact us</a>
              <a href={`/${slug}/services`} className="rounded-full border border-neutral-200 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-neutral-950">See what we offer</a>
            </div>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="px-6 pb-10 pt-12" style={{ backgroundColor: SHOP_BLACK }}>
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Shop Online</p>
          <h1 className="mb-4 text-5xl font-black leading-none text-white md:text-7xl">Shop {companyName}</h1>
          <p className="max-w-xl text-lg leading-relaxed text-white/72">Choose what you want. {companyName} will receive the order and help with the next step.</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-10 pb-32">
        <section>
          {categories.map((cat, catIndex) => {
            const categoryItems = items.filter((item) => item.catIndex === catIndex)
            if (categoryItems.length === 0) return null
            return (
              <div key={cat.category} className={catIndex > 0 ? "mt-14" : ""}>
                <h2 className="mb-5 text-3xl font-black text-neutral-950">{cat.category}</h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {categoryItems.map((item) => {
                    const quantity = productQuantity(item)
                    const hasOptions = normalizeProductOptions(item.options).length > 0
                    const images = productImages(item)
                    return (
                      <article key={item.key} className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.07)]">
                        <button type="button" onClick={() => openProduct(item)} className="block w-full text-left">
                          <div className="relative aspect-[4/3] bg-neutral-100">
                            {images[0] ? <img src={images[0]} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-[0.18em] text-neutral-400">Product</div>}
                            <div className="absolute bottom-3 right-3 rounded-full bg-white/92 px-3 py-2 text-sm font-black text-neutral-950 shadow-lg">{formatMoney(item.unitAmount)}</div>
                          </div>
                          <div className="p-5">
                            <h3 className="text-2xl font-black leading-tight text-neutral-950">{item.name}</h3>
                            {item.description && <p className="mt-2 line-clamp-2 text-base leading-relaxed text-neutral-600">{item.description}</p>}
                            <p className="mt-4 text-xs font-black uppercase tracking-[0.16em]" style={{ color: primary }}>View details</p>
                          </div>
                        </button>
                        <div className="flex items-center justify-between border-t border-neutral-100 p-4">
                          <span className="text-sm font-bold text-neutral-500">{quantity ? `${quantity} in cart` : "Ready to add"}</span>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => { const firstMatch = cartItems.find((cartItem) => cartItem.catIndex === item.catIndex && cartItem.itemIndex === item.itemIndex); if (firstMatch) setQuantity(item, firstMatch.quantity - 1, firstMatch.selectedOptions ?? {}) }} disabled={quantity === 0} className="h-10 w-10 rounded-full border border-neutral-200 font-black text-neutral-950 disabled:opacity-30" aria-label={`Remove ${item.name}`}>-</button>
                            <button type="button" onClick={() => hasOptions ? openProduct(item) : setQuantity(item, quantity + 1)} className="h-10 w-10 rounded-full font-black text-white" style={{ backgroundColor: primary }} aria-label={`Add ${item.name}`}>+</button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </section>

      </main>

      {cartItems.length > 0 && !paid && !checkoutOpen && (
        <div className="fixed inset-x-4 bottom-[calc(18px+env(safe-area-inset-bottom))] z-[70] rounded-[26px] border border-neutral-200 bg-white/95 px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-neutral-950">{itemCount} {itemCount === 1 ? "item" : "items"} ready</p>
              <p className="mt-0.5 truncate text-xs font-bold text-neutral-500">{formatMoney(subtotal)} total</p>
            </div>
            <button type="button" onClick={() => setCheckoutOpen(true)} className="rounded-full px-6 py-3 text-sm font-black text-white" style={{ backgroundColor: primary }}>Checkout</button>
          </div>
        </div>
      )}

      {cartItems.length > 0 && !paid && !checkoutOpen && (
        <div className="fixed bottom-6 left-1/2 z-40 hidden w-[min(720px,calc(100%-48px))] -translate-x-1/2 rounded-full border border-neutral-200 bg-white/95 p-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur md:block">
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1 px-3">
              <p className="text-sm font-black text-neutral-950">{itemCount} {itemCount === 1 ? "item" : "items"} ready</p>
              <p className="truncate text-xs font-bold text-neutral-500">{formatMoney(subtotal)} total</p>
            </div>
            <button type="button" onClick={() => setCheckoutOpen(true)} className="rounded-full px-7 py-3 text-sm font-black text-white" style={{ backgroundColor: primary }}>Checkout</button>
          </div>
        </div>
      )}

      {(checkoutOpen || paid) && (
        <div className="fixed inset-0 z-[90] flex w-[100svw] touch-pan-y items-end overflow-hidden bg-black/55 pt-[calc(28px+env(safe-area-inset-top))] backdrop-blur-sm" onClick={closeCheckout}>
          <section
            className="box-border w-full max-w-[100svw] overscroll-contain overflow-x-hidden overflow-y-auto rounded-t-[34px] bg-white px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-7 shadow-2xl md:mx-auto md:mb-8 md:max-w-xl md:rounded-[34px]"
            style={{ maxHeight: "calc(var(--found-visual-height, 100svh) - 88px)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-200" />
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primary }}>Checkout</p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-neutral-950">Your cart</h2>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-neutral-500">{companyName} will receive this order directly.</p>
              </div>
              <button type="button" onClick={closeCheckout} className="h-10 w-10 rounded-full border border-neutral-200 text-xl font-black text-neutral-500" aria-label="Close checkout">x</button>
            </div>

            {paid ? (
              <div className="rounded-[22px] border p-5" style={{ borderColor: `${primary}33`, backgroundColor: "#F8FAF9" }}>
                <p className="text-xs font-black uppercase tracking-[0.18em]" style={{ color: primary }}>Order paid</p>
                <p className="mt-3 text-lg font-black leading-tight text-neutral-950">Your order was sent to {companyName}.</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">A confirmation email is on the way to {email}.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-3">
                  {cartItems.map((item) => <div key={item.key} className="flex justify-between gap-3 text-sm"><span className="text-neutral-700"><span>{item.quantity}x {item.name}</span>{selectedOptionLabel(item.selectedOptions) && <span className="mt-1 block text-xs font-bold text-neutral-500">{selectedOptionLabel(item.selectedOptions)}</span>}</span><span className="font-bold text-neutral-950">{formatMoney(item.unitAmount * item.quantity)}</span></div>)}
                  <div className="mt-2 flex justify-between border-t border-neutral-200 pt-4"><span className="font-black text-neutral-950">Subtotal</span><span className="font-black text-neutral-950">{formatMoney(subtotal)}</span></div>
                </div>

                <div className="flex flex-col gap-4">
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Name</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="w-full rounded-[16px] border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Phone</span><input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" className="w-full rounded-[16px] border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Email</span><input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" type="email" className="w-full rounded-[16px] border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                  <div><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Delivery</span><div className="grid grid-cols-2 gap-2">{(["pickup", "shipping"] as const).map((option) => <button key={option} type="button" onClick={() => { setFulfillment(option); setPaymentSetup(null) }} className="rounded-[16px] border px-3 py-3 text-sm font-black capitalize" style={{ borderColor: fulfillment === option ? primary : "#e5e5e5", color: fulfillment === option ? primary : "#555", backgroundColor: fulfillment === option ? `${primary}12` : "white" }}>{option}</button>)}</div></div>
                  {fulfillment === "shipping" && (
                    <div className="rounded-[20px] border border-neutral-200 bg-neutral-50 p-3">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Shipping address</p>
                      <div className="grid gap-3">
                        <input
                          value={shippingAddress.line1}
                          onChange={(e) => updateShippingAddress("line1", e.target.value)}
                          autoComplete="shipping address-line1"
                          name="shipping-address-line1"
                          placeholder="Street address"
                          className="w-full rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950"
                        />
                        <input
                          value={shippingAddress.line2}
                          onChange={(e) => updateShippingAddress("line2", e.target.value)}
                          autoComplete="shipping address-line2"
                          name="shipping-address-line2"
                          placeholder="Apt, suite, unit"
                          className="w-full rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950"
                        />
                        <div className="grid grid-cols-[1fr_92px] gap-3">
                          <input
                            value={shippingAddress.city}
                            onChange={(e) => updateShippingAddress("city", e.target.value)}
                            autoComplete="shipping address-level2"
                            name="shipping-address-level2"
                            placeholder="City"
                            className="w-full min-w-0 rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950"
                          />
                          <input
                            value={shippingAddress.region}
                            onChange={(e) => updateShippingAddress("region", e.target.value.toUpperCase().slice(0, 2))}
                            autoComplete="shipping address-level1"
                            name="shipping-address-level1"
                            placeholder="State"
                            className="w-full min-w-0 rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base uppercase text-neutral-950"
                          />
                        </div>
                        <div className="grid grid-cols-[1fr_1.15fr] gap-3">
                          <input
                            value={shippingAddress.postalCode}
                            onChange={(e) => updateShippingAddress("postalCode", e.target.value)}
                            autoComplete="shipping postal-code"
                            name="shipping-postal-code"
                            inputMode="numeric"
                            placeholder="ZIP code"
                            className="w-full min-w-0 rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950"
                          />
                          <input
                            value={shippingAddress.country}
                            onChange={(e) => updateShippingAddress("country", e.target.value)}
                            autoComplete="shipping country-name"
                            name="shipping-country-name"
                            placeholder="Country"
                            className="w-full min-w-0 rounded-[16px] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-950"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-neutral-500">Notes</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-none rounded-[16px] border border-neutral-200 px-4 py-3 text-base text-neutral-950" /></label>
                </div>

                {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}

                {!paymentSetup ? (
                  <button type="button" disabled={!canCheckout || loading} onClick={startPayment} className="mt-5 w-full rounded-full py-4 text-base font-black text-white transition disabled:cursor-not-allowed" style={{ backgroundColor: canCheckout && !loading ? primary : "#D8E3F2", color: canCheckout && !loading ? "#fff" : "#5D718C" }}>{checkoutActionLabel}</button>
                ) : <ClientPaymentElement setup={paymentSetup} companyId={companyId} slug={slug} total={subtotal} primary={primary} onPaid={handlePaid} />}
              </>
            )}
          </section>
        </div>
      )}


      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex w-[100svw] items-end overflow-hidden bg-black/60 backdrop-blur-sm md:items-center md:justify-center" onClick={() => setSelectedProduct(null)}>
          <section className="box-border max-h-[88svh] w-full max-w-[100svw] overscroll-contain overflow-x-hidden overflow-y-auto rounded-t-[34px] bg-white shadow-2xl md:max-w-3xl md:rounded-[34px]" onClick={(event) => event.stopPropagation()}>
            <div className="grid md:grid-cols-[1.05fr_0.95fr]">
              <div className="bg-neutral-100 p-4">
                <div className="aspect-square overflow-hidden rounded-[26px] bg-neutral-200">
                  {selectedImage ? <img src={selectedImage} alt={selectedProduct.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-black uppercase tracking-[0.18em] text-neutral-400">Product</div>}
                </div>
                {productImages(selectedProduct).length > 1 && <div className="mt-3 grid grid-cols-5 gap-2">{productImages(selectedProduct).map((image) => <button key={image} onClick={() => setSelectedImage(image)} className="aspect-square overflow-hidden rounded-xl border" style={{ borderColor: selectedImage === image ? primary : "#e5e5e5" }}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}
              </div>
              <div className="p-6 md:p-7">
                <button onClick={() => setSelectedProduct(null)} className="mb-6 rounded-full border border-neutral-200 px-4 py-2 text-sm font-black text-neutral-700">Close</button>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]" style={{ color: primary }}>Product</p>
                <h2 className="text-4xl font-black leading-none text-neutral-950">{selectedProduct.name}</h2>
                <p className="mt-4 text-2xl font-black" style={{ color: primary }}>{formatMoney(selectedProduct.unitAmount)}</p>
                {selectedProduct.description && <p className="mt-5 text-lg leading-relaxed text-neutral-600">{selectedProduct.description}</p>}
                {selectedProductOptions.length > 0 && (
                  <div className="mt-6 grid gap-4 rounded-[22px] border border-neutral-200 bg-neutral-50 p-4">
                    {selectedProductOptions.map((option) => (
                      <div key={option.label}>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-neutral-500">Choose {option.label}</p>
                        <div className="flex flex-wrap gap-2">
                          {option.choices.map((choice) => {
                            const active = selectedOptions[option.label] === choice
                            const soldOut = choiceSoldOut(selectedProduct, option.label, choice, selectedOptions)
                            return <button key={choice} type="button" disabled={soldOut} aria-label={soldOut ? `${choice} sold out` : choice} onClick={() => setSelectedOptions((current) => ({ ...current, [option.label]: choice }))} className="rounded-full border px-4 py-2 text-sm font-black transition disabled:cursor-not-allowed" style={{ borderColor: soldOut ? "#d4d4d4" : active ? primary : "#e5e5e5", backgroundColor: soldOut ? "#f1f1f1" : active ? primary : "white", color: soldOut ? "#8a8a8a" : active ? "white" : "#111", textDecoration: soldOut ? "line-through" : "none", opacity: soldOut ? 0.72 : 1 }}>{choice}{soldOut ? <span className="ml-1 text-[10px] uppercase tracking-[0.12em]">Out</span> : null}</button>
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 grid gap-3">
                  {selectedProduct.sizes && <DetailRow label="Sizes" value={selectedProduct.sizes} />}
                  {selectedProduct.materials && <DetailRow label="Material" value={selectedProduct.materials} />}
                  {selectedProduct.shipping_note && <DetailRow label="Pickup and shipping" value={selectedProduct.shipping_note} />}
                  {selectedProduct.details?.map((detail) => <DetailRow key={`${detail.label}-${detail.value}`} label={detail.label} value={detail.value} />)}
                </div>
                <button onClick={() => { if (missingSelectedOption) return; setQuantity(selectedProduct, selectedProductQuantity + 1, selectedOptions); setSelectedProduct(null) }} disabled={Boolean(missingSelectedOption) || Boolean(selectedProductSoldOut) || Boolean(selectedProductAtLimit)} className="mt-7 w-full rounded-full py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-45" style={{ backgroundColor: primary }}>{missingSelectedOption ? `Choose ${missingSelectedOption.label}` : selectedProductSoldOut ? "Sold out" : selectedProductAtLimit ? "All available added" : "Add to cart"}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[18px] bg-neutral-50 p-4"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-500">{label}</p><p className="mt-1 text-sm leading-relaxed text-neutral-700">{value}</p></div>
}
