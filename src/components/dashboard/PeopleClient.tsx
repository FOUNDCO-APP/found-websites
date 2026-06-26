"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import { GREEN, BLACK, TYPE, TEXT_OPACITY } from "@/lib/dashboard/typography"
import LeadContactSheet from "./LeadContactSheet"
import type { PersonRecord, LeadItem } from "@/app/dashboard/(app)/people/page"

function formatTimeAgo(iso: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  if (mins < 2) return "Just now"
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  if (weeks < 5) return `${weeks}w ago`
  return `${months}mo ago`
}

function formatDate(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatCents(cents: unknown) {
  const amount = typeof cents === "number" ? cents : Number(cents || 0)
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

function avatarColor(name: string | null): string {
  const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444", "#06B6D4", "#F97316"]
  const str = name ?? "?"
  const idx = str.charCodeAt(0) % colors.length
  return colors[idx]
}

function visitSummary(person: PersonRecord): string {
  const parts: string[] = []
  if (person.orderCount > 0) parts.push(`${person.orderCount} order${person.orderCount !== 1 ? "s" : ""}`)
  if (person.reservationCount > 0) parts.push(`${person.reservationCount} reservation${person.reservationCount !== 1 ? "s" : ""}`)
  if (person.inquiryCount > 0) parts.push(`${person.inquiryCount} ${person.inquiryCount === 1 ? "inquiry" : "inquiries"}`)
  return parts.join(" · ") || "1 visit"
}

function isOrder(l: LeadItem) { return l.type === "online_order" || l.source === "online_ordering" }
function isReservation(l: LeadItem) {
  return l.type === "reservation_request" || l.source === "reservation" || l.source === "reservations"
}

function orderSummary(lead: LeadItem): string {
  const items = lead.partial_answers?.items
  if (Array.isArray(items) && items.length > 0) {
    return (items as { name?: string; quantity?: number }[])
      .map(i => `${i.quantity || 1}× ${i.name || "Item"}`)
      .join(", ")
  }
  return lead.message || "Online order"
}

function reservationSummary(lead: LeadItem): string {
  const pa = lead.partial_answers ?? {}
  const parts: string[] = []
  if (pa.party_size) parts.push(`Party of ${pa.party_size}`)
  if (pa.date) parts.push(String(pa.date))
  if (pa.time) parts.push(String(pa.time))
  return parts.join(" · ") || lead.message || "Reservation"
}

// ─── Detail sheet ────────────────────────────────────────────────────────────

function PersonDetailSheet({
  person,
  industry,
  companyName,
  onClose,
}: {
  person: PersonRecord
  industry: string | null
  companyName: string
  onClose: () => void
}) {
  const [showContact, setShowContact] = useState(false)
  const [contactChannel, setContactChannel] = useState<"email" | "sms">("email")
  const displayName = person.name || "Unknown Guest"
  const color = avatarColor(person.name)
  const mostRecentLead = person.leads[0]

  function openEmail() { setContactChannel("email"); setShowContact(true) }
  function openSms() { setContactChannel("sms"); setShowContact(true) }

  return createPortal(
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 9990,
          backgroundColor: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
          animation: "pickerFade 0.18s ease",
        }}
      />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9991,
        backgroundColor: "#0D100E",
        borderRadius: "24px 24px 0 0",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        animation: "sheetUp 0.22s cubic-bezier(0.32,0.72,0,1)",
      }}>
        <div style={{ width: 32, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", margin: "16px auto 0" }} />

        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0,
              backgroundColor: `${color}22`, border: `1.5px solid ${color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "1.375rem", fontWeight: 300, color, lineHeight: 1 }}>
                {displayName[0].toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: "white", ...TYPE.headline, fontWeight: 600 }}>{displayName}</p>
              {person.phone && (
                <p style={{ margin: "2px 0 0", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead }}>{person.phone}</p>
              )}
              {person.email && (
                <p style={{ margin: "1px 0 0", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.footnote }}>{person.email}</p>
              )}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Action buttons */}
          {(person.phone || person.email) ? (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {person.phone && (
                <a href={`tel:${person.phone}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 0", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", textDecoration: "none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .95h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.85a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  <span style={{ ...TYPE.caption, fontWeight: 700, color: "white" }}>Call</span>
                </a>
              )}
              {person.phone && (
                <button onClick={openSms} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 0", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <span style={{ ...TYPE.caption, fontWeight: 700, color: "white" }}>Text</span>
                </button>
              )}
              {person.email && (
                <button onClick={openEmail} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 0", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span style={{ ...TYPE.caption, fontWeight: 700, color: "white" }}>Email</span>
                </button>
              )}
            </div>
          ) : (
            <p style={{ margin: "14px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,0.3)`, textAlign: "center" }}>
              No contact info on file
            </p>
          )}
        </div>

        {/* Timeline */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 40px" }}>
          <p style={{ margin: "0 0 14px", ...TYPE.caption, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            History
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {person.leads.map(lead => {
              const isOrd = isOrder(lead)
              const isRes = isReservation(lead)
              const totalCents = lead.partial_answers?.total_cents
              return (
                <div key={lead.id} style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isOrd ? `${GREEN}15` : isRes ? "rgba(100,200,255,0.1)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isOrd && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2l1.5 3L10 2l2 3 2-3 2.5 3L18 2v20l-2-1-2 1-2-1-2 1-2-1-2 1V2z"/>
                        <path d="M8 10h8"/><path d="M8 14h6"/>
                      </svg>
                    )}
                    {isRes && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(100,200,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>
                      </svg>
                    )}
                    {!isOrd && !isRes && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ ...TYPE.subhead, fontWeight: 600, color: "white" }}>
                        {isOrd ? "Order" : isRes ? "Reservation" : "Inquiry"}
                      </span>
                      <span style={{ ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, flexShrink: 0 }}>
                        {formatDate(lead.created_at ?? "")}
                      </span>
                    </div>
                    <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isOrd
                        ? `${orderSummary(lead)}${totalCents ? ` · ${formatCents(totalCents)}` : ""}`
                        : isRes
                          ? reservationSummary(lead)
                          : lead.message || "Contact form submission"
                      }
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showContact && mostRecentLead && (
        <LeadContactSheet
          lead={mostRecentLead}
          industry={industry}
          companyName={companyName}
          defaultChannel={contactChannel}
          onClose={() => setShowContact(false)}
        />
      )}
    </>,
    document.body
  )
}

// ─── Person card ─────────────────────────────────────────────────────────────

function PersonCard({
  person,
  industry,
  companyName,
}: {
  person: PersonRecord
  industry: string | null
  companyName: string
}) {
  const [showDetail, setShowDetail] = useState(false)
  const displayName = person.name || "Unknown Guest"
  const color = avatarColor(person.name)
  const summary = visitSummary(person)

  return (
    <>
      <button
        onClick={() => setShowDetail(true)}
        style={{
          width: "100%", textAlign: "left", background: "none",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "14px 16px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 14,
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
          backgroundColor: `${color}18`, border: `1.5px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "1.125rem", fontWeight: 300, color, lineHeight: 1 }}>
            {displayName[0].toUpperCase()}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, color: "white", ...TYPE.subhead, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {displayName}
          </p>
          <p style={{ margin: "2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            {summary}
          </p>
          <p style={{ margin: "2px 0 0", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Last visit {formatTimeAgo(person.lastSeen)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {person.phone && (
            <a
              href={`tel:${person.phone}`}
              onClick={e => e.stopPropagation()}
              style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                backgroundColor: `${GREEN}12`, border: `1px solid ${GREEN}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .95h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.85a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </a>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      </button>

      {showDetail && (
        <PersonDetailSheet
          person={person}
          industry={industry}
          companyName={companyName}
          onClose={() => setShowDetail(false)}
        />
      )}
    </>
  )
}

// ─── Main client component ────────────────────────────────────────────────────

export default function PeopleClient({
  people,
  tabLabel,
  tabLabelSingular,
  industry,
  companyName,
}: {
  people: PersonRecord[]
  tabLabel: string
  tabLabelSingular: string
  industry: string | null
  companyName: string
}) {
  const [search, setSearch] = useState("")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return people
    return people.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.phone?.includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  }, [people, search])

  return (
    <main style={{ padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: "white", ...TYPE.largeTitle }}>{tabLabel}</h1>
        {people.length > 0 && (
          <p style={{ margin: "6px 0 0", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.caption }}>
            {people.length} {people.length === 1 ? tabLabelSingular.toLowerCase() : tabLabel.toLowerCase()}
          </p>
        )}
      </div>

      {/* Search */}
      {people.length > 0 && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Search ${tabLabel.toLowerCase()}…`}
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "13px 40px 13px 40px",
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "white", fontSize: 15, outline: "none",
            }}
          />
          {search && (
            <button onClick={() => setSearch("")}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* List */}
      {people.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 80 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <p style={{ margin: 0, color: "white", ...TYPE.headline, fontWeight: 600 }}>No {tabLabel.toLowerCase()} yet</p>
          <p style={{ margin: "8px 0 0", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, ...TYPE.subhead }}>
            {industry === "food"
              ? "Guests who order or reserve online will show up here."
              : `${tabLabel} who reach out through your website will show up here.`}
          </p>
          {industry === "food" && (
            <p style={{ margin: "6px 0 0", color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, ...TYPE.footnote }}>
              Walk-in guests aren&apos;t tracked here — only online orders and reservations.
            </p>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <p style={{ margin: 0, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, ...TYPE.subhead }}>
            No {tabLabel.toLowerCase()} match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(person => (
            <PersonCard
              key={person.key}
              person={person}
              industry={industry}
              companyName={companyName}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes sheetUp    { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes pickerFade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </main>
  )
}
