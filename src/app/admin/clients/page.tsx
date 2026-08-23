import { getAdminClient } from "../lib"
import { adminTestIdentityReason, isAdminTestIdentity } from "../testIdentity"
import ClientsWorkspace, { type ClientRow } from "./ClientsWorkspace"

export const metadata = { title: "Clients - Found HQ" }

const PAYMENT_RELEVANT_INTENTS = new Set(["estimates", "bookings", "appointments", "reservations", "orders"])
const ACTIVITY_LOOKBACK_DAYS = 90

type CustomerActivityRow = {
  company_id: string
  surface: string
  feature: string | null
  created_at: string
}

function clientActivityStatus(lastActivityAt: string | null) {
  if (!lastActivityAt) return { label: "No client use yet", level: "stagnant" as const, days: null }
  const days = Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / 86400000)
  if (days <= 7) return { label: days === 0 ? "Used today" : `Used ${days}d ago`, level: "using" as const, days }
  if (days <= 14) return { label: `Quiet ${days}d`, level: "quiet" as const, days }
  if (days <= 30) return { label: `Check in ${days}d`, level: "outreach" as const, days }
  return { label: `Stagnant ${days}d`, level: "stagnant" as const, days }
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const initialSearch = typeof params.q === "string" ? params.q : ""
  const initialFilter = typeof params.state === "string" ? params.state : undefined
  const admin = getAdminClient()
  const activitySince = new Date(Date.now() - ACTIVITY_LOOKBACK_DAYS * 86400000).toISOString()
  const [{ data: companies }, { data: configs }, { data: activities }, { data: emails }, customerActivityResult] = await Promise.all([
    admin.from("companies").select("id, name, slug, email, phone, plan, subscription_status, client_state, account_kind, comp_reason, created_at, logo_url, logo_white_url, industry_category, primary_intent, stripe_connect_account_id, is_test, included_addon_slug, trial_ends_at").order("created_at", { ascending: false }),
    admin.from("website_config").select("company_id, copy_generated"),
    admin.from("client_activities").select("company_id, summary, created_at").order("created_at", { ascending: false }),
    admin.from("email_log").select("company_id, subject, email_type, recipient_email, success, created_at").not("company_id", "is", null).order("created_at", { ascending: false }),
    admin.from("customer_activity_events").select("company_id, surface, feature, created_at").eq("is_admin_view", false).gte("created_at", activitySince).order("created_at", { ascending: false }).limit(5000),
  ])
  const customerActivities = (customerActivityResult.data ?? []) as CustomerActivityRow[]
  const copyByCompany = new Map((configs ?? []).map((row) => [row.company_id, row.copy_generated]))
  const lastActivity = new Map<string, string>()
  for (const activity of activities ?? []) if (!lastActivity.has(activity.company_id)) lastActivity.set(activity.company_id, activity.summary)
  const customerActivityByCompany = new Map<string, CustomerActivityRow[]>()
  for (const activity of customerActivities) {
    const list = customerActivityByCompany.get(activity.company_id) ?? []
    list.push(activity)
    customerActivityByCompany.set(activity.company_id, list)
  }
  const emailsByCompany = new Map<string, { summary: string; created_at: string }[]>()
  for (const email of emails ?? []) {
    if (!email.company_id) continue
    const list = emailsByCompany.get(email.company_id) ?? []
    if (list.length < 10) {
      list.push({
        summary: `${email.success ? "Sent" : "FAILED"}: ${email.email_type} to ${email.recipient_email}`,
        created_at: email.created_at,
      })
    }
    emailsByCompany.set(email.company_id, list)
  }
  const rows: ClientRow[] = (companies ?? []).map((company) => {
    const issues: string[] = []
    if (company.client_state === "past_due") issues.push("Payment")
    if (company.client_state === "onboarding" && !company.logo_url && !company.logo_white_url) issues.push("No logo")
    if (company.client_state === "onboarding" && copyByCompany.get(company.id) !== true) issues.push("Fallback copy")
    if (PAYMENT_RELEVANT_INTENTS.has(company.primary_intent ?? "") && !company.stripe_connect_account_id) issues.push("No payment setup")
    const isActiveSubscription = company.subscription_status === "active" || company.subscription_status === "trialing"
    if (company.trial_ends_at && !isActiveSubscription) {
      const dueDate = new Date(company.trial_ends_at)
      if (dueDate < new Date()) {
        issues.push("Paused - no card")
      } else {
        issues.push(`Card due ${dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`)
      }
    }
    const clientActivity = customerActivityByCompany.get(company.id) ?? []
    const lastClientActivity = clientActivity[0] ?? null
    const activityStatus = clientActivityStatus(lastClientActivity?.created_at ?? null)
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      email: company.email,
      phone: company.phone,
      plan: company.plan,
      subscription_status: company.subscription_status,
      client_state: company.client_state ?? "onboarding",
      account_kind: company.account_kind ?? "client",
      comp_reason: company.comp_reason,
      created_at: company.created_at,
      test_identity: isAdminTestIdentity(company),
      test_identity_reason: isAdminTestIdentity(company) ? adminTestIdentityReason(company) : null,
      last_activity: lastActivity.get(company.id) ?? null,
      last_customer_activity_at: lastClientActivity?.created_at ?? null,
      last_customer_surface: lastClientActivity?.surface ?? null,
      customer_activity_count_90d: clientActivity.length,
      customer_activity_status: activityStatus,
      industry_category: company.industry_category,
      is_test: company.is_test,
      included_addon_slug: company.included_addon_slug ?? null,
      issues,
      emails: emailsByCompany.get(company.id) ?? [],
    }
  })
  const realClients = rows.filter((row) => row.account_kind === "client" && !row.test_identity).length
  return (
    <div className="hq-page">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Clients</h1><p className="hq-subtitle">Scan accounts. Fix risk. Open any client.</p></div><span className="hq-count">{realClients}</span></header>
      <ClientsWorkspace rows={rows} initialSearch={initialSearch} initialFilter={initialFilter} />
    </div>
  )
}
