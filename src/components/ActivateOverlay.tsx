"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup, activateAsComp } from "@/app/activate/activateActions"
import FoundPlanSelector from "@/components/FoundPlanSelector"
import {
  defaultActivationPlan,
  foundPlanDetails,
  normalizeFoundPlan,
  type FoundPlanKey,
} from "@/lib/foundPlans"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
type PromoSummary = {
  code: string
  promotionCodeId: string
  couponId: string
  couponName: string | null
  discountLabel: string
  originalAmount: number
  discountedAmount: number
  currency: string
  duration: string
}

type ActivationPriceSummary = {
  originalAmount: number
  discountedAmount: number
  currency: string
  promo: PromoSummary | null
}

type ActivationSetupResult = {
  clientSecret: string
  companyName: string
  plan: string | null
  price: ActivationPriceSummary | null
  promoError?: string
}

function fallbackPlanSummary(plan?: string | null): ActivationPriceSummary {
  const selectedPlan = foundPlanDetails(plan)
  return {
    originalAmount: selectedPlan.price * 100,
    discountedAmount: selectedPlan.price * 100,
    currency: "usd",
    promo: null,
  }
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function promoDurationLabel(duration?: string) {
  if (duration === "once") return "first invoice"
  if (duration === "repeating") return "promo period"
  if (duration === "forever") return "every invoice"
  return "this subscription"
}

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
  plan,
  priceSummary,
  targetAddonSlug,
  addonLabel,
  addonPrice,
  returnTo = "site",
  onSetupUpdated,
}: {
  slug: string
  companyName: string
  plan?: string | null
  priceSummary: ActivationPriceSummary | null
  targetAddonSlug?: string | null
  addonLabel?: string | null
  addonPrice?: number | null
  returnTo?: "site" | "dashboard"
  onSetupUpdated: (result: ActivationSetupResult) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoDraft, setPromoDraft] = useState(priceSummary?.promo?.code ?? "")
  const [promoMessage, setPromoMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const selectedPlan = foundPlanDetails(plan)
  const hasAddon = !!addonLabel && typeof addonPrice === "number"
  const summary = priceSummary ?? fallbackPlanSummary(plan)
  const hasPromo = !!summary.promo

  async function handlePromoApply(e: React.FormEvent) {
    e.preventDefault()
    const code = promoDraft.trim()
    if (!code) {
      setPromoMessage("Enter a promo code first.")
      return
    }

    setPromoLoading(true)
    setPromoMessage(null)
    setError(null)

    const result = await createActivationSetup(slug, plan, targetAddonSlug, code)
    setPromoLoading(false)

    if (!result) {
      setPromoMessage("Could not check that promo code. Try again.")
      return
    }

    if (result.promoError || !result.price?.promo) {
      setPromoMessage(result.promoError ?? "That promo code is not active.")
      return
    }

    onSetupUpdated(result)
    setPromoDraft(result.price.promo.code)
    setPromoMessage(`${result.price.promo.code} applied.`)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)
    const { error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `https://${rootDomain}/activate/confirm?slug=${slug}&returnTo=${returnTo}`,
      },
    })
    if (stripeError) {
      setError(stripeError.message ?? "Something went wrong - please try again.")
      setLoading(false)
    }
  }

  return (
    <div style={{ width: "100%", animation: "cinematic-word-in 420ms ease-out both" }}>
      <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 6px ${SIGNAL_GREEN}`, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.22em", color: SIGNAL_GREEN }}>
          {hasAddon ? "Add feature" : hasPromo ? "Promo applied" : "Intro rate"}
        </span>
      </div>
      <p style={{ fontSize: 30, fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.02em", color: "white", margin: "0 0 5px" }}>
        {hasAddon ? addonLabel : `${formatCurrency(summary.discountedAmount, summary.currency)}/month.`}
      </p>
      <p style={{ fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.44)", margin: "0 0 24px" }}>
        {hasAddon ? `${formatCurrency(addonPrice * 100, "usd")}/month added to your Found plan. Cancel anytime.` : hasPromo ? `${summary.promo?.discountLabel} for ${promoDurationLabel(summary.promo?.duration)}. Regular intro rate is ${formatCurrency(summary.originalAmount, summary.currency)}/month.` : `Locked in for 12 months, then ${formatCurrency(selectedPlan.normalPrice * 100, "usd")}/month. Cancel anytime.`}
      </p>
      {!hasAddon && (
        <>
          <form onSubmit={handlePromoApply} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={promoDraft}
              onChange={(e) => setPromoDraft(e.target.value.toUpperCase())}
              placeholder="Promo code"
              autoCapitalize="characters"
              style={{
                minWidth: 0,
                flex: 1,
                borderRadius: 14,
                padding: "14px 15px",
                backgroundColor: "#111111",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 16,
                fontWeight: 800,
                textTransform: "uppercase",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={promoLoading}
              style={{
                borderRadius: 14,
                padding: "0 15px",
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                cursor: promoLoading ? "default" : "pointer",
                opacity: promoLoading ? 0.45 : 1,
              }}
            >
              {promoLoading ? "..." : "Apply"}
            </button>
          </form>
          {promoMessage && (
            <p style={{ fontSize: 12, fontWeight: 800, color: hasPromo ? SIGNAL_GREEN : "rgba(255,255,255,0.45)", margin: "0 0 18px" }}>
              {promoMessage}
            </p>
          )}
        </>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <PaymentElement options={{ layout: "tabs" }} />
        {error && <p style={{ fontSize: 12, fontWeight: 900, color: "#F43F5E", margin: 0 }}>{error}</p>}
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "17px 16px",
            fontSize: 12,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            backgroundColor: SIGNAL_GREEN,
            color: FOUND_BLACK,
            border: "none",
            cursor: loading ? "default" : "pointer",
            opacity: (!stripe || loading) ? 0.45 : 1,
            boxShadow: "0 14px 34px rgba(0,0,0,0.36)",
          }}
        >
          {loading ? "One moment..." : hasAddon ? `Activate ${addonLabel}` : "Activate my site"}
        </button>
        <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.22)", margin: 0 }}>
          {companyName} - Powered by Found
        </p>
      </form>
    </div>
  )
}

type CinPhase = "text" | "iris" | "fading" | "done"
type PaymentStep = "plans" | "loading" | "payment"

export default function ActivateOverlay({
  slug,
  companyName: initialName,
  targetPlan,
  targetAddonSlug,
  targetAddonLabel,
  targetAddonPrice,
  returnTo = "site",
  skipIntro = false,
  isAdminSession = false,
  onClose,
}: {
  slug: string
  companyName: string
  targetPlan?: string | null
  targetAddonSlug?: string | null
  targetAddonLabel?: string | null
  targetAddonPrice?: number | null
  returnTo?: "site" | "dashboard"
  skipIntro?: boolean
  isAdminSession?: boolean
  onClose: () => void
}) {
  const isAddonFlow = !!targetAddonSlug
  const [cinPhase, setCinPhase] = useState<CinPhase>(skipIntro ? "done" : "text")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [priceSummary, setPriceSummary] = useState<ActivationPriceSummary | null>(null)
  const [companyName, setCompanyName] = useState(initialName)
  const [plan, setPlan] = useState<string | null>(targetPlan ?? null)
  const [selectedPlan, setSelectedPlan] = useState<FoundPlanKey>(defaultActivationPlan(targetPlan))
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(isAddonFlow ? "loading" : "plans")
  const [preparingPlan, setPreparingPlan] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [compActivating, setCompActivating] = useState(false)
  const rootDomainForComp = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

  async function handleCompActivate() {
    if (compActivating) return
    setCompActivating(true)
    const ok = await activateAsComp(slug, selectedPlan)
    if (!ok) {
      setCompActivating(false)
      setLoadError("Comp activation failed - admin session may have expired.")
      return
    }
    window.location.href = returnTo === "dashboard"
      ? `https://my.${rootDomainForComp}/?activated=true`
      : `https://${slug}.${rootDomainForComp}?activated=true`
  }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [])

  function applySetupResult(result: ActivationSetupResult, fallbackPlan: FoundPlanKey = selectedPlan) {
    setClientSecret(result.clientSecret)
    if (!companyName) setCompanyName(result.companyName)
    if (result.plan) {
      setPlan(result.plan)
      setSelectedPlan(normalizeFoundPlan(result.plan))
    } else {
      setPlan(fallbackPlan)
    }
    if (result.price) setPriceSummary(result.price)
  }

  async function preparePayment(nextPlan: FoundPlanKey = selectedPlan) {
    setPreparingPlan(true)
    setPaymentStep("loading")
    setLoadError(null)
    setClientSecret(null)
    const result = await createActivationSetup(slug, nextPlan, targetAddonSlug)
    setPreparingPlan(false)

    if (!result) {
      setLoadError("This site is already activated or could not be found.")
      return
    }

    applySetupResult(result, nextPlan)
    setPaymentStep("payment")
  }
  useEffect(() => {
    if (!isAddonFlow) return
    void preparePayment(selectedPlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddonFlow, slug, targetAddonSlug])

  useEffect(() => {
    if (skipIntro) return
    const t1 = setTimeout(() => setCinPhase("iris"), 3000)
    const t2 = setTimeout(() => setCinPhase("fading"), 3300)
    const t3 = setTimeout(() => setCinPhase("done"), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [skipIntro])

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: cinPhase === "done" ? "rgba(0,0,0,0.58)" : FOUND_BLACK }}>
      {cinPhase !== "done" && (
        <>
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
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{
                width: 480, height: 480,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(50,208,116,0.32) 0%, rgba(50,208,116,0.1) 50%, transparent 70%)",
                animation: "cinematic-breathe 2s ease-in-out infinite",
              }} />
            </div>
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(1rem, 3vw, 1.4rem)", textAlign: "center" }}>
              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: "clamp(3.2rem, 11vw, 5rem)", fontWeight: 300, letterSpacing: "0.32em", paddingLeft: "0.32em", textTransform: "uppercase", color: "white", display: "block", animation: "cinematic-word-in 500ms ease-out 200ms both" }}>
                Finally
              </span>
              <span style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: "clamp(1.3rem, 4.5vw, 1.75rem)", fontWeight: 400, letterSpacing: "0.14em", paddingLeft: "0.14em", textTransform: "uppercase", color: SIGNAL_GREEN, display: "block", animation: "cinematic-word-in 500ms ease-out 1400ms both" }}>
                {companyName} is ready!
              </span>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ position: "absolute", right: 24, top: 24, background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", fontSize: 28, lineHeight: 1, padding: 4, zIndex: 2 }}>
              x
            </button>
          </div>

          {(cinPhase === "iris" || cinPhase === "fading") && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", opacity: cinPhase === "fading" ? 0 : 1, transition: cinPhase === "fading" ? "opacity 700ms ease-out" : "none" }} aria-hidden="true">
              <div style={{ width: "150vmax", height: "150vmax", minWidth: "150vmax", minHeight: "150vmax", flexShrink: 0, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, animation: "iris-open 250ms cubic-bezier(0.4, 0, 0.6, 1) forwards" }} />
            </div>
          )}
        </>
      )}

      {cinPhase === "done" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div
            role="dialog"
            aria-modal="true"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "calc(100dvh - 18px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRadius: "30px 30px 0 0",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              backgroundColor: FOUND_BLACK,
              boxShadow: "0 -24px 70px rgba(0,0,0,0.58)",
              animation: "activate-sheet-up 260ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
            }}
          >
            <div style={{ flexShrink: 0, position: "relative", height: 58, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 54, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)" }} />
              <button
                onClick={onClose}
                aria-label="Close"
                style={{ position: "absolute", right: 16, top: 10, width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.58)", fontSize: 24, lineHeight: 1, cursor: "pointer" }}
              >
                x
              </button>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 28px 24px" }}>
              {loadError ? (
                <div style={{ minHeight: 280, display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 300, color: "white", marginBottom: 16 }}>{loadError}</p>
                    <button onClick={onClose} style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: SIGNAL_GREEN, background: "none", border: "none", cursor: "pointer" }}>
                      Go back
                    </button>
                  </div>
                </div>
              ) : paymentStep === "plans" && !isAddonFlow ? (
                <>
                  <FoundPlanSelector
                    selectedPlan={selectedPlan}
                    loading={preparingPlan}
                    onSelect={setSelectedPlan}
                    onContinue={() => void preparePayment(selectedPlan)}
                  />
                  {isAdminSession && (
                    <button
                      onClick={handleCompActivate}
                      disabled={compActivating}
                      style={{
                        display: "block", width: "100%", maxWidth: 448, margin: "14px auto 0",
                        padding: "13px 0", borderRadius: 999, border: "1px dashed rgba(255,149,0,0.4)",
                        backgroundColor: "rgba(255,149,0,0.08)", color: "#FF9500",
                        fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em",
                        cursor: compActivating ? "default" : "pointer",
                      }}
                    >
                      {compActivating ? "Activating…" : "Activate as comp (Found team)"}
                    </button>
                  )}
                </>
              ) : clientSecret ? (
                <div style={{ maxWidth: 448, margin: "0 auto", padding: "8px 0 8px" }}>
                  <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                    <CardForm slug={slug} companyName={companyName} plan={plan} priceSummary={priceSummary} targetAddonSlug={targetAddonSlug} addonLabel={targetAddonLabel} addonPrice={targetAddonPrice} returnTo={returnTo} onSetupUpdated={applySetupResult} />
                  </Elements>
                </div>
              ) : (
                <div style={{ width: "100%", maxWidth: 448, margin: "0 auto", padding: "28px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#161616", color: "rgba(255,255,255,0.52)", textAlign: "center", fontSize: 14 }}>
                  Preparing secure card form...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes activate-sheet-up {
          from { transform: translateY(22px); opacity: 0.85; }
          to { transform: translateY(0); opacity: 1; }
        }
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
