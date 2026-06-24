"use client"

import { useState, useEffect } from "react"

type Slot = { start: string; end: string; display: string }
type Step = "date" | "time" | "details" | "confirmed"

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function todayLocal(): { year: number; month: number; day: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstWeekdayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function BookingCalendar({
  companyId,
  primaryColor,
  workingDays,
  companyName,
  pageTitle,
}: {
  companyId: string
  primaryColor: string
  workingDays: number[]   // [1,2,3,4,5] = Mon-Fri
  companyName: string
  pageTitle: string
}) {
  const today = todayLocal()
  const [viewYear, setViewYear]     = useState(today.year)
  const [viewMonth, setViewMonth]   = useState(today.month)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [slots, setSlots]           = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [step, setStep]             = useState<Step>("date")

  // Form fields
  const [name, setName]     = useState("")
  const [phone, setPhone]   = useState("")
  const [email, setEmail]   = useState("")
  const [service, setService] = useState("")
  const [notes, setNotes]   = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError]   = useState("")
  const [confirmCode, setConfirmCode] = useState("")

  const workingSet = new Set(workingDays)

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function canGoBack() {
    return viewYear > today.year || (viewYear === today.year && viewMonth > today.month)
  }

  function isDateAvailable(day: number) {
    const dow = new Date(viewYear, viewMonth, day).getDay()
    if (!workingSet.has(dow)) return false
    const dateStr = formatDate(viewYear, viewMonth, day)
    const todayStr = formatDate(today.year, today.month, today.day)
    return dateStr >= todayStr
  }

  async function handleDateClick(day: number) {
    const dateStr = formatDate(viewYear, viewMonth, day)
    setSelectedDate(dateStr)
    setSelectedSlot(null)
    setLoadingSlots(true)
    setStep("time")
    try {
      const res = await fetch(`/api/bookings/slots?company_id=${companyId}&date=${dateStr}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  function handleSlotClick(slot: Slot) {
    setSelectedSlot(slot)
    setStep("details")
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedSlot) return
    if (!name.trim() || !phone.trim()) {
      setFormError("Name and phone number are required.")
      return
    }
    setFormError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          service: service.trim(),
          notes: notes.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setConfirmCode(data.confirmationCode ?? "")
        setStep("confirmed")
      } else {
        setFormError(data.error || "Something went wrong. Please try again.")
      }
    } catch {
      setFormError("Unable to connect. Please check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  function formatSelectedDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00Z")
    return d.toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
    })
  }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const firstDow = firstWeekdayOfMonth(viewYear, viewMonth)

  // ── Confirmed screen ──
  if (step === "confirmed") {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: `${primaryColor}22` }}>
          <svg className="w-8 h-8" fill="none" stroke={primaryColor} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "#111111" }}>You&apos;re booked!</h2>
        <p className="text-gray-500 text-lg mb-6">
          {selectedDate && formatSelectedDate(selectedDate)} at {selectedSlot?.display}
        </p>
        {confirmCode && (
          <div className="inline-block px-6 py-3 rounded-2xl mb-6" style={{ backgroundColor: `${primaryColor}12`, border: `1px solid ${primaryColor}30` }}>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: primaryColor }}>Confirmation #</p>
            <p className="text-2xl font-black" style={{ color: "#111111" }}>{confirmCode}</p>
          </div>
        )}
        <p className="text-gray-400 text-sm">
          {email ? "A confirmation was sent to your email." : "Save your confirmation number for your records."}
        </p>
      </div>
    )
  }

  // ── Details form ──
  if (step === "details") {
    return (
      <div>
        <button
          onClick={() => setStep("time")}
          className="flex items-center gap-2 text-sm font-semibold mb-6"
          style={{ color: primaryColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}25` }}>
          <p className="text-sm font-black uppercase tracking-widest mb-1" style={{ color: primaryColor }}>Your Appointment</p>
          <p className="font-black text-lg" style={{ color: "#111111" }}>
            {selectedDate && formatSelectedDate(selectedDate)}
          </p>
          <p className="font-semibold" style={{ color: "#555555" }}>{selectedSlot?.display}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
                Full Name <span style={{ color: primaryColor }}>*</span>
              </label>
              <input
                type="text" required value={name} onChange={e => setName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
                Phone <span style={{ color: primaryColor }}>*</span>
              </label>
              <input
                type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
              Email <span className="text-gray-400 font-normal">(optional — for confirmation)</span>
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
              Service or reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text" value={service} onChange={e => setService(e.target.value)}
              placeholder="What are you coming in for?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#111111" }}>
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              rows={3} placeholder="Anything we should know?"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 resize-none"
            />
          </div>

          {formError && (
            <p className="text-sm font-medium text-red-600 bg-red-50 rounded-xl px-4 py-3">{formError}</p>
          )}

          <button
            type="submit" disabled={submitting}
            className="btn w-full text-white disabled:opacity-60"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
          >
            {submitting ? "Confirming…" : "Confirm Booking"}
          </button>
        </form>
      </div>
    )
  }

  // ── Time slot picker ──
  if (step === "time") {
    return (
      <div>
        <button
          onClick={() => setStep("date")}
          className="flex items-center gap-2 text-sm font-semibold mb-6"
          style={{ color: primaryColor, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {selectedDate && (
          <h2 className="text-lg font-black mb-5" style={{ color: "#111111" }}>
            {formatSelectedDate(selectedDate)}
          </h2>
        )}

        {loadingSlots ? (
          <div className="text-center py-10">
            <div className="inline-block w-8 h-8 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: primaryColor }} />
            <p className="text-sm text-gray-400 mt-3">Checking availability…</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No availability on this date.</p>
            <button
              onClick={() => setStep("date")}
              className="btn"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Pick another day
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map(slot => (
              <button
                key={slot.start}
                onClick={() => handleSlotClick(slot)}
                className="px-4 py-3 rounded-xl text-sm font-bold border-2 transition-colors"
                style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: "transparent" }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor
                  ;(e.currentTarget as HTMLButtonElement).style.color = "white"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"
                  ;(e.currentTarget as HTMLButtonElement).style.color = primaryColor
                }}
              >
                {slot.display}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Date picker (calendar grid) ──
  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          disabled={!canGoBack()}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200 disabled:opacity-30"
          style={{ cursor: canGoBack() ? "pointer" : "default" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h2 className="font-black text-lg" style={{ color: "#111111" }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={nextMonth}
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-xs font-black uppercase tracking-widest py-2" style={{ color: "#999999" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDow }, (_, i) => <div key={`pad-${i}`} />)}
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1
          const available = isDateAvailable(day)
          const dateStr = formatDate(viewYear, viewMonth, day)
          const isToday = viewYear === today.year && viewMonth === today.month && day === today.day
          return (
            <button
              key={day}
              onClick={() => available && handleDateClick(day)}
              disabled={!available}
              className="aspect-square flex items-center justify-center rounded-xl text-sm font-bold transition-colors"
              style={{
                backgroundColor: available ? `${primaryColor}12` : "transparent",
                color: available ? primaryColor : "#cccccc",
                cursor: available ? "pointer" : "default",
                border: isToday ? `2px solid ${primaryColor}` : "2px solid transparent",
              }}
              onMouseEnter={e => {
                if (available) (e.currentTarget as HTMLButtonElement).style.backgroundColor = primaryColor,
                              (e.currentTarget as HTMLButtonElement).style.color = "white"
              }}
              onMouseLeave={e => {
                if (available) (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${primaryColor}12`,
                              (e.currentTarget as HTMLButtonElement).style.color = primaryColor
              }}
            >
              {day}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-center text-gray-400 mt-5">
        Select a date to see available times
      </p>
    </div>
  )
}
