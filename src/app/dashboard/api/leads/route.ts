import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ leads: [] }, { status: 401 })

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ leads: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("leads")
    .select("id, name, email, phone, message, type, created_at, partial_answers")
    .eq("company_id", company.id)
    .neq("type", "onboarding_abandoned")
    .order("created_at", { ascending: false })
    .limit(100)

  return NextResponse.json({ leads: data ?? [] })
}
