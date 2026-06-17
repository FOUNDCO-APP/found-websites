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
    .select("id, name, email, phone, message, type, source, temperature, created_at, partial_answers")
    .eq("company_id", company.id)
    .neq("type", "onboarding_abandoned")
    .order("created_at", { ascending: false })
    .limit(100)

  return NextResponse.json({ leads: data ?? [] })
}

export async function POST(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

  const body = await req.json()
  const { name, phone, email, notes, temperature } = body

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("leads")
    .insert({
      company_id: company.id,
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      message: notes?.trim() || null,
      type: "manual",
      source: "manual",
      temperature: temperature || "warm",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead: data })
}
