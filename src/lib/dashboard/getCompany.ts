import * as Sentry from "@sentry/nextjs"
import { createAdminClient } from "@/lib/supabase/admin"
import { cookies } from "next/headers"

export type CompanyRow = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  plan: string | null
  subscription_status: string | null
  stripe_customer_id: string | null
  stripe_connect_account_id: string | null
  pending_setup_intent_secret: string | null
  is_founding_member: boolean | null
  primary_color: string
  user_id: string | null
  city: string | null
  state: string | null
  address: string | null
  zip: string | null
  address_visible: boolean | null
  industry_category: string | null
  sub_industry: string | null
  form_intent: string | null
  primary_intent: string | null
  primary_action_override: string | null
  booking_cta_label: string | null
  vibe: string | null
  layout_override: string | null
  navbar_dark: boolean | null
  included_addon_slug: string | null
  disabled_addons: string[] | null
  default_tax_rate: number | null
  is_comp: boolean | null
  admin_notes: string | null
  logo_url: string | null
  logo_white_url: string | null
}

const SELECT_FIELDS =
  "id, name, slug, email, phone, plan, subscription_status, stripe_customer_id, stripe_connect_account_id, pending_setup_intent_secret, is_founding_member, primary_color, user_id, city, state, address, zip, address_visible, industry_category, sub_industry, form_intent, primary_intent, primary_action_override, booking_cta_label, vibe, layout_override, navbar_dark, included_addon_slug, disabled_addons, default_tax_rate, is_comp, admin_notes, logo_url, logo_white_url"

// True only when both the selected-company cookie AND a server-verified
// admin key are present - never trust the cookie alone. This is what lets
// a Found operator view/act as any business for support, demos, and comp
// activation without needing to be added as an owner on that company.
export async function isAdminOverrideActive(): Promise<boolean> {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const adminView = cookieStore.get("found_admin_view")?.value
  return Boolean(adminView === "1" && adminKey && process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY)
}

// Company IDs this user can access as an active worker (company_members),
// on top of whatever they own outright via companies.user_id/email. A
// separate lookup rather than a join because company_members is additive —
// most users never have a row here at all.
async function getMemberCompanyIds(userId: string, userEmail: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("company_members")
    .select("company_id")
    .eq("status", "active")
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
  return (data ?? []).map((row: { company_id: string }) => row.company_id)
}

export async function getCompany(
  userId: string,
  userEmail: string
): Promise<CompanyRow | null> {
  const cookieStore = await cookies()
  const selectedCompanyV2Cookies = cookieStore.getAll("found_selected_company_id")
  const selectedCompanyCookies = selectedCompanyV2Cookies.length > 0
    ? selectedCompanyV2Cookies
    : cookieStore.getAll("found_company_id")
  const selectedId = selectedCompanyCookies.length > 0
    ? selectedCompanyCookies[selectedCompanyCookies.length - 1]?.value
    : undefined
  const adminCompanyCookies = cookieStore.getAll("found_admin_company_id")
  const adminCompanyId = adminCompanyCookies.length > 0
    ? adminCompanyCookies[adminCompanyCookies.length - 1]?.value
    : undefined
  const admin = createAdminClient()
  const adminOverride = await isAdminOverrideActive()

  if (adminOverride && adminCompanyId) {
    const { data } = await admin
      .from("companies")
      .select(SELECT_FIELDS)
      .eq("id", adminCompanyId)
      .maybeSingle()
    if (data) {
      Sentry.setTag("company_slug", (data as CompanyRow).slug)
      return data as CompanyRow
    }
  }

  if (selectedId) {
    const { data } = await admin
      .from("companies")
      .select(SELECT_FIELDS)
      .eq("id", selectedId)
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .maybeSingle()
    if (data) {
      Sentry.setTag("company_slug", (data as CompanyRow).slug)
      return data as CompanyRow
    }
  }

  const { data } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (data) {
    Sentry.setTag("company_slug", (data as CompanyRow).slug)
    return data as CompanyRow
  }

  // Not an owner — check worker access (company_members) before giving up.
  const memberCompanyIds = await getMemberCompanyIds(userId, userEmail)
  if (memberCompanyIds.length === 0) return null

  const targetId = selectedId && memberCompanyIds.includes(selectedId) ? selectedId : memberCompanyIds[0]
  const { data: memberCompany } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .eq("id", targetId)
    .maybeSingle()

  if (memberCompany) Sentry.setTag("company_slug", (memberCompany as CompanyRow).slug)
  return (memberCompany as CompanyRow) ?? null
}

export async function getAllCompanies(
  userId: string,
  userEmail: string
): Promise<CompanyRow[]> {
  const admin = createAdminClient()
  const [{ data: owned }, memberCompanyIds] = await Promise.all([
    admin
      .from("companies")
      .select(SELECT_FIELDS)
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .order("created_at", { ascending: false }),
    getMemberCompanyIds(userId, userEmail),
  ])

  const ownedRows = (owned ?? []) as CompanyRow[]
  if (memberCompanyIds.length === 0) return ownedRows

  const ownedIds = new Set(ownedRows.map(row => row.id))
  const newMemberIds = memberCompanyIds.filter(id => !ownedIds.has(id))
  if (newMemberIds.length === 0) return ownedRows

  const { data: memberRows } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .in("id", newMemberIds)
  return [...ownedRows, ...((memberRows ?? []) as CompanyRow[])]
}

export async function hasMultipleCompanies(
  userId: string,
  userEmail: string
): Promise<boolean> {
  const companies = await getAllCompanies(userId, userEmail)
  return companies.length > 1
}

export type MemberRole = "owner" | "worker"

// The real permission boundary — call this in any server action/route that
// a worker must NOT reach (leads, contacts, estimates, site editing,
// marketing, payments, business settings). Workers may only reach
// Jobs/photo-capture surfaces. Never rely on hiding the button in the UI
// alone; RLS is a no-op on tenant tables in this project (see
// requireScheduleAccess precedent), so this app-level check is the actual
// enforcement.
export async function getCompanyRole(
  userId: string,
  userEmail: string,
  company: Pick<CompanyRow, "id" | "user_id" | "email">
): Promise<MemberRole | null> {
  const isOwner = company.user_id === userId || (!!company.email && company.email === userEmail)
  if (isOwner) return "owner"

  // Found admin "View As" already bypasses ownership entirely in
  // getCompany() to resolve the company - it must get the same full
  // access downstream, or every owner-only action in this project would
  // wrongly treat a support/demo session as a restricted worker.
  if (await isAdminOverrideActive()) return "owner"

  const admin = createAdminClient()
  const { data } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", company.id)
    .eq("status", "active")
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .maybeSingle()

  return data ? ((data.role as MemberRole) ?? "worker") : null
}

export async function requireOwnerAccess(
  userId: string,
  userEmail: string,
  company: Pick<CompanyRow, "id" | "user_id" | "email">
): Promise<boolean> {
  const role = await getCompanyRole(userId, userEmail, company)
  return role === "owner"
}
