import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, type CompanyRow } from "@/lib/dashboard/getCompany"
import { hasAddonAccess, getFeatureAccess, type AddonSlug, type Feature } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"

export async function getCompanyActiveAddonSlugs(companyId: string): Promise<AddonSlug[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("addon_subscriptions")
    .select("addon_slug")
    .eq("company_id", companyId)
    .eq("active", true)

  return ((data ?? []).map((row: { addon_slug: string }) => row.addon_slug) as AddonSlug[])
}

export async function companyHasAddonAccess(company: Pick<CompanyRow, "id" | "plan">, addon: AddonSlug): Promise<boolean> {
  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  return hasAddonAccess(company.plan, addon, activeAddons)
}

export async function requireDashboardAddonAccess(addon: AddonSlug) {
  const user = await getAuthUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return { ok: false as const, response: NextResponse.json({ error: "No company" }, { status: 404 }) }

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!hasAddonAccess(company.plan, addon, activeAddons)) {
    return { ok: false as const, response: NextResponse.json({ error: "Feature not available on this plan" }, { status: 403 }) }
  }

  return { ok: true as const, user, company, activeAddons, admin: createAdminClient() }
}

export async function requireDashboardAddonPage(addon: AddonSlug) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!hasAddonAccess(company.plan, addon, activeAddons)) {
    redirect("/more?addon_unavailable=1")
  }

  return { user, company, activeAddons }
}

// Same as requireDashboardAddonPage but for plan-tier features (e.g. contact_database)
// that aren't tied to a purchasable add-on - anything getFeatureAccess covers.
export async function requireDashboardFeaturePage(feature: Feature) {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!getFeatureAccess(company.plan, feature, activeAddons)) {
    redirect("/more?addon_unavailable=1")
  }

  return { user, company, activeAddons }
}

export async function companyHasFeatureAccess(company: Pick<CompanyRow, "id" | "plan">, feature: Feature): Promise<boolean> {
  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  return getFeatureAccess(company.plan, feature, activeAddons)
}
