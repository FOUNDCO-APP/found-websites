"use client"

import IncludedProTool from "./IncludedProTool"
import AddonActivateButton from "./AddonActivateButton"
import MoreActivateButton from "./MoreActivateButton"
import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"

type AddonDef = { slug: string; label: string; description: string; price: number }

export default function AddonsPanel({
  companyId,
  companySlug,
  companyName,
  plan,
  isActive,
  addons,
  includedAddonSlug,
  activeAddonSlugs,
  disabledAddonSlugs,
}: {
  companyId: string
  companySlug: string
  companyName: string
  plan: string
  isActive: boolean
  addons: AddonDef[]
  includedAddonSlug: string | null
  activeAddonSlugs: string[]
  disabledAddonSlugs: string[]
}) {
  const isPro = plan === "found_pro"

  return (
    <section style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 2px", ...TYPE.title, fontWeight: 700, color: "white" }}>
        Features
      </p>
      <p style={{ margin: "0 0 12px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        {isPro ? "One tool is included with Pro. Additional tools cost extra." : "Additional tools cost extra."}
      </p>
      {isPro && isActive && <IncludedProTool companyId={companyId} currentIncludedSlug={includedAddonSlug} disabledAddonSlugs={disabledAddonSlugs} paidAddonSlugs={activeAddonSlugs} variant="manage" />}
      <p style={{ ...TYPE.footnote, color: "#bbb" }}>Other tools and paid extras - prices below are additional monthly charges unless marked included.</p>
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
