"use client"

import { useState, useTransition } from "react"
import { addLead, convertLeadToClient, dismissLead, markLeadOutreach, sendApprovedAutomationEmail } from "./actions"
import { markClientOutreach } from "../activity/actions"

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
  outreach_activities: LeadOutreach[]
}

export type LeadOutreach = {
  activity_type: string
  summary: string
  created_at: string
  metadata: Record<string, unknown> | null
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

export type CampaignMember = {
  id: string
  type: "client" | "lead"
  name: string
  contactName: string
  businessName: string
  detail: string
  email: string | null
  phone: string | null
  href: string | null
  status: string
  message?: string
  outreachMemory?: string | null
  lastOutreachAt?: string | null
}

export type AutomationRuleStatus = "Manual only" | "Test only" | "Ready later" | "Paused"

export type CampaignAudience = {
  id: string
  title: string
  description: string
  members: CampaignMember[]
}

export type AutomationDraft = {
  id: string
  title: string
  trigger: string
  audience: string
  channel: "Email" | "Text" | "Manual"
  status: AutomationRuleStatus
  readyNow: number
  suppressedByFollowUp: number
  missingContact: number
  lastSent: string
  message: string
  members: CampaignMember[]
}

type GoalWindow = "weekly" | "monthly" | "quarterly" | "yearly"
type LeadView = "needs_follow_up" | "follow_up_due" | "follow_up_later" | "recently_contacted" | "stale" | "all"

const PLAN_MRR: Record<string, number> = {
  found: 29,
  found_pro: 39,
  found_business: 69,
}

const GOALS: Record<GoalWindow, { label: string; accountGoal: number; days: number; buckets: number }> = {
  weekly: { label: "This week", accountGoal: 3, days: 7, buckets: 7 },
  monthly: { label: "This month", accountGoal: 10, days: 31, buckets: 6 },
  quarterly: { label: "This quarter", accountGoal: 30, days: 92, buckets: 6 },
  yearly: { label: "This year", accountGoal: 120, days: 365, buckets: 12 },
}

const LEAD_VIEWS: { key: LeadView; label: string }[] = [
  { key: "needs_follow_up", label: "Needs follow-up" },
  { key: "follow_up_due", label: "Follow-up due" },
  { key: "follow_up_later", label: "Follow-up later" },
  { key: "recently_contacted", label: "Recently contacted" },
  { key: "stale", label: "Stale" },
  { key: "all", label: "All" },
]

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

function dayAge(value: string | null | undefined) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
}

function nextFollowUpAt(outreach: LeadOutreach | undefined) {
  const value = outreach?.metadata?.next_follow_up_at
  return typeof value === "string" ? value : null
}

function isFollowUpDue(outreach: LeadOutreach | undefined) {
  const value = nextFollowUpAt(outreach)
  if (value) return new Date(value).getTime() <= Date.now()
  const days = dayAge(outreach?.created_at)
  return days !== null && days >= 7
}

function isFollowUpLater(outreach: LeadOutreach | undefined) {
  const value = nextFollowUpAt(outreach)
  if (value) return new Date(value).getTime() > Date.now()
  const days = dayAge(outreach?.created_at)
  return days !== null && days < 7
}

function followUpLabel(value: string | null | undefined) {
  if (!value) return "No follow-up date"
  const days = dayAge(value)
  if (days === null) return "No follow-up date"
  if (days >= 0) return days === 0 ? "Follow up today" : `Follow-up overdue ${days}d`
  const daysAway = Math.abs(days)
  if (daysAway === 1) return "Follow up tomorrow"
  return `Follow up in ${daysAway}d`
}

function outreachLabel(outreach: LeadOutreach | undefined) {
  const days = dayAge(outreach?.created_at)
  if (days === null) return "No outreach logged"
  if (days <= 0) return "Contacted today"
  if (days === 1) return "Contacted yesterday"
  return `Contacted ${days}d ago`
}

function memberMeta(member: CampaignMember) {
  return [member.status, member.detail, member.outreachMemory].filter(Boolean).join(" / ")
}

function statusClass(status: AutomationRuleStatus) {
  if (status === "Manual only") return "hq-badge-info"
  if (status === "Test only") return "hq-badge-success"
  if (status === "Ready later") return "hq-badge-warning"
  return ""
}

function leadNeedsFollowUp(prospect: Prospect) {
  const latest = prospect.outreach_activities[0]
  return !latest || isFollowUpDue(latest)
}

function isStaleLead(prospect: Prospect) {
  return prospect.outreach_activities.length === 0 && (dayAge(prospect.created_at) ?? 0) >= 14
}

function leadOutreachReason(prospect: Prospect) {
  if (isStaleLead(prospect)) return "Stale lead with no outreach"
  const latest = prospect.outreach_activities[0]
  if (!latest) return "New lead needs first touch"
  if (isFollowUpDue(latest)) return "Follow-up is due"
  return "Follow-up is scheduled"
}

function leadOutreachCopy(prospect: Prospect) {
  const intro = `Hey ${prospect.person_name}, this is Super Shawn with Found.`
  return `${intro} I wanted to follow up about ${prospect.business_name}. I think we can help you get a real working website and business system live without making it complicated. Worth taking a look together this week? https://foundco.app`
}

function mailtoHref(prospect: Prospect) {
  const subject = `Following up about ${prospect.business_name}`
  return `mailto:${prospect.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(leadOutreachCopy(prospect))}`
}

function smsHref(prospect: Prospect) {
  const phone = prospect.phone?.replace(/[^\d+]/g, "")
  return phone ? `sms:${phone}?&body=${encodeURIComponent(leadOutreachCopy(prospect))}` : null
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
        <label className="hq-period-select">
          <span>Period</span>
          <select value={window} onChange={(event) => setWindow(event.target.value as GoalWindow)}>
            {(Object.keys(GOALS) as GoalWindow[]).map((key) => (
              <option key={key} value={key}>{GOALS[key].label}</option>
            ))}
          </select>
        </label>
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

function CampaignAudienceCard({ audience }: { audience: CampaignAudience }) {
  const [expanded, setExpanded] = useState(false)
  const emails = audience.members.map((member) => member.email).filter((email): email is string => Boolean(email))

  return (
    <article className="hq-prospect">
      <button type="button" className="hq-prospect-head" onClick={() => setExpanded((value) => !value)} style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <div>
          <div className="hq-business-name-line">
            <h2>{audience.title}</h2>
            <span className="hq-badge hq-badge-info">{audience.members.length}</span>
          </div>
          <p className="hq-row-meta">{audience.description}</p>
        </div>
        <span className="hq-chevron" style={{ transform: expanded ? "rotate(135deg)" : "rotate(45deg)" }} />
      </button>
      {expanded && (
        <div className="hq-business-manage-body hq-sales-forms">
          <div className="hq-contact-actions" style={{ marginBottom: 10 }}>
            {emails.length > 0 && <a href={`mailto:?bcc=${emails.join(",")}`}>Email list {emails.length}</a>}
          </div>
          {audience.members.length === 0 ? (
            <p className="hq-row-meta">No one is in this list right now.</p>
          ) : (
            audience.members.slice(0, 25).map((member) => (
              <div key={`${audience.id}-${member.type}-${member.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 0", borderTop: "1px solid var(--hq-border)" }}>
                <div>
                  <p className="hq-row-title" style={{ fontSize: 13 }}>{member.name}</p>
                  <p className="hq-row-meta">{memberMeta(member)}</p>
                </div>
                <div className="hq-contact-actions" style={{ marginTop: 0, alignItems: "center" }}>
                  {member.phone && <a href={`tel:${member.phone}`}>Call</a>}
                  {member.email && <a href={`mailto:${member.email}`}>Email</a>}
                  {member.href && <a href={member.href}>Open</a>}
                </div>
              </div>
            ))
          )}
          {audience.members.length > 25 && <p className="hq-row-meta" style={{ marginTop: 10 }}>Showing first 25. Automation will use the full list later.</p>}
        </div>
      )}
    </article>
  )
}

function draftMessage(draft: AutomationDraft, member: CampaignMember) {
  const firstName = member.contactName.split(/\s+/)[0] || member.name
  return (member.message ?? draft.message)
    .replaceAll("{{first_name}}", firstName)
    .replaceAll("{{business_name}}", member.businessName)
}

function draftMailtoHref(draft: AutomationDraft, member: CampaignMember) {
  if (!member.email) return null
  const subject = `${draft.title} - ${member.businessName}`
  return `mailto:${member.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftMessage(draft, member))}`
}

function draftSubject(draft: AutomationDraft, member: CampaignMember) {
  return `${draft.title} - ${member.businessName}`
}

function draftSmsHref(draft: AutomationDraft, member: CampaignMember) {
  const phone = member.phone?.replace(/[^\d+]/g, "")
  return phone ? `sms:${phone}?&body=${encodeURIComponent(draftMessage(draft, member))}` : null
}

function AutomationDraftCard({ draft }: { draft: AutomationDraft }) {
  const [expanded, setExpanded] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const reachable = draft.members.filter((member) =>
    draft.channel === "Text" ? member.phone : draft.channel === "Email" ? member.email : member.phone || member.email,
  )

  async function copyMessage(member: CampaignMember) {
    const key = `${draft.id}-${member.type}-${member.id}`
    await navigator.clipboard.writeText(draftMessage(draft, member))
    setCopiedKey(key)
  }

  return (
    <article className="hq-prospect">
      <button type="button" className="hq-prospect-head" onClick={() => setExpanded((value) => !value)} style={{ width: "100%", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
        <div>
          <div className="hq-business-name-line">
            <h2>{draft.title}</h2>
            <span className={`hq-badge ${statusClass(draft.status)}`}>{draft.status}</span>
          </div>
          <p className="hq-row-meta">{draft.trigger} / {draft.channel} / {draft.members.length} match{draft.members.length === 1 ? "" : "es"}</p>
        </div>
        <span className="hq-chevron" style={{ transform: expanded ? "rotate(135deg)" : "rotate(45deg)" }} />
      </button>
      {expanded && (
        <div className="hq-business-manage-body hq-sales-forms">
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <p className="hq-row-meta">Audience</p>
              <p className="hq-row-title">{draft.audience}</p>
            </div>
            <div>
              <p className="hq-row-meta">Suggested message</p>
              <p className="hq-form-note" style={{ marginTop: 6 }}>{draft.message}</p>
            </div>
            <div>
              <p className="hq-row-meta">Ready to reach</p>
              <p className="hq-row-title">{reachable.length} of {draft.readyNow}</p>
            </div>
          </div>
          {draft.members.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {draft.members.slice(0, 8).map((member) => (
                <div key={`${draft.id}-${member.type}-${member.id}`} style={{ display: "grid", gap: 8, padding: "10px 0", borderTop: "1px solid var(--hq-border)" }}>
                  <div>
                    <p className="hq-row-title" style={{ fontSize: 13 }}>{member.name}</p>
                    <p className="hq-row-meta">{memberMeta(member)}</p>
                  </div>
                  <p className="hq-form-note" style={{ marginTop: 0 }}>{draftMessage(draft, member)}</p>
                  <div className="hq-contact-actions hq-outreach-actions" style={{ marginTop: 0 }}>
                    {draftSmsHref(draft, member) && <a href={draftSmsHref(draft, member)!}>Open text</a>}
                    {draftMailtoHref(draft, member) && <a href={draftMailtoHref(draft, member)!}>Open email</a>}
                    <button type="button" onClick={() => copyMessage(member)} style={{ border: 0, background: "transparent", color: "var(--hq-green)", font: "inherit", fontSize: 11, fontWeight: 750, padding: 0, cursor: "pointer" }}>{copiedKey === `${draft.id}-${member.type}-${member.id}` ? "Copied" : "Copy"}</button>
                    {member.href && <a href={member.href}>Open</a>}
                  </div>
                  {member.email && (
                    <form action={sendApprovedAutomationEmail} className="hq-contact-actions hq-outreach-log-actions" style={{ marginTop: 0 }}>
                      <input type="hidden" name="recipientType" value={member.type} />
                      <input type="hidden" name="recipientId" value={member.id} />
                      <input type="hidden" name="email" value={member.email} />
                      <input type="hidden" name="subject" value={draftSubject(draft, member)} />
                      <input type="hidden" name="message" value={draftMessage(draft, member)} />
                      <input type="hidden" name="reason" value={`${draft.title}: ${draft.trigger}`} />
                      <button type="submit">Send email</button>
                    </form>
                  )}
                  <form action={member.type === "client" ? markClientOutreach : markLeadOutreach} className="hq-contact-actions hq-outreach-log-actions" style={{ marginTop: 0 }}>
                    <input type="hidden" name={member.type === "client" ? "companyId" : "prospectId"} value={member.id} />
                    <input type="hidden" name="method" value="reviewed" />
                    <input type="hidden" name="reason" value={`${draft.title}: ${draft.trigger}`} />
                    <button type="submit">Mark reviewed</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function AutomationSafetyPanel({ drafts, testSandboxDraft }: { drafts: AutomationDraft[]; testSandboxDraft: AutomationDraft }) {
  const rules = [testSandboxDraft, ...drafts]
  const readyNow = rules.reduce((total, rule) => total + rule.readyNow, 0)
  const suppressed = rules.reduce((total, rule) => total + rule.suppressedByFollowUp, 0)

  return (
    <section className="hq-section hq-growth-followup">
      <div className="hq-section-head">
        <h2 className="hq-section-title">Outreach rules</h2>
        <span className="hq-section-meta">{readyNow} ready, {suppressed} waiting</span>
      </div>
      <div className="hq-automation-rules" aria-label="Outreach automation safety rules">
        {rules.map((rule) => (
          <article key={`rule-${rule.id}`} className="hq-automation-rule">
            <div className="hq-automation-rule-head">
              <div>
                <h3>{rule.title}</h3>
                <p>{rule.trigger}</p>
              </div>
              <span className={`hq-badge ${statusClass(rule.status)}`}>{rule.status}</span>
            </div>
            <div className="hq-automation-rule-grid">
              <div><span>Ready now</span><strong>{rule.readyNow}</strong></div>
              <div><span>Suppressed</span><strong>{rule.suppressedByFollowUp}</strong></div>
              <div><span>Missing</span><strong>{rule.missingContact}</strong></div>
              <div><span>Last sent</span><strong>{rule.lastSent}</strong></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function LeadRow({ prospect }: { prospect: Prospect }) {
  const [converting, startConverting] = useTransition()
  const [dismissing, startDismissing] = useTransition()
  const [converted, setConverted] = useState(Boolean(prospect.linked_company_id))
  const [dismissed, setDismissed] = useState(false)
  const latestOutreach = prospect.outreach_activities[0]
  const textHref = smsHref(prospect)
  const reason = leadOutreachReason(prospect)

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
          <p className="hq-client-activity">
            {reason} / {outreachLabel(latestOutreach)}
            {nextFollowUpAt(latestOutreach) ? ` / ${followUpLabel(nextFollowUpAt(latestOutreach))}` : ""}
          </p>
          <div className="hq-contact-actions">
            {prospect.phone && <a href={`tel:${prospect.phone}`}>Call</a>}
            {textHref && <a href={textHref}>Text</a>}
            {prospect.email && <a href={mailtoHref(prospect)}>Email</a>}
          </div>
          <div className="hq-contact-actions hq-outreach-log-actions">
            {["call", "text", "email", "skip"].map((method) => (
              <form key={method} action={markLeadOutreach}>
                <input type="hidden" name="prospectId" value={prospect.id} />
                <input type="hidden" name="method" value={method} />
                <input type="hidden" name="reason" value={reason} />
                <button type="submit">{method === "skip" ? "Skip" : `Log ${method}`}</button>
              </form>
            ))}
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

export default function GrowthWorkspace({ accounts, cohorts, prospects, campaignAudiences, automationDrafts, testSandboxDraft, recentSignupCount, windowDays }: {
  accounts: GrowthAccount[]
  cohorts: Cohort[]
  prospects: Prospect[]
  campaignAudiences: CampaignAudience[]
  automationDrafts: AutomationDraft[]
  testSandboxDraft: AutomationDraft
  recentSignupCount: number
  windowDays: number
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [leadView, setLeadView] = useState<LeadView>("needs_follow_up")
  const leadCounts = LEAD_VIEWS.reduce<Record<LeadView, number>>((counts, view) => {
    counts[view.key] =
      view.key === "all" ? prospects.length
      : view.key === "needs_follow_up" ? prospects.filter(leadNeedsFollowUp).length
      : view.key === "follow_up_due" ? prospects.filter((prospect) => isFollowUpDue(prospect.outreach_activities[0])).length
      : view.key === "follow_up_later" ? prospects.filter((prospect) => isFollowUpLater(prospect.outreach_activities[0])).length
      : view.key === "recently_contacted" ? prospects.filter((prospect) => prospect.outreach_activities.length > 0).length
      : prospects.filter(isStaleLead).length
    return counts
  }, {} as Record<LeadView, number>)
  const visibleProspects =
    leadView === "all" ? prospects
    : leadView === "needs_follow_up" ? prospects.filter(leadNeedsFollowUp)
    : leadView === "follow_up_due" ? prospects.filter((prospect) => isFollowUpDue(prospect.outreach_activities[0]))
    : leadView === "follow_up_later" ? prospects.filter((prospect) => isFollowUpLater(prospect.outreach_activities[0]))
    : leadView === "recently_contacted" ? prospects.filter((prospect) => prospect.outreach_activities.length > 0)
    : prospects.filter(isStaleLead)

  return (
    <>
      <GoalScoreboard accounts={accounts} />

      <AutomationSafetyPanel drafts={automationDrafts} testSandboxDraft={testSandboxDraft} />

      <section className="hq-section hq-growth-followup">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Test send sandbox</h2>
          <span className="hq-section-meta">{testSandboxDraft.members.length} safe test matches</span>
        </div>
        <div className="hq-business-list">
          <AutomationDraftCard draft={testSandboxDraft} />
        </div>
      </section>

      <section className="hq-section hq-growth-followup">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Automation drafts</h2>
          <span className="hq-section-meta">{automationDrafts.length} rules, no auto-send</span>
        </div>
        <div className="hq-business-list">
          {automationDrafts.map((draft) => <AutomationDraftCard key={draft.id} draft={draft} />)}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Campaign lists</h2>
          <span className="hq-section-meta">{campaignAudiences.reduce((total, audience) => total + audience.members.length, 0)} total matches</span>
        </div>
        <div className="hq-business-list">
          {campaignAudiences.map((audience) => <CampaignAudienceCard key={audience.id} audience={audience} />)}
        </div>
      </section>

      <section className="hq-section">
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
          <>
            <div className="hq-filter-row hq-health-filters" style={{ marginBottom: 18 }}>
              {LEAD_VIEWS.map((view) => (
                <button key={view.key} type="button" data-active={leadView === view.key} onClick={() => setLeadView(view.key)}>
                  {view.label} ({leadCounts[view.key]})
                </button>
              ))}
            </div>
            {visibleProspects.length === 0 ? (
              <div className="hq-panel"><div className="hq-empty-state"><strong>No leads in this view.</strong><span>When a lead matches this follow-up state, it will appear here.</span></div></div>
            ) : (
              <div className="hq-business-list">
                {visibleProspects.map((prospect) => <LeadRow key={prospect.id} prospect={prospect} />)}
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
