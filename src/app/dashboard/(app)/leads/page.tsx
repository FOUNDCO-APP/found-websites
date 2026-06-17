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

function formatDate(iso: string) {
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const msDay = 86400000
  if (diff < msDay)     return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  if (diff < 7 * msDay) return d.toLocaleDateString("en-US", { weekday: "short" })
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function TempBadge({ temp }: { temp: string | null }) {
  const map: Record<string, { label: string; color: string }> = {
    hot:  { label: "Hot",  color: "#FF4B4B" },
    warm: { label: "Warm", color: "#FF9500" },
    cold: { label: "Cold", color: "rgba(255,255,255,0.25)" },
  }
  const t = map[temp ?? "warm"] ?? map.warm
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: t.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      {t.label}
    </span>
  )
}

export default function LeadsPage() {
  const [view, setView] = useState<"leads" | "inbox">("leads")
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

  return (
    <main style={{ padding: "28px 20px" }}>

      {/* Header + toggle */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            {view === "leads" ? "Leads" : "Inbox"}
          </h1>
          <button onClick={() => setShowAdd(true)} style={{
            width: 36, height: 36, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        <div style={{ display: "inline-flex", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 10, padding: 3 }}>
          {(["leads", "inbox"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "7px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
              backgroundColor: view === v ? SIGNAL_GREEN : "transparent",
              color: view === v ? FOUND_BLACK : "rgba(255,255,255,0.4)",
              transition: "all 0.15s ease",
            }}>
              {v === "leads" ? "Leads" : "Inbox"}
            </button>
          ))}
        </div>
      </div>

      {/* Add Lead form */}
      {showAdd && (
        <div style={{
          borderRadius: 16, padding: 20, marginBottom: 20,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: `1px solid ${SIGNAL_GREEN}44`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "white", marginBottom: 16 }}>New Lead</div>
          {[
            { label: "Name *", val: newName, set: setNewName, placeholder: "Full name", type: "text" },
            { label: "Phone", val: newPhone, set: setNewPhone, placeholder: "Phone number", type: "tel" },
            { label: "Email", val: newEmail, set: setNewEmail, placeholder: "Email address", type: "email" },
            { label: "Notes", val: newNotes, set: setNewNotes, placeholder: "What are they looking for?", type: "text" },
          ].map(({ label, val, set, placeholder, type }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
              <input
                type={type}
                value={val}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white", fontSize: 14, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          ))}
          {/* Temperature */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>Temperature</div>
            <div style={{ display: "flex", gap: 8 }}>
              {(["hot", "warm", "cold"] as const).map(t => {
                const colors = { hot: "#FF4B4B", warm: "#FF9500", cold: "rgba(255,255,255,0.4)" }
                const active = newTemp === t
                return (
                  <button key={t} onClick={() => setNewTemp(t)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid",
                    borderColor: active ? colors[t] : "rgba(255,255,255,0.1)",
                    backgroundColor: active ? `${colors[t]}22` : "transparent",
                    color: active ? colors[t] : "rgba(255,255,255,0.35)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                  }}>{t}</button>
                )
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setShowAdd(false); setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTemp("warm") }} style={{
              flex: 1, padding: "12px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
              backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={handleSaveLead} disabled={!newName.trim() || saving} style={{
              flex: 2, padding: "12px 0", borderRadius: 10, border: "none",
              backgroundColor: newName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
              color: newName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.3)",
              fontSize: 13, fontWeight: 700, cursor: newName.trim() ? "pointer" : "default",
            }}>{saving ? "Saving…" : "Save Lead"}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ paddingTop: 60, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Loading…</div>
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
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 300, color: "white" }}>Your site is live and listening.</p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>Your first lead will show up here.</p>
        </div>
      ) : view === "leads" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {leads.map(lead => {
            const pa = lead.partial_answers
            const preview = lead.message || pa?.message || pa?.services || pa?.description || ""
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
                  {(lead.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{lead.name || "Unknown"}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <TempBadge temp={lead.temperature} />
                      {lead.created_at && (
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatDate(lead.created_at)}</span>
                      )}
                    </div>
                  </div>
                  {lead.source === "manual" && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Manual</span>
                  )}
                  {lead.email && (
                    <p style={{ margin: "2px 0", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</p>
                  )}
                  {preview && (
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preview}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leads.map(lead => {
            const pa = lead.partial_answers
            const message = lead.message || pa?.message || pa?.services || pa?.description || ""
            const emailHref = lead.email
              ? `mailto:${lead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(lead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
              : null
            const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null
            return (
              <div key={lead.id} style={{
                borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden",
              }}>
                <div style={{ padding: "16px 18px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    backgroundColor: `${SIGNAL_GREEN}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, fontSize: 15, fontWeight: 700, color: SIGNAL_GREEN,
                  }}>
                    {(lead.name || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{lead.name || "Unknown"}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                        <TempBadge temp={lead.temperature} />
                        {lead.created_at && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{formatDate(lead.created_at)}</span>
                        )}
                      </div>
                    </div>
                    {lead.email && (
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email}</p>
                    )}
                    {message && (
                      <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as React.CSSProperties}>{message}</p>
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
