import { requireDashboardAddonAccess } from "@/lib/dashboard/entitlements"
import { NextResponse } from "next/server"

export async function GET() {
  const guard = await requireDashboardAddonAccess("reservation_calendar")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  const { data } = await admin
    .from("company_availability")
    .select("day_of_week, is_working, start_time, end_time, slot_duration_minutes, buffer_minutes")
    .eq("company_id", company.id)
    .order("day_of_week")

  return NextResponse.json({ days: data ?? [], companyId: company.id })
}
