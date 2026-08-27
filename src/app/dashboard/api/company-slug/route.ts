import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, getCompanyRole, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { getStripeConnectStatus } from "@/lib/stripe/connect"
import { hasAddonAccess } from "@/lib/featureAccess"

export async function GET() {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ slug: null }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  // Basic slug/industry/plan info is needed by worker-accessible pages
  // (Photos) too, so this stays readable for anyone with company access -
  // just strip the billing/payments-adjacent fields for non-owners rather
  // than blocking the whole endpoint.
  const isOwner = company ? await requireOwnerAccess(identity.userId, identity.userEmail, company) : false
  const role = company ? await getCompanyRole(identity.userId, identity.userEmail, company) : null
  const plan = company?.plan ?? null
  const status = company?.subscription_status ?? null
  const isPro = (plan === "found_pro" || plan === "found_business") && (status === "active" || status === "trialing")
  const stripeConnect = await getStripeConnectStatus(company?.stripe_connect_account_id)
  let customDomain: string | null = null
  let hasCalendar = false
  if (company?.id) {
    const admin = createAdminClient()
    const [{ data: config }, { data: addonRows }] = await Promise.all([
      admin.from("website_config").select("custom_domain").eq("company_id", company.id).single(),
      admin.from("addon_subscriptions").select("addon_slug").eq("company_id", company.id).eq("active", true),
    ])
    customDomain = config?.custom_domain ?? null
    hasCalendar = hasAddonAccess(plan, "reservation_calendar", (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug), company?.included_addon_slug ?? null, company?.disabled_addons ?? [])
  }
  return NextResponse.json({ id: company?.id ?? null, name: company?.name ?? null, slug: company?.slug ?? null, role, industry: company?.industry_category ?? null, subIndustry: company?.sub_industry ?? null, formIntent: company?.form_intent ?? null, primaryIntent: company?.primary_intent ?? null, plan, hasCalendar, isPro, stripe_connect_account_id: isOwner ? (company?.stripe_connect_account_id ?? null) : null, stripe_connect_ready: isOwner ? stripeConnect.ready : false, primaryColor: company?.primary_color ?? null, phone: company?.phone ?? null, city: company?.city ?? null, state: company?.state ?? null, default_tax_rate: isOwner ? (company?.default_tax_rate ?? 0) : 0, customDomain })
}

export async function PATCH(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
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
