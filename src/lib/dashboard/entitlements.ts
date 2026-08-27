import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess, type CompanyRow } from "@/lib/dashboard/getCompany"
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

export async function companyHasAddonAccess(company: Pick<CompanyRow, "id" | "plan" | "included_addon_slug" | "disabled_addons">, addon: AddonSlug): Promise<boolean> {
  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  // Dashboard/API entitlement is based on the customer's plan and paid add-ons.
  // disabled_addons is a public-site visibility switch; it must not remove
  // paid Business tools like Estimates from the owner's dashboard.
  return hasAddonAccess(company.plan, addon, activeAddons, company.included_addon_slug, [])
}

export async function requireDashboardAddonAccess(addon: AddonSlug) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return { ok: false as const, response: NextResponse.json({ error: "No company" }, { status: 404 }) }

  // Business tools (estimates, scheduling, ordering, etc.) are owner-only
  // for now - workers get Jobs/photo capture only. See getCompanyRole().
  // A Found-admin "View As" session resolves as owner here.
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    return { ok: false as const, response: NextResponse.json({ error: "Not available for your account" }, { status: 403 }) }
  }

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!hasAddonAccess(company.plan, addon, activeAddons, company.included_addon_slug, [])) {
    return { ok: false as const, response: NextResponse.json({ error: "Feature not available on this plan" }, { status: 403 }) }
  }

  return { ok: true as const, identity, company, activeAddons, admin: createAdminClient() }
}

export async function requireDashboardAddonPage(addon: AddonSlug) {
  const identity = await resolveDashboardIdentity()
  if (!identity) redirect("/login")

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) redirect(identity.isAdminView ? "/admin" : "/login")

  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    redirect("/photos")
  }

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!hasAddonAccess(company.plan, addon, activeAddons, company.included_addon_slug, [])) {
    redirect("/billing?addon_unavailable=1")
  }

  return { identity, company, activeAddons }
}

// Same as requireDashboardAddonPage but for plan-tier features (e.g. contact_database)
// that aren't tied to a purchasable add-on - anything getFeatureAccess covers.
export async function requireDashboardFeaturePage(feature: Feature) {
  const identity = await resolveDashboardIdentity()
  if (!identity) redirect("/login")

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) redirect(identity.isAdminView ? "/admin" : "/login")

  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    redirect("/photos")
  }

  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  if (!getFeatureAccess(company.plan, feature, activeAddons, company.included_addon_slug, [])) {
    redirect("/billing?addon_unavailable=1")
  }

  return { identity, company, activeAddons }
}

export async function companyHasFeatureAccess(company: Pick<CompanyRow, "id" | "plan" | "included_addon_slug" | "disabled_addons">, feature: Feature): Promise<boolean> {
  const activeAddons = await getCompanyActiveAddonSlugs(company.id)
  return getFeatureAccess(company.plan, feature, activeAddons, company.included_addon_slug, [])
}
