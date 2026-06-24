import { createAdminClient } from "@/lib/supabase/admin"

export type TimeSlot = {
  start: string   // "09:00"
  end: string     // "10:00"
  display: string // "9:00 AM"
}

function minutesToTime(m: number) {
  return `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function toDisplay(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const ampm = h < 12 ? "AM" : "PM"
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`
}

export async function getAvailableSlots(companyId: string, dateStr: string): Promise<TimeSlot[]> {
  const admin = createAdminClient()

  // Reject past dates
  const today = new Date()
  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-")
  if (dateStr < todayStr) return []

  // Parse day-of-week from UTC noon (avoids timezone day-shift)
  const dayOfWeek = new Date(dateStr + "T12:00:00Z").getUTCDay()

  // 1. Working hours for this day
  const { data: avail } = await admin
    .from("company_availability")
    .select("is_working, start_time, end_time, slot_duration_minutes, buffer_minutes")
    .eq("company_id", companyId)
    .eq("day_of_week", dayOfWeek)
    .single()

  if (!avail || !avail.is_working) return []

  const duration = avail.slot_duration_minutes ?? 60
  const buffer = avail.buffer_minutes ?? 0
  const startMin = timeToMinutes(avail.start_time)
  const endMin = timeToMinutes(avail.end_time)

  // 2. Check for blocking rules
  const { data: blocks } = await admin
    .from("availability_blocks")
    .select("block_date, range_start, range_end, time_date, time_start, time_end")
    .eq("company_id", companyId)

  const isFullyBlocked = (blocks ?? []).some(b => {
    if (b.block_date === dateStr) return true
    if (b.range_start && b.range_end && dateStr >= b.range_start && dateStr <= b.range_end) return true
    return false
  })
  if (isFullyBlocked) return []

  const timeBlocks = (blocks ?? [])
    .filter(b => b.time_date === dateStr && b.time_start && b.time_end)
    .map(b => ({ start: timeToMinutes(b.time_start), end: timeToMinutes(b.time_end) }))

  // 3. Existing confirmed bookings for this date
  const { data: existing } = await admin
    .from("bookings")
    .select("start_time, end_time")
    .eq("company_id", companyId)
    .eq("booking_date", dateStr)
    .not("status", "eq", "cancelled")

  const taken = (existing ?? []).map(b => ({
    start: timeToMinutes(b.start_time),
    end: timeToMinutes(b.end_time) + buffer,
  }))

  // 4. For today: skip slots that have already passed (give 30-min lead time)
  const nowMin = dateStr === todayStr
    ? today.getHours() * 60 + today.getMinutes() + 30
    : 0

  // 5. Generate slots
  const slots: TimeSlot[] = []
  for (let t = startMin; t + duration <= endMin; t += duration) {
    if (t < nowMin) continue
    const slotEnd = t + duration
    const slotEndBuf = slotEnd + buffer
    if (timeBlocks.some(b => t < b.end && slotEndBuf > b.start)) continue
    if (taken.some(b => t < b.end && slotEnd > b.start)) continue
    slots.push({ start: minutesToTime(t), end: minutesToTime(slotEnd), display: toDisplay(t) })
  }

  return slots
}
