import { getAdminClient } from "../lib"
import { planLabel } from "../client-utils"
import GrowthWorkspace, { type Prospect, type Cohort, type GrowthAccount } from "./GrowthWorkspace"

export const metadata = { title: "Growth - Found HQ" }

const UPGRADEABLE_PLANS = new Set(["found", "found_pro"])
const COHORT_WINDOW_DAYS = 90
const OUTREACH_WINDOW_DAYS = 90

type SalesActivity = {
  prospect_id: string
  activity_type: string
  summary: string
  created_at: string
  metadata: Record<string, unknown> | null
}

function industryLabel(value: string | null) {
  if (!value) return "Uncategorized"
  return value.replace(/_/g, " ").replace(/\b[a-z]/g, (l) => l.toUpperCase())
}

export default async function GrowthPage() {
  const admin = getAdminClient()
  const windowStart = new Date(Date.now() - COHORT_WINDOW_DAYS * 86400000).toISOString()
  const outreachStart = new Date(Date.now() - OUTREACH_WINDOW_DAYS * 86400000).toISOString()

  const [{ data: companies }, { data: prospectData }, { data: salesActivityData }] = await Promise.all([
    admin.from("companies").select("id, name, slug, email, plan, subscription_status, client_state, industry_category, created_at").eq("account_kind", "client"),
    admin.from("sales_prospects")
      .select("id, person_name, business_name, email, phone, source, stage, notes, created_at, linked_company_id")
      .order("created_at", { ascending: false }),
    admin.from("sales_activities")
      .select("prospect_id, activity_type, summary, created_at, metadata")
      .in("activity_type", ["outreach_call", "outreach_text", "outreach_email", "outreach_skip"])
      .gte("created_at", outreachStart)
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  // Upgrade cohorts: real clients on a plan below the top tier, grouped by
  // plan + industry. A "cohort" of one isn't a pattern worth interrupting
  // Shawn's day for - only surfaced once there are at least 2 companies to
  // reach out to together. This replaces manually tracking deals through
  // pipeline stages with the thing Shawn actually asked for: "you have 10
  // new Starter clients that are all HVAC companies."
  const groups = new Map<string, { plan: string; industry: string | null; companies: { id: string; name: string; slug: string; email: string | null }[] }>()
  for (const company of companies ?? []) {
    if (!UPGRADEABLE_PLANS.has(company.plan ?? "")) continue
    const key = `${company.plan}::${company.industry_category ?? "none"}`
    if (!groups.has(key)) groups.set(key, { plan: company.plan!, industry: company.industry_category, companies: [] })
    groups.get(key)!.companies.push({ id: company.id, name: company.name, slug: company.slug, email: company.email })
  }
  const cohorts: Cohort[] = Array.from(groups.values())
    .filter((g) => g.companies.length >= 2)
    .map((g) => ({
      title: `${g.companies.length} ${planLabel(g.plan)} clients - ${industryLabel(g.industry)}`,
      plan: planLabel(g.plan),
      companies: g.companies,
    }))
    .sort((a, b) => b.companies.length - a.companies.length)

  const recentSignupCount = (companies ?? []).filter((c) => c.created_at >= windowStart).length
  const outreachByProspect = new Map<string, SalesActivity[]>()
  for (const activity of (salesActivityData ?? []) as SalesActivity[]) {
    const list = outreachByProspect.get(activity.prospect_id) ?? []
    list.push(activity)
    outreachByProspect.set(activity.prospect_id, list)
  }
  const prospects = ((prospectData ?? []) as Prospect[]).map((prospect) => ({
    ...prospect,
    outreach_activities: outreachByProspect.get(prospect.id) ?? [],
  }))
  const openLeads = prospects.filter((p) => p.stage !== "won" && p.stage !== "lost")
  const accounts: GrowthAccount[] = (companies ?? []).map((company) => ({
    id: company.id,
    plan: company.plan,
    subscription_status: company.subscription_status,
    client_state: company.client_state ?? "onboarding",
    created_at: company.created_at,
  }))

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Growth</h1><p className="hq-subtitle">Who to reach out to next, and the leads you're tracking by hand.</p></div>
        <span className="hq-count">{openLeads.length} leads</span>
      </header>
      <GrowthWorkspace accounts={accounts} cohorts={cohorts} prospects={openLeads} recentSignupCount={recentSignupCount} windowDays={COHORT_WINDOW_DAYS} />
    </div>
  )
}
