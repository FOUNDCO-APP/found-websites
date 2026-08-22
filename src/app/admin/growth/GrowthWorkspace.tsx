"use client"

import { useState, useTransition } from "react"
import { addLead, convertLeadToClient, dismissLead } from "./actions"

export type Prospect = {
  id: string
  person_name: string
  business_name: string
  email: string | null
  phone: string | null
  source: string
  stage: string
  notes: string | null
  created_at: string
  linked_company_id: string | null
}

export type Cohort = {
  title: string
  plan: string
  companies: { id: string; name: string; slug: string; email: string | null }[]
}

export type GrowthAccount = {
  id: string
  plan: string | null
  subscription_status: string | null
  client_state: string
  created_at: string
}

type GoalWindow = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"

const PLAN_MRR: Record<string, number> = {
  found: 29,
  found_pro: 39,
  found_business: 69,
}

const GOALS: Record<GoalWindow, { label: string; accountGoal: number; days: number; buckets: number }> = {
  daily: { label: "Today", accountGoal: 1, days: 1, buckets: 7 },
  weekly: { label: "This week", accountGoal: 3, days: 7, buckets: 7 },
  monthly: { label: "This month", accountGoal: 10, days: 31, buckets: 6 },
  quarterly: { label: "This quarter", accountGoal: 30, days: 92, buckets: 6 },
  yearly: { label: "This year", accountGoal: 120, days: 365, buckets: 12 },
}

function isRevenueAccount(account: GrowthAccount) {
  return ["active", "trialing"].includes(account.subscription_status ?? "") && account.client_state !== "cancelled" && account.client_state !== "comp"
}

function accountMrr(account: GrowthAccount) {
  return PLAN_MRR[account.plan ?? ""] ?? 0
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value)
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000)
}

function periodAccounts(accounts: GrowthAccount[], days: number) {
  const start = daysAgo(days)
  return accounts.filter((account) => new Date(account.created_at) >= start)
}

function chartBuckets(accounts: GrowthAccount[], days: number, bucketCount: number) {
  const bucketDays = Math.max(1, Math.ceil(days / bucketCount))
  return Array.from({ length: bucketCount }, (_, index) => {
    const bucketEnd = daysAgo((bucketCount - index - 1) * bucketDays)
    const bucketStart = daysAgo((bucketCount - index) * bucketDays)
    const count = accounts.filter((account) => {
      const created = new Date(account.created_at)
      return created >= bucketStart && created < bucketEnd
    }).length
    return { label: days <= 7 ? bucketEnd.toLocaleDateString("en-US", { weekday: "short" }) : bucketEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" }), count }
  })
}

function GoalScoreboard({ accounts }: { accounts: GrowthAccount[] }) {
  const [window, setWindow] = useState<GoalWindow>("monthly")
  const goal = GOALS[window]
  const currentPeriodAccounts = periodAccounts(accounts, goal.days)
  const activeAccounts = accounts.filter(isRevenueAccount)
  const mrr = activeAccounts.reduce((total, account) => total + accountMrr(account), 0)
  const newMrr = currentPeriodAccounts.reduce((total, account) => total + accountMrr(account), 0)
  const progress = Math.min(100, Math.round((currentPeriodAccounts.length / goal.accountGoal) * 100))
  const pace = currentPeriodAccounts.length >= goal.accountGoal ? "Growing" : currentPeriodAccounts.length >= goal.accountGoal * 0.55 ? "Building" : "Needs attention"
  const yearlyAccounts = window === "yearly" ? currentPeriodAccounts.length : Math.round((currentPeriodAccounts.length / goal.days) * 365)
  const bars = chartBuckets(accounts, goal.days, goal.buckets)
  const maxBar = Math.max(1, ...bars.map((bar) => bar.count))

  return (
    <section>
      <div className="hq-growth-hero">
        <div>
          <p className="hq-eyebrow">Growth scorecard</p>
          <h2>{pace}</h2>
          <p>{currentPeriodAccounts.length} new account{currentPeriodAccounts.length === 1 ? "" : "s"} against a {goal.accountGoal} account goal.</p>
        </div>
        <div className="hq-period-control" aria-label="Goal window">
          {(Object.keys(GOALS) as GoalWindow[]).map((key) => (
            <button key={key} type="button" data-active={window === key} onClick={() => setWindow(key)}>
              {GOALS[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="hq-goal-grid">
        <div className="hq-goal-primary">
          <span>{goal.label}</span>
          <strong>{currentPeriodAccounts.length} / {goal.accountGoal}</strong>
          <div className="hq-progress"><span style={{ width: `${progress}%` }} /></div>
        </div>
        <div><span>Current MRR</span><strong>{formatMoney(mrr)}</strong></div>
        <div><span>New MRR</span><strong>{formatMoney(newMrr)}</strong></div>
        <div><span>Year pace</span><strong>{yearlyAccounts}</strong></div>
      </div>

      <div className="hq-chart" aria-label={`${goal.label} signup chart`}>
        {bars.map((bar) => (
          <div key={bar.label} className="hq-chart-bar">
            <span style={{ height: `${Math.max(8, (bar.count / maxBar) * 100)}%` }} />
            <strong>{bar.count}</strong>
            <em>{bar.label}</em>
          </div>
        ))}
      </div>
    </section>
  )
}

function CohortCard({ cohort }: { cohort: Cohort }) {
  const [expanded, setExpanded] = useState(false)
  const emails = cohort.companies.map((c) => c.email).filter((e): e is string => !!e)
  return (
    <article className="hq-prospect">
      <button type="button" className="hq-prospect-head" onClick={() => setExpanded((v) => !v)} style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <div>
          <div className="hq-business-name-line"><h2>{cohort.title}</h2></div>
          <p className="hq-row-meta">{cohort.plan} clients ready for a personal nudge to upgrade</p>
        </div>
        <span className="hq-chevron" style={{ transform: expanded ? "rotate(135deg)" : "rotate(45deg)" }} />
      </button>
      {expanded && (
        <div className="hq-business-manage-body hq-sales-forms">
          <div className="hq-contact-actions" style={{ marginBottom: 10 }}>
            {emails.length > 0 && <a href={`mailto:?bcc=${emails.join(",")}`}>Email all {emails.length}</a>}
          </div>
          {cohort.companies.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--hq-border)" }}>
              <span className="hq-row-title" style={{ fontSize: 13 }}>{c.name}</span>
              <a href={`/admin/clients/${c.id}`} style={{ color: "var(--hq-green)", fontSize: 11, fontWeight: 750, textDecoration: "none" }}>View</a>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function LeadRow({ prospect }: { prospect: Prospect }) {
  const [converting, startConverting] = useTransition()
  const [dismissing, startDismissing] = useTransition()
  const [converted, setConverted] = useState(Boolean(prospect.linked_company_id))
  const [dismissed, setDismissed] = useState(false)

  function handleConvert() {
    startConverting(async () => {
      await convertLeadToClient(prospect.id)
      setConverted(true)
    })
  }

  function handleDismiss() {
    startDismissing(async () => {
      await dismissLead(prospect.id)
      setDismissed(true)
    })
  }

  if (dismissed) return null

  return (
    <article className="hq-prospect">
      <div className="hq-prospect-head">
        <div>
          <div className="hq-business-name-line">
            <h2>{prospect.business_name}</h2>
            {converted && <span className="hq-badge hq-badge-success">Converted</span>}
          </div>
          <p className="hq-row-meta">{prospect.person_name} - {prospect.source}</p>
          <div className="hq-contact-actions">
            {prospect.phone && <a href={`tel:${prospect.phone}`}>Call</a>}
            {prospect.phone && <a href={`sms:${prospect.phone}`}>Text</a>}
            {prospect.email && <a href={`mailto:${prospect.email}`}>Email</a>}
          </div>
          {prospect.notes && <p className="hq-form-note" style={{ marginTop: 8 }}>{prospect.notes}</p>}
        </div>
      </div>
      {!converted && (
        <div className="hq-business-manage-body" style={{ paddingTop: 0, display: "flex", gap: 10 }}>
          <button type="button" onClick={handleConvert} disabled={converting} className="hq-button hq-button-primary">
            {converting ? "Converting..." : "Mark converted"}
          </button>
          <button type="button" onClick={handleDismiss} disabled={dismissing} className="hq-button hq-button-secondary">
            {dismissing ? "..." : "Not moving forward"}
          </button>
        </div>
      )}
      {converted && (
        <div className="hq-business-manage-body" style={{ paddingTop: 0 }}>
          <a href={prospect.linked_company_id ? `/admin/clients/${prospect.linked_company_id}` : `/admin/clients?q=${encodeURIComponent(prospect.business_name)}`} style={{ color: "var(--hq-green)", fontSize: 12, fontWeight: 750, textDecoration: "none" }}>View client record</a>
        </div>
      )}
    </article>
  )
}

export default function GrowthWorkspace({ accounts, cohorts, prospects, recentSignupCount, windowDays }: {
  accounts: GrowthAccount[]
  cohorts: Cohort[]
  prospects: Prospect[]
  recentSignupCount: number
  windowDays: number
}) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <>
      <GoalScoreboard accounts={accounts} />

      <section>
        <div className="hq-section-head">
          <h2 className="hq-section-title">Upgrade opportunities</h2>
          <span className="hq-section-meta">{recentSignupCount} signups, last {windowDays}d</span>
        </div>
        {cohorts.length === 0 ? (
          <div className="hq-panel"><div className="hq-empty-state"><strong>No upgrade cohorts yet.</strong><span>Once 2+ clients share a plan and industry, they'll show up here as a group worth reaching out to.</span></div></div>
        ) : (
          <div className="hq-business-list">
            {cohorts.map((cohort) => <CohortCard key={cohort.title} cohort={cohort} />)}
          </div>
        )}
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Leads you're tracking</h2>
          <button type="button" className="hq-button hq-button-secondary" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "Add a lead"}
          </button>
        </div>
        {showAdd && (
          <form action={async (formData) => { await addLead(formData); setShowAdd(false) }} className="hq-create-form" style={{ marginBottom: 16, padding: 14, border: "1px solid var(--hq-border)", borderRadius: 8, background: "var(--hq-surface)" }}>
            <label>Person<input name="person_name" required /></label>
            <label>Business<input name="business_name" required /></label>
            <label>Email<input name="email" type="email" /></label>
            <label>Phone<input name="phone" type="tel" /></label>
            <label className="hq-form-wide">Note<textarea name="notes" rows={2} placeholder="How you know them, what they're interested in" /></label>
            <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Add</button></div>
          </form>
        )}
        {prospects.length === 0 ? (
          <div className="hq-panel"><div className="hq-empty-state"><strong>No leads yet.</strong><span>Add someone worth following up with - a referral, someone you met.</span></div></div>
        ) : (
          <div className="hq-business-list">
            {prospects.map((prospect) => <LeadRow key={prospect.id} prospect={prospect} />)}
          </div>
        )}
      </section>
    </>
  )
}
