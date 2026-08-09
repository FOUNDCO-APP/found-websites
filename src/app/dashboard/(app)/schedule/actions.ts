"use server"

import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { companyHasAddonAccess } from "@/lib/dashboard/entitlements"
import { createAdminClient } from "@/lib/supabase/admin"

async function requireScheduleAccess(companyId?: string) {
  const user = await getAuthUser()
  if (!user) return { ok: false as const, error: "Unauthorized" }

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return { ok: false as const, error: "No company" }
  if (companyId && companyId !== company.id) return { ok: false as const, error: "No company" }
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return { ok: false as const, error: "Not available for your account" }

  const allowed = await companyHasAddonAccess(company, "reservation_calendar")
  if (!allowed) return { ok: false as const, error: "Booking Calendar is not available on this plan." }

  return { ok: true as const, company }
}
type DayConfig = {
  day_of_week: number
  block_order: number
  is_working: boolean
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
}

// Rows are the full flattened set (up to 3 blocks per day) - delete-then-
// insert instead of upsert so removing a block actually removes its row
// instead of leaving a stale one behind.
export async function saveAvailability(companyId: string, days: DayConfig[]) {
  const access = await requireScheduleAccess(companyId)
  if (!access.ok) return { success: false, error: access.error }
  const supabase = createAdminClient()

  const rows = days.map(d => ({
    company_id: companyId,
    day_of_week: d.day_of_week,
    block_order: d.block_order,
    is_working: d.is_working,
    start_time: d.start_time,
    end_time: d.end_time,
    slot_duration_minutes: d.slot_duration_minutes,
    buffer_minutes: d.buffer_minutes,
  }))

  const { error: deleteError } = await supabase.from("company_availability").delete().eq("company_id", companyId)
  if (deleteError) {
    console.error("[saveAvailability] delete", deleteError.message)
    return { success: false, error: "Could not save availability. Please try again." }
  }

  const { error } = await supabase.from("company_availability").insert(rows)

  if (error) {
    console.error("[saveAvailability]", error.message)
    return { success: false, error: "Could not save availability. Please try again." }
  }
  return { success: true }
}

export async function blockDate(companyId: string, blockDate: string, label?: string) {
  const access = await requireScheduleAccess(companyId)
  if (!access.ok) return { success: false, error: access.error }
  const supabase = createAdminClient()
  const { error } = await supabase.from("availability_blocks").insert({
    company_id: companyId,
    block_date: blockDate,
    label: label || null,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function blockRange(companyId: string, rangeStart: string, rangeEnd: string, label?: string) {
  const access = await requireScheduleAccess(companyId)
  if (!access.ok) return { success: false, error: access.error }
  const supabase = createAdminClient()
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
  const access = await requireScheduleAccess()
  if (!access.ok) return { success: false, error: access.error }
  const supabase = createAdminClient()
  const { error } = await supabase.from("availability_blocks").delete().eq("id", blockId).eq("company_id", access.company.id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function cancelBooking(bookingId: string) {
  const access = await requireScheduleAccess()
  if (!access.ok) return { success: false, error: access.error }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("company_id", access.company.id)
  if (error) return { success: false, error: error.message }
  return { success: true }
}
