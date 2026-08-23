import Link from "next/link"
import { getAdminClient, formatDue, timeAgo } from "./lib"
import { buildClientActivitySignal } from "./customerActivitySignals"
import { isAdminTestEmail, isAdminTestIdentity } from "./testIdentity"

export const metadata = { title: "Today - Found HQ" }

type WorkItem = {
  priority: number
  title: string
  detail: string
  timing: string
  href: string
  action: string
  tone: "warning" | "info"
}

type CompanyRow = {
  id: string
  name: string
  slug: string
  email: string | null
  client_state: string | null
  subscription_status: string | null
  account_kind: string | null
  is_test: boolean | null
  plan: string | null
  created_at: string
  logo_url: string | null
  logo_white_url: string | null
}

type CustomerActivityRow = {
  company_id: string
  event_type?: string | null
  surface: string | null
  feature: string | null
  created_at: string
}

const PLAN_MRR: Record<string, number> = {
  found: 29,
  found_pro: 39,
  found_business: 69,
}

function companyMrr(company: { plan: string | null; subscription_status: string | null; client_state: string | null }) {
  const isPaying = ["active", "trialing"].includes(company.subscription_status ?? "") && company.client_state !== "comp" && company.client_state !== "cancelled"
  return isPaying ? PLAN_MRR[company.plan ?? ""] ?? 0 : 0
}

export default async function AdminTodayPage() {
  const admin = getAdminClient()
  const now = new Date().toISOString()
  const activitySince = new Date(Date.now() - 90 * 86400000).toISOString()
  const [{ data: prospects }, { data: companies }, { data: configs }, customerActivityResult] = await Promise.all([
    admin.from("sales_prospects").select("id, person_name, business_name, email, stage, next_follow_up_at, created_at").not("stage", "in", "(won,lost)").order("next_follow_up_at", { ascending: true, nullsFirst: false }),
    admin.from("companies").select("id, name, slug, email, client_state, subscription_status, account_kind, is_test, plan, created_at, logo_url, logo_white_url").order("created_at", { ascending: false }),
    admin.from("website_config").select("company_id, copy_generated"),
    admin.from("customer_activity_events").select("company_id, event_type, surface, feature, created_at").eq("is_admin_view", false).gte("created_at", activitySince).order("created_at", { ascending: false }).limit(5000),
  ])
  const copyByCompany = new Map((configs ?? []).map((row) => [row.company_id, row.copy_generated]))
  const companyRows = ((companies ?? []) as CompanyRow[]).filter((company) => company.account_kind === "client" && !isAdminTestIdentity(company))
  const activityByCompany = new Map<string, CustomerActivityRow[]>()
  if (!customerActivityResult.error) {
    for (const activity of (customerActivityResult.data ?? []) as CustomerActivityRow[]) {
      const list = activityByCompany.get(activity.company_id) ?? []
      list.push(activity)
      activityByCompany.set(activity.company_id, list)
    }
  }
  const items: WorkItem[] = []
  for (const prospect of prospects ?? []) {
    if (isAdminTestEmail(prospect.email)) continue
    const overdue = prospect.next_follow_up_at && prospect.next_follow_up_at < now
    const isNew = prospect.stage === "new"
    const proposal = prospect.stage === "proposal_sent"
    if (!overdue && !isNew && !proposal) continue
    items.push({
      priority: overdue ? 1 : isNew ? 2 : 3,
      title: prospect.business_name,
      detail: overdue ? `Follow up with ${prospect.person_name}` : isNew ? `New prospect: contact ${prospect.person_name}` : "Proposal is waiting for a response",
      timing: overdue ? formatDue(prospect.next_follow_up_at) : isNew ? "Not contacted" : formatDue(prospect.next_follow_up_at),
      href: "/admin/growth",
      action: overdue || isNew ? "Contact" : "Review",
      tone: overdue ? "warning" : "info",
    })
  }
  for (const company of companyRows) {
    const paymentProblem = ["past_due", "unpaid", "incomplete"].includes(company.subscription_status ?? "") || company.client_state === "past_due"
    const launchProblem = company.client_state === "onboarding" && ((!company.logo_url && !company.logo_white_url) || copyByCompany.get(company.id) !== true)
    if (!paymentProblem && !launchProblem) continue
    items.push({
      priority: paymentProblem ? 4 : 5,
      title: company.name,
      detail: paymentProblem ? "Payment needs attention" : "Setup is blocking a complete launch",
      timing: paymentProblem ? "Client risk" : "Onboarding",
      href: `/admin/clients/${company.id}`,
      action: "Resolve",
      tone: paymentProblem ? "warning" : "info",
    })
  }
  if (!customerActivityResult.error) {
    for (const company of companyRows) {
      if (!["active", "comp", "onboarding"].includes(company.client_state ?? "")) continue
      const signal = buildClientActivitySignal(activityByCompany.get(company.id) ?? [], company.subscription_status)
      const shouldShow = signal.bucket === "trialing_inactive" || signal.bucket === "no_activity" || signal.bucket === "stagnant" || signal.onlyDashboard
      if (!shouldShow) continue
      items.push({
        priority: signal.bucket === "trialing_inactive" ? 6 : signal.bucket === "no_activity" ? 7 : signal.onlyDashboard ? 8 : 9,
        title: company.name,
        detail: signal.reachOutReason,
        timing: signal.bucket === "trialing_inactive" ? "Trial risk" : signal.onlyDashboard ? "Dashboard only" : signal.label,
        href: `/admin/clients/${company.id}`,
        action: "Reach out",
        tone: signal.bucket === "trialing_inactive" || signal.bucket === "no_activity" ? "warning" : "info",
      })
    }
  }
  items.sort((a, b) => a.priority - b.priority)
  const visibleItems = items.slice(0, 8)
  const activeClients = companyRows.filter((company) => ["active", "comp"].includes(company.client_state ?? "")).length
  const atRisk = companyRows.filter((company) => company.client_state === "past_due").length
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const recentSignups = companyRows.filter((company) => company.created_at >= sevenDaysAgo).slice(0, 8)
  const monthSignups = companyRows.filter((company) => company.created_at >= thirtyDaysAgo).length
  const currentMrr = companyRows.reduce((total, company) => total + companyMrr(company), 0)
  const monthGoal = 10
  const health = atRisk > 0 ? "Needs attention" : monthSignups >= monthGoal ? "Growing" : monthSignups >= 5 ? "Building" : "Flat"
  const goalPercent = Math.min(100, Math.round((monthSignups / monthGoal) * 100))
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Today</h1><p className="hq-subtitle">What needs attention now.</p></div></header>
      <section className="hq-command-status">
        <div>
          <span>Found health</span>
          <strong>{health}</strong>
          <p>{monthSignups} new account{monthSignups === 1 ? "" : "s"} in the last 30 days. Monthly target is {monthGoal}.</p>
          <div className="hq-progress"><span style={{ width: `${goalPercent}%` }} /></div>
        </div>
        <Link href="/admin/growth">Open Growth<span className="hq-chevron" /></Link>
      </section>
      <div className="hq-today-summary">
        <div><strong>{items.length}</strong><span>Due now</span></div>
        <Link href="/admin/growth"><strong>{(prospects ?? []).filter((prospect) => !isAdminTestEmail(prospect.email)).length}</strong><span>Open sales</span></Link>
        <Link href="/admin/clients?state=active"><strong>{activeClients}</strong><span>Active clients</span></Link>
        <Link href="/admin/clients?state=past_due"><strong>{atRisk}</strong><span>At risk</span></Link>
        <div><strong>${currentMrr}</strong><span>MRR</span></div>
      </div>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Next actions</h2><span className="hq-section-meta">Top {visibleItems.length} of {items.length}</span></div>
        <div className="hq-panel">
          {visibleItems.map((item, index) => (
            <Link key={`${item.title}-${index}`} href={item.href} className="hq-row hq-link-row hq-action-row">
              <div><p className="hq-row-title">{item.title}</p><p className="hq-row-meta">{item.detail}</p></div>
              <div className="hq-action-end"><span className={`hq-badge hq-badge-${item.tone}`}>{item.timing}</span><strong>{item.action}</strong><span className="hq-chevron" /></div>
            </Link>
          ))}
          {!items.length && <div className="hq-empty-state"><strong>You are caught up.</strong><span>New prospects and client risks will appear here.</span></div>}
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Recent signups</h2><span className="hq-section-meta">Last 7 days</span></div>
        <div className="hq-panel">
          {recentSignups.map((company) => (
            <Link key={company.id} href={`/admin/clients/${company.id}`} className="hq-row hq-link-row">
              <div><p className="hq-row-title">{company.name}</p><p className="hq-row-meta">{timeAgo(company.created_at)}</p></div>
              <span className="hq-chevron" />
            </Link>
          ))}
          {!recentSignups.length && <div className="hq-empty-state"><strong>No new signups this week.</strong><span>New accounts will show up here as they sign up.</span></div>}
        </div>
      </section>
    </div>
  )
}
