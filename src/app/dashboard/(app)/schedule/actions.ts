"use server"

import { createClient } from "@/lib/supabase/server"

type DayConfig = {
  day_of_week: number
  is_working: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

export async function saveAvailability(companyId: string, days: DayConfig[]) {
  const supabase = await createClient()

  // Upsert all 7 rows (one per day of week)
  const rows = days.map(d => ({
    company_id: companyId,
    day_of_week: d.day_of_week,
    is_working: d.is_working,
    start_time: d.start_time,
    end_time: d.end_time,
    slot_duration_minutes: d.slot_duration_minutes,
    buffer_minutes: d.buffer_minutes,
  }))

  const { error } = await supabase
    .from("company_availability")
    .upsert(rows, { onConflict: "company_id,day_of_week" })

  if (error) {
    console.error("[saveAvailability]", error.message)
    return { success: false, error: "Could not save availability. Please try again." }
  }
  return { success: true }
}

export async function blockDate(companyId: string, blockDate: string, label?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("availability_blocks").insert({
    company_id: companyId,
    block_date: blockDate,
    label: label || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function blockRange(companyId: string, rangeStart: string, rangeEnd: string, label?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("availability_blocks").insert({
    company_id: companyId,
    range_start: rangeStart,
    range_end: rangeEnd,
    label: label || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removeBlock(blockId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("availability_blocks").delete().eq("id", blockId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
