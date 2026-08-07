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

type TimeBlock = {
  block_order: number
  start_time: string
  end_time: string
}

type DayConfig = {
  day_of_week: number
  is_working: boolean
  blocks: TimeBlock[]
  slot_duration_minutes: number
  buffer_minutes: number
}

const MAX_BLOCKS_PER_DAY = 3

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
    blocks: weekday ? [{ block_order: 0, start_time: "09:00", end_time: "17:00" }] : [],
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
  const [hasScheduleChanges, setHasScheduleChanges] = useState(false)
  const [hasSavedData, setHasSavedData] = useState(false)

  // Block form
  const [blockType, setBlockType]     = useState<"single" | "range">("single")
  const [blockDateVal, setBlockDateVal]   = useState("")
  const [rangeStart, setRangeStart]   = useState("")
  const [rangeEnd, setRangeEnd]       = useState("")
  const [blockLabel, setBlockLabel]   = useState("")
  const [addingBlock, setAddingBlock] = useState(false)
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set())
  const [savedConfirmDay, setSavedConfirmDay] = useState<number | null>(null)
  const [lastSavedDays, setLastSavedDays] = useState<DayConfig[] | null>(null)
  const [showBookingSettings, setShowBookingSettings] = useState(false)

  const prefix = typeof window !== "undefined" && window.location.pathname.startsWith("/dashboard") ? "/dashboard" : ""

  useEffect(() => {
    Promise.all([
      fetch(`${prefix}/api/schedule/availability`).then(r => r.json()).catch(() => ({})),
      fetch(`${prefix}/api/schedule/blocks`).then(r => r.json()).catch(() => ({})),
      fetch(`${prefix}/api/schedule/bookings`).then(r => r.json()).catch(() => ({})),
    ]).then(([av, bl, bk]) => {
      if (av.companyId) setCompanyId(av.companyId)
      if (av.days?.length) {
        setHasSavedData(true)
        setDays(prev => {
          type Row = { day_of_week: number; block_order: number; is_working: boolean; start_time: string; end_time: string; slot_duration_minutes: number; buffer_minutes: number }
          const byDay = new Map<number, Row[]>()
          for (const row of av.days as Row[]) {
            if (!byDay.has(row.day_of_week)) byDay.set(row.day_of_week, [])
            byDay.get(row.day_of_week)!.push(row)
          }
          const hydrated = prev.map((p, i) => {
            const rows = byDay.get(i)
            if (!rows || rows.length === 0) return p
            const workingRows = rows.filter(r => r.is_working).sort((a, b) => a.block_order - b.block_order)
            return {
              ...p,
              is_working: rows.some(r => r.is_working),
              blocks: workingRows.map(r => ({ block_order: r.block_order, start_time: r.start_time, end_time: r.end_time })),
              slot_duration_minutes: rows[0].slot_duration_minutes,
              buffer_minutes: rows[0].buffer_minutes,
            }
          })
          setLastSavedDays(hydrated)
          return hydrated
        })
      }
      setBlocks(bl.blocks ?? [])
      setBookings(bk.bookings ?? [])
    }).finally(() => setLoading(false))
  }, [prefix])

  function toggleDayOpen(dow: number) {
    setHasScheduleChanges(true)
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow) return d
      const nowOpen = !d.is_working
      return { ...d, is_working: nowOpen, blocks: nowOpen && d.blocks.length === 0 ? [{ block_order: 0, start_time: "09:00", end_time: "17:00" }] : d.blocks }
    }))
  }

  function updateBlock(dow: number, blockOrder: number, patch: Partial<TimeBlock>) {
    setHasScheduleChanges(true)
    setDays(prev => prev.map(d => d.day_of_week === dow
      ? { ...d, blocks: d.blocks.map(b => b.block_order === blockOrder ? { ...b, ...patch } : b) }
      : d
    ))
  }

  function addBlock(dow: number) {
    setHasScheduleChanges(true)
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow || d.blocks.length >= MAX_BLOCKS_PER_DAY) return d
      const last = d.blocks[d.blocks.length - 1]
      return { ...d, blocks: [...d.blocks, { block_order: d.blocks.length, start_time: last?.end_time ?? "09:00", end_time: "17:00" }] }
    }))
  }

  function removeBlockAt(dow: number, blockOrder: number) {
    setHasScheduleChanges(true)
    setDays(prev => prev.map(d => {
      if (d.day_of_week !== dow) return d
      const resequenced = d.blocks.filter(b => b.block_order !== blockOrder).map((b, i) => ({ ...b, block_order: i }))
      return { ...d, blocks: resequenced }
    }))
  }

  function updateOpenDays(patch: Partial<Pick<DayConfig, "slot_duration_minutes" | "buffer_minutes">>) {
    setHasScheduleChanges(true)
    setDays(prev => prev.map(d => d.is_working ? { ...d, ...patch } : d))
  }

  function toggleDayExpanded(dow: number) {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dow)) next.delete(dow)
      else next.add(dow)
      return next
    })
  }

  function startBulkEdit() {
    setExpandedDays(new Set(days.map(d => d.day_of_week)))
  }

  function cancelEdit() {
    if (lastSavedDays) setDays(lastSavedDays)
    setExpandedDays(new Set())
    setHasScheduleChanges(false)
    setShowBookingSettings(false)
  }

  async function handleSave() {
    if (!companyId) return
    setSaving(true)
    setSaveMsg("")
    const rows = days.flatMap(d =>
      d.is_working && d.blocks.length > 0
        ? d.blocks.map(b => ({
            day_of_week: d.day_of_week,
            block_order: b.block_order,
            is_working: true,
            start_time: b.start_time,
            end_time: b.end_time,
            slot_duration_minutes: d.slot_duration_minutes,
            buffer_minutes: d.buffer_minutes,
          }))
        : [{
            day_of_week: d.day_of_week,
            block_order: 0,
            is_working: false,
            start_time: "09:00",
            end_time: "17:00",
            slot_duration_minutes: d.slot_duration_minutes,
            buffer_minutes: d.buffer_minutes,
          }]
    )
    const result = await saveAvailability(companyId, rows)
    setSaving(false)
    if (!result.success) {
      setSaveMsg(result.error ?? "Error saving")
      setTimeout(() => setSaveMsg(""), 3000)
      return
    }
    setLastSavedDays(days)
    setHasScheduleChanges(false)
    setHasSavedData(true)
    setShowBookingSettings(false)
    if (expandedDays.size === 1) {
      const [onlyDay] = Array.from(expandedDays)
      setSavedConfirmDay(onlyDay)
      setTimeout(() => { setSavedConfirmDay(null); setExpandedDays(new Set()) }, 1200)
    } else {
      setExpandedDays(new Set())
      setSaveMsg("Saved!")
      setTimeout(() => setSaveMsg(""), 3000)
    }
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
  const openDays = days.filter(d => d.is_working)
  const closedDays = days.filter(d => !d.is_working)
  const incompleteDays = days.filter(d => d.is_working && d.blocks.length === 0)
  const primaryWorkingDay = openDays[0] ?? defaultDay(1)
  const hoursSummary = closedDays.length === 0
    ? "Open every day"
    : openDays.length === 0
      ? "Closed every day"
      : `Open ${openDays.length} day${openDays.length === 1 ? "" : "s"} · Closed ${closedDays.map(d => DAY_SHORT[d.day_of_week]).join(", ")}`
  const isBulkEdit = expandedDays.size > 1

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
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "28px 16px 112px" }}>
      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: GREEN }}>Schedule</p>
        <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>My Schedule</h1>
        <p style={{ margin: "10px 0 0", ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
          See what is booked. Adjust hours only when something changes.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        gap: 4,
        marginBottom: 26,
        background: "rgba(8,10,9,0.88)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        padding: 4,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
      }}>
        {(["calendar", "bookings", "hours"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${tab === t ? `${GREEN}55` : "transparent"}`,
              background: tab === t ? `${GREEN}18` : "transparent",
              color: tab === t ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.secondary})`,
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
              <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 850, color: "white" }}>No bookings this week.</p>
              <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.5, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>When someone reserves a time, it will show here first.</p>
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

      {/* Hours */}
      {tab === "hours" && (
        <>
          <div style={{ ...sectionCard, padding: "0 18px 20px", overflow: "hidden" }}>
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
              margin: "0 -18px 12px",
              padding: "18px",
              background: "rgba(255,255,255,0.025)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div>
                <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Weekly hours</p>
                <p style={{ margin: "0 0 6px", ...TYPE.headline, color: "white" }}>{hoursSummary}</p>
                {!loading && (
                  incompleteDays.length > 0 ? (
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#FF3B30", background: "rgba(255,59,48,0.14)", borderRadius: 999, padding: "3px 9px" }}>
                      {incompleteDays.map(d => DAY_SHORT[d.day_of_week]).join(", ")} needs a time added
                    </span>
                  ) : hasScheduleChanges ? (
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#FFB800", background: "rgba(255,184,0,0.14)", borderRadius: 999, padding: "3px 9px" }}>
                      Unsaved changes
                    </span>
                  ) : hasSavedData ? (
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: GREEN, background: `${GREEN}14`, borderRadius: 999, padding: "3px 9px" }}>
                      Live on your site
                    </span>
                  ) : (
                    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#FF3B30", background: "rgba(255,59,48,0.14)", borderRadius: 999, padding: "3px 9px" }}>
                      Not saved yet — tap a day to set your hours
                    </span>
                  )
                )}
              </div>
              <button onClick={() => expandedDays.size > 0 ? cancelEdit() : startBulkEdit()} style={{ border: "1px solid rgba(255,255,255,0.1)", background: expandedDays.size > 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.04)", color: expandedDays.size > 0 ? "rgba(255,255,255,0.7)" : GREEN, borderRadius: 999, padding: "8px 12px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
                {expandedDays.size > 0 ? "Cancel" : "Edit all days"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {days.map(day => {
                const isExpanded = expandedDays.has(day.day_of_week)
                const justSaved = savedConfirmDay === day.day_of_week
                return (
                <div key={day.day_of_week} style={{ padding: "13px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button
                    onClick={() => toggleDayExpanded(day.day_of_week)}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, ...TYPE.headline, fontSize: "1rem", color: day.is_working ? "white" : `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                        {DAY_NAMES[day.day_of_week]}
                      </p>
                      {!isExpanded && (
                        <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${day.is_working ? TEXT_OPACITY.secondary : TEXT_OPACITY.disabled})` }}>
                          {day.is_working && day.blocks.length > 0
                            ? day.blocks.map(b => `${formatTime12(b.start_time)} - ${formatTime12(b.end_time)}`).join(", ")
                            : "Closed"}
                        </p>
                      )}
                    </div>
                    {justSaved ? (
                      <span style={{ ...TYPE.footnote, fontWeight: 800, color: GREEN }}>Saved ✓</span>
                    ) : !isExpanded ? (
                      <span style={{ ...TYPE.footnote, color: day.is_working ? GREEN : `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
                        {day.is_working ? "Open" : "Closed"}
                      </span>
                    ) : (
                      <span style={{ color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontSize: 18, lineHeight: 1 }}>−</span>
                    )}
                  </button>

                  {isExpanded && !justSaved && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: day.is_working ? 12 : 0 }}>
                        <button
                          onClick={() => toggleDayOpen(day.day_of_week)}
                          style={{
                            width: 42, height: 25, borderRadius: 999, border: "none", cursor: "pointer",
                            background: day.is_working ? GREEN : "rgba(255,255,255,0.12)",
                            position: "relative", transition: "background 0.2s", flexShrink: 0,
                          }}
                        >
                          <span style={{
                            position: "absolute", top: 3, left: day.is_working ? 20 : 3,
                            width: 19, height: 19, borderRadius: "50%", background: "white",
                            transition: "left 0.2s",
                          }} />
                        </button>
                        <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{day.is_working ? "Open" : "Closed"}</span>
                      </div>

                      {day.is_working && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {day.blocks.map(block => (
                            <div key={block.block_order} style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "10px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                              <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                                Opens
                                <input type="time" value={block.start_time} onChange={e => updateBlock(day.day_of_week, block.block_order, { start_time: e.target.value })} style={inputStyle} />
                              </label>
                              <label style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                                Closes
                                <input type="time" value={block.end_time} onChange={e => updateBlock(day.day_of_week, block.block_order, { end_time: e.target.value })} style={inputStyle} />
                              </label>
                              {day.blocks.length > 1 && (
                                <button onClick={() => removeBlockAt(day.day_of_week, block.block_order)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,59,48,0.14)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF3B30" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              )}
                            </div>
                          ))}
                          {day.blocks.length < MAX_BLOCKS_PER_DAY && (
                            <button onClick={() => addBlock(day.day_of_week)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", color: GREEN, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "4px 0" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Add time block
                            </button>
                          )}
                        </div>
                      )}

                      {!isBulkEdit && (
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          style={{
                            width: "100%", marginTop: 14, padding: "12px 0", borderRadius: 12, border: "none",
                            background: saving ? "rgba(255,255,255,0.1)" : GREEN,
                            color: saving ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : "#000",
                            fontWeight: 800, fontSize: 14, cursor: saving ? "default" : "pointer",
                          }}
                        >
                          {saving ? "Saving..." : `Save ${DAY_NAMES[day.day_of_week]}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </div>

          <div style={sectionCard}>
            <button onClick={() => setShowBookingSettings(v => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, border: "none", background: "transparent", padding: 0, color: "inherit", cursor: "pointer", textAlign: "left" }}>
              <div>
                <p style={{ margin: "0 0 4px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Booking settings</p>
                <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>{DURATION_OPTIONS.find(o => o.value === primaryWorkingDay.slot_duration_minutes)?.label ?? `${primaryWorkingDay.slot_duration_minutes} min`} appointments, {BUFFER_OPTIONS.find(o => o.value === primaryWorkingDay.buffer_minutes)?.label.toLowerCase() ?? `${primaryWorkingDay.buffer_minutes} min`} between bookings</p>
              </div>
              <span style={{ color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontSize: 22, lineHeight: 1 }}>{showBookingSettings ? "-" : "+"}</span>
            </button>

            {showBookingSettings && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  Appointment length
                  <select value={primaryWorkingDay.slot_duration_minutes} onChange={e => updateOpenDays({ slot_duration_minutes: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }}>
                    {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
                  Time between
                  <select value={primaryWorkingDay.buffer_minutes} onChange={e => updateOpenDays({ buffer_minutes: Number(e.target.value) })} style={{ ...inputStyle, cursor: "pointer" }}>
                    {BUFFER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            )}
          </div>

          {isBulkEdit && (
            <div style={{ position: "sticky", bottom: 88, zIndex: 15 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%", padding: "16px 0", borderRadius: 14, border: "none",
                  background: saving ? "rgba(255,255,255,0.1)" : GREEN,
                  color: saving ? `rgba(255,255,255,${TEXT_OPACITY.secondary})` : "#000",
                  fontWeight: 800, fontSize: 15, cursor: saving ? "default" : "pointer",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {saveMsg && (
                <p style={{ textAlign: "center", margin: "8px 0 0", ...TYPE.footnote, color: saveMsg === "Saved!" ? GREEN : "#FF3B30", background: "#0d100e", borderRadius: 8, padding: "4px 0" }}>
                  {saveMsg}
                </p>
              )}
            </div>
          )}
          {!isBulkEdit && saveMsg && (
            <p style={{ textAlign: "center", margin: "8px 0 0", ...TYPE.footnote, color: saveMsg === "Saved!" ? GREEN : "#FF3B30" }}>
              {saveMsg}
            </p>
          )}
        </>
      )}
      {/* Time off */}
      {tab === "hours" && (
        <>
          <div style={{ margin: "8px 0 12px" }}>
            <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Time off</p>
          </div>
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
                <input type="text" value={blockLabel} onChange={e => setBlockLabel(e.target.value)} placeholder="e.g. Vacation, holiday" style={{ ...inputStyle, width: "100%", boxSizing: "border-box" as const }} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowBlockForm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleAddBlock} disabled={addingBlock} style={{ flex: 2, padding: "11px 0", borderRadius: 10, border: "none", background: GREEN, color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>{addingBlock ? "Saving..." : "Block These Days"}</button>
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
                      : `${b.range_start ? formatBookingDate(b.range_start) : ""} - ${b.range_end ? formatBookingDate(b.range_end) : ""}`}
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
            <div style={{ ...sectionCard, textAlign: "center", padding: "30px 20px" }}>
              <p style={{ margin: "0 0 6px", ...TYPE.headline, color: "white" }}>No booking history yet.</p>
              <p style={{ margin: 0, ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Every scheduled customer will appear here after they book.</p>
            </div>
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
                    {b.service_name ? ` - ${b.service_name}` : ""}
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
