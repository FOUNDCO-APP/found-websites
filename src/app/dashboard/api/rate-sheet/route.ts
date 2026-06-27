import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ items: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ items: [] })

  const admin = createAdminClient()
  const { data } = await admin
    .from("estimate_rate_sheets")
    .select("items")
    .eq("company_id", company.id)
    .single()

  return NextResponse.json({ items: data?.items ?? [] })
}

export async function PUT(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const { items } = await req.json()
  const admin = createAdminClient()
  const { error } = await admin
    .from("estimate_rate_sheets")
    .upsert({ company_id: company.id, items: items ?? [], updated_at: new Date().toISOString() }, { onConflict: "company_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
