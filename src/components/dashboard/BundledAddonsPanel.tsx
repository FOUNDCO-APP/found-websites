"use client"

import { useState, useTransition } from "react"
import { toggleBundledAddon } from "@/app/dashboard/(app)/more/actions"
import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"

type AddonDef = { slug: string; label: string; description: string }

export default function BundledAddonsPanel({
  companyId,
  addons,
  disabledAddons,
}: {
  companyId: string
  addons: AddonDef[]
  disabledAddons: string[]
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(disabledAddons))
  const [pending, startTransition] = useTransition()
  const [errorSlug, setErrorSlug] = useState<string | null>(null)

  function handleToggle(slug: string) {
    const willHide = !hidden.has(slug)
    setErrorSlug(null)
    setHidden((prev) => {
      const next = new Set(prev)
      if (willHide) next.add(slug); else next.delete(slug)
      return next
    })
    startTransition(async () => {
      const result = await toggleBundledAddon(companyId, slug, willHide)
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
    <section style={{ marginBottom: 20 }}>
      <p style={{ margin: "0 0 2px", ...TYPE.title, fontWeight: 700, color: "white" }}>
        Bundled Features
      </p>
      <p style={{ margin: "0 0 12px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        All included free with Found Business. Hide anything you don&apos;t use - your site only shows what&apos;s on.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {addons.map((addon) => {
          const isHidden = hidden.has(addon.slug)
          return (
            <div key={addon.slug} style={{
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
                    <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 600, color: "white" }}>{addon.label}</p>
                  </div>
                  <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    {addon.description}
                  </p>
                  {errorSlug === addon.slug && (
                    <p style={{ margin: "6px 0 0", ...TYPE.footnote, fontWeight: 700, color: "#F43F5E" }}>
                      Couldn&apos;t save - please try again.
                    </p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleToggle(addon.slug)}
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
    </section>
  )
}
