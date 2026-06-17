"use client"

import React, { useState } from "react"
import { useEffect } from "react"

const SIGNAL_GREEN = "#32D074"

type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  type: string | null
  created_at: string | null
  partial_answers: Record<string, string> | null
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const msDay = 86400000
  if (diff < msDay)     return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  if (diff < 7 * msDay) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function LeadsPage() {
  const [view, setView] = useState<"leads" | "inbox">("leads")
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <main style={{ padding: "28px 20px" }}>

      {/* Header + toggle */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
          {view === "leads" ? "Leads" : "Inbox"}
        </h1>
        {/* Segmented control */}
        <div style={{
          display: "inline-flex",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 10,
          padding: 3,
        }}>
          {(["leads", "inbox"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 20px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.02em",
              backgroundColor: view === v ? SIGNAL_GREEN : "transparent",
              color: view === v ? "#080A09" : "rgba(255,255,255,0.4)",
              transition: "all 0.15s ease",
            }}>
              {v === "leads" ? "Leads" : "Inbox"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ paddingTop: 60, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
          Loading...
        </div>
      ) : leads.length === 0 ? (
        <div style={{ paddingTop: 60, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.04)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>
            Your site is live and listening.
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
            Your first lead will show up here.
          </p>
        </div>
      ) : view === "leads" ? (
        /* LEADS VIEW — compact list */
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {leads.map((lead) => {
            const pa = lead.partial_answers
            const preview = lead.message || pa?.message || pa?.services || pa?.description || ""
            const initial = (lead.name || "?")[0].toUpperCase()
            return (
              <div key={lead.id} style={{
                borderRadius: 14, padding: "16px 18px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "flex-start", gap: 14,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  backgroundColor: `${SIGNAL_GREEN}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 14, fontWeight: 700, color: SIGNAL_GREEN,
                }}>
                  {initial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                      {lead.name || "Unknown"}
                    </span>
                    {lead.created_at && (
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>
                        {formatDate(lead.created_at)}
                      </span>
                    )}
                  </div>
                  {lead.email && (
                    <p style={{ margin: "0 0 3px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {lead.email}
                    </p>
                  )}
                  {preview && (
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {preview}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* INBOX VIEW — cards with call/reply actions */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map((lead) => {
            const pa = lead.partial_answers
            const message = lead.message || pa?.message || pa?.services || pa?.description || ""
            const initial = (lead.name || "?")[0].toUpperCase()
            const emailHref = lead.email
              ? `mailto:${lead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(lead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
              : null
            const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null

            return (
              <div key={lead.id} style={{
                borderRadius: 16,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                overflow: "hidden",
              }}>
                <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: `${SIGNAL_GREEN}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 15, fontWeight: 700, color: SIGNAL_GREEN,
                  }}>
                    {initial}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>
                        {lead.name || "Unknown"}
                      </span>
                      {lead.created_at && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0, marginLeft: 12 }}>
                          {formatDate(lead.created_at)}
                        </span>
                      )}
                    </div>
                    {lead.email && (
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {lead.email}
                      </p>
                    )}
                    {message && (
                      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>
                        {message}
                      </p>
                    )}
                  </div>
                </div>
                {(emailHref || phoneHref) && (
                  <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {phoneHref && (
                      <a href={phoneHref} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 7, padding: "12px 0", textDecoration: "none",
                        borderRight: emailHref ? "1px solid rgba(255,255,255,0.05)" : "none",
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Call</span>
                      </a>
                    )}
                    {emailHref && (
                      <a href={emailHref} style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 7, padding: "12px 0", textDecoration: "none",
                      }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Reply</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
