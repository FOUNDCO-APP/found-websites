import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ templates: [] }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ templates: [] })

  const { searchParams } = new URL(req.url)
  const context = searchParams.get("context") ?? "lead"
  const channel = searchParams.get("channel") ?? "email"

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_contact_templates")
    .select("id, name, subject, body, channel, context")
    .eq("company_id", company.id)
    .eq("context", context)
    .eq("channel", channel)
    .order("created_at", { ascending: false })

  return NextResponse.json({ templates: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const { name, subject, body, context, channel } = await req.json()
  if (!name || !body || !context || !channel) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("company_contact_templates")
    .insert({ company_id: company.id, name, subject, body, context, channel })
    .select("id, name, subject, body, channel, context")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const admin = createAdminClient()
  await admin.from("company_contact_templates").delete().eq("id", id).eq("company_id", company.id)
  return NextResponse.json({ ok: true })
}
