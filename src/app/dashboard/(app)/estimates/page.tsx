"use client"

import React, { useState, useEffect, useRef } from "react"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK } from "@/lib/dashboard/typography"

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
  client_phone: string | null
  client_email: string | null
  title: string | null
  property_address: string | null
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired"
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  sent_at: string | null
  accepted_at: string | null
  created_at: string
  estimate_line_items?: LineItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  draft:    "rgba(255,255,255,0.3)",
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

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.draft
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 100,
      backgroundColor: `${color}18`,
      border: `1px solid ${color}44`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{STATUS_LABELS[status] ?? status}</span>
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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "draft" | "sent" | "accepted" | "declined">("all")
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showRateSheet, setShowRateSheet] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/estimates").then(r => r.json()),
      fetch("/api/rate-sheet").then(r => r.json()),
      fetch("/api/company-slug").then(r => r.json()).catch(() => ({})),
    ]).then(([ed, rd, sd]) => {
      setEstimates(ed.estimates ?? [])
      setRateSheet(rd.items ?? [])
      setCompanySlug(sd.slug ?? sd.name?.toLowerCase().replace(/\s+/g, "-") ?? "")
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const selected = estimates.find(e => e.id === selectedId) ?? null

  const filtered = filter === "all"
    ? estimates
    : estimates.filter(e => e.status === filter)

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

  async function handleSend(estimate: Estimate) {
    const sentAt = new Date().toISOString()
    await handleUpdate(estimate.id, { status: "sent", sent_at: sentAt })
  }

  return (
    <main style={{ padding: "32px 24px 120px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", color: "white", ...TYPE.largeTitle }}>Estimates</h1>
          {estimates.length > 0 && (
            <p style={{ margin: 0, color: "white", opacity: TEXT_OPACITY.disabled, ...TYPE.footnote }}>
              {estimates.filter(e => e.status === "draft" || e.status === "sent").length} active
              {counts.accepted ? ` · ${counts.accepted} won` : ""}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setShowRateSheet(true)} style={{
            width: 44, height: 44, borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
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
          {(["all", "draft", "sent", "accepted", "declined"] as const).map(f => {
            const active = filter === f
            const color = f === "all" ? SIGNAL_GREEN : STATUS_COLORS[f]
            const count = f === "all" ? estimates.length : (counts[f] ?? 0)
            if (f !== "all" && !counts[f]) return null
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 100,
                border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                backgroundColor: active ? `${color}1A` : "transparent",
                color: active ? color : "rgba(255,255,255,0.35)",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7 }}>{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ paddingTop: 80, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 16 }}>Loading…</div>
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
          {filtered.map(est => (
            <EstimateCard
              key={est.id}
              estimate={est}
              onClick={() => setSelectedId(est.id)}
            />
          ))}
        </div>
      )}

      {/* Builder sheet */}
      {showBuilder && (
        <BuilderSheet
          rateSheet={rateSheet}
          onSave={handleCreate}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Detail sheet */}
      {selected && (
        <DetailSheet
          estimate={selected}
          companySlug={companySlug}
          rateSheet={rateSheet}
          onClose={() => setSelectedId(null)}
          onUpdate={(patch) => handleUpdate(selected.id, patch)}
          onSend={() => handleSend(selected)}
          onDelete={() => handleDelete(selected.id)}
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

function EstimateCard({ estimate, onClick }: { estimate: Estimate; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px 18px",
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <span style={{ color: "white", ...TYPE.headline, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {estimate.client_name}
          </span>
          <StatusBadge status={estimate.status} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {estimate.property_address && (
            <span style={{ color: "white", opacity: TEXT_OPACITY.tertiary, ...TYPE.footnote, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, textTransform: "none" }}>
              {estimate.property_address}
            </span>
          )}
          {estimate.property_address && <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 10 }}>·</span>}
          <span style={{ color: "white", opacity: TEXT_OPACITY.disabled, ...TYPE.footnote, textTransform: "none" }}>
            {timeAgo(estimate.created_at)}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: "white", fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>
          {fmt(estimate.total)}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  )
}

// ── Builder Sheet ─────────────────────────────────────────────────────────────

function BuilderSheet({ rateSheet, onSave, onClose }: {
  rateSheet: RateSheetItem[]
  onSave: (data: Partial<Estimate> & { line_items: LineItem[]; tax_rate: number }) => Promise<void>
  onClose: () => void
}) {
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [address, setAddress] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [taxRate, setTaxRate] = useState(0)
  const [saving, setSaving] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newQty, setNewQty] = useState("1")
  const [newUnit, setNewUnit] = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [newCat, setNewCat] = useState("labor")
  const [addingItem, setAddingItem] = useState(false)

  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)
  const taxAmt = subtotal * taxRate
  const total = subtotal + taxAmt

  function addFromRateSheet(item: RateSheetItem) {
    setLineItems(prev => [...prev, { ...item, quantity: 1 }])
  }

  function addManualItem() {
    if (!newDesc.trim() || !newPrice) return
    setLineItems(prev => [...prev, {
      description: newDesc.trim(),
      quantity: Number(newQty) || 1,
      unit: newUnit.trim(),
      unit_price: Number(newPrice) || 0,
      category: newCat,
    }])
    setNewDesc(""); setNewQty("1"); setNewUnit(""); setNewPrice(""); setAddingItem(false)
  }

  function removeItem(i: number) {
    setLineItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    if (!clientName.trim()) return
    setSaving(true)
    await onSave({
      client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
      property_address: address, line_items: lineItems, tax_rate: taxRate,
    })
    setSaving(false)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: "#101411",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: "14px 22px 48px",
        maxHeight: "94dvh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>New Estimate</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        {/* Client */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...labelStyle }}>Client</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full name *" style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} type="tel" placeholder="Phone" style={inputStyle} />
              <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Property */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ ...labelStyle }}>Property Address</p>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, State" style={inputStyle} />
        </div>

        {/* Line Items */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ ...labelStyle, margin: 0 }}>Line Items</p>
            <button onClick={() => setAddingItem(v => !v)} style={{
              padding: "5px 12px", borderRadius: 100, border: `1px solid ${SIGNAL_GREEN}55`,
              backgroundColor: `${SIGNAL_GREEN}14`, color: SIGNAL_GREEN,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}>+ Add Line</button>
          </div>

          {/* Rate sheet quick-add */}
          {rateSheet.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {rateSheet.map((item, i) => (
                <button key={i} onClick={() => addFromRateSheet(item)} style={{
                  padding: "6px 12px", borderRadius: 100,
                  border: "1px solid rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  + {item.description}
                </button>
              ))}
            </div>
          )}

          {/* Manual add form */}
          {addingItem && (
            <div style={{ borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}33`, padding: 16, marginBottom: 12, backgroundColor: `${SIGNAL_GREEN}08` }}>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description *" style={{ ...inputStyle, marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px", gap: 8, marginBottom: 8 }}>
                <input value={newQty} onChange={e => setNewQty(e.target.value)} type="number" placeholder="Qty" style={inputStyle} />
                <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Unit (sq ft, hr…)" style={inputStyle} />
                <input value={newPrice} onChange={e => setNewPrice(e.target.value)} type="number" placeholder="Price" style={inputStyle} />
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {(["labor", "materials", "other"] as const).map(c => (
                  <button key={c} onClick={() => setNewCat(c)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid",
                    borderColor: newCat === c ? SIGNAL_GREEN : "rgba(255,255,255,0.1)",
                    backgroundColor: newCat === c ? `${SIGNAL_GREEN}18` : "transparent",
                    color: newCat === c ? SIGNAL_GREEN : "rgba(255,255,255,0.35)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setAddingItem(false); setNewDesc(""); setNewQty("1"); setNewUnit(""); setNewPrice("") }} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={addManualItem} disabled={!newDesc.trim() || !newPrice} style={{ flex: 2, padding: "10px 0", borderRadius: 12, border: "none", backgroundColor: newDesc.trim() && newPrice ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: newDesc.trim() && newPrice ? FOUND_BLACK : "rgba(255,255,255,0.2)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Add Item
                </button>
              </div>
            </div>
          )}

          {/* Items list */}
          {lineItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 16 }}>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.04)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.description}</div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                      {item.quantity} {item.unit || "×"} {fmt(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ color: "white", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>{fmt(item.quantity * item.unit_price)}</div>
                  <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", padding: "4px", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {lineItems.length === 0 && !addingItem && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.2)", fontSize: 14 }}>
              No line items yet — tap "+ Add Line" above
            </div>
          )}
        </div>

        {/* Tax */}
        <div style={{ marginBottom: 24, padding: "16px 18px", borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: subtotal > 0 ? 12 : 0 }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Tax rate</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={taxRate === 0 ? "" : (taxRate * 100).toFixed(2)}
                onChange={e => setTaxRate(Number(e.target.value) / 100)}
                placeholder="0"
                style={{ ...inputStyle, width: 72, padding: "8px 12px", textAlign: "right" }}
              />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>%</span>
            </div>
          </div>
          {subtotal > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Subtotal</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>{fmt(subtotal)}</span>
              </div>
              {taxRate > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Tax ({(taxRate * 100).toFixed(2)}%)</span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>{fmt(taxAmt)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ color: "white", fontSize: 16, fontWeight: 700 }}>Total</span>
                <span style={{ color: SIGNAL_GREEN, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !clientName.trim()}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 16, border: "none",
            backgroundColor: clientName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)",
            color: clientName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.2)",
            fontSize: 16, fontWeight: 800, cursor: clientName.trim() ? "pointer" : "default",
          }}
        >
          {saving ? "Saving…" : "Save Estimate"}
        </button>
      </div>
    </>
  )
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

function DetailSheet({ estimate, companySlug, rateSheet, onClose, onUpdate, onSend, onDelete }: {
  estimate: Estimate
  companySlug: string
  rateSheet: RateSheetItem[]
  onClose: () => void
  onUpdate: (patch: Record<string, unknown>) => Promise<void>
  onSend: () => Promise<void>
  onDelete: () => void
}) {
  const [mode, setMode] = useState<"view" | "edit" | "confirm_delete">("view")
  const [editItems, setEditItems] = useState<LineItem[]>([])
  const [editTax, setEditTax] = useState(0)
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
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
    if (hasFetched.current) return
    hasFetched.current = true
    fetch(`/api/estimates/${estimate.id}`)
      .then(r => r.json())
      .then(d => { if (d.estimate) setFullEstimate(d.estimate) })
      .catch(() => {})
  }, [estimate.id])

  const est = fullEstimate ?? estimate
  const items = est.estimate_line_items ?? []
  const link = shareUrl(estimate.id, companySlug)

  function startEdit() {
    setEditItems(items.map(i => ({ ...i })))
    setEditTax(est.tax_rate)
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

  async function handleSaveEdit() {
    setSaving(true)
    await onUpdate({ client_name: editName, client_phone: editPhone, client_email: editEmail, property_address: editAddress, line_items: editItems, tax_rate: editTax })
    setFullEstimate(prev => prev ? { ...prev, client_name: editName, client_phone: editPhone || null, client_email: editEmail || null, property_address: editAddress || null, tax_rate: editTax, estimate_line_items: editItems } : null)
    setSaving(false)
    setMode("view")
  }

  async function handleSend() {
    setSending(true)
    await onSend()
    setSending(false)
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
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", zIndex: 60, }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 70,
        backgroundColor: "#101411",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: "14px 22px 48px",
        maxHeight: "94dvh", overflowY: "auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", margin: "0 auto 22px" }} />

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
                <StatusBadge status={est.status} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setMode("confirm_delete")} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,69,58,0.25)", backgroundColor: "rgba(255,69,58,0.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF453A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
                <button onClick={startEdit} style={{ padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Edit</button>
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

            {/* Line items */}
            {items.length > 0 && (
              <div style={{ marginBottom: 20, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
                    padding: "12px 16px",
                    borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "white", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{item.description}</div>
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                        {item.quantity} {item.unit || "×"} {fmt(item.unit_price)}
                        {item.category && <span style={{ marginLeft: 6, textTransform: "capitalize" }}>· {item.category}</span>}
                      </div>
                    </div>
                    <div style={{ color: "white", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                      {fmt(item.quantity * item.unit_price)}
                    </div>
                  </div>
                ))}
              </div>
            )}

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
                    backgroundColor: "rgba(255,255,255,0.05)", color: "white",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    {copied ? "Copied!" : "Copy Client Link"}
                  </button>
                )}
                {est.status === "draft" && (
                  <button onClick={handleSend} disabled={sending} style={{
                    width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
                    backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK,
                    fontSize: 15, fontWeight: 800, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    opacity: sending ? 0.7 : 1,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    {sending ? "Sending…" : "Send Estimate"}
                  </button>
                )}
              </div>
            )}

            {est.status === "accepted" && (
              <div style={{ padding: "16px 18px", borderRadius: 16, backgroundColor: `${SIGNAL_GREEN}12`, border: `1px solid ${SIGNAL_GREEN}30`, textAlign: "center" }}>
                <div style={{ color: SIGNAL_GREEN, fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Estimate Accepted</div>
                {est.accepted_at && (
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    {new Date(est.accepted_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
              </div>
            )}

            {est.status === "declined" && (
              <div style={{ padding: "14px 18px", borderRadius: 16, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", textAlign: "center" }}>
                <div style={{ color: "#FF453A", fontSize: 14, fontWeight: 700 }}>Estimate Declined</div>
              </div>
            )}
          </>
        )}

        {/* Edit mode */}
        {mode === "edit" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
              <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>Edit Estimate</h2>
              <button onClick={() => setMode("view")} style={{ border: "none", background: "none", color: "rgba(255,255,255,0.4)", fontSize: 24, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ ...labelStyle }}>Client</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name *" style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={editPhone} onChange={e => setEditPhone(e.target.value)} type="tel" placeholder="Phone" style={inputStyle} />
                  <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email" placeholder="Email" style={inputStyle} />
                </div>
                <input value={editAddress} onChange={e => setEditAddress(e.target.value)} placeholder="Property address" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ ...labelStyle, margin: 0 }}>Line Items</p>
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
                    <input value={newUnit} onChange={e => setNewUnit(e.target.value)} placeholder="Unit" style={inputStyle} />
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
                    <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{item.quantity} {item.unit || "×"} {fmt(item.unit_price)}</div>
                  </div>
                  <div style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{fmt(item.quantity * item.unit_price)}</div>
                  <button onClick={() => removeEditItem(i)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>

            {/* Tax */}
            <div style={{ marginBottom: 20, padding: "14px 16px", borderRadius: 14, backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Tax rate</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" value={editTax === 0 ? "" : (editTax * 100).toFixed(2)} onChange={e => setEditTax(Number(e.target.value) / 100)} placeholder="0" style={{ ...inputStyle, width: 72, padding: "8px 12px", textAlign: "right" }} />
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

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setMode("view")} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: editName.trim() ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: editName.trim() ? FOUND_BLACK : "rgba(255,255,255,0.2)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
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
          <h2 style={{ margin: 0, color: "white", ...TYPE.title }}>Rate Sheet</h2>
          <button onClick={() => setAdding(v => !v)} style={{ padding: "7px 14px", borderRadius: 100, border: `1px solid ${SIGNAL_GREEN}55`, backgroundColor: `${SIGNAL_GREEN}14`, color: SIGNAL_GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
        </div>
        <p style={{ margin: "0 0 20px", color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.5 }}>
          Save your common services and prices. They'll appear as quick-add buttons when building estimates.
        </p>

        {adding && (
          <div style={{ borderRadius: 16, border: `1px solid ${SIGNAL_GREEN}33`, padding: 16, marginBottom: 16, backgroundColor: `${SIGNAL_GREEN}08` }}>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Service description *" style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, marginBottom: 8 }}>
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="Unit (sq ft, hr, each…)" style={inputStyle} />
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
                    <span style={{ marginLeft: 6, textTransform: "capitalize" }}>· {item.category}</span>
                  </div>
                </div>
                <button onClick={() => setLocal(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", backgroundColor: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "14px 0", borderRadius: 14, border: "none", backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            {saving ? "Saving…" : "Save Rate Sheet"}
          </button>
        </div>
      </div>
    </>
  )
}
