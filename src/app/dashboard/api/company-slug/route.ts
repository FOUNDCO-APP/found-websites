import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ slug: null }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  const plan = company?.plan ?? null
  const status = company?.subscription_status ?? null
  const isPro = (plan === "found_pro" || plan === "found_business") && (status === "active" || status === "trialing")
  return NextResponse.json({ id: company?.id ?? null, name: company?.name ?? null, slug: company?.slug ?? null, industry: company?.industry_category ?? null, formIntent: company?.form_intent ?? null, isPro, stripe_connect_account_id: company?.stripe_connect_account_id ?? null })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  const body = await req.json()
  const { form_intent } = body
  if (!form_intent) return NextResponse.json({ error: "form_intent required" }, { status: 400 })
  const admin = createAdminClient()
  const { error } = await admin.from("companies").update({ form_intent }).eq("id", company.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
