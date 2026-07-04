"use client"

import React, { useState, useEffect, useRef } from "react"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK } from "@/lib/dashboard/typography"
import PaymentSetupButton from "@/components/dashboard/PaymentSetupButton"
import PlacesInput from "@/components/dashboard/PlacesInput"

// ── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  id?: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  category: string
  ai_generated?: boolean
}

type RateSheetItem = {
  description: string
  unit: string
  unit_price: number
  category: string
}

type Estimate = {
  id: string
  client_name: string
  client_first_name: string | null
  client_last_name: string | null
  client_company: string | null
  client_phone: string | null
  client_email: string | null
  title: string | null
  property_address: string | null
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired"
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  deposit_pct: number
  deposit_amount: number | null
  deposit_paid_at: string | null
  payment_status: "unpaid" | "deposit_paid" | "paid" | null
  accepted_payment_choice: "pay_now" | "pay_later" | null
  accepted_pay_later_at: string | null
  payment_link_sent_at: string | null
  paid_at: string | null
  receipt_sent_at: string | null
  stripe_payment_intent_id: string | null
  estimate_number?: number | null
  valid_until?: string | null
  sent_at: string | null
  email_sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  created_at: string
  updated_at?: string | null
  estimate_line_items?: LineItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:    "rgba(255,255,255,0.48)",
  sent:     "#0A84FF",
  viewed:   "#FFD60A",
  accepted: "#30D158",
  declined: "#FF453A",
  expired:  "rgba(255,255,255,0.2)",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft", sent: "Sent", viewed: "Viewed",
  accepted: "Accepted", declined: "Declined", expired: "Expired",
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function isIncompleteDraft(est: Estimate) {
  return est.status === "draft" && (est.total <= 0 || !(est.estimate_line_items?.length))
}

function estimateListPriority(est: Estimate) {
  if (est.status === "sent" || est.status === "viewed") return 0
  if (est.status === "draft") return 1
  if (est.status === "accepted") return 2
  return 3
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "13px 16px", borderRadius: 14,
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "white", fontSize: 15, outline: "none", boxSizing: "border-box",
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "rgba(255,255,255,0.4)",
  marginBottom: 6, display: "block",
}

const UNIT_OPTIONS = [
  { value: "", label: "No unit" },
  { value: "each", label: "Each" },
  { value: "hr", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "sq ft", label: "Sq ft" },
  { value: "linear ft", label: "Linear ft" },
  { value: "ft", label: "Foot" },
  { value: "yd", label: "Yard" },
  { value: "room", label: "Room" },
  { value: "item", label: "Item" },
  { value: "trip", label: "Trip" },
]

function taxInputFromRate(rate: number) {
  if (!rate) return ""
  return String(Number((rate * 100).toFixed(3))).replace(/\.0+$/, "")
}

function taxRateFromInput(value: string) {
  const cleaned = value.replace(/%/g, "").trim()
  if (!cleaned) return 0
  const numeric = Number(cleaned)
  if (!Number.isFinite(numeric) || numeric < 0) return 0
  return numeric / 100
}

function estimateDisplayStatus(est: Estimate) {
  if (est.payment_status === "paid" || est.paid_at) {
    return { label: "Paid", color: SIGNAL_GREEN, detail: "Paid in full" }
  }
  if (est.payment_status === "deposit_paid" || est.deposit_paid_at) {
    return {
      label: "Deposit paid",
      color: SIGNAL_GREEN,
      detail: est.deposit_amount ? `${fmt(est.deposit_amount)} received` : "Deposit received",
    }
  }
  if (est.status === "accepted" && (est.payment_status === "unpaid" || est.accepted_payment_choice === "pay_later" || est.accepted_pay_later_at)) {
    return {
      label: "Accepted",
      color: SIGNAL_GREEN,
      detail: est.payment_link_sent_at ? "Payment link sent" : "Unpaid",
    }
  }
  return {
    label: STATUS_LABELS[est.status] ?? est.status,
    color: STATUS_COLORS[est.status] ?? STATUS_COLORS.draft,
    detail: null,
  }
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, label, color }: { status: string; label?: string; color?: string }) {
  const badgeColor = color ?? STATUS_COLORS[status] ?? STATUS_COLORS.draft
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 100,
      backgroundColor: `${badgeColor}18`,
      border: `1px solid ${badgeColor}44`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: badgeColor, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color: badgeColor }}>{label ?? STATUS_LABELS[status] ?? status}</span>
    </div>
  )
}

// ── Shareable Link ────────────────────────────────────────────────────────────

function shareUrl(estimateId: string, slug: string) {
  return `https://${slug}.foundco.app/q/${estimateId}`
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [rateSheet, setRateSheet] = useState<RateSheetItem[]>([])
  const [companySlug, setCompanySlug] = useState("")
  const [companyStripeReady, setCompanyStripeReady] = useState(false)
  const [defaultTaxRate, setDefaultTaxRate] = useState(0)
  const [leads, setLeads] = useState<{ id: string; name: string; phone: string | null; email: string | null }[]>([])
  const [locationBias, setLocationBias] = useState("")
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "viewed" | "accepted" | "declined">("all")
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showRateSheet, setShowRateSheet] = useState(false)

  function refreshEstimates() {
    fetch("/api/estimates").then(r => r.json()).then(ed => {
      if (ed.estimates) setEstimates(ed.estimates)
    }).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/estimates").then(r => r.json()),
      fetch("/api/rate-sheet").then(r => r.json()),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({})),
      fetch("/api/leads").then(r => r.json()).catch(() => ({ leads: [] })),
    ]).then(([ed, rd, sd, ld]) => {
      setEstimates(ed.estimates ?? [])
      const deepLinkedEstimate = new URLSearchParams(window.location.search).get("estimate")
      if (deepLinkedEstimate && (ed.estimates ?? []).some((e: Estimate) => e.id === deepLinkedEstimate)) {
        setSelectedId(deepLinkedEstimate)
      }
      setRateSheet(rd.items ?? [])
      setCompanySlug(sd.slug ?? sd.name?.toLowerCase().replace(/\s+/g, "-") ?? "")
      setCompanyStripeReady(Boolean(sd.stripe_connect_account_id))
      setDefaultTaxRate(Number(sd.default_tax_rate ?? 0))
      setLocationBias([sd.city, sd.state].filter(Boolean).join(", "))
      setLeads((ld.leads ?? []).map((l: { id: string; name: string; phone: string | null; email: string | null }) => ({ id: l.id, name: l.name, phone: l.phone, email: l.email })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Re-fetch when tab becomes visible (e.g. user accepted in another tab)
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refreshEstimates()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = estimates.find(e => e.id === selectedId) ?? null
  const [taxInput, setTaxInput] = useState(taxInputFromRate(defaultTaxRate))

  const openStatuses = new Set<Estimate["status"]>(["draft", "sent", "viewed"])
  const filtered = filter === "all"
    ? estimates
    : filter === "open"
      ? estimates.filter(e => openStatuses.has(e.status))
      : estimates.filter(e => e.status === filter)
  const displayEstimates = [...filtered].sort((a, b) => {
    const priority = estimateListPriority(a) - estimateListPriority(b)
    if (priority !== 0) return priority
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const counts: Record<string, number> = {}
  for (const e of estimates) counts[e.status] = (counts[e.status] ?? 0) + 1

  async function handleCreate(data: Partial<Estimate> & { line_items: LineItem[]; tax_rate: number }) {
    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (json.estimate) {
      setEstimates(prev => [json.estimate, ...prev])
      setShowBuilder(false)
      setSelectedId(json.estimate.id)
    }
  }

  async function handleUpdate(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/estimates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    const json = await res.json()
    if (json.estimate) {
      setEstimates(prev => prev.map(e => e.id === id ? { ...e, ...json.estimate } : e))
      if (selectedId === id) setSelectedId(id)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/estimates/${id}`, { method: "DELETE" })
    setEstimates(prev => prev.filter(e => e.id !== id))
    setSelectedId(null)
  }

  async function handleSend(estimate: Estimate, method: "email" | "sms" | "link" | "payment_link"): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch(`/api/estimates/${estimate.id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method }),
    })
    if (res.ok) {
      const now = new Date().toISOString()
      setEstimates(prev => prev.map(e =>
        e.id === estimate.id ? method === "payment_link" ? {
          ...e,
          payment_link_sent_at: now,
          updated_at: now,
        } : {
          ...e,
          status: "sent" as const,
          sent_at: now,
          email_sent_at: method === "email" ? now : e.email_sent_at,
        } : e
      ))
      return { ok: true }
    }
    const body = await res.json().catch(() => ({}))
    return { ok: false, error: body.error ?? "Something went wrong" }
  }

  return (
    <main style={{ padding: "32px 24px 120px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", color: "white", ...TYPE.largeTitle }}>Estimates</h1>
          {estimates.length > 0 && (
            <p style={{ margin: 0, color: "white", opacity: TEXT_OPACITY.disabled, ...TYPE.footnote }}>
              {estimates.filter(e => e.status === "draft" || e.status === "sent" || e.status === "viewed").length} active
              {counts.accepted ? ` - ${counts.accepted} won` : ""}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowRateSheet(true)} title="My Services" style={{
            height: 38, padding: "0 14px", borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            color: "rgba(255,255,255,0.45)", fontSize: 13, fontWeight: 600,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Services
          </button>
          <button onClick={() => setShowBuilder(true)} style={{
            width: 44, height: 44, borderRadius: "50%",
            backgroundColor: SIGNAL_GREEN, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 16px ${SIGNAL_GREEN}44`,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={FOUND_BLACK} strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Status filters */}
      {estimates.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, overflowX: "auto", paddingBottom: 2 }}>
          {([
            { key: "all" as const, label: "All", count: estimates.length, color: SIGNAL_GREEN },
            { key: "open" as const, label: "Open", count: estimates.filter(e => openStatuses.has(e.status)).length, color: "rgba(255,255,255,0.62)" },
            { key: "viewed" as const, label: "Viewed", count: counts.viewed ?? 0, color: STATUS_COLORS.viewed },
            { key: "accepted" as const, label: "Accepted", count: counts.accepted ?? 0, color: SIGNAL_GREEN },
            { key: "declined" as const, label: "Declined", count: counts.declined ?? 0, color: STATUS_COLORS.declined },
          ]).map(f => {
            if (f.key !== "all" && f.count === 0) return null
            const active = filter === f.key
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 100,
                border: `1px solid ${active ? f.color : "rgba(255,255,255,0.1)"}`,
                backgroundColor: active ? `${f.color}1A` : "transparent",
                color: active ? f.color : "rgba(255,255,255,0.35)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                {f.label}
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{f.count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 16 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ paddingTop: 80, textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <p style={{ margin: "0 0 8px", fontSize: "1.375rem", fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
            {filter === "all" ? "Your first estimate is ready to build." : `No ${filter} estimates.`}
          </p>
          <p style={{ margin: "0 0 28px", ...TYPE.subhead, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, lineHeight: 1.7 }}>
            {filter === "all" ? "Tap + to create your first professional quote." : ""}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {displayEstimates.map(est => (
            <EstimateCard
              key={est.id}
              estimate={est}
              companyStripeReady={companyStripeReady}
              activeFilter={filter}
              onClick={() => setSelectedId(est.id)}
            />
          ))}
        </div>
      )}

      {/* Builder sheet */}
      {showBuilder && (
        <BuilderSheet
          rateSheet={rateSheet}
          leads={leads}
          defaultTaxRate={defaultTaxRate}
          locationBias={locationBias}
          onSave={handleCreate}
          onSaveDefaultTax={(rate) => {
            setDefaultTaxRate(rate)
            fetch("/api/company-slug", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ default_tax_rate: rate }) }).catch(() => {})
          }}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          estimate={selected}
          companySlug={companySlug}
          companyStripeReady={companyStripeReady}
          locationBias={locationBias}
          rateSheet={rateSheet}
          onClose={() => { setSelectedId(null); refreshEstimates() }}
          onUpdate={(patch) => handleUpdate(selected.id, patch)}
          onSend={(method) => handleSend(selected, method)}
          onDelete={() => handleDelete(selected.id)}
          onSync={(fresh) => setEstimates(prev => prev.map(e => e.id === fresh.id ? { ...e, ...fresh } : e))}
        />
      )}

      {/* Rate sheet manager */}
      {showRateSheet && (
        <RateSheetManager
          items={rateSheet}
          onChange={setRateSheet}
          onClose={() => setShowRateSheet(false)}
        />
      )}

    </main>
  )
}

// ── Estimate Card ─────────────────────────────────────────────────────────────

function EstimateCard({ estimate, companyStripeReady, activeFilter, onClick }: { estimate: Estimate; companyStripeReady: boolean; activeFilter: "all" | "open" | "viewed" | "accepted" | "declined"; onClick: () => void }) {
  const displayStatus = estimateDisplayStatus(estimate)
  const isAcceptedUnpaid = estimate.status === "accepted" && !(estimate.payment_status === "paid" || estimate.paid_at || estimate.payment_status === "deposit_paid" || estimate.deposit_paid_at)
  const shouldShowStatus = estimate.status === "accepted" ? false : estimate.status !== activeFilter
  const paymentHint = isAcceptedUnpaid ? (companyStripeReady ? (estimate.payment_link_sent_at ? "Payment sent" : "Ready to collect") : null) : displayStatus.detail
  const incompleteDraft = isIncompleteDraft(estimate)
  const hasAddress = Boolean(estimate.property_address?.trim())
  const sublineText = hasAddress ? estimate.property_address! : "Job address missing"

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "16px 0",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        backgroundColor: "transparent",
        cursor: "pointer",
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto 12px", alignItems: "center", gap: 12,
        textAlign: "left",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, marginBottom: 5 }}>
          <span style={{ color: "white", ...TYPE.headline, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {estimate.client_name}
          </span>
          {shouldShowStatus && (
            <span style={{ color: displayStatus.color, fontSize: 11, fontWeight: 760, flexShrink: 0 }}>
              {displayStatus.label}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center", minWidth: 0 }}>
          <span style={{ color: hasAddress ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.28)", ...TYPE.footnote, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 210, textTransform: "none" }}>
            {sublineText}
          </span>
          <span style={{ color: "rgba(255,255,255,0.14)", fontSize: 10 }}>-</span>
          <span style={{ color: "rgba(255,255,255,0.30)", ...TYPE.footnote, textTransform: "none", whiteSpace: "nowrap" }}>
            {timeAgo(estimate.created_at)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: incompleteDraft ? SIGNAL_GREEN : "white", fontSize: incompleteDraft ? 15 : 17, fontWeight: 760, letterSpacing: 0 }}>
          {incompleteDraft ? "Finish" : fmt(estimate.total)}
        </div>
        {paymentHint && paymentHint !== "Unpaid" && (
          <div style={{ color: displayStatus.color, fontSize: 11, fontWeight: 720, marginTop: 4, whiteSpace: "nowrap" }}>{paymentHint}</div>
        )}
      </div>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  )
}
type LeadSuggestion = { id: string; name: string; phone: string | null; email: string | null }

function BuilderSheet({ rateSheet, leads, defaultTaxRate, locationBias, onSave, onSaveDefaultTax, onClose }: {
  rateSheet: RateSheetItem[]
  leads: LeadSuggestion[]
  defaultTaxRate: number
  locationBias?: string
  onSave: (data: Partial<Estimate> & { line_items: LineItem[]; tax_rate: number }) => Promise<void>
  onSaveDefaultTax: (rate: number) => void
  onClose: () => void
}) {
  const [clientFirst, setClientFirst] = useState("")
  const [clientLast, setClientLast] = useState("")
  const [clientCompany, setClientCompany] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [address, setAddress] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState(defaultTaxRate)
  const [taxInput, setTaxInput] = useState(taxInputFromRate(defaultTaxRate))
  const [taxSaved, setTaxSaved] = useState(false)
  const [suggestions, setSuggestions] = useState<LeadSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [newDesc, setNewDesc] = useState("")
  const [newQty, setNewQty] = useState("1")
  const [newUnit, setNewUnit] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newCat, setNewCat] = useState("labor")
  const [pricingMode, setPricingMode] = useState<"flat" | "rate">("flat")
  const [addingItem, setAddingItem] = useState(true)

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmt = subtotal * taxRate
  const total = subtotal + taxAmt
  const canSave = clientFirst.trim().length > 0 && !saving

  const STEP_LABELS = ["Customer", "Job", "Work", "Price", "Review"] as const
  const [activeStep, setActiveStep] = useState(0)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const tapScrolling = useRef(false)
  const fieldStyle: React.CSSProperties = {
    ...inputStyle,
    borderRadius: 16,
    padding: "15px 16px",
    backgroundColor: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 16,
  }
  const sectionBlockStyle: React.CSSProperties = {
    scrollMarginTop: 118,
  }
  // Scroll-spy: the quiet progress rail follows whichever section is actually on screen.
  // Suppressed for a beat after a tap-to-jump so the target step doesn't flicker mid-scroll.
  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (tapScrolling.current) return
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length === 0) return
        const idx = sectionRefs.current.findIndex(el => el === visible[0].target)
        if (idx !== -1) setActiveStep(idx)
      },
      { root, threshold: [0.25, 0.5, 0.75], rootMargin: "-15% 0px -55% 0px" }
    )
    sectionRefs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  function handleBuilderScroll() {
    const root = scrollRef.current
    if (!root || tapScrolling.current) return
    const distanceFromBottom = root.scrollHeight - root.scrollTop - root.clientHeight
    if (distanceFromBottom < 96) setActiveStep(STEP_LABELS.length - 1)
  }

  function jumpToStep(index: number) {
    const target = sectionRefs.current[index]
    if (!target) return
    tapScrolling.current = true
    setActiveStep(index)
    if (index === STEP_LABELS.length - 1) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
    setTimeout(() => { tapScrolling.current = false; handleBuilderScroll() }, 700)
  }

  function sectionAnchor(step: string, title: string, value?: string) {
    return (
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ color: SIGNAL_GREEN, fontSize: 11, fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7 }}>{step.padStart(2, "0")}</div>
          <h3 style={{ margin: 0, color: "white", fontSize: 23, lineHeight: 1.1, fontWeight: 850, letterSpacing: 0 }}>{title}</h3>
        </div>
        {value && <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{value}</span>}
      </div>
    )
  }

  const dividerStyle: React.CSSProperties = { border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "34px 0" }
  function handleFirstNameChange(value: string) {
    setClientFirst(value)
    if (value.trim().length >= 1) {
      const q = value.toLowerCase()
      const matches = leads.filter(l => l.name.toLowerCase().includes(q)).slice(0, 5)
      setSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  function selectSuggestion(lead: LeadSuggestion) {
    const parts = lead.name.trim().split(" ")
    setClientFirst(parts[0] ?? "")
    setClientLast(parts.slice(1).join(" "))
    setClientPhone(lead.phone ?? "")
    setClientEmail(lead.email ?? "")
    setShowSuggestions(false)
    setSuggestions([])
  }

  function saveDefaultTax() {
    onSaveDefaultTax(taxRate)
    setTaxSaved(true)
    setTimeout(() => setTaxSaved(false), 2000)
  }

  function handleTaxInput(value: string) {
    setTaxInput(value)
    setTaxRate(taxRateFromInput(value))
  }

  function addFromRateSheet(item: RateSheetItem) {
    setLineItems(prev => [...prev, { ...item, quantity: 1 }])
    setAddingItem(false)
  }

  function resetNewItem() {
    setNewDesc("")
    setNewQty("1")
    setNewUnit("")
    setNewPrice("")
    setNewCat("labor")
    setPricingMode("flat")
  }

  function addManualItem() {
    const price = Number(newPrice) || 0
    if (!newDesc.trim() || price <= 0) return
    const quantity = pricingMode === "rate" ? Number(newQty) || 1 : 1
    const unit = pricingMode === "rate" ? newUnit.trim() : ""
    setLineItems(prev => [...prev, {
      description: newDesc.trim(),
      quantity,
      unit,
      unit_price: price,
      category: newCat,
    }])
    resetNewItem()
    setAddingItem(false)
  }

  function removeItem(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!canSave) return
    const fullName = [clientFirst.trim(), clientLast.trim()].filter(Boolean).join(" ")
    setSaving(true)
    setSaveError(null)
    try {
      await onSave({
        client_name: fullName,
        client_first_name: clientFirst.trim(),
        client_last_name: clientLast.trim() || null,
        client_company: clientCompany.trim() || null,
        client_phone: clientPhone,
        client_email: clientEmail,
        property_address: address,
        line_items: lineItems,
        tax_rate: taxRate,
      })
    } catch {
      setSaveError("Could not save. Check the customer name and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div ref={scrollRef} onScroll={handleBuilderScroll} style={{
      position: "fixed", inset: 0, zIndex: 70,
      backgroundColor: "#0B0F0C", color: "white", overflowY: "auto",
      padding: "max(env(safe-area-inset-top), 18px) 18px max(env(safe-area-inset-bottom), 28px)",
      boxSizing: "border-box",
    }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <header style={{
          position: "sticky", top: 0, zIndex: 5,
          margin: "-18px -18px 22px", padding: "max(env(safe-area-inset-top), 18px) 18px 12px",
          backgroundColor: "#0B0F0C",
          borderBottom: "1px solid rgba(255,255,255,0.045)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: SIGNAL_GREEN, fontSize: 11, fontWeight: 850, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Estimate</div>
              <h2 style={{ margin: 0, color: "white", fontSize: 18, lineHeight: 1.15, fontWeight: 800, letterSpacing: 0 }}>New estimate</h2>
            </div>
            <button onClick={onClose} aria-label="Close" style={{
              width: 38, height: 38, borderRadius: 19, border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.58)",
              fontSize: 21, lineHeight: 1, cursor: "pointer", flexShrink: 0,
            }}>x</button>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.44)", fontSize: 12, fontWeight: 750 }}>{STEP_LABELS[activeStep]}</span>
              <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 12, fontWeight: 700 }}>{fmt(total)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
              {STEP_LABELS.map((step, index) => (
                <button key={step} type="button" aria-label={step} title={step} onClick={() => jumpToStep(index)} style={{ border: "none", background: "transparent", padding: "9px 0", cursor: "pointer" }}>
                  <span style={{ display: "block", height: 3, borderRadius: 3, backgroundColor: index <= activeStep ? SIGNAL_GREEN : "rgba(255,255,255,0.12)" }} />
                </button>
              ))}
            </div>
          </div>
        </header>

        <section ref={el => { sectionRefs.current[0] = el }} style={sectionBlockStyle}>
          {sectionAnchor("1", "Customer")}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              <div style={{ position: "relative" }}>
                <input
                  value={clientFirst}
                  onChange={e => handleFirstNameChange(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                  placeholder="First name *"
                  autoComplete="off"
                  style={fieldStyle}
                />
                {showSuggestions && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, backgroundColor: "#1A1F1B", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.32)" }}>
                    {suggestions.map(lead => (
                      <button key={lead.id} onMouseDown={() => selectSuggestion(lead)} style={{ width: "100%", padding: "12px 14px", background: "none", border: "none", textAlign: "left", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{lead.name}</div>
                        {lead.phone && <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{lead.phone}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input value={clientLast} onChange={e => setClientLast(e.target.value)} placeholder="Last name" style={fieldStyle} />
            </div>
            <input value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Company optional" style={fieldStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} type="tel" placeholder="Phone" style={fieldStyle} />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="Email" style={fieldStyle} />
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        <section ref={el => { sectionRefs.current[1] = el }} style={sectionBlockStyle}>
          {sectionAnchor("2", "Job")}
          <PlacesInput value={address} onChange={setAddress} locationBias={locationBias} style={fieldStyle} />
        </section>

        <hr style={dividerStyle} />

        <section ref={el => { sectionRefs.current[2] = el }} style={sectionBlockStyle}>
          {sectionAnchor("3", "Work", lineItems.length ? `${lineItems.length} added` : undefined)}

          {rateSheet.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
              {rateSheet.slice(0, 8).map((item, i) => (
                <button key={i} onClick={() => addFromRateSheet(item)} style={{
                  padding: "8px 12px", borderRadius: 100,
                  border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.055)",
                  color: "rgba(255,255,255,0.68)", fontSize: 12, fontWeight: 750, cursor: "pointer",
                }}>
                  + {item.description}
                </button>
              ))}
            </div>
          )}

          {addingItem ? (
            <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.08)", padding: 14, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.025)" }}>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Describe the work" style={{ ...fieldStyle, fontSize: 17, marginBottom: 10 }} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {(["flat", "rate"] as const).map(mode => (
                  <button key={mode} onClick={() => setPricingMode(mode)} style={{
                    height: 46, borderRadius: 14, border: "1px solid",
                    borderColor: pricingMode === mode ? `${SIGNAL_GREEN}88` : "rgba(255,255,255,0.08)",
                    backgroundColor: pricingMode === mode ? "rgba(50,208,116,0.10)" : "rgba(255,255,255,0.025)",
                    color: pricingMode === mode ? SIGNAL_GREEN : "rgba(255,255,255,0.44)",
                    fontSize: 14, fontWeight: 800, cursor: "pointer",
                  }}>{mode === "flat" ? "Flat price" : "Qty x rate"}</button>
                ))}
              </div>

              {pricingMode === "flat" ? (
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" inputMode="decimal" placeholder="Amount" style={{ ...fieldStyle, marginBottom: 10 }} />
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "82px minmax(0, 1fr) minmax(104px, 0.8fr)", gap: 8, marginBottom: 10 }}>
                  <input value={newQty} onChange={e => setNewQty(e.target.value)} type="number" inputMode="decimal" placeholder="Qty" style={fieldStyle} />
                  <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ ...fieldStyle, appearance: "none" }}>
                    {UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ color: "#111" }}>{opt.label}</option>)}
                  </select>
                  <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" inputMode="decimal" placeholder="Rate" style={fieldStyle} />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                {(["labor", "materials", "other"] as const).map(c => (
                  <button key={c} onClick={() => setNewCat(c)} style={{
                    height: 42, borderRadius: 14, border: "1px solid",
                    borderColor: newCat === c ? `${SIGNAL_GREEN}88` : "rgba(255,255,255,0.08)",
                    backgroundColor: newCat === c ? "rgba(50,208,116,0.10)" : "rgba(255,255,255,0.02)",
                    color: newCat === c ? SIGNAL_GREEN : "rgba(255,255,255,0.36)",
                    fontSize: 12, fontWeight: 800, cursor: "pointer",
                  }}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.4fr", gap: 8 }}>
                <button onClick={() => { resetNewItem(); setAddingItem(false) }} style={{ height: 48, borderRadius: 15, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 750, cursor: "pointer" }}>Cancel</button>
                <button onClick={addManualItem} disabled={!newDesc.trim() || !newPrice || Number(newPrice) <= 0} style={{
                  height: 48, borderRadius: 15, border: "none",
                  backgroundColor: newDesc.trim() && Number(newPrice) > 0 ? SIGNAL_GREEN : "rgba(255,255,255,0.065)",
                  color: newDesc.trim() && Number(newPrice) > 0 ? FOUND_BLACK : "rgba(255,255,255,0.24)",
                  fontSize: 14, fontWeight: 850, cursor: newDesc.trim() && Number(newPrice) > 0 ? "pointer" : "default",
                }}>Add work</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingItem(true)} style={{ width: "100%", height: 52, borderRadius: 17, border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.025)", color: SIGNAL_GREEN, fontSize: 15, fontWeight: 850, cursor: "pointer", marginBottom: 14 }}>Add work</button>
          )}

          {lineItems.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lineItems.map((item, i) => {
                const isFlat = item.quantity === 1 && !item.unit
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto 32px", gap: 10, alignItems: "center", padding: "12px 12px 12px 14px", borderRadius: 17, backgroundColor: "rgba(255,255,255,0.052)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "white", fontSize: 15, fontWeight: 750, lineHeight: 1.25, marginBottom: 4, overflowWrap: "anywhere" }}>{item.description}</div>
                      <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: 650 }}>
                        {isFlat ? "Flat price" : `${item.quantity} ${item.unit || "unit"} x ${fmt(item.unit_price)}`}
                      </div>
                    </div>
                    <div style={{ color: "white", fontSize: 15, fontWeight: 850, flexShrink: 0 }}>{fmt(item.quantity * item.unit_price)}</div>
                    <button onClick={() => removeItem(i)} aria-label="Remove work" style={{ width: 32, height: 32, borderRadius: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.32)", cursor: "pointer", fontSize: 17, lineHeight: 1 }}>x</button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: "12px 4px 2px", color: "rgba(255,255,255,0.26)", fontSize: 14, fontWeight: 650 }}>No work added yet.</div>
          )}
        </section>

        <hr style={dividerStyle} />

        <section ref={el => { sectionRefs.current[3] = el }} style={sectionBlockStyle}>
          {sectionAnchor("4", "Price")}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ color: "rgba(255,255,255,0.62)", fontSize: 15, fontWeight: 750 }}>Tax rate</span>
              {taxRate > 0 && taxRate !== defaultTaxRate && (
                <button onClick={saveDefaultTax} style={{ padding: "5px 9px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                  {taxSaved ? "Saved" : "Save default"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <input
                type="text"
                inputMode="decimal"
                value={taxInput}
                onChange={e => handleTaxInput(e.target.value)}
                placeholder="8.7"
                style={{ ...fieldStyle, width: 90, padding: "10px 13px", textAlign: "right", fontSize: 17 }}
              />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: 750 }}>%</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 650 }}>Subtotal</span>
              <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: 800 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, fontWeight: 650 }}>Tax</span>
              <span style={{ color: "rgba(255,255,255,0.72)", fontSize: 14, fontWeight: 800 }}>{fmt(taxAmt)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ color: "white", fontSize: 17, fontWeight: 850 }}>Total</span>
              <span style={{ color: SIGNAL_GREEN, fontSize: 28, lineHeight: 1, fontWeight: 900, letterSpacing: 0 }}>{fmt(total)}</span>
            </div>
          </div>
        </section>

        <hr style={dividerStyle} />

        <section ref={el => { sectionRefs.current[4] = el }} style={{ ...sectionBlockStyle, marginBottom: 16 }}>
          {sectionAnchor("5", "Review", clientFirst.trim() ? [clientFirst.trim(), clientLast.trim()].filter(Boolean).join(" ") : undefined)}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, fontWeight: 700, marginBottom: 5 }}>Ready total</div>
              <div style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: 0 }}>{fmt(total)}</div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.36)", fontSize: 13, fontWeight: 700, textAlign: "right" }}>{lineItems.length} work item{lineItems.length === 1 ? "" : "s"}</div>
          </div>
        </section>

        {saveError && (
          <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 14, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)", color: "#FF453A", fontSize: 13, fontWeight: 700 }}>{saveError}</div>
        )}

        <div style={{
          position: canSave ? "sticky" : "static",
          bottom: 0,
          margin: "0 -2px",
          padding: canSave ? "12px 0 max(env(safe-area-inset-bottom), 12px)" : "0 0 max(env(safe-area-inset-bottom), 0px)",
          background: canSave ? "linear-gradient(180deg, rgba(11,15,12,0), #0B0F0C 30%)" : "transparent",
        }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              width: "100%", minHeight: 58, borderRadius: 18, border: "none",
              backgroundColor: canSave ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
              color: canSave ? FOUND_BLACK : "rgba(255,255,255,0.24)",
              fontSize: 16, fontWeight: 900, cursor: canSave ? "pointer" : "default",
              boxShadow: canSave ? `0 12px 30px ${SIGNAL_GREEN}20` : "none",
            }}
          >
            {saving ? "Saving..." : "Save Estimate"}
          </button>
        </div>
      </div>
    </div>
  )
}
// ── Detail Sheet ──────────────────────────────────────────────────────────────

function DetailSheet({ estimate, companySlug, companyStripeReady, locationBias, rateSheet, onClose, onUpdate, onSend, onDelete, onSync }: {
  estimate: Estimate
  companySlug: string
  companyStripeReady: boolean
  locationBias?: string
  rateSheet: RateSheetItem[]
  onClose: () => void
  onUpdate: (patch: Record<string, unknown>) => Promise<void>
  onSend: (method: "email" | "sms" | "link" | "payment_link") => Promise<{ ok: boolean; error?: string }>
  onDelete: () => void
  onSync: (fresh: Estimate) => void
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm_delete" | "send_options">("view")
  const [editItems, setEditItems] = useState<LineItem[]>([])
  const [editTax, setEditTax] = useState(0)
  const [editTaxInput, setEditTaxInput] = useState("")
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sending, setSending] = useState<"email" | "payment_link" | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newQty, setNewQty] = useState("1")
  const [newUnit, setNewUnit] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newCat, setNewCat] = useState("labor")
  const [fullEstimate, setFullEstimate] = useState<Estimate | null>(null)
  const hasFetched = useRef(false)

  useEffect(() => {
    // Lock body scroll while sheet is open
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetch(`/api/estimates/${estimate.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.estimate) {
          setFullEstimate(d.estimate)
          // Propagate fresh payment/status fields back to the list.
          onSync(d.estimate)
        }
      })
      .catch(() => {})
  }, [estimate.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const est = fullEstimate ?? estimate
  const displayStatus = estimateDisplayStatus(est)
  const isAcceptedUnpaid = est.status === "accepted" && !(est.payment_status === "paid" || est.paid_at || est.payment_status === "deposit_paid" || est.deposit_paid_at)
  const items = est.estimate_line_items ?? []
  const link = shareUrl(estimate.id, companySlug)

  function startEdit() {
    setEditItems(items.map(i => ({ ...i })))
    setEditTax(est.tax_rate)
    setEditTaxInput(taxInputFromRate(est.tax_rate))
    setEditName(est.client_name)
    setEditPhone(est.client_phone ?? "")
    setEditEmail(est.client_email ?? "")
    setEditAddress(est.property_address ?? "")
    setMode("edit")
  }

  function addFromRateSheet(item: RateSheetItem) {
    setEditItems(prev => [...prev, { ...item, quantity: 1 }])
  }

  function addManualItem() {
    if (!newDesc.trim() || !newPrice) return
    setEditItems(prev => [...prev, { description: newDesc.trim(), quantity: Number(newQty) || 1, unit: newUnit.trim(), unit_price: Number(newPrice) || 0, category: newCat }])
    setNewDesc(""); setNewQty("1"); setNewUnit(""); setNewPrice(""); setAddingItem(false)
  }

  function removeEditItem(i: number) { setEditItems(prev => prev.filter((_, idx) => idx !== i)) }

  function handleEditTaxInput(value: string) {
    setEditTaxInput(value)
    setEditTax(taxRateFromInput(value))
  }

  async function handleSaveEdit() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await onUpdate({ client_name: editName, client_phone: editPhone, client_email: editEmail, property_address: editAddress, line_items: editItems, tax_rate: editTax })
      setFullEstimate(prev => prev ? { ...prev, client_name: editName, client_phone: editPhone || null, client_email: editEmail || null, property_address: editAddress || null, tax_rate: editTax, estimate_line_items: editItems } : null)
      setMode("view")
    } catch {
      setSaveError("Could not save changes. Try again.")
    } finally {
      setSaving(false)
    }
  }

  async function handleSendOption(method: "email" | "sms" | "link") {
    setSendError(null)
    if (method === "link") {
      navigator.clipboard.writeText(link).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      await onSend("link")
      setMode("view")
      return
    }
    if (method === "sms") {
      const firstName = (est.client_name ?? "there").split(" ")[0]
      const totalFmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(est.total)
      const msg = `Hi ${firstName}, I put together your estimate${est.property_address ? ` for ${est.property_address}` : ""} - ${totalFmt}. You can view all the details and approve it right here: ${link}`
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      window.open(`sms:${est.client_phone}${isIOS ? "&" : "?"}body=${encodeURIComponent(msg)}`, "_self")
      await onSend("sms")
      setMode("view")
      return
    }
    setSending("email")
    try {
      const result = await onSend("email")
      if (result.ok) {
        setMode("view")
      } else {
        setSendError(result.error ?? "Failed to send email")
      }
    } finally {
      setSending(null)
    }
  }

  async function handlePaymentLinkSend() {
    if (sending || !companyStripeReady) return
    setSendError(null)
    setSending("payment_link")
    try {
      const result = await onSend("payment_link")
      if (result.ok) {
        const now = new Date().toISOString()
        setFullEstimate(prev => prev ? { ...prev, payment_link_sent_at: now, updated_at: now } : prev)
      } else {
        setSendError(result.error ?? "Could not send payment link")
      }
    } finally {
      setSending(null)
    }
  }
  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const editSubtotal = editItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const editTaxAmt = editSubtotal * editTax
  const editTotal = editSubtotal + editTaxAmt

  return (
    <>
      <div style={{
        position: "fixed", inset: 0, zIndex: 70,
        backgroundColor: FOUND_BLACK,
        padding: "calc(env(safe-area-inset-top, 0px) + 14px) 22px calc(env(safe-area-inset-bottom, 0px) + 36px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
      } as React.CSSProperties}>
        {/* Send options */}
        {mode === "send_options" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>Send Estimate</h2>
              <button onClick={() => setMode("view")} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>x</button>
            </div>

            {/* Summary pill */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "16px 18px", marginBottom: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "white", fontSize: 15, fontWeight: 600 }}>{est.client_name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(est.total)}</div>
              </div>
              <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, textAlign: "right" }}>
                {est.property_address && <div>{est.property_address}</div>}
              </div>
            </div>

            {/* Stripe setup nudge */}
            {!companyStripeReady && (
              <div style={{ padding: "13px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.075)", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <span style={{ color: "white", fontSize: 13, fontWeight: 760 }}>Connect Stripe </span>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>to let clients pay a deposit the moment they accept.</span>
                </div>
              </div>
            )}

            {/* Email option */}
            <button
              onClick={() => handleSendOption("email")}
              disabled={!est.client_email || sending === "email"}
              style={{
                width: "100%", padding: "16px 18px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: sending === "email" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)",
                cursor: est.client_email ? "pointer" : "default",
                opacity: est.client_email ? 1 : 0.4,
                display: "flex", alignItems: "center", gap: 16, marginBottom: 10, textAlign: "left",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(0,122,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontSize: 15, fontWeight: 600 }}>{sending === "email" ? "Sending..." : "Email"}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{est.client_email ?? "No email on file"}</div>
              </div>
              {est.client_email && sending !== "email" && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>

            {/* Email error */}
            {sendError && (
              <div style={{ marginBottom: 10, padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)" }}>
                <p style={{ margin: 0, color: "#FF453A", fontSize: 13, lineHeight: 1.5 }}>{sendError}</p>
              </div>
            )}

            {/* Text option */}
            <button
              onClick={() => handleSendOption("sms")}
              disabled={!est.client_phone}
              style={{
                width: "100%", padding: "16px 18px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.04)",
                cursor: est.client_phone ? "pointer" : "default",
                opacity: est.client_phone ? 1 : 0.4,
                display: "flex", alignItems: "center", gap: 16, marginBottom: 10, textAlign: "left",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(48,209,88,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontSize: 15, fontWeight: 600 }}>Text Message</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>{est.client_phone ?? "No phone on file"}</div>
              </div>
              {est.client_phone && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              )}
            </button>

            {/* Copy link option */}
            <button
              onClick={() => handleSendOption("link")}
              style={{
                width: "100%", padding: "16px 18px", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.04)",
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 16, marginBottom: 22, textAlign: "left",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.045)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "white", fontSize: 15, fontWeight: 600 }}>{copied ? "Copied" : "Copy Link"}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Share anywhere</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={copied ? SIGNAL_GREEN : "rgba(255,255,255,0.2)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {copied ? <polyline points="20 6 9 17 4 12"/> : <polyline points="9 18 15 12 9 6"/>}
              </svg>
            </button>

            <button onClick={() => setMode("view")} style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "transparent", color: "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        )}

        {/* Delete confirmation */}
        {mode === "confirm_delete" && (
          <div style={{ textAlign: "center", padding: "16px 0 8px" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "rgba(255,69,58,0.12)", border: "1px solid rgba(255,69,58,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 8px", color: "white", ...TYPE.title }}>Delete Estimate?</h2>
            <p style={{ margin: "0 0 24px", color: "rgba(255,255,255,0.5)", ...TYPE.subhead, lineHeight: 1.5 }}>
              This will permanently remove the estimate for {est.client_name}.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMode("view")} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={onDelete} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: "#FF453A", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Delete</button>
            </div>
          </div>
        )}

        {/* View mode */}
        {mode === "view" && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", color: "white", ...TYPE.title }}>{est.client_name}</h2>
                <StatusBadge status={est.status} label={displayStatus.label} color={displayStatus.color} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMode("confirm_delete")} aria-label="Delete estimate" style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,69,58,0.2)", backgroundColor: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,69,58,0.82)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
                <button onClick={startEdit} style={{ padding: "8px 15px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.62)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                <button onClick={onClose} aria-label="Close estimate" style={{ width: 38, height: 38, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.58)", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>x</button>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {est.property_address && (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>{est.property_address}</span>
                </div>
              )}
              {est.client_phone && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.1 1.22 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6z"/>
                  </svg>
                  <a href={`tel:${est.client_phone}`} style={{ color: SIGNAL_GREEN, fontSize: 14, textDecoration: "none" }}>{est.client_phone}</a>
                </div>
              )}
              {est.client_email && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <a href={`mailto:${est.client_email}`} style={{ color: SIGNAL_GREEN, fontSize: 14, textDecoration: "none" }}>{est.client_email}</a>
                </div>
              )}
            </div>


            {/* Totals */}
            <div style={{ marginBottom: 24, padding: "16px 18px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Subtotal</span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>{fmt(est.subtotal)}</span>
                </div>
                {est.tax_rate > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>Tax ({(est.tax_rate * 100).toFixed(2)}%)</span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 600 }}>{fmt(est.tax_amount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                  <span style={{ color: "white", fontSize: 17, fontWeight: 700 }}>Total</span>
                  <span style={{ color: SIGNAL_GREEN, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(est.total)}</span>
                </div>
              </div>
            </div>


            {/* Actions */}
            {(est.status === "draft" || est.status === "sent" || est.status === "viewed") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(est.status === "sent" || est.status === "viewed") && (
                  <button onClick={copyLink} style={{
                    width: "100%", padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    {copied ? "Copied" : "Copy estimate link"}
                  </button>
                )}
                {/* Send for draft, Resend for sent/viewed */}
                <button onClick={() => setMode("send_options")} style={{
                  width: "100%", padding: "15px 0", borderRadius: 14,
                  border: est.status === "draft" ? "none" : `1px solid ${SIGNAL_GREEN}33`,
                  backgroundColor: est.status === "draft" ? SIGNAL_GREEN : "rgba(48,209,88,0.12)",
                  color: est.status === "draft" ? FOUND_BLACK : SIGNAL_GREEN,
                  fontSize: 15, fontWeight: 800, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  {est.status === "draft" ? "Send Estimate" : "Resend Estimate"}
                </button>
              </div>
            )}

            {est.status === "accepted" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ padding: "2px 0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
                    <div style={{ color: SIGNAL_GREEN, fontSize: 14, fontWeight: 780 }}>Accepted</div>
                    <div style={{ color: "white", fontSize: 15, fontWeight: 780 }}>{fmt(est.total)}</div>
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.42)", fontSize: 13, lineHeight: 1.45 }}>
                    {est.payment_status === "paid" || est.paid_at ? "Paid in full" : est.deposit_paid_at ? "Deposit received" : companyStripeReady ? (est.payment_link_sent_at ? "Payment link sent" : "Ready to collect payment") : (est.accepted_at ? new Date(est.accepted_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "Estimate accepted")}
                    {(est.payment_status === "paid" || est.paid_at || est.deposit_paid_at || companyStripeReady) && est.accepted_at ? ` - ${new Date(est.accepted_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}` : ""}
                  </div>
                </div>

                <button onClick={copyLink} style={{
                  width: "100%", padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.035)", color: "rgba(255,255,255,0.72)",
                  fontSize: 14, fontWeight: 760, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  {copied ? "Copied" : "Copy estimate link"}
                </button>

                {isAcceptedUnpaid && companyStripeReady && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button
                      onClick={handlePaymentLinkSend}
                      disabled={!est.client_email || sending === "payment_link"}
                      style={{
                        width: "100%", padding: "15px 0", borderRadius: 14,
                        border: `1px solid ${SIGNAL_GREEN}33`,
                        backgroundColor: est.client_email ? "rgba(48,209,88,0.12)" : "rgba(255,255,255,0.05)",
                        color: est.client_email ? SIGNAL_GREEN : "rgba(255,255,255,0.28)",
                        fontSize: 15, fontWeight: 800, cursor: est.client_email && sending !== "payment_link" ? "pointer" : "default",
                      }}
                    >
                      {sending === "payment_link" ? "Sending..." : est.payment_link_sent_at ? "Resend Payment Link" : "Send Payment Link"}
                    </button>
                    {!est.client_email && (
                      <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, lineHeight: 1.45, textAlign: "center" }}>Add an email to send a payment link.</div>
                    )}
                    {sendError && (
                      <div style={{ padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)", color: "#FF453A", fontSize: 13, lineHeight: 1.45 }}>{sendError}</div>
                    )}
                  </div>
                )}

                {isAcceptedUnpaid && !companyStripeReady && (
                  <div style={{ padding: "12px 0 0", borderTop: "1px solid rgba(255,255,255,0.07)", display: "grid", gridTemplateColumns: "minmax(0, 1fr) 142px", alignItems: "center", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "rgba(255,255,255,0.82)", fontSize: 13, fontWeight: 760, marginBottom: 2 }}>Online payments</div>
                      <div style={{ color: "rgba(255,255,255,0.46)", fontSize: 12, lineHeight: 1.45 }}>Set up payments when you want clients to pay online.</div>
                    </div>
                    <PaymentSetupButton returnTo={`/estimates?estimate=${est.id}`} variant="subtle" compact>Set up</PaymentSetupButton>
                  </div>
                )}
              </div>
            )}

            {est.status === "declined" && (
              <div style={{ padding: "14px 18px", borderRadius: 16, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", textAlign: "center" }}>
                <div style={{ color: "#FF453A", fontSize: 14, fontWeight: 700 }}>Estimate Declined</div>
              </div>
            )}


            {/* Line items */}
            {items.length > 0 && (
              <div style={{ marginBottom: 20, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                    padding: "13px 0",
                    borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.description}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                        {item.quantity} {item.unit || "x"} {fmt(item.unit_price)}
                        {item.category && <span style={{ marginLeft: 6, textTransform: "capitalize" }}>- {item.category}</span>}
                      </div>
                    </div>
                    <div style={{ color: "white", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {fmt(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
              </div>
            )}



            <div style={{ height: 22 }} />
            {/* Activity timeline */}
            <ActivityTimeline estimate={est} />
          </>
        )}

        {/* Edit mode */}
        {mode === "edit" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>Edit Estimate</h2>
              <button onClick={() => setMode("view")} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>x</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ ...labelStyle }}>Client</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name *" style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" placeholder="Phone" style={inputStyle} />
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
                </div>
                <PlacesInput value={editAddress} onChange={setEditAddress} locationBias={locationBias} placeholder="Property / Job address" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Work & pricing</p>
                <button onClick={() => setAddingItem(v => !v)} style={{ padding: "5px 12px", borderRadius: 100, border: `1px solid ${SIGNAL_GREEN}55`, backgroundColor: `${SIGNAL_GREEN}14`, color: SIGNAL_GREEN, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
              </div>
              {rateSheet.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {rateSheet.map((item, i) => (
                    <button key={i} onClick={() => addFromRateSheet(item)} style={{ padding: "5px 10px", borderRadius: 100, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      + {item.description}
                    </button>
                  ))}
                </div>
              )}
              {addingItem && (
                <div style={{ borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}33`, padding: 14, marginBottom: 10, backgroundColor: `${SIGNAL_GREEN}08` }}>
                  <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description *" style={{ ...inputStyle, marginBottom: 8 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px", gap: 8, marginBottom: 8 }}>
                    <input value={newQty} onChange={e => setNewQty(e.target.value)} type="number" placeholder="Qty" style={inputStyle} />
                    <select value={newUnit} onChange={e => setNewUnit(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>{UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ color: "#111" }}>{opt.label}</option>)}</select>
                    <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Price" style={inputStyle} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => { setAddingItem(false); setNewDesc(""); setNewQty("1"); setNewUnit(""); setNewPrice("") }} style={{ flex: 1, padding: "9px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={addManualItem} disabled={!newDesc.trim() || !newPrice} style={{ flex: 2, padding: "9px 0", borderRadius: 12, border: "none", backgroundColor: newDesc.trim() && newPrice ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: newDesc.trim() && newPrice ? FOUND_BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add Item</button>
                  </div>
                </div>
              )}
              {editItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)", marginBottom: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "white", fontSize: 14, fontWeight: 600 }}>{item.description}</div>
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{item.quantity} {item.unit || "x"} {fmt(item.unit_price)}</div>
                  </div>
                  <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{fmt(item.quantity * item.unit_price)}</div>
                  <button onClick={() => removeEditItem(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>x</button>
                </div>
              ))}
            </div>

            {/* Tax */}
            <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Tax rate</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="text" inputMode="decimal" value={editTaxInput} onChange={e => handleEditTaxInput(e.target.value)} placeholder="8.7" style={{ ...inputStyle, width: 86, padding: "8px 12px", textAlign: "right" }} />
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>%</span>
                </div>
              </div>
              {editSubtotal > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>Total</span>
                    <span style={{ color: SIGNAL_GREEN, fontSize: 20, fontWeight: 700 }}>{fmt(editTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            {saveError && (
              <div style={{ marginBottom: 12, padding: "11px 14px", borderRadius: 12, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.18)", color: "#FF453A", fontSize: 13 }}>{saveError}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMode("view")} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: editName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: editName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Activity Timeline ─────────────────────────────────────────────────────────

function ActivityTimeline({ estimate: est }: { estimate: Estimate }) {
  type Event = { label: string; time: string | null; color: string; icon: React.ReactNode }
  const events: Event[] = []

  const iconProps = { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

  events.push({
    label: "Estimate created",
    time: est.created_at,
    color: "rgba(255,255,255,0.3)",
    icon: <svg {...iconProps} stroke="rgba(255,255,255,0.3)"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  })

  if (est.email_sent_at) {
    events.push({
      label: `Emailed to ${est.client_email ?? "client"}`,
      time: est.email_sent_at,
      color: "rgba(255,255,255,0.34)",
      icon: <svg {...iconProps} stroke="rgba(255,255,255,0.34)"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
    })
  }

  if (est.sent_at && !est.email_sent_at) {
    events.push({
      label: "Sent via link or text",
      time: est.sent_at,
      color: "rgba(255,255,255,0.4)",
      icon: <svg {...iconProps} stroke="rgba(255,255,255,0.4)"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    })
  }

  if (est.viewed_at || (est.status === "viewed" || est.status === "accepted")) {
    events.push({
      label: `Opened by ${est.client_first_name ?? est.client_name ?? "client"}`,
      time: est.viewed_at,
      color: "rgba(255,255,255,0.34)",
      icon: <svg {...iconProps} stroke="rgba(255,255,255,0.34)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    })
  }

  if (est.accepted_at) {
    events.push({
      label: "Estimate accepted",
      time: est.accepted_at,
      color: "#30D158",
      icon: <svg {...iconProps} stroke="#30D158"><polyline points="20 6 9 17 4 12"/></svg>,
    })
  }

  if (est.deposit_paid_at) {
    events.push({
      label: `Deposit paid${est.deposit_amount ? ` - ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(est.deposit_amount)}` : ""}`,
      time: est.deposit_paid_at,
      color: "#30D158",
      icon: <svg {...iconProps} stroke="#30D158"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    })
  }

  if (events.length <= 1) return null

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.24)", marginBottom: 14 }}>Activity</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {events.map((ev, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            {/* Line + dot column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.025)", border: `1px solid ${ev.color}33`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {ev.icon}
              </div>
              {i < events.length - 1 && (
                <div style={{ width: 1, flex: 1, minHeight: 18, backgroundColor: "rgba(255,255,255,0.07)", margin: "3px 0" }} />
              )}
            </div>
            {/* Content */}
            <div style={{ paddingBottom: i < events.length - 1 ? 18 : 0, paddingTop: 2, flex: 1 }}>
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, fontWeight: 600 }}>{ev.label}</div>
              {ev.time && (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 2 }}>
                  {new Date(ev.time).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {" at "}
                  {new Date(ev.time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Rate Sheet Manager ────────────────────────────────────────────────────────

function RateSheetManager({ items, onChange, onClose }: {
  items: RateSheetItem[]
  onChange: (items: RateSheetItem[]) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<RateSheetItem[]>(items)
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [desc, setDesc] = useState("")
  const [unit, setUnit] = useState("")
  const [price, setPrice] = useState("")
  const [cat, setCat] = useState("labor")

  function addItem() {
    if (!desc.trim() || !price) return
    setLocal(prev => [...prev, { description: desc.trim(), unit: unit.trim(), unit_price: Number(price) || 0, category: cat }])
    setDesc(""); setUnit(""); setPrice(""); setAdding(false)
  }

  async function handleSave() {
    setSaving(true)
    await fetch("/api/rate-sheet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: local }) })
    onChange(local)
    setSaving(false)
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 80, }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90, backgroundColor: "#101411", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "28px 28px 0 0", padding: "14px 22px 48px", maxHeight: "90dvh", overflowY: "auto" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>My Services</h2>
          <button onClick={() => setAdding(v => !v)} style={{ padding: "7px 14px", borderRadius: 100, border: `1px solid ${SIGNAL_GREEN}55`, backgroundColor: `${SIGNAL_GREEN}14`, color: SIGNAL_GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
        </div>
        <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.5 }}>
          Your saved services appear as quick-add buttons when building estimates.
        </p>

        {adding && (
          <div style={{ borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}33`, padding: 16, marginBottom: 16, backgroundColor: `${SIGNAL_GREEN}08` }}>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Service description *" style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, marginBottom: 8 }}>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>{UNIT_OPTIONS.map(opt => <option key={opt.value} value={opt.value} style={{ color: "#111" }}>{opt.label}</option>)}</select>
              <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Price" style={inputStyle} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["labor", "materials", "other"] as const).map(c => (
                <button key={c} onClick={() => setCat(c)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid", borderColor: cat === c ? SIGNAL_GREEN : "rgba(255,255,255,0.1)", backgroundColor: cat === c ? `${SIGNAL_GREEN}18` : "transparent", color: cat === c ? SIGNAL_GREEN : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setAdding(false); setDesc(""); setUnit(""); setPrice("") }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={addItem} disabled={!desc.trim() || !price} style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "none", backgroundColor: desc.trim() && price ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: desc.trim() && price ? FOUND_BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add to Rate Sheet</button>
            </div>
          </div>
        )}

        {local.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
            No services yet. Add your standard rates above.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 20 }}>
            {local.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.description}</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                    {fmt(item.unit_price)} {item.unit ? `/ ${item.unit}` : ""}
                    <span style={{ marginLeft: 6, textTransform: "capitalize" }}>- {item.category}</span>
                  </div>
                </div>
                <button onClick={() => setLocal(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>x</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Services"}
          </button>
        </div>
      </div>
    </>
  )
}
