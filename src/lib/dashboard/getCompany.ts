import { cache } from "react"
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
}

const SELECT_FIELDS =
  "id, name, slug, email, phone, plan, subscription_status, stripe_customer_id, stripe_connect_account_id, pending_setup_intent_secret, is_founding_member, primary_color, user_id, city, state, industry_category, sub_industry, form_intent, primary_intent, default_tax_rate"

export const getCompany = cache(async (
  userId: string,
  userEmail: string
): Promise<CompanyRow | null> => {
  const cookieStore = await cookies()
  const selectedId = cookieStore.get("found_company_id")?.value
  const admin = createAdminClient()

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
})

export const getAllCompanies = cache(async (
  userId: string,
  userEmail: string
): Promise<CompanyRow[]> => {
  const admin = createAdminClient()
  const { data } = await admin
    .from("companies")
    .select(SELECT_FIELDS)
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
    .order("created_at", { ascending: false })
  return (data ?? []) as CompanyRow[]
})

export const hasMultipleCompanies = cache(async (
  userId: string,
  userEmail: string
): Promise<boolean> => {
  const admin = createAdminClient()
  const { count } = await admin
    .from("companies")
    .select("id", { count: "exact", head: true })
    .or(`user_id.eq.${userId},email.eq.${userEmail}`)
  return (count ?? 0) > 1
})
