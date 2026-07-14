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
  industry_category: string | null
  sub_industry: string | null
  form_intent: string | null
  primary_intent: string | null
  default_tax_rate: number | null
  is_comp: boolean | null
  admin_notes: string | null
}

const SELECT_FIELDS =
  "id, name, slug, email, phone, plan, subscription_status, stripe_customer_id, stripe_connect_account_id, pending_setup_intent_secret, is_founding_member, primary_color, user_id, city, state, industry_category, sub_industry, form_intent, primary_intent, default_tax_rate, is_comp, admin_notes"

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

export async function getCompany(
  userId: string,
  userEmail: string
): Promise<CompanyRow | null> {
  const cookieStore = await cookies()
  const selectedId = cookieStore.get("found_company_id")?.value
  const adminCompanyId = cookieStore.get("found_admin_company_id")?.value
  const admin = createAdminClient()
  const adminOverride = await isAdminOverrideActive()

  if (adminOverride && adminCompanyId) {
    const { data } = await admin
      .from("companies")
      .select(SELECT_FIELDS)
      .eq("id", adminCompanyId)
      .maybeSingle()
    if (data) return data as CompanyRow
  }

  if (selectedId) {
    const { data } = await admin
      .from("companies")
      .select(SELECT_FIELDS)
      .eq("id", selectedId)
      .or(`user_id.eq.${userId},email.eq.${userEmail}`)
      .maybeSingle()
    if (data) return data as CompanyRow
  }

  const { data } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as CompanyRow) ?? null
}

export async function getAllCompanies(
  userId: string,
  userEmail: string
): Promise<CompanyRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
  return (data ?? []) as CompanyRow[]
}

export async function hasMultipleCompanies(
  userId: string,
  userEmail: string
): Promise<boolean> {
  const admin = createAdminClient()
  const { count } = await admin
    .from("companies")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
  return (count ?? 0) > 1
}
