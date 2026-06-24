import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ days: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ days: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_availability")
    .select("day_of_week, is_working, start_time, end_time, slot_duration_minutes, buffer_minutes")
    .eq("company_id", company.id)
    .order("day_of_week")

  return NextResponse.json({ days: data ?? [], companyId: company.id })
}
