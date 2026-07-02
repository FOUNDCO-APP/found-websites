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
  return NextResponse.json({ id: company?.id ?? null, name: company?.name ?? null, slug: company?.slug ?? null, industry: company?.industry_category ?? null, formIntent: company?.form_intent ?? null, isPro, stripe_connect_account_id: company?.stripe_connect_account_id ?? null, primaryColor: company?.primary_color ?? null, phone: company?.phone ?? null, city: company?.city ?? null, state: company?.state ?? null, default_tax_rate: company?.default_tax_rate ?? 0 })
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  const body = await req.json()
  const admin = createAdminClient()

  const patch: Record<string, string | number> = {}
  if (body.form_intent) patch.form_intent = body.form_intent
  if (body.name) patch.name = body.name.trim()
  if (typeof body.default_tax_rate === "number") patch.default_tax_rate = Math.max(0, Math.min(1, body.default_tax_rate))
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 })

  const { error } = await admin.from("companies").update(patch).eq("id", company.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
