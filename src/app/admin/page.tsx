import Link from "next/link"
import { getAdminClient, formatDue } from "./lib"

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

export default async function AdminTodayPage() {
  const admin = getAdminClient()
  const now = new Date().toISOString()
  const [{ data: prospects }, { data: companies }, { data: configs }] = await Promise.all([
    admin.from("sales_prospects").select("id, person_name, business_name, stage, next_follow_up_at, created_at").not("stage", "in", "(won,lost)").order("next_follow_up_at", { ascending: true, nullsFirst: false }),
    admin.from("companies").select("id, name, slug, client_state, subscription_status, account_kind, created_at, logo_url, logo_white_url").eq("account_kind", "client").order("created_at", { ascending: false }),
    admin.from("website_config").select("company_id, copy_generated"),
  ])
  const copyByCompany = new Map((configs ?? []).map((row) => [row.company_id, row.copy_generated]))
  const items: WorkItem[] = []
  for (const prospect of prospects ?? []) {
    const overdue = prospect.next_follow_up_at && prospect.next_follow_up_at < now
    const isNew = prospect.stage === "new"
    const proposal = prospect.stage === "proposal_sent"
    if (!overdue && !isNew && !proposal) continue
    items.push({
      priority: overdue ? 1 : isNew ? 2 : 3,
      title: prospect.business_name,
      detail: overdue ? `Follow up with ${prospect.person_name}` : isNew ? `New prospect: contact ${prospect.person_name}` : "Proposal is waiting for a response",
      timing: overdue ? formatDue(prospect.next_follow_up_at) : isNew ? "Not contacted" : formatDue(prospect.next_follow_up_at),
      href: "/admin/sales",
      action: overdue || isNew ? "Contact" : "Review",
      tone: overdue ? "warning" : "info",
    })
  }
  for (const company of companies ?? []) {
    const paymentProblem = ["past_due", "unpaid", "incomplete"].includes(company.subscription_status ?? "") || company.client_state === "past_due"
    const launchProblem = company.client_state === "onboarding" && ((!company.logo_url && !company.logo_white_url) || copyByCompany.get(company.id) !== true)
    if (!paymentProblem && !launchProblem) continue
    items.push({
      priority: paymentProblem ? 4 : 5,
      title: company.name,
      detail: paymentProblem ? "Payment needs attention" : "Setup is blocking a complete launch",
      timing: paymentProblem ? "Client risk" : "Onboarding",
      href: `/admin/clients?q=${encodeURIComponent(company.name)}`,
      action: "Resolve",
      tone: paymentProblem ? "warning" : "info",
    })
  }
  items.sort((a, b) => a.priority - b.priority)
  const activeClients = (companies ?? []).filter((company) => ["active", "comp"].includes(company.client_state ?? "")).length
  const atRisk = (companies ?? []).filter((company) => company.client_state === "past_due").length
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Today</h1><p className="hq-subtitle">The work that grows or protects Found Co.</p></div></header>
      <div className="hq-today-summary">
        <div><strong>{items.length}</strong><span>Due now</span></div>
        <div><strong>{(prospects ?? []).length}</strong><span>Open sales</span></div>
        <div><strong>{activeClients}</strong><span>Active clients</span></div>
        <div><strong>{atRisk}</strong><span>At risk</span></div>
      </div>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Next actions</h2><span className="hq-section-meta">Highest priority first</span></div>
        <div className="hq-panel">
          {items.map((item, index) => (
            <Link key={`${item.title}-${index}`} href={item.href} className="hq-row hq-link-row hq-action-row">
              <div><p className="hq-row-title">{item.title}</p><p className="hq-row-meta">{item.detail}</p></div>
              <div className="hq-action-end"><span className={`hq-badge hq-badge-${item.tone}`}>{item.timing}</span><strong>{item.action}</strong><span className="hq-chevron" /></div>
            </Link>
          ))}
          {!items.length && <div className="hq-empty-state"><strong>You are caught up.</strong><span>New prospects and client risks will appear here.</span></div>}
        </div>
      </section>
    </div>
  )
}
