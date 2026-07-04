import { requireDashboardAddonAccess } from "@/lib/dashboard/entitlements"
import { NextResponse } from "next/server"

export async function GET() {
  const guard = await requireDashboardAddonAccess("reservation_calendar")
  if (!guard.ok) return guard.response
  const { admin, company } = guard
  const { data } = await admin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_email, service_name, booking_date, start_time, end_time, status, confirmation_code")
    .eq("company_id", company.id)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100)

  return NextResponse.json({ bookings: data ?? [] })
}
