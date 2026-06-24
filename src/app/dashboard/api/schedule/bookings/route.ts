import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ bookings: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ bookings: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("bookings")
    .select("id, customer_name, customer_phone, customer_email, service_name, booking_date, start_time, end_time, status, confirmation_code")
    .eq("company_id", company.id)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100)

  return NextResponse.json({ bookings: data ?? [] })
}
