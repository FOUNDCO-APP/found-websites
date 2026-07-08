import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import BusinessesTable, { type BusinessRow } from "./BusinessesTable"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const metadata = { title: "Businesses — Found Admin" }

// Businesses whose website job actually depends on getting paid through
// Found - a pure lead-gen/inquiry business without Stripe connected isn't
// missing anything, so this flag only fires where it's a real gap.
const PAYMENT_RELEVANT_INTENTS = new Set(["estimates", "bookings", "appointments", "reservations", "orders"])

function computeIssues(
  company: { logo_url: string | null; logo_white_url: string | null; primary_intent: string | null; stripe_connect_account_id: string | null },
  copyGenerated: boolean | null | undefined,
  leadCount: number,
): string[] {
  const issues: string[] = []
  if (copyGenerated === false || copyGenerated == null) issues.push("Fallback copy")
  if (!company.logo_url && !company.logo_white_url) issues.push("No logo")
  if (leadCount === 0) issues.push("No leads yet")
  if (PAYMENT_RELEVANT_INTENTS.has(company.primary_intent ?? "") && !company.stripe_connect_account_id) {
    issues.push("No payment setup")
  }
  return issues
}

export default async function AdminBusinessesPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin")

  const supabase = getAdminClient()
  const [{ data: companies }, { data: configs }, { data: leadRows }] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, slug, industry_category, plan, subscription_status, email, is_comp, admin_notes, created_at, logo_url, logo_white_url, primary_intent, stripe_connect_account_id")
      .order("created_at", { ascending: false }),
    supabase.from("website_config").select("company_id, copy_generated"),
    supabase.from("leads").select("company_id").neq("type", "onboarding_abandoned"),
  ])

  const copyGeneratedByCompany = new Map<string, boolean | null>()
  for (const row of configs ?? []) copyGeneratedByCompany.set(row.company_id, row.copy_generated)

  const leadCountByCompany = new Map<string, number>()
  for (const row of leadRows ?? []) {
    leadCountByCompany.set(row.company_id, (leadCountByCompany.get(row.company_id) ?? 0) + 1)
  }

  const rows: BusinessRow[] = (companies ?? []).map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    industry_category: c.industry_category,
    plan: c.plan,
    subscription_status: c.subscription_status,
    email: c.email,
    is_comp: c.is_comp,
    admin_notes: c.admin_notes,
    created_at: c.created_at,
    issues: computeIssues(c, copyGeneratedByCompany.get(c.id), leadCountByCompany.get(c.id) ?? 0),
  }))

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/admin"
            className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            ← Admin
          </Link>
          <h1 className="text-3xl font-black mt-2" style={{ color: "#ffffff" }}>Businesses</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            View as any business, mark comp accounts, and keep your own notes. {rows.length} total.
          </p>
        </div>

        <BusinessesTable rows={rows} />
      </div>
    </div>
  )
}
