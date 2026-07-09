import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import BusinessesTable, { type BusinessRow, type BusinessFilter } from "./BusinessesTable"

function getAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const metadata = { title: "Businesses - Found HQ" }
const PAYMENT_RELEVANT_INTENTS = new Set(["estimates", "bookings", "appointments", "reservations", "orders"])

function computeIssues(
  company: { logo_url: string | null; logo_white_url: string | null; primary_intent: string | null; stripe_connect_account_id: string | null; subscription_status: string | null },
  copyGenerated: boolean | null | undefined,
): string[] {
  const issues: string[] = []
  if (company.subscription_status !== "active" && company.subscription_status !== "trialing") issues.push("Not active")
  if (copyGenerated !== true) issues.push("Fallback copy")
  if (!company.logo_url && !company.logo_white_url) issues.push("No logo")
  if (PAYMENT_RELEVANT_INTENTS.has(company.primary_intent ?? "") && !company.stripe_connect_account_id) issues.push("No payment setup")
  return issues
}

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin")

  const params = await searchParams
  const initialSearch = typeof params.q === "string" ? params.q : ""
  const requestedFilter = typeof params.filter === "string" ? params.filter : "all"
  const allowedFilters: BusinessFilter[] = ["all", "attention", "inactive", "logo", "payments"]
  const initialFilter = allowedFilters.includes(requestedFilter as BusinessFilter) ? requestedFilter as BusinessFilter : "all"
  const supabase = getAdminClient()
  const [{ data: companies }, { data: configs }] = await Promise.all([
    supabase.from("companies")
      .select("id, name, slug, industry_category, plan, subscription_status, email, is_comp, admin_notes, created_at, logo_url, logo_white_url, primary_intent, stripe_connect_account_id")
      .order("created_at", { ascending: false }),
    supabase.from("website_config").select("company_id, copy_generated"),
  ])

  const copyGeneratedByCompany = new Map<string, boolean | null>()
  for (const row of configs ?? []) copyGeneratedByCompany.set(row.company_id, row.copy_generated)

  const rows: BusinessRow[] = (companies ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    industry_category: company.industry_category,
    plan: company.plan,
    subscription_status: company.subscription_status,
    email: company.email,
    is_comp: company.is_comp,
    admin_notes: company.admin_notes,
    created_at: company.created_at,
    issues: computeIssues(company, copyGeneratedByCompany.get(company.id)),
  }))

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Operate</p>
          <h1 className="hq-title">Businesses</h1>
          <p className="hq-subtitle">Support customers, inspect their sites, and resolve setup issues.</p>
        </div>
        <span className="hq-count">{rows.length}</span>
      </header>
      <BusinessesTable rows={rows} initialSearch={initialSearch} initialFilter={initialFilter} />
    </div>
  )
}
