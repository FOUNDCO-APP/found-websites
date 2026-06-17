"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

const SIGNAL_GREEN = "#32D074"
const FOUND_BLACK = "#080A09"

type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  type: string | null
  source: string | null
  temperature: string | null
  created_at: string | null
  partial_answers: Record<string, string> | null
}

function formatTimeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return "Just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

const TEMP_COLORS: Record<string, string> = {
  hot: "#FF4B4B",
  warm: "#FF9500",
  cold: "rgba(255,255,255,0.2)",
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newNotes, setNewNotes] = useState("")
  const [newTemp, setNewTemp] = useState<"hot" | "warm" | "cold">("warm")

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setShowAdd(true)
      router.replace("/leads")
    }
  }, [searchParams, router])

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(d => { setLeads(d.leads ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleSaveLead() {
    if (!newName.trim()) return
    setSaving(true)
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail, notes: newNotes, temperature: newTemp }),
    })
    const data = await res.json()
    if (data.lead) {
      setLeads(prev => [data.lead, ...prev])
      setShowAdd(false)
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTemp("warm")
    }
    setSaving(false)
  }

  const hotLeads = leads.filter(l => l.temperature === "hot")
  const otherLeads = leads.filter(l => l.temperature !== "hot")

  return (
    <main style={{ padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 300, color: "white", letterSpacing: "-0.04em", lineHeight: 0.95 }}>
            Leads
          </h1>
          {leads.length > 0 && (
            <p style={{ margin: "8px 0 0", fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.18em" }}>
              {leads.length} {leads.length === 1 ? "contact" : "contacts"}
            </p>
          )}
        </div>
        <button onClick={() => setShowAdd(true)} style={{
          width: 44, height: 44, borderRadius: "50%",
          backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${SIGNAL_GREEN}44`,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Add Lead sheet */}
      {showAdd && (
        <div style={{
          borderRadius: 24, padding: 24, marginBottom: 24,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: `1px solid ${SIGNAL_GREEN}33`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "white", marginBottom: 20 }}>New Lead</div>

          {/* Temperature first — sets the tone */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>How hot is this lead?</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["hot", "warm", "cold"] as const).map(t => {
                const active = newTemp === t
                const color = TEMP_COLORS[t]
                const labels = { hot: "🔥 Hot", warm: "⚡ Warm", cold: "❄️ Cold" }
                return (
                  <button key={t} onClick={() => setNewTemp(t)} style={{
                    flex: 1, padding: "10px 0", borderRadius: 14, border: "1px solid",
                    borderColor: active ? color : "rgba(255,255,255,0.08)",
                    backgroundColor: active ? `${color}18` : "transparent",
                    color: active ? color : "rgba(255,255,255,0.3)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>{labels[t]}</button>
                )
              })}
            </div>
          </div>

          {[
            { label: "Name", val: newName, set: setNewName, placeholder: "Their name", type: "text", required: true },
            { label: "Phone", val: newPhone, set: setNewPhone, placeholder: "Phone number", type: "tel", required: false },
            { label: "Email", val: newEmail, set: setNewEmail, placeholder: "Email address", type: "email", required: false },
            { label: "Notes", val: newNotes, set: setNewNotes, placeholder: "What are they looking for?", type: "text", required: false },
          ].map(({ label, val, set, placeholder, type }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
              <input
                type={type}
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "13px 16px", borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "white", fontSize: 15, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTemp("warm") }} style={{
              flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSaveLead} disabled={!newName.trim() || saving} style={{
              flex: 2, padding: "14px 0", borderRadius: 14, border: "none",
              backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
              color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.2)",
              fontSize: 14, fontWeight: 700, cursor: newName.trim() ? "pointer" : "default",
            }}>{saving ? "Saving…" : "Save Lead"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
          Loading…
        </div>
      ) : leads.length === 0 ? (
        <div style={{ paddingTop: 80, textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            Your first lead is coming.
          </p>
          <p style={{ margin: "0 0 28px", fontSize: 14, color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
            Add one manually from a networking<br/>event, or wait for your site to bring one in.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Hot leads — elevated */}
          {hotLeads.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: TEMP_COLORS.hot, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
                🔥 Hot
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {hotLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            </div>
          )}

          {/* All other leads */}
          {otherLeads.length > 0 && (
            <div>
              {hotLeads.length > 0 && (
                <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.15)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 12 }}>
                  All Leads
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {otherLeads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
              </div>
            </div>
          )}

        </div>
      )}
    </main>
  )
}

function LeadCard({ lead }: { lead: LeadRow }) {
  const pa = lead.partial_answers
  const preview = lead.message || pa?.message || pa?.services || pa?.description || ""
  const emailHref = lead.email
    ? `mailto:${lead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(lead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
    : null
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null
  const smsHref = lead.phone ? `sms:${lead.phone.replace(/\D/g, "")}` : null
  const tempColor = TEMP_COLORS[lead.temperature ?? "warm"] ?? TEMP_COLORS.warm

  return (
    <div style={{
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "18px 18px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Avatar with temp color ring */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `radial-gradient(circle, ${tempColor}22, ${tempColor}08)`,
          border: `1.5px solid ${tempColor}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, fontSize: 16, fontWeight: 700, color: tempColor,
        }}>
          {(lead.name || "?")[0].toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "white" }}>
              {lead.name || "Unknown"}
            </span>
            {lead.created_at && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
                {formatTimeAgo(lead.created_at)}
              </span>
            )}
          </div>
          {preview ? (
            <p style={{
              margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.5,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {preview}
            </p>
          ) : lead.source === "manual" ? (
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Added manually</p>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.2)" }}>Reached out from your site</p>
          )}
        </div>
      </div>

      {/* Inline actions */}
      {(phoneHref || emailHref) && (
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "0 4px 4px" }}>
          {phoneHref && (
            <a href={phoneHref} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Call</span>
            </a>
          )}
          {smsHref && (
            <a href={smsHref} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>Text</span>
            </a>
          )}
          {emailHref && (
            <a href={emailHref} style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>Email</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
