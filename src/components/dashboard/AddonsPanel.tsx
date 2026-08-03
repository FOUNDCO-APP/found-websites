"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import AddonActivateButton from "./AddonActivateButton"
import MoreActivateButton from "./MoreActivateButton"
import { switchIncludedAddon } from "@/app/dashboard/(app)/more/actions"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

type AddonDef = { slug: string; label: string; description: string; price: number }

function UseAsFreePickButton({
  companyId,
  addon,
  currentIncludedLabel,
}: {
  companyId: string
  addon: AddonDef
  currentIncludedLabel: string | null
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    const result = await switchIncludedAddon(companyId, addon.slug)
    setLoading(false)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => { setOpen(false); window.location.reload() }, 1100)
    } else {
      setError(result.error ?? "Something went wrong — please try again.")
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setError(null); setSuccess(false); setOpen(true) }}
        style={{
          minHeight: 34,
          borderRadius: 999,
          padding: "0 15px",
          fontSize: 12,
          fontWeight: 900,
          backgroundColor: `${GREEN}18`,
          color: GREEN,
          border: `1px solid ${GREEN}35`,
          cursor: "pointer",
          boxShadow: `0 0 18px ${GREEN}10`,
          letterSpacing: "0.01em",
        }}
      >
        Use free pick
      </button>

      {open && createPortal(
        <div
          style={{ position: "fixed", inset: 0, zIndex: 99999, backgroundColor: "rgba(8,10,9,0.86)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 0 32px" }}
          onClick={(e) => { if (e.target === e.currentTarget && !loading) setOpen(false) }}
        >
          <div style={{ width: "100%", maxWidth: 448, borderRadius: 24, backgroundColor: "#161616", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
            <div style={{ height: 1, backgroundColor: GREEN }} />
            <div style={{ padding: "24px 28px 28px" }}>
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase" as const, letterSpacing: "0.22em", color: GREEN }}>
                    Free plan pick
                  </span>
                </div>
                {!loading && !success && (
                  <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
                )}
              </div>

              {success ? (
                <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: `${GREEN}18`, border: `1px solid ${GREEN}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 300, color: "white" }}>{addon.label} is now included</p>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Free with your plan. No charge.</p>
                </div>
              ) : (
                <>
                  <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 300, lineHeight: 1.2, letterSpacing: "-0.02em", color: "white" }}>{addon.label}</p>
                  <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(255,255,255,0.35)" }}>
                    {currentIncludedLabel
                      ? `Your plan includes one free feature. Switching means ${currentIncludedLabel} is no longer included — you can switch back anytime.`
                      : "Your plan includes one free feature. This won't be billed."}
                  </p>

                  {error && <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: "#F43F5E" }}>{error}</p>}

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirm}
                    style={{
                      width: "100%", borderRadius: 12, padding: "16px 0", fontSize: 12, fontWeight: 900,
                      textTransform: "uppercase" as const, letterSpacing: "0.18em", backgroundColor: GREEN, color: BLACK,
                      border: "none", cursor: loading ? "default" : "pointer", opacity: loading ? 0.5 : 1, transition: "opacity 150ms",
                    }}
                  >
                    {loading ? "One moment..." : `Make ${addon.label} my free pick →`}
                  </button>
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

export default function AddonsPanel({
  companyId,
  companySlug,
  companyName,
  plan,
  isActive,
  addons,
  includedAddonSlug,
  activeAddonSlugs,
}: {
  companyId: string
  companySlug: string
  companyName: string
  plan: string
  isActive: boolean
  addons: AddonDef[]
  includedAddonSlug: string | null
  activeAddonSlugs: string[]
}) {
  const isPro = plan === "found_pro"
  const includedLabel = includedAddonSlug ? addons.find((a) => a.slug === includedAddonSlug)?.label ?? null : null

  return (
    <section style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 2px", ...TYPE.title, fontWeight: 700, color: "white" }}>
        Features
      </p>
      <p style={{ margin: "0 0 12px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        {isPro ? "One pick included free. Add more anytime." : "Add more anytime."}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {addons.map((addon) => {
          const isIncluded = isPro && includedAddonSlug === addon.slug
          const isPaidActive = activeAddonSlugs.includes(addon.slug)

          return (
            <div key={addon.slug} style={{
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: `1px solid ${isIncluded || isPaidActive ? `${GREEN}35` : "rgba(255,255,255,0.06)"}`,
              padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    {(isIncluded || isPaidActive) && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />}
                    <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{addon.label}</p>
                  </div>
                  <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    {addon.description}
                  </p>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" as const, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                  {isIncluded ? (
                    <span style={{ ...TYPE.footnote, color: GREEN, fontWeight: 800 }}>Included - Free</span>
                  ) : isPaidActive ? (
                    <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{`Active - $${addon.price}/mo`}</span>
                  ) : (
                    <>
                      {isPro && <UseAsFreePickButton companyId={companyId} addon={addon} currentIncludedLabel={includedLabel} />}
                      {isActive ? (
                        <AddonActivateButton companyId={companyId} addonSlug={addon.slug} addonLabel={addon.label} addonPrice={addon.price} emphasis={isPro ? "quiet" : "bold"} />
                      ) : (
                        <div style={{ width: 112 }}>
                          <MoreActivateButton slug={companySlug} companyName={companyName} targetPlan={plan} targetAddonSlug={addon.slug} targetAddonLabel={addon.label} targetAddonPrice={addon.price} size="compact">
                            Activate
                          </MoreActivateButton>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
