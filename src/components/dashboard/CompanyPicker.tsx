"use client"

import { useState } from "react"
import type { CompanyRow } from "@/lib/dashboard/getCompany"

const SIGNAL_GREEN = "#32D074"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function planLabel(plan: string | null) {
  if (plan === "found_pro") return "Pro"
  if (plan === "found_business") return "Business"
  return "Found"
}

function initial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?"
}

export default function CompanyPicker({
  companies,
}: {
  companies: CompanyRow[]
}) {
  // Set the moment a business is tapped before the hard navigation starts.
  const [pendingId, setPendingId] = useState<string | null>(null)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {companies.map((company) => {
        const isPending  = pendingId === company.id
        const isDisabled = pendingId !== null && !isPending
        return (
          <button
            key={company.id}
            type="button"
            disabled={isDisabled}
            onClick={() => {
              setPendingId(company.id)
              window.location.assign(`/api/select-company?id=${encodeURIComponent(company.id)}`)
            }}
              style={{
                width: "100%",
                background: "none",
                border: `1px solid ${isPending ? SIGNAL_GREEN : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16,
                padding: "16px 18px",
                cursor: isDisabled ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                backgroundColor: isPending ? `${SIGNAL_GREEN}14` : "rgba(255,255,255,0.04)",
                fontFamily: "inherit",
                transition: "background-color 150ms ease, border-color 150ms ease, opacity 150ms ease",
                textAlign: "left",
                opacity: isDisabled ? 0.4 : 1,
              }}>
              {/* Avatar */}
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: company.primary_color || SIGNAL_GREEN,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 700,
                color: "white",
                flexShrink: 0,
                opacity: 0.9,
              }}>
                {initial(company.name)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: "0 0 3px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "white",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {company.name}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: "rgba(255,255,255,0.35)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {company.slug}.{ROOT_DOMAIN} - {planLabel(company.plan)}
                </p>
              </div>

              {/* Chevron swaps to a spinner the instant this one is picked */}
              {isPending ? (
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid rgba(50,208,116,0.25)",
                  borderTopColor: SIGNAL_GREEN,
                  flexShrink: 0,
                  animation: "companyPickerSpin 0.6s linear infinite",
                }} />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
          </button>
        )
      })}

      <style>{`
        @keyframes companyPickerSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
