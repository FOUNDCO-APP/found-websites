import { requireDashboardAddonAccess } from "@/lib/dashboard/entitlements"
import { NextResponse } from "next/server"

export async function GET() {
  const guard = await requireDashboardAddonAccess("reservation_calendar")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  const { data } = await admin
    .from("availability_blocks")
    .select("id, block_date, range_start, range_end, label, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ blocks: data ?? [] })
}
