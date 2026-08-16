"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toggleAddonVisibility } from "@/app/dashboard/(app)/more/actions"
import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"

type FeatureRow = { slug: string; label: string; description: string; price: number; isPaid: boolean }

// Pure visibility - lives in Edit Website because it answers "does this
// show on my site," not "am I paying for this." A free/bundled feature
// (Business's 5, or Pro's one free pick) is a plain show/hide toggle. A
// paid feature keeps working and keeps being billed either way - hiding it
// here only removes it from the site; the warning + Billing link is there
// so nobody mistakes "hidden" for "cancelled."
export default function SiteFeatureVisibilityPanel({
  companyId,
  features,
  disabledAddons,
}: {
  companyId: string
  features: FeatureRow[]
  disabledAddons: string[]
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(disabledAddons))
  const [pending, startTransition] = useTransition()
  const [errorSlug, setErrorSlug] = useState<string | null>(null)

  if (features.length === 0) return null

  function handleToggle(slug: string) {
    const willHide = !hidden.has(slug)
    setErrorSlug(null)
    setHidden((prev) => {
      const next = new Set(prev)
      if (willHide) next.add(slug); else next.delete(slug)
      return next
    })
    startTransition(async () => {
      const result = await toggleAddonVisibility(companyId, slug, willHide)
      if (!result.success) {
        // Roll back - the write failed, don't leave the toggle showing a
        // state that isn't actually saved.
        setHidden((prev) => {
          const next = new Set(prev)
          if (willHide) next.delete(slug); else next.add(slug)
          return next
        })
        setErrorSlug(slug)
      }
    })
  }

  return (
    <div style={{ padding: "26px 20px 0" }}>
      <div style={{ ...TYPE.caption, color: GREEN, marginBottom: 4 }}>What shows on your site</div>
      <p style={{ margin: "0 0 12px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Turn a feature off here and it disappears from your site - it doesn&apos;t cancel anything you&apos;re paying for.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {features.map((feature) => {
          const isHidden = hidden.has(feature.slug)
          return (
            <div key={feature.slug} style={{
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.04)",
              border: `1px solid ${isHidden ? "rgba(255,255,255,0.06)" : `${GREEN}35`}`,
              padding: "16px 18px",
              opacity: isHidden ? 0.6 : 1,
              transition: "opacity 150ms, border-color 150ms",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    {!isHidden && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />}
                    <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{feature.label}</p>
                    {feature.isPaid && (
                      <span style={{ ...TYPE.footnote, fontWeight: 800, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                        ${feature.price}/mo
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    {feature.description}
                  </p>
                  {feature.isPaid && isHidden && (
                    <p style={{ margin: "8px 0 0", ...TYPE.footnote, lineHeight: 1.4, color: "rgba(255,200,90,0.85)" }}>
                      Hidden from your site, but you&apos;re still being billed ${feature.price}/mo for it.{" "}
                      <Link href="/billing" style={{ color: GREEN, fontWeight: 700, textDecoration: "underline" }}>Manage in Billing</Link>
                    </p>
                  )}
                  {errorSlug === feature.slug && (
                    <p style={{ margin: "6px 0 0", ...TYPE.footnote, fontWeight: 700, color: "#F43F5E" }}>
                      Couldn&apos;t save - please try again.
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleToggle(feature.slug)}
                    style={{
                      minHeight: 34,
                      borderRadius: 999,
                      padding: "0 15px",
                      fontSize: 12,
                      fontWeight: 900,
                      backgroundColor: isHidden ? "rgba(255,255,255,0.08)" : `${GREEN}18`,
                      color: isHidden ? "rgba(255,255,255,0.55)" : GREEN,
                      border: `1px solid ${isHidden ? "rgba(255,255,255,0.12)" : `${GREEN}35`}`,
                      cursor: pending ? "default" : "pointer",
                      opacity: pending ? 0.6 : 1,
                      letterSpacing: "0.01em",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {isHidden ? "Show on my site" : "Hide from my site"}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
