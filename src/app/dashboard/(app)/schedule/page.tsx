"use client"

import React, { useState, useEffect } from "react"
import { TYPE, TEXT_OPACITY, GREEN } from "@/lib/dashboard/typography"
import { saveAvailability, blockDate, blockRange, removeBlock, cancelBooking } from "./actions"

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const DURATION_OPTIONS = [
  { value: 15,  label: "15 min" },
  { value: 30,  label: "30 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "1 hour" },
  { value: 90,  label: "1.5 hours" },
  { value: 120, label: "2 hours" },
]
const BUFFER_OPTIONS = [
  { value: 0,  label: "No buffer" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
]

type DayConfig = {
  day_of_week: number
  is_working: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

type Block = {
  id: string
  block_date: string | null
  range_start: string | null
  range_end: string | null
  label: string | null
  created_at: string
}

type Booking = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  service_name: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: string
  confirmation_code: string | null
}

function defaultDay(dayOfWeek: number): DayConfig {
  const weekday = dayOfWeek >= 1 && dayOfWeek <= 5
  return {
    day_of_week: dayOfWeek,
    is_working: weekday,
    start_time: "09:00",
    end_time: "17:00",
    slot_duration_minutes: 60,
    buffer_minutes: 0,
  }
}

function formatBookingDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  })
}

function formatTime12(t: string) {
  const [h, m] = t.split(":").map(Number)
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
}

export default function SchedulePage() {
  const [companyId, setCompanyId]     = useState<string | null>(null)
  const [days, setDays]               = useState<DayConfig[]>(Array.from({ length: 7 }, (_, i) => defaultDay(i)))
  const [blocks, setBlocks]           = useState<Block[]>([])
  const [bookings, setBookings]       = useState<Booking[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saveMsg, setSaveMsg]         = useState("")
  const [tab, setTab]                 = useState<"calendar" | "bookings" | "hours">("calendar")

  // Block form
  const [blockType, setBlockType]     = useState<"single" | "range">("single")
  const [blockDateVal, setBlockDateVal]   = useState("")
  const [rangeStart, setRangeStart]   = useState("")
  const [rangeEnd, setRangeEnd]       = useState("")
  const [blockLabel, setBlockLabel]   = useState("")
  const [addingBlock, setAddingBlock] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)

  const prefix = typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard") ? "/dashboard" : ""

  useEffect(() => {
    Promise.all([
      fetch(`${prefix}/api/schedule/availability`).then(r => r.json()).catch(() => ({})),
      fetch(`${prefix}/api/schedule/blocks`).then(r => r.json()).catch(() => ({})),
      fetch(`${prefix}/api/schedule/bookings`).then(r => r.json()).catch(() => ({})),
    ]).then(([av, bl, bk]) => {
      if (av.companyId) setCompanyId(av.companyId)
      if (av.days?.length) {
        setDays(prev => {
          const map = new Map(av.days.map((d: DayConfig) => [d.day_of_week, d]))
          return prev.map((p, i) => {
            const override = map.get(i)
            return override ? { ...p, ...override } : p
          })
        })
      }
      setBlocks(bl.blocks ?? [])
      setBookings(bk.bookings ?? [])
    }).finally(() => setLoading(false))
  }, [prefix])

  function updateDay(dow: number, patch: Partial<DayConfig>) {
    setDays(prev => prev.map(d => d.day_of_week === dow ? { ...d, ...patch } : d))
  }

  async function handleSave() {
    if (!companyId) return
    setSaving(true)
    setSaveMsg("")
    const result = await saveAvailability(companyId, days)
    setSaving(false)
    setSaveMsg(result.success ? "Saved!" : (result.error ?? "Error saving"))
    setTimeout(() => setSaveMsg(""), 3000)
  }

  async function handleAddBlock() {
    if (!companyId) return
    setAddingBlock(true)
    let result
    if (blockType === "single" && blockDateVal) {
      result = await blockDate(companyId, blockDateVal, blockLabel || undefined)
    } else if (blockType === "range" && rangeStart && rangeEnd) {
      result = await blockRange(companyId, rangeStart, rangeEnd, blockLabel || undefined)
    } else {
      setAddingBlock(false)
      return
    }
    if (result?.success) {
      const bl = await fetch(`${prefix}/api/schedule/blocks`).then(r => r.json()).catch(() => ({}))
      setBlocks(bl.blocks ?? [])
      setBlockDateVal(""); setRangeStart(""); setRangeEnd(""); setBlockLabel(""); setShowBlockForm(false)
    }
    setAddingBlock(false)
  }

  async function handleRemoveBlock(id: string) {
    await removeBlock(id)
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  async function handleCancelBooking(id: string) {
    await cancelBooking(id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: "cancelled" } : b))
  }

  const upcomingBookings = bookings.filter(b => b.status !== "cancelled" && b.booking_date >= new Date().toISOString().split("T")[0])
  const pastBookings = bookings.filter(b => b.booking_date < new Date().toISOString().split("T")[0] && b.status !== "cancelled")

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: "8px 12px",
    color: "white",
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  }

  const sectionCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: "20px 18px",
    marginBottom: 16,
  }

  if (loading) {
    return (
      <div style={{ padding: "48px 20px", textAlign: "center" }}>
        <div style={{ display: "inline-block", width: 28, height: 28, border: `2px solid ${GREEN}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 100px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 2px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Booking Calendar</p>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "white", letterSpacing: "-0.02em" }}>My Schedule</h1>
        <p style={{ margin: "6px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          See what is booked, then adjust hours when you need to.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 4 }}>
        {(["calendar", "bookings", "hours"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: tab === t ? GREEN : "transparent",
              color: tab === t ? "#000" : `rgba(255,255,255,${TEXT_OPACITY.secondary})`,
              fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {t === "calendar" ? "Calendar" : t === "bookings" ? "Bookings" : "Hours"}
          </button>
        ))}
      </div>

      {/* Calendar */}
      {tab === "calendar" && (
        <>
          <div style={{ ...sectionCard, padding: "18px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 3px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>This week</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 850, color: "white" }}>{upcomingBookings.length} upcoming</p>
              </div>
              <button onClick={() => setTab("hours")} style={{ border: `1px solid ${GREEN}35`, background: `${GREEN}12`, color: GREEN, borderRadius: 999, padding: "9px 13px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Hours</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {Array.from({ length: 7 }, (_, offset) => {
                const d = new Date()
                d.setDate(d.getDate() + offset)
                const iso = d.toISOString().split("T")[0]
                const count = upcomingBookings.filter(b => b.booking_date === iso).length
                const isToday = offset === 0
                return (
                  <div key={iso} style={{ minHeight: 70, borderRadius: 14, padding: "9px 4px", textAlign: "center", background: isToday ? `${GREEN}18` : "rgba(255,255,255,0.035)", border: isToday ? `1px solid ${GREEN}45` : "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 800, color: isToday ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.disabled})`, textTransform: "uppercase" }}>{DAY_SHORT[d.getDay()]}</p>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 850, color: "white" }}>{d.getDate()}</p>
                    {count > 0 && <span style={{ display: "inline-block", marginTop: 6, width: 7, height: 7, borderRadius: "50%", background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />}
                  </div>
                )
              })}
            </div>
          </div>

          {upcomingBookings.length === 0 ? (
            <div style={{ ...sectionCard, textAlign: "center", padding: "30px 20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 850, color: "white" }}>No bookings yet.</p>
              <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.5, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>When customers reserve a time, the next booking will show here first.</p>
            </div>
          ) : (
            <>
              <p style={{ margin: "0 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Next up</p>
              {upcomingBookings.slice(0, 4).map(b => (
                <div key={b.id} style={sectionCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <p style={{ margin: "0 0 3px", fontWeight: 850, fontSize: 16, color: "white" }}>{b.customer_name}</p>
                      <p style={{ margin: "0 0 5px", ...TYPE.footnote, fontWeight: 760, color: GREEN }}>{formatBookingDate(b.booking_date)} at {formatTime12(b.start_time)}</p>
                      {b.service_name && <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{b.service_name}</p>}
                    </div>
                    <button onClick={() => setTab("bookings")} style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 750, cursor: "pointer" }}>Details</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* HOURS TAB */}
      {tab === "hours" && (
        <>
          {days.map(day => (
            <div key={day.day_of_week} style={sectionCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: day.is_working ? 16 : 0 }}>
                {/* Toggle */}
                <button
                  onClick={() => updateDay(day.day_of_week, { is_working: !day.is_working })}
                  style={{
                    width: 44, height: 26, borderRadius: 999, border: "none", cursor: "pointer",
                    background: day.is_working ? GREEN : "rgba(255,255,255,0.12)",
                    position: "relative", transition: "background 0.2s", flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute", top: 3, left: day.is_working ? 21 : 3,
                    width: 20, height: 20, borderRadius: "50%", background: "white",
                    transition: "left 0.2s",
                  }} />
                </button>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: day.is_working ? "white" : `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  {DAY_NAMES[day.day_of_week]}
                </span>
                {!day.is_working && (
                  <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>Closed</span>
                )}
              </div>

              {day.is_working && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Hours */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, minWidth: 36 }}>From</span>
                    <input type="time" value={day.start_time} onChange={e => updateDay(day.day_of_week, { start_time: e.target.value })} style={inputStyle} />
                    <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>to</span>
                    <input type="time" value={day.end_time} onChange={e => updateDay(day.day_of_week, { end_time: e.target.value })} style={inputStyle} />
                  </div>
                  {/* Slot + buffer */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
                    <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, minWidth: 36 }}>Slot</span>
                    <select value={day.slot_duration_minutes} onChange={e => updateDay(day.day_of_week, { slot_duration_minutes: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }}>
                      {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Buffer</span>
                    <select value={day.buffer_minutes} onChange={e => updateDay(day.day_of_week, { buffer_minutes: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }}>
                      {BUFFER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
              background: saving ? "rgba(255,255,255,0.1)" : GREEN,
              color: saving ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : "#000",
              fontWeight: 800, fontSize: 15, cursor: saving ? "default" : "pointer",
              marginTop: 8,
            }}
          >
            {saving ? "Saving…" : "Save My Hours"}
          </button>
          {saveMsg && (
            <p style={{ textAlign: "center", marginTop: 10, ...TYPE.footnote, color: saveMsg === "Saved!" ? GREEN : "#FF3B30" }}>
              {saveMsg}
            </p>
          )}
        </>
      )}

      {/* Time off */}
      {tab === "hours" && (
        <>
          <button
            onClick={() => setShowBlockForm(true)}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 14, border: `1px solid ${GREEN}35`,
              background: `${GREEN}12`, color: GREEN, fontWeight: 700, fontSize: 14,
              cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Block Time Off
          </button>

          {showBlockForm && (
            <div style={{ ...sectionCard, borderColor: `${GREEN}25` }}>
              {/* Type selector */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                {(["single", "range"] as const).map(t => (
                  <button key={t} onClick={() => setBlockType(t)} style={{
                    flex: 1, padding: "9px 0", borderRadius: 10, border: "none",
                    background: blockType === t ? "rgba(255,255,255,0.12)" : "transparent",
                    color: blockType === t ? "white" : `rgba(255,255,255,${TEXT_OPACITY.secondary})`,
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                  }}>
                    {t === "single" ? "Single day" : "Date range"}
                  </button>
                ))}
              </div>

              {blockType === "single" ? (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, marginBottom: 6 }}>Date</label>
                  <input type="date" value={blockDateVal} onChange={e => setBlockDateVal(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, marginBottom: 6 }}>From</label>
                    <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, marginBottom: 6 }}>To</label>
                    <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, marginBottom: 6 }}>Label (optional)</label>
                <input type="text" value={blockLabel} onChange={e => setBlockLabel(e.target.value)} placeholder="e.g. Vacation, Holiday…" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowBlockForm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleAddBlock} disabled={addingBlock} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: GREEN, color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{addingBlock ? "Saving…" : "Block These Days"}</button>
              </div>
            </div>
          )}

          {blocks.length === 0 ? (
            <p style={{ textAlign: "center", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 24 }}>
              No blocked days yet.
            </p>
          ) : (
            blocks.map(b => (
              <div key={b.id} style={{ ...sectionCard, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "white" }}>
                    {b.block_date
                      ? formatBookingDate(b.block_date)
                      : `${b.range_start ? formatBookingDate(b.range_start) : ""} – ${b.range_end ? formatBookingDate(b.range_end) : ""}`}
                  </p>
                  {b.label && <p style={{ margin: "2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{b.label}</p>}
                </div>
                <button onClick={() => handleRemoveBlock(b.id)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,59,48,0.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))
          )}
        </>
      )}

      {/* BOOKINGS TAB */}
      {tab === "bookings" && (
        <>
          {upcomingBookings.length === 0 && pastBookings.length === 0 && (
            <p style={{ textAlign: "center", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, marginTop: 24 }}>
              No bookings yet. Once customers book through your site, they&apos;ll appear here.
            </p>
          )}

          {upcomingBookings.length > 0 && (
            <>
              <p style={{ margin: "0 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Upcoming</p>
              {upcomingBookings.map(b => (
                <div key={b.id} style={sectionCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div>
                      <p style={{ margin: "0 0 2px", fontWeight: 800, fontSize: 16, color: "white" }}>{b.customer_name}</p>
                      <p style={{ margin: "0 0 6px", ...TYPE.footnote, fontWeight: 700, color: GREEN }}>
                        {formatBookingDate(b.booking_date)} at {formatTime12(b.start_time)}
                      </p>
                      {b.service_name && <p style={{ margin: "0 0 4px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{b.service_name}</p>}
                      <a href={`tel:${b.customer_phone.replace(/\D/g, "")}`} style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, textDecoration: "none" }}>{b.customer_phone}</a>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      {b.confirmation_code && (
                        <span style={{ ...TYPE.footnote, fontWeight: 700, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>#{b.confirmation_code}</span>
                      )}
                      <button onClick={() => handleCancelBooking(b.id)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,59,48,0.14)", color: "#FF3B30", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {pastBookings.length > 0 && (
            <>
              <p style={{ margin: "20px 0 10px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Past</p>
              {pastBookings.slice(0, 10).map(b => (
                <div key={b.id} style={{ ...sectionCard, opacity: 0.55 }}>
                  <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 15, color: "white" }}>{b.customer_name}</p>
                  <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                    {formatBookingDate(b.booking_date)} at {formatTime12(b.start_time)}
                    {b.service_name ? ` — ${b.service_name}` : ""}
                  </p>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

