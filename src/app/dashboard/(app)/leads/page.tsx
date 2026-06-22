"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TYPE, TEXT_OPACITY, ICON, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, formIntentLabelFor, defaultFormIntentFor, FormIntentLabel } from "@/lib/dashboard/typography"
import { addContact } from "../contacts/actions"

type LeadRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  message: string | null
  type: string | null
  source: string | null
  temperature: string | null
  status: string | null
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
  cold: "rgba(255,255,255,0.25)",
}

const INTENT_OPTIONS = [
  { key: "lead",        label: "Leads",        desc: "Sales pipeline, clients reaching out" },
  { key: "estimate",    label: "Estimates",     desc: "Requests for quotes or pricing" },
  { key: "inquiry",     label: "Inquiries",     desc: "General questions and info requests" },
  { key: "booking",     label: "Bookings",      desc: "Service appointments and sessions" },
  { key: "reservation", label: "Reservations",  desc: "Dining, events, and time slots" },
  { key: "order",       label: "Orders",        desc: "Product purchases and retail" },
  { key: "appointment", label: "Appointments",  desc: "Healthcare and professional services" },
]

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
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null)
  const [industry, setIndustry] = useState<string | null>(null)
  const [formIntent, setFormIntent] = useState<string | null>(null)
  const [filterTemp, setFilterTemp] = useState<"all" | "hot" | "warm" | "cold">("all")
  const [showClosedSection, setShowClosedSection] = useState(false)
  const [showIntentPicker, setShowIntentPicker] = useState(false)

  const effectiveIntent = formIntent ?? defaultFormIntentFor(industry)
  const intentLabel = formIntentLabelFor(effectiveIntent)

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setShowAdd(true)
      router.replace("/leads")
    }
  }, [searchParams, router])

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then(r => r.json()),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({ industry: null, formIntent: null })),
    ]).then(([ld, sd]) => {
      setLeads(ld.leads ?? [])
      setIndustry(sd.industry ?? null)
      setFormIntent(sd.formIntent ?? null)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleSaveLead() {
    if (!newName.trim()) return
    setSaving(true)
    const body: Record<string, unknown> = { name: newName, phone: newPhone, email: newEmail, notes: newNotes }
    if (intentLabel.hasTemperature) body.temperature = newTemp
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.lead) {
      setLeads(prev => [data.lead, ...prev])
      setShowAdd(false)
      setNewName(""); setNewPhone(""); setNewEmail(""); setNewNotes(""); setNewTemp("warm")
    }
    setSaving(false)
  }

  async function updateTemp(id: string, temp: "hot" | "warm" | "cold") {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, temperature: temp } : l))
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, temperature: temp }),
    }).catch(console.error)
  }

  function updateStatusLocal(id: string, status: "open" | "closed") {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(console.error)
  }

  async function changeFormIntent(intent: string) {
    setFormIntent(intent)
    setShowIntentPicker(false)
    fetch("/api/company-slug", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ form_intent: intent }),
    }).catch(console.error)
  }

  const openLeads = leads.filter(l => !l.status || l.status === "open")
  const closedLeads = leads.filter(l => l.status === "closed")

  const filteredOpen = filterTemp === "all"
    ? openLeads
    : openLeads.filter(l => (l.temperature ?? "warm") === filterTemp)

  const hotLeads   = filterTemp === "all" ? openLeads.filter(l => l.temperature === "hot") : []
  const otherLeads = filterTemp === "all" ? openLeads.filter(l => l.temperature !== "hot") : filteredOpen

  const FILTER_PILLS: { key: "all" | "hot" | "warm" | "cold"; label: string; color?: string }[] = [
    { key: "all",  label: "All" },
    { key: "hot",  label: "Hot",  color: TEMP_COLORS.hot },
    { key: "warm", label: "Warm", color: TEMP_COLORS.warm },
    { key: "cold", label: "Cold", color: "rgba(255,255,255,0.4)" },
  ]

  return (
    <main style={{ padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>
              {intentLabel.plural}
            </h1>
            <button onClick={() => setShowIntentPicker(true)} style={{
              border: "none", background: "none", padding: "4px", cursor: "pointer",
              color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.07 4.93l-1.41 1.41M5.34 17.66l-1.41 1.41M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M5.34 6.34L3.93 4.93M12 2v2M12 20v2"/>
              </svg>
            </button>
          </div>
          {(openLeads.length > 0 || closedLeads.length > 0) && (
            <p style={{ margin: "6px 0 0", color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.caption }}>
              {openLeads.length} open{closedLeads.length > 0 ? ` · ${closedLeads.length} done` : ""}
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

      {/* Temperature filter pills — only for temp-based intents */}
      {intentLabel.hasTemperature && openLeads.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 2 }}>
          {FILTER_PILLS.map(pill => {
            const active = filterTemp === pill.key
            const dotColor = pill.color ?? SIGNAL_GREEN
            return (
              <button key={pill.key} onClick={() => setFilterTemp(pill.key)} style={{
                flexShrink: 0,
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 100,
                border: `1px solid ${active ? dotColor : "rgba(255,255,255,0.1)"}`,
                backgroundColor: active ? `${dotColor}1A` : "transparent",
                color: active ? dotColor : "rgba(255,255,255,0.35)",
                fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
              }}>
                {pill.key !== "all" && (
                  <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: active ? dotColor : "rgba(255,255,255,0.2)", flexShrink: 0 }}/>
                )}
                {pill.label}
                {pill.key !== "all" && (
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, opacity: 0.7 }}>
                    {openLeads.filter(l => (l.temperature ?? "warm") === pill.key).length}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div style={{
          borderRadius: 24, padding: 24, marginBottom: 24,
          backgroundColor: "rgba(255,255,255,0.05)",
          border: `1px solid ${SIGNAL_GREEN}33`,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "white", marginBottom: 20 }}>{intentLabel.new}</div>

          {intentLabel.hasTemperature && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: "white", opacity: TEXT_OPACITY.secondary, marginBottom: 10, ...TYPE.caption }}>Temperature</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["hot", "warm", "cold"] as const).map(t => {
                  const active = newTemp === t
                  const color = TEMP_COLORS[t]
                  return (
                    <button key={t} onClick={() => setNewTemp(t)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 14, border: "1px solid",
                      borderColor: active ? color : "rgba(255,255,255,0.08)",
                      backgroundColor: active ? `${color}18` : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: active ? color : "rgba(255,255,255,0.25)", flexShrink: 0 }}/>
                      <span style={{ ...TYPE.subhead, fontWeight: 700, color: active ? color : "rgba(255,255,255,0.3)" }}>
                        {t === "hot" ? "Hot" : t === "warm" ? "Warm" : "Cold"}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {[
            { label: "Name", val: newName, set: setNewName, placeholder: "Their name", type: "text" },
            { label: "Phone", val: newPhone, set: setNewPhone, placeholder: "Phone number", type: "tel" },
            { label: "Email", val: newEmail, set: setNewEmail, placeholder: "Email address", type: "email" },
            { label: "Notes", val: newNotes, set: setNewNotes, placeholder: "What are they looking for?", type: "text" },
          ].map(({ label, val, set, placeholder, type }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ color: "white", opacity: TEXT_OPACITY.secondary, marginBottom: 6, ...TYPE.caption }}>{label}</div>
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
            }}>{saving ? "Saving…" : `Save ${intentLabel.singular}`}</button>
          </div>
        </div>
      )}

      {/* Main content */}
      {loading ? (
        <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 16 }}>
          Loading…
        </div>
      ) : filteredOpen.length === 0 && filterTemp !== "all" ? (
        <div style={{ paddingTop: 60, textAlign: "center" }}>
          <p style={{ margin: "0 0 8px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            No {filterTemp} {intentLabel.plural.toLowerCase()}.
          </p>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
            Tap the temperature pill on any {intentLabel.singular.toLowerCase()} to tag it.
          </p>
        </div>
      ) : openLeads.length === 0 && closedLeads.length === 0 ? (
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
          <p style={{ margin: "0 0 8px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            Your first {intentLabel.singular.toLowerCase()} is coming.
          </p>
          <p style={{ margin: "0 0 28px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
            Add one manually or wait for your site to bring one in.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {intentLabel.hasTemperature && hotLeads.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: TEMP_COLORS.hot, marginBottom: 12, ...TYPE.caption }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: TEMP_COLORS.hot, flexShrink: 0 }}/>
                Hot
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {hotLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} hasTemperature={intentLabel.hasTemperature} onSelect={setSelectedLead} onTempChange={updateTemp} />
                ))}
              </div>
            </div>
          )}

          {otherLeads.length > 0 && (
            <div>
              {intentLabel.hasTemperature && hotLeads.length > 0 && filterTemp === "all" && (
                <div style={{ color: "white", opacity: TEXT_OPACITY.disabled, marginBottom: 12, ...TYPE.caption }}>
                  All {intentLabel.plural}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {otherLeads.map(lead => (
                  <LeadCard key={lead.id} lead={lead} hasTemperature={intentLabel.hasTemperature} onSelect={setSelectedLead} onTempChange={updateTemp} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Closed / Done section */}
      {!loading && closedLeads.length > 0 && (
        <div style={{ marginTop: openLeads.length === 0 && closedLeads.length > 0 ? 0 : 36 }}>
          <button onClick={() => setShowClosedSection(v => !v)} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "13px 18px", borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span style={{ color: "rgba(255,255,255,0.4)", ...TYPE.subhead, fontWeight: 600 }}>
                Done ({closedLeads.length})
              </span>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showClosedSection ? "rotate(90deg)" : "none", transition: "transform 0.2s ease" }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {showClosedSection && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
              {closedLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} hasTemperature={false} onSelect={setSelectedLead} onTempChange={updateTemp} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail sheet */}
      {selectedLead && (
        <LeadDetailSheet
          lead={selectedLead}
          intentLabel={intentLabel}
          onClose={() => setSelectedLead(null)}
          onSaved={(updated) => {
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
            setSelectedLead(updated)
          }}
          onMarkDone={(id) => {
            updateStatusLocal(id, "closed")
          }}
          onReopen={(id) => {
            updateStatusLocal(id, "open")
            setSelectedLead(prev => prev ? { ...prev, status: "open" } : null)
          }}
        />
      )}

      {/* Form intent picker */}
      {showIntentPicker && (
        <IntentPickerSheet
          current={effectiveIntent}
          onSelect={changeFormIntent}
          onClose={() => setShowIntentPicker(false)}
        />
      )}
    </main>
  )
}

function LeadCard({
  lead, hasTemperature, onSelect, onTempChange,
}: {
  lead: LeadRow
  hasTemperature: boolean
  onSelect: (lead: LeadRow) => void
  onTempChange: (id: string, temp: "hot" | "warm" | "cold") => void
}) {
  const [pickingTemp, setPickingTemp] = useState(false)
  const pa = lead.partial_answers
  const preview = lead.message || pa?.message || pa?.services || pa?.description || ""
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null
  const smsHref = lead.phone ? `sms:${lead.phone.replace(/\D/g, "")}` : null
  const emailHref = lead.email
    ? `mailto:${lead.email}?subject=Re%3A%20Your%20inquiry&body=Hi%20${encodeURIComponent(lead.name || "there")}%2C%0A%0AThanks%20for%20reaching%20out.%20`
    : null
  const currentTemp = (lead.temperature ?? null) as "hot" | "warm" | "cold" | null
  const tempColor = currentTemp ? TEMP_COLORS[currentTemp] : "rgba(255,255,255,0.18)"
  const tempLabel = currentTemp ? (currentTemp.charAt(0).toUpperCase() + currentTemp.slice(1)) : "—"
  const isDone = lead.status === "closed"

  return (
    <div style={{
      borderRadius: 20,
      backgroundColor: isDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      overflow: "hidden",
      opacity: isDone ? 0.6 : 1,
    }}>
      <div
        onClick={() => { if (!pickingTemp) onSelect(lead) }}
        style={{ padding: "16px 16px 12px", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: preview ? 6 : 0 }}>
          <span style={{ color: "white", ...TYPE.headline, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.name || "Unknown"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* Temperature pill — only for temp-based intents */}
            {hasTemperature && (
              pickingTemp ? (
                <div style={{ display: "flex", gap: 5, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  {(["hot", "warm", "cold"] as const).map(t => (
                    <button key={t} onClick={() => { onTempChange(lead.id, t); setPickingTemp(false) }} style={{
                      padding: "3px 9px", borderRadius: 100, border: "none", cursor: "pointer",
                      backgroundColor: TEMP_COLORS[t],
                      color: t === "cold" ? "rgba(0,0,0,0.7)" : "white", fontSize: "0.75rem", fontWeight: 700,
                    }}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                  <button onClick={e => { e.stopPropagation(); setPickingTemp(false) }} style={{
                    border: "none", background: "none", color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", cursor: "pointer", padding: "3px 4px",
                  }}>✕</button>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); setPickingTemp(true) }} style={{
                  padding: "3px 10px", borderRadius: 100, border: `1px solid ${currentTemp ? `${tempColor}55` : "rgba(255,255,255,0.12)"}`,
                  backgroundColor: currentTemp ? `${tempColor}18` : "transparent",
                  color: currentTemp ? tempColor : "rgba(255,255,255,0.3)",
                  fontSize: "0.75rem", fontWeight: 700, cursor: "pointer",
                }}>
                  {tempLabel}
                </button>
              )
            )}
            {lead.created_at && (
              <span style={{ color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.footnote }}>
                {formatTimeAgo(lead.created_at)}
              </span>
            )}
            <svg width={ICON.chevron} height={ICON.chevron} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </div>

        {preview ? (
          <p style={{ margin: 0, color: "white", opacity: TEXT_OPACITY.secondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...TYPE.subhead }}>
            {preview}
          </p>
        ) : (
          <p style={{ margin: 0, color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.subhead }}>
            {lead.source === "manual" ? "Added manually" : "Reached out from your site"}
          </p>
        )}
      </div>

      {/* Inline contact actions */}
      {!isDone && (phoneHref || emailHref) && (
        <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "0 4px 4px" }}>
          {phoneHref && (
            <a href={phoneHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: SIGNAL_GREEN, letterSpacing: "0.04em" }}>Call</span>
            </a>
          )}
          {smsHref && (
            <a href={smsHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>Text</span>
            </a>
          )}
          {emailHref && (
            <a href={emailHref} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 8px", textDecoration: "none", borderRadius: 14 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>Email</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}

type SheetMode = "view" | "edit" | "done"

function LeadDetailSheet({ lead, intentLabel, onClose, onSaved, onMarkDone, onReopen }: {
  lead: LeadRow
  intentLabel: FormIntentLabel
  onClose: () => void
  onSaved: (lead: LeadRow) => void
  onMarkDone: (id: string) => void
  onReopen: (id: string) => void
}) {
  const [mode, setMode] = useState<SheetMode>("view")
  const [name, setName] = useState(lead.name ?? "")
  const [phone, setPhone] = useState(lead.phone ?? "")
  const [email, setEmail] = useState(lead.email ?? "")
  const [message, setMessage] = useState(lead.message ?? "")
  const [temp, setTemp] = useState<"hot" | "warm" | "cold">((lead.temperature as "hot"|"warm"|"cold") ?? "warm")
  const [saving, setSaving] = useState(false)
  const [savingContact, setSavingContact] = useState(false)

  const isDone = lead.status === "closed"
  const phoneHref = lead.phone ? `tel:${lead.phone.replace(/\D/g, "")}` : null
  const smsHref = lead.phone ? `sms:${lead.phone.replace(/\D/g, "")}` : null
  const emailHref = lead.email ? `mailto:${lead.email}` : null
  const tempColor = TEMP_COLORS[lead.temperature ?? "warm"] ?? TEMP_COLORS.warm

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, name, phone, email, message, temperature: temp }),
    })
    const data = await res.json()
    setSaving(false)
    if (data.lead) {
      onSaved(data.lead)
      setMode("view")
    }
  }

  function handleMarkDone() {
    onMarkDone(lead.id)
    setMode("done")
  }

  async function handleSaveToContacts() {
    setSavingContact(true)
    try {
      await addContact({
        name: lead.name || "Unknown",
        phone: lead.phone || undefined,
        email: lead.email || undefined,
        notes: lead.message || undefined,
        tags: [],
      })
    } catch {}
    setSavingContact(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: "#101411",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: "14px 22px 36px",
        maxHeight: "88dvh",
        overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>

        {/* Done state — offer to save to contacts */}
        {mode === "done" && (
          <div style={{ textAlign: "center", paddingTop: 16, paddingBottom: 8 }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              backgroundColor: `${SIGNAL_GREEN}18`,
              border: `1px solid ${SIGNAL_GREEN}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", color: "white", ...TYPE.title }}>Marked as done</h2>
            {(lead.phone || lead.email) && (
              <>
                <p style={{ margin: "0 0 24px", color: "white", opacity: TEXT_OPACITY.secondary, ...TYPE.subhead, lineHeight: 1.6 }}>
                  Want to save {lead.name || "this person"} to your contacts?
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={onClose} style={{
                    flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
                    backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}>Skip</button>
                  <button onClick={handleSaveToContacts} disabled={savingContact} style={{
                    flex: 2, padding: "14px 0", borderRadius: 14, border: "none",
                    backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 14, fontWeight: 700,
                    cursor: savingContact ? "default" : "pointer", opacity: savingContact ? 0.6 : 1,
                  }}>{savingContact ? "Saving…" : "Save to Contacts"}</button>
                </div>
              </>
            )}
            {!lead.phone && !lead.email && (
              <button onClick={onClose} style={{
                marginTop: 16, padding: "14px 32px", borderRadius: 14, border: "none",
                backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>Done</button>
            )}
          </div>
        )}

        {/* View mode */}
        {mode === "view" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: "0 0 8px", color: "white", ...TYPE.title }}>
                  {lead.name || "Unknown"}
                </h2>
                {intentLabel.hasTemperature && !isDone && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, backgroundColor: `${tempColor}18` }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: tempColor }}/>
                    <span style={{ color: tempColor, ...TYPE.caption }}>
                      {lead.temperature ?? "warm"}
                    </span>
                  </div>
                )}
                {isDone && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 100, backgroundColor: `${SIGNAL_GREEN}12` }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span style={{ color: SIGNAL_GREEN, ...TYPE.caption }}>Done</span>
                  </div>
                )}
              </div>
              {!isDone && (
                <button onClick={() => setMode("edit")} style={{
                  padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)",
                  fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0,
                }}>
                  Edit
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              {phoneHref && (
                <a href={phoneHref} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: `${SIGNAL_GREEN}15`, textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: SIGNAL_GREEN }}>Call</span>
                </a>
              )}
              {smsHref && (
                <a href={smsHref} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>Text</span>
                </a>
              )}
              {emailHref && (
                <a href={emailHref} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 0", borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.6)" }}>Email</span>
                </a>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
              {lead.phone && <DetailRow label="Phone" value={lead.phone} />}
              {lead.email && <DetailRow label="Email" value={lead.email} />}
              {lead.created_at && (
                <DetailRow label="Received" value={new Date(lead.created_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })} />
              )}
              {lead.source && (
                <DetailRow label="Source" value={lead.source === "manual" ? "Added manually" : lead.source === "website" ? "Website form" : lead.source} />
              )}
              {lead.message && (
                <div>
                  <div style={{ color: "white", opacity: TEXT_OPACITY.tertiary, marginBottom: 8, ...TYPE.caption }}>Notes</div>
                  <p style={{ margin: 0, color: "white", opacity: TEXT_OPACITY.secondary, whiteSpace: "pre-wrap", ...TYPE.body }}>
                    {lead.message}
                  </p>
                </div>
              )}
            </div>

            {/* Mark as Done / Reopen */}
            {isDone ? (
              <button onClick={() => onReopen(lead.id)} style={{
                width: "100%", padding: "14px 0", borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "transparent", color: "rgba(255,255,255,0.4)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>
                Reopen
              </button>
            ) : (
              <button onClick={handleMarkDone} style={{
                width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
                backgroundColor: `${SIGNAL_GREEN}18`,
                color: SIGNAL_GREEN, fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Mark as Done
              </button>
            )}
          </>
        )}

        {/* Edit mode */}
        {mode === "edit" && (
          <>
            <div style={{ color: SIGNAL_GREEN, marginBottom: 18, ...TYPE.caption }}>Edit {intentLabel.singular}</div>

            {intentLabel.hasTemperature && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "white", opacity: TEXT_OPACITY.secondary, marginBottom: 8, ...TYPE.caption }}>Temperature</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["hot","warm","cold"] as const).map(t => (
                    <button key={t} onClick={() => setTemp(t)} style={{
                      flex: 1, padding: "10px 0", borderRadius: 12,
                      border: `1.5px solid ${temp === t ? TEMP_COLORS[t] : "rgba(255,255,255,0.1)"}`,
                      backgroundColor: temp === t ? `${TEMP_COLORS[t]}18` : "transparent",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: temp === t ? TEMP_COLORS[t] : "rgba(255,255,255,0.25)", flexShrink: 0 }}/>
                      <span style={{ ...TYPE.subhead, fontWeight: 700, color: temp === t ? TEMP_COLORS[t] : "rgba(255,255,255,0.4)" }}>
                        {t === "hot" ? "Hot" : t === "warm" ? "Warm" : "Cold"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {[
              { label: "Name", val: name, set: setName, placeholder: "Full name" },
              { label: "Phone", val: phone, set: setPhone, placeholder: "Phone number" },
              { label: "Email", val: email, set: setEmail, placeholder: "Email address" },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>{f.label}</div>
                <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "13px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Notes</div>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Add notes…" rows={4}
                style={{ width: "100%", padding: "13px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.6, fontFamily: "inherit" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMode("view")} style={{
                flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
                backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !name.trim()} style={{
                flex: 2, padding: "14px 0", borderRadius: 14, border: "none",
                backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 14, fontWeight: 700,
                cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              }}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function IntentPickerSheet({ current, onSelect, onClose }: {
  current: string
  onSelect: (intent: string) => void
  onClose: () => void
}) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, backdropFilter: "blur(4px)" }}/>
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: "#101411",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: "14px 22px 40px",
        maxHeight: "80dvh",
        overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }}/>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>Inbox Type</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "4px 8px" }}>Done</button>
        </div>
        <p style={{ margin: "0 0 20px", color: "white", opacity: TEXT_OPACITY.secondary, ...TYPE.subhead, lineHeight: 1.5 }}>
          What kind of requests does your business receive?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {INTENT_OPTIONS.map(opt => {
            const active = current === opt.key
            return (
              <button key={opt.key} onClick={() => onSelect(opt.key)} style={{
                width: "100%", padding: "14px 18px", borderRadius: 16, border: "none", cursor: "pointer",
                backgroundColor: active ? `${SIGNAL_GREEN}18` : "rgba(255,255,255,0.04)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                textAlign: "left",
              }}>
                <div>
                  <div style={{ color: active ? SIGNAL_GREEN : "white", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>
                    {opt.label}
                  </div>
                  <div style={{ color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.caption }}>
                    {opt.desc}
                  </div>
                </div>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginBottom: 4 }}>
        {label}
      </div>
      <p style={{ margin: 0, ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
        {value}
      </p>
    </div>
  )
}
