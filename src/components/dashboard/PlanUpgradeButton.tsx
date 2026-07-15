"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { confirmPlanUpgrade, previewPlanUpgrade } from "@/app/dashboard/(app)/more/actions"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"

function formatCurrency(amount?: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: (amount ?? 0) % 100 === 0 ? 0 : 2,
  }).format((amount ?? 0) / 100)
}

function formatDate(value?: string | null) {
  if (!value) return "your next invoice"
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value))
}

type Preview = Awaited<ReturnType<typeof previewPlanUpgrade>>

export default function PlanUpgradeButton({
  companyId,
  targetPlan,
  targetLabel,
  children,
  variant = "green",
}: {
  companyId: string
  targetPlan: string
  targetLabel: string
  children: ReactNode
  variant?: "green" | "black"
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [promoDraft, setPromoDraft] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const isBlack = variant === "black"

  const promoCode = useMemo(() => promoDraft.trim().toUpperCase(), [promoDraft])

  async function loadPreview(code?: string) {
    setLoadingPreview(true)
    setMessage(null)
    const result = await previewPlanUpgrade(companyId, targetPlan, code ?? null)
    setPreview(result)
    setLoadingPreview(false)
    if (!result.ok) setMessage(result.error ?? "Plan upgrade could not be prepared.")
    if (result.ok && result.promoCode) {
      setPromoDraft(result.promoCode)
      setMessage(`${result.promoCode} applied.`)
    }
  }

  useEffect(() => {
    if (!open) return
    void loadPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyId, targetPlan])

  async function applyPromo(e: React.FormEvent) {
    e.preventDefault()
    if (!promoCode) {
      setMessage("Enter a promo code first.")
      return
    }
    await loadPreview(promoCode)
  }

  async function confirmUpgrade() {
    if (confirming || !preview?.ok) return
    setConfirming(true)
    setMessage(null)
    const result = await confirmPlanUpgrade(companyId, targetPlan, promoCode || null)
    setConfirming(false)

    if (result.ok) {
      setSuccess(true)
      setTimeout(() => window.location.reload(), 1600)
      return
    }

    if (result.requiresAction && result.hostedInvoiceUrl) {
      window.location.href = result.hostedInvoiceUrl
      return
    }

    setMessage(result.error ?? "Plan upgrade could not be completed.")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setSuccess(false); setOpen(true) }}
        style={{
          width: "100%",
          minHeight: 52,
          borderRadius: 999,
          padding: "0 18px",
          ...TYPE.subhead,
          fontWeight: 900,
          backgroundColor: isBlack ? BLACK : GREEN,
          color: isBlack ? "white" : BLACK,
          border: "none",
          cursor: "pointer",
          boxShadow: isBlack ? "0 12px 34px rgba(8,10,9,0.22)" : `0 0 34px ${GREEN}26`,
        }}
      >
        {children}
      </button>

      {open && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "rgba(8,10,9,0.86)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 24px" }}
          onClick={(e) => { if (e.target === e.currentTarget && !confirming) setOpen(false) }}
        >
          <div style={{ width: "100%", maxWidth: 470, borderRadius: "28px 28px 0 0", backgroundColor: "#080A09", border: "1px solid rgba(255,255,255,0.1)", borderBottom: "none", boxShadow: "0 -24px 70px rgba(0,0,0,0.58)", overflow: "hidden" }}>
            <div style={{ height: 1, backgroundColor: GREEN }} />
            <div style={{ padding: "22px 26px 26px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
                  <span style={{ ...TYPE.caption, color: GREEN }}>Plan upgrade</span>
                </div>
                {!confirming && (
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close" style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)", fontSize: 20, cursor: "pointer" }}>x</button>
                )}
              </div>

              {success ? (
                <div style={{ textAlign: "center", padding: "24px 0 10px" }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p style={{ margin: "0 0 6px", ...TYPE.title, fontWeight: 320, color: "white" }}>{targetLabel} confirmed</p>
                  <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Stripe is syncing your plan back to Found.</p>
                </div>
              ) : (
                <>
                  <h2 style={{ margin: "0 0 8px", ...TYPE.largeTitle, fontSize: "2rem", color: "white" }}>Upgrade to {targetLabel}.</h2>
                  <p style={{ margin: "0 0 20px", ...TYPE.subhead, lineHeight: 1.48, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                    Confirm the plan change inside Found. Stripe stays behind the scenes and sends the receipt.
                  </p>

                  <div style={{ borderRadius: 18, padding: "16px 18px", backgroundColor: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 14 }}>
                    {loadingPreview ? (
                      <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>Preparing upgrade...</p>
                    ) : preview?.ok ? (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", marginBottom: 13 }}>
                          <div>
                            <p style={{ margin: "0 0 2px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>New plan</p>
                            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 850, color: "white" }}>{targetLabel}</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{ margin: 0, ...TYPE.title, color: "white" }}>{formatCurrency(preview.discountedAmount, preview.currency)}</p>
                            <p style={{ margin: "-2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
                          </div>
                        </div>
                        {preview.discountLabel && <p style={{ margin: "0 0 10px", ...TYPE.footnote, fontWeight: 800, color: GREEN }}>{preview.discountLabel} applied.</p>}
                        <p style={{ margin: "0 0 5px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Next billing date: {formatDate(preview.nextBillingDate)}</p>
                        <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Payment: {preview.paymentMethodLabel ?? "card on file"}</p>
                      </>
                    ) : (
                      <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>Upgrade details are not ready.</p>
                    )}
                  </div>

                  <form onSubmit={applyPromo} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      value={promoDraft}
                      onChange={(e) => setPromoDraft(e.target.value.toUpperCase())}
                      placeholder="Promo code"
                      autoCapitalize="characters"
                      style={{ minWidth: 0, flex: 1, borderRadius: 14, padding: "14px 15px", backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 16, fontWeight: 800, textTransform: "uppercase", outline: "none" }}
                    />
                    <button type="submit" disabled={loadingPreview} style={{ borderRadius: 14, padding: "0 15px", backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em", opacity: loadingPreview ? 0.45 : 1 }}>
                      {loadingPreview ? "..." : "Apply"}
                    </button>
                  </form>

                  {message && <p style={{ margin: "0 0 14px", ...TYPE.footnote, fontWeight: 800, color: message.includes("applied") ? GREEN : "#FF453A" }}>{message}</p>}

                  <button
                    type="button"
                    disabled={confirming || !preview?.ok}
                    onClick={() => void confirmUpgrade()}
                    style={{ width: "100%", minHeight: 54, borderRadius: 999, border: "none", backgroundColor: GREEN, color: BLACK, ...TYPE.subhead, fontWeight: 950, cursor: confirming ? "default" : "pointer", opacity: confirming || !preview?.ok ? 0.45 : 1, boxShadow: `0 18px 42px ${GREEN}22` }}
                  >
                    {confirming ? "Confirming..." : `Confirm ${targetLabel}`}
                  </button>
                  <p style={{ margin: "12px 0 0", textAlign: "center", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Found will update your plan after Stripe confirms it.</p>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}