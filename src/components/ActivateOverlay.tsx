"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { loadStripe } from "@stripe/stripe-js"
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { createActivationSetup } from "@/app/activate/activateActions"
import FoundWordmark from "@/components/FoundWordmark"
import {
  FOUND_PLAN_OPTIONS,
  defaultActivationPlan,
  foundPlanDetails,
  normalizeFoundPlan,
  type FoundPlanKey,
} from "@/lib/foundPlans"

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

function CardForm({
  slug,
  companyName,
  plan,
  addonLabel,
  addonPrice,
}: {
  slug: string
  companyName: string
  plan?: string | null
  addonLabel?: string | null
  addonPrice?: number | null
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const selectedPlan = foundPlanDetails(plan)
  const price = selectedPlan.price
  const normal = selectedPlan.normalPrice
  const hasAddon = !!addonLabel && typeof addonPrice === "number"

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
      setError(stripeError.message ?? "Something went wrong - please try again.")
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: "100%",
      maxWidth: 448,
      overflow: "hidden",
      maxHeight: "min(760px, calc(100dvh - 112px))",
      display: "flex",
      flexDirection: "column",
      borderRadius: 24,
      backgroundColor: "#161616",
      border: "1px solid rgba(255,255,255,0.07)",
      animation: "cinematic-word-in 600ms ease-out both",
    }}>
      <div style={{ height: 1, backgroundColor: SIGNAL_GREEN }} />
      <div style={{ padding: "24px 28px 28px", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: SIGNAL_GREEN, boxShadow: `0 0 6px ${SIGNAL_GREEN}`, flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.22em", color: SIGNAL_GREEN }}>
            {hasAddon ? "Add feature" : "Intro rate"}
          </span>
        </div>
        <p style={{ fontSize: 24, fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: "white", marginBottom: 4 }}>
          {hasAddon ? addonLabel : `${price}/month.`}
        </p>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", marginBottom: 24 }}>
          {hasAddon ? `+${addonPrice}/month added to your Found plan. Cancel anytime.` : `Locked in for 12 months, then ${normal}/month. Cancel anytime.`}
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PaymentElement options={{ layout: "tabs", paymentMethodOrder: ["card"], wallets: { link: "never" } }} />
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
              position: "sticky",
              bottom: 0,
              zIndex: 1,
              boxShadow: "0 -14px 26px rgba(22,22,22,0.92)",
            }}>
            {loading ? "One moment..." : hasAddon ? `Activate ${addonLabel} ->` : "Activate my site ->"}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.22)", margin: 0 }}>
            {companyName} - Powered by Found
          </p>
        </form>
      </div>
    </div>
  )
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function PlanChoice({
  selectedPlan,
  loading,
  onSelect,
  onContinue,
}: {
  selectedPlan: FoundPlanKey
  loading: boolean
  onSelect: (plan: FoundPlanKey) => void
  onContinue: () => void
}) {
  const selected = foundPlanDetails(selectedPlan)

  return (
    <section style={{
      position: "relative",
      width: "100%",
      maxWidth: 448,
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      padding: "20px 0 0",
      animation: "cinematic-word-in 600ms ease-out both",
    }}>
      <div style={{
        pointerEvents: "none",
        position: "absolute",
        left: -28,
        right: -28,
        bottom: 0,
        height: "66%",
        background: "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(50,208,116,0.16) 0%, transparent 70%)",
      }} />

      <div style={{ position: "relative", maxWidth: 512 }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 900, letterSpacing: "0.22em", textTransform: "uppercase", color: SIGNAL_GREEN }}>
          Best place to start
        </p>
        <h1 style={{ margin: 0, whiteSpace: "nowrap", fontSize: "1.72rem", lineHeight: 1.04, fontWeight: 300, color: "white" }}>
          Most owners start with Pro.
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: "24px", color: "rgba(255,255,255,0.58)" }}>
          Starter gets your site live. Pro keeps leads warm. Business helps you book jobs and collect money.
        </p>
      </div>

      <div style={{ position: "relative", display: "grid", gap: 10, marginTop: 20, paddingBottom: 96 }}>
        {FOUND_PLAN_OPTIONS.map((card) => {
          const activePlan = selectedPlan === card.key
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key)}
              style={{
                width: "100%",
                borderRadius: "1.2rem",
                border: "1px solid",
                padding: 16,
                textAlign: "left",
                transition: "transform 150ms ease, border-color 150ms ease, background 150ms ease",
                borderColor: activePlan ? SIGNAL_GREEN : card.featured ? "rgba(50,208,116,0.34)" : "rgba(255,255,255,0.11)",
                background: activePlan
                  ? "linear-gradient(180deg, rgba(50,208,116,0.15) 0%, rgba(50,208,116,0.075) 100%)"
                  : card.featured
                    ? "rgba(50,208,116,0.065)"
                    : "rgba(255,255,255,0.035)",
                boxShadow: activePlan ? "0 20px 60px rgba(50,208,116,0.13)" : "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  marginTop: 2,
                  display: "flex",
                  height: 24,
                  width: 24,
                  flexShrink: 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  border: "1px solid",
                  borderColor: activePlan ? SIGNAL_GREEN : "rgba(255,255,255,0.2)",
                  backgroundColor: activePlan ? SIGNAL_GREEN : "transparent",
                }}>
                  {activePlan && <CheckIcon color={FOUND_BLACK} />}
                </span>

                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 8, rowGap: 4 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "white" }}>{card.name}</span>
                    <span style={{
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      backgroundColor: card.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
                      color: card.featured ? FOUND_BLACK : "rgba(255,255,255,0.55)",
                    }}>
                      {card.eyebrow}
                    </span>
                  </span>

                  <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: 8, rowGap: 4, marginTop: 6 }}>
                    <span style={{ fontSize: "1.35rem", lineHeight: 1, fontWeight: 900, color: "white" }}>${card.price}/mo</span>
                    <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: "0.01em", color: "rgba(255,255,255,0.62)" }}>
                      regular <span style={{ textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.45)", textDecorationThickness: 2 }}>${card.normalPrice}/mo</span>
                    </span>
                  </span>

                  <span style={{ display: "block", marginTop: 8, fontSize: 14, lineHeight: "20px", fontWeight: 900, color: SIGNAL_GREEN }}>
                    {card.headline}
                  </span>

                  <span style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    {card.bullets.map((bullet) => (
                      <span key={bullet} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: "20px", fontWeight: 600, color: "rgba(255,255,255,0.62)" }}>
                        <span style={{ marginTop: 2, flexShrink: 0 }}><CheckIcon color={SIGNAL_GREEN} /></span>
                        {bullet}
                      </span>
                    ))}
                    {card.toolGroup && (
                      <span style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, lineHeight: "20px", fontWeight: 600, color: "rgba(255,255,255,0.62)" }}>
                        <span style={{ marginTop: 2, flexShrink: 0 }}><CheckIcon color={SIGNAL_GREEN} /></span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 900, color: "rgba(255,255,255,0.75)" }}>{card.toolGroup.label}</span>
                          <span style={{ display: "grid", gap: 4, marginTop: 6 }}>
                            {card.toolGroup.items.map((item) => (
                              <span key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "rgba(255,255,255,0.52)" }}>
                                <span style={{ marginTop: 7, height: 4, width: 4, flexShrink: 0, borderRadius: "50%", backgroundColor: SIGNAL_GREEN }} />
                                {item}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                    )}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ position: "sticky", bottom: 0, zIndex: 10, marginTop: 20, paddingTop: 12, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "16px 14px",
            border: "none",
            backgroundColor: SIGNAL_GREEN,
            color: FOUND_BLACK,
            boxShadow: "0 14px 34px rgba(0,0,0,0.36)",
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.55 : 1,
          }}
        >
          {loading ? "Preparing secure payment" : selected.cta}
        </button>
      </div>
    </section>
  )
}
// Cinematic phases mirror page.tsx exactly.
type CinPhase = "text" | "iris" | "fading" | "done"
type PaymentStep = "plans" | "loading" | "payment"

export default function ActivateOverlay({
  slug,
  companyName: initialName,
  targetPlan,
  targetAddonSlug,
  targetAddonLabel,
  targetAddonPrice,
  skipIntro = false,
  onClose,
}: {
  slug: string
  companyName: string
  targetPlan?: string | null
  targetAddonSlug?: string | null
  targetAddonLabel?: string | null
  targetAddonPrice?: number | null
  skipIntro?: boolean
  onClose: () => void
}) {
  const isAddonFlow = !!targetAddonSlug
  const [cinPhase, setCinPhase] = useState<CinPhase>(skipIntro ? "done" : "text")
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState(initialName)
  const [plan, setPlan] = useState<string | null>(targetPlan ?? null)
  const [selectedPlan, setSelectedPlan] = useState<FoundPlanKey>(defaultActivationPlan(targetPlan))
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(isAddonFlow ? "loading" : "plans")
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [skipIntro])

  async function preparePayment(nextPlan: FoundPlanKey = selectedPlan) {
    setPaymentStep("loading")
    setLoadError(null)
    setClientSecret(null)
    const result = await createActivationSetup(slug, nextPlan, targetAddonSlug)
    if (!result) {
      setLoadError("This site is already activated or could not be found.")
      return
    }

    setClientSecret(result.clientSecret)
    if (!companyName) setCompanyName(result.companyName)
    if (result.plan) {
      setPlan(result.plan)
      setSelectedPlan(normalizeFoundPlan(result.plan))
    } else {
      setPlan(nextPlan)
    }
    setPaymentStep("payment")
  }

  // Add-ons skip plan choice. Site activation waits for the owner's plan decision.
  useEffect(() => {
    if (!isAddonFlow) return
    void preparePayment(selectedPlan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddonFlow, slug, targetAddonSlug])

  // Mirror page.tsx timing exactly: iris 3000ms, fading 3300ms, done 4000ms
  useEffect(() => {
    if (skipIntro) return
    const t1 = setTimeout(() => setCinPhase("iris"), 3000)
    const t2 = setTimeout(() => setCinPhase("fading"), 3300)
    const t3 = setTimeout(() => setCinPhase("done"), 4000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [skipIntro])

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: FOUND_BLACK }}>
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

            <div style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "clamp(1rem, 3vw, 1.4rem)",
              textAlign: "center",
            }}>
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

            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                position: "absolute", right: 24, top: 24,
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.2)", fontSize: 28, lineHeight: 1, padding: 4,
                zIndex: 2,
              }}>
              x
            </button>
          </div>

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

      {cinPhase === "done" && (
        <div style={{
          position: "absolute", inset: 0,
          backgroundColor: FOUND_BLACK,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "flex-start",
          padding: "88px 20px 24px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          animation: "cinematic-word-in 600ms ease-out both",
        }}>
          <div style={{ position: "absolute", left: 28, top: 28 }}>
            <FoundWordmark height={24} color="white" />
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", right: 24, top: 24,
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.25)", fontSize: 28, lineHeight: 1, padding: 4,
            }}>
            x
          </button>

          {loadError ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 300, color: "white", marginBottom: 16 }}>{loadError}</p>
              <button onClick={onClose} style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", color: SIGNAL_GREEN, background: "none", border: "none", cursor: "pointer" }}>
                Go back
              </button>
            </div>
          ) : paymentStep === "plans" && !isAddonFlow ? (
            <PlanChoice
              selectedPlan={selectedPlan}
              loading={false}
              onSelect={setSelectedPlan}
              onContinue={() => void preparePayment(selectedPlan)}
            />
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <CardForm slug={slug} companyName={companyName} plan={plan} addonLabel={targetAddonLabel} addonPrice={targetAddonPrice} />
            </Elements>
          ) : (
            <div style={{ width: "100%", maxWidth: 448, padding: "28px", borderRadius: 24, border: "1px solid rgba(255,255,255,0.07)", backgroundColor: "#161616", color: "rgba(255,255,255,0.52)", textAlign: "center", fontSize: 14 }}>
              Preparing secure card form...
            </div>
          )}
        </div>
      )}

      <style>{`
        /* Neutralize Stripe test-mode badge - goes away in production with live keys */
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

