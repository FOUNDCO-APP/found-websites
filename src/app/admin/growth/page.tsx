import { getAdminClient } from "../lib"
import { planLabel } from "../client-utils"
import { buildClientActivitySignal, clientActivityOutreachCopy } from "../customerActivitySignals"
import { isAdminTestEmail, isAdminTestIdentity } from "../testIdentity"
import GrowthWorkspace, { type Prospect, type Cohort, type GrowthAccount, type CampaignAudience, type AutomationDraft } from "./GrowthWorkspace"

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

type ClientOutreachActivity = {
  company_id: string
  activity_type: string
  summary: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type CompanyRow = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  account_kind: string | null
  is_test: boolean | null
  plan: string | null
  subscription_status: string | null
  client_state: string | null
  industry_category: string | null
  created_at: string
}

type CustomerActivity = {
  company_id: string
  surface: string | null
  feature: string | null
  created_at: string
}

function industryLabel(value: string | null) {
  if (!value) return "Uncategorized"
  return value.replace(/_/g, " ").replace(/\b[a-z]/g, (l) => l.toUpperCase())
}

function dayAge(value: string | null | undefined) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
}

function nextFollowUpAt(activity: SalesActivity | undefined) {
  const value = activity?.metadata?.next_follow_up_at
  return typeof value === "string" ? value : null
}

function isSalesFollowUpDue(activity: SalesActivity | undefined) {
  const value = nextFollowUpAt(activity)
  if (value) return new Date(value).getTime() <= Date.now()
  const days = dayAge(activity?.created_at)
  return days !== null && days >= 7
}

function clientNextFollowUpAt(activity: ClientOutreachActivity | undefined) {
  const value = activity?.metadata?.next_follow_up_at
  return typeof value === "string" ? value : null
}

function isClientFollowUpLater(activity: ClientOutreachActivity | undefined) {
  const value = clientNextFollowUpAt(activity)
  if (value) return new Date(value).getTime() > Date.now()
  const days = dayAge(activity?.created_at)
  return days !== null && days < 7
}

function followUpLabel(value: string | null | undefined) {
  if (!value) return null
  const days = dayAge(value)
  if (days === null) return null
  if (days >= 0) return days === 0 ? "follow up today" : `follow-up overdue ${days}d`
  const daysAway = Math.abs(days)
  return daysAway === 1 ? "follow up tomorrow" : `follow up in ${daysAway}d`
}

function outreachMethodLabel(activity: ClientOutreachActivity) {
  const method = activity.metadata?.method
  const value = typeof method === "string" ? method : activity.activity_type.replace("outreach_", "")
  if (value === "call") return "Call logged"
  if (value === "text") return "Text sent"
  if (value === "email") return "Email sent"
  if (value === "skip") return "Skipped"
  if (value === "reviewed") return "Reviewed"
  return "Outreach logged"
}

function outreachMemoryLabel(activity: ClientOutreachActivity | undefined) {
  if (!activity) return null
  const days = dayAge(activity.created_at)
  const age = days === null ? null : days <= 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`
  const followUp = followUpLabel(clientNextFollowUpAt(activity))
  return [age ? `${outreachMethodLabel(activity)} ${age}` : outreachMethodLabel(activity), followUp].filter(Boolean).join(" / ")
}

function isTestCompany(company: CompanyRow) {
  return isAdminTestIdentity(company)
}

function isTestProspect(prospect: Prospect) {
  return isAdminTestEmail(prospect.email)
}

function companyMember(company: CompanyRow, status: string, message?: string, outreachMemory?: string | null, lastOutreachAt?: string | null) {
  return {
    id: company.id,
    type: "client" as const,
    name: company.name,
    contactName: company.name,
    businessName: company.name,
    detail: `${planLabel(company.plan)} / ${company.subscription_status ?? "not active"}`,
    email: company.email,
    phone: company.phone,
    href: `/admin/clients/${company.id}`,
    status,
    message,
    outreachMemory,
    lastOutreachAt: lastOutreachAt ?? null,
  }
}

function prospectMember(prospect: Prospect, status: string) {
  return {
    id: prospect.id,
    type: "lead" as const,
    name: prospect.business_name,
    contactName: prospect.person_name,
    businessName: prospect.business_name,
    detail: `${prospect.person_name} / ${prospect.source}`,
    email: prospect.email,
    phone: prospect.phone,
    href: null,
    status,
    lastOutreachAt: prospect.outreach_activities[0]?.created_at ?? null,
  }
}

function audienceById(audiences: CampaignAudience[], id: string) {
  return audiences.find((audience) => audience.id === id)?.members ?? []
}

function memberHasContact(member: { email: string | null; phone: string | null }, channel: AutomationDraft["channel"]) {
  if (channel === "Email") return Boolean(member.email)
  if (channel === "Text") return Boolean(member.phone)
  return Boolean(member.email || member.phone)
}

function lastSentLabel(members: { lastOutreachAt?: string | null }[]) {
  const latest = members
    .map((member) => member.lastOutreachAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
  const days = dayAge(latest)
  if (days === null) return "None"
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days}d ago`
}

function automationStatus(readyMembers: unknown[], suppressedByFollowUp: number): AutomationDraft["status"] {
  if (readyMembers.length > 0) return "Manual only"
  if (suppressedByFollowUp > 0) return "Ready later"
  return "Paused"
}

export default async function GrowthPage() {
  const admin = getAdminClient()
  const windowStart = new Date(Date.now() - COHORT_WINDOW_DAYS * 86400000).toISOString()
  const outreachStart = new Date(Date.now() - OUTREACH_WINDOW_DAYS * 86400000).toISOString()

  const [{ data: companies }, { data: prospectData }, { data: salesActivityData }, { data: customerActivityData }, { data: clientOutreachData }] = await Promise.all([
    admin.from("companies").select("id, name, slug, email, phone, account_kind, is_test, plan, subscription_status, client_state, industry_category, created_at"),
    admin.from("sales_prospects")
      .select("id, person_name, business_name, email, phone, source, stage, notes, created_at, linked_company_id")
      .order("created_at", { ascending: false }),
    admin.from("sales_activities")
      .select("prospect_id, activity_type, summary, created_at, metadata")
      .in("activity_type", ["outreach_call", "outreach_text", "outreach_email", "outreach_skip", "outreach_reviewed"])
      .gte("created_at", outreachStart)
      .order("created_at", { ascending: false })
      .limit(1000),
    admin.from("customer_activity_events")
      .select("company_id, surface, feature, created_at")
      .eq("is_admin_view", false)
      .gte("created_at", outreachStart)
      .order("created_at", { ascending: false })
      .limit(10000),
    admin.from("client_activities")
      .select("company_id, activity_type, summary, created_at, metadata")
      .in("activity_type", ["outreach_call", "outreach_text", "outreach_email", "outreach_skip", "outreach_reviewed"])
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
  const allCompanyRows = (companies ?? []) as CompanyRow[]
  const testCompanyRows = allCompanyRows.filter(isTestCompany)
  const companyRows = allCompanyRows.filter((company) => !isTestCompany(company) && company.account_kind === "client")
  const customerActivityByCompany = new Map<string, CustomerActivity[]>()
  for (const activity of (customerActivityData ?? []) as CustomerActivity[]) {
    const list = customerActivityByCompany.get(activity.company_id) ?? []
    list.push(activity)
    customerActivityByCompany.set(activity.company_id, list)
  }

  const groups = new Map<string, { plan: string; industry: string | null; companies: { id: string; name: string; slug: string; email: string | null }[] }>()
  for (const company of companyRows) {
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

  const recentSignupCount = companyRows.filter((c) => c.created_at >= windowStart).length
  const outreachByProspect = new Map<string, SalesActivity[]>()
  for (const activity of (salesActivityData ?? []) as SalesActivity[]) {
    const list = outreachByProspect.get(activity.prospect_id) ?? []
    list.push(activity)
    outreachByProspect.set(activity.prospect_id, list)
  }
  const latestClientOutreachByCompany = new Map<string, ClientOutreachActivity>()
  for (const activity of (clientOutreachData ?? []) as ClientOutreachActivity[]) {
    if (!latestClientOutreachByCompany.has(activity.company_id)) latestClientOutreachByCompany.set(activity.company_id, activity)
  }
  const prospects = ((prospectData ?? []) as Prospect[]).map((prospect) => ({
    ...prospect,
    outreach_activities: outreachByProspect.get(prospect.id) ?? [],
  }))
  const allOpenLeads = prospects.filter((p) => p.stage !== "won" && p.stage !== "lost")
  const testOpenLeads = allOpenLeads.filter(isTestProspect)
  const openLeads = allOpenLeads.filter((prospect) => !isTestProspect(prospect))
  const accounts: GrowthAccount[] = companyRows.map((company) => ({
    id: company.id,
    plan: company.plan,
    subscription_status: company.subscription_status,
    client_state: company.client_state ?? "onboarding",
    created_at: company.created_at,
  }))
  const activitySignalByCompany = new Map(companyRows.map((company) => [
    company.id,
    buildClientActivitySignal(customerActivityByCompany.get(company.id) ?? [], company.subscription_status),
  ]))
  const activityMessageForCompany = (company: CompanyRow) => clientActivityOutreachCopy({
    businessName: company.name,
    signal: activitySignalByCompany.get(company.id) ?? buildClientActivitySignal([], company.subscription_status),
  })
  const campaignMemberForCompany = (company: CompanyRow, status: string, message?: string) => {
    const latestOutreach = latestClientOutreachByCompany.get(company.id)
    return companyMember(company, status, message, outreachMemoryLabel(latestOutreach), latestOutreach?.created_at ?? null)
  }
  const clientDraftReady = (member: { id: string; type: "client" | "lead" }) =>
    member.type !== "client" || !isClientFollowUpLater(latestClientOutreachByCompany.get(member.id))
  const automationDraft = (draft: Omit<AutomationDraft, "status" | "readyNow" | "suppressedByFollowUp" | "missingContact" | "lastSent">, fullMembers: ReturnType<typeof audienceById>) => {
    const suppressedByFollowUp = fullMembers.filter((member) => !clientDraftReady(member)).length
    return {
      ...draft,
      status: automationStatus(draft.members, suppressedByFollowUp),
      readyNow: draft.members.length,
      suppressedByFollowUp,
      missingContact: draft.members.filter((member) => !memberHasContact(member, draft.channel)).length,
      lastSent: lastSentLabel(fullMembers),
    }
  }
  const upgradeReadyClients = companyRows.filter((company) => UPGRADEABLE_PLANS.has(company.plan ?? ""))
  const inactiveClients = companyRows.filter((company) => (dayAge(activitySignalByCompany.get(company.id)?.latest?.created_at) ?? 999) >= 15)
  const noActivityClients = companyRows.filter((company) => !customerActivityByCompany.has(company.id))
  const trialingInactiveClients = companyRows.filter((company) => company.subscription_status === "trialing" && (dayAge(activitySignalByCompany.get(company.id)?.latest?.created_at) ?? 999) >= 7)
  const dashboardOnlyClients = companyRows.filter((company) => activitySignalByCompany.get(company.id)?.onlyDashboard)
  const noLeadsUsageClients = companyRows.filter((company) => activitySignalByCompany.get(company.id)?.missingCoreTools.includes("leads"))
  const noPhotosUsageClients = companyRows.filter((company) => activitySignalByCompany.get(company.id)?.missingCoreTools.includes("photos"))
  const noEstimatesUsageClients = companyRows.filter((company) => activitySignalByCompany.get(company.id)?.missingCoreTools.includes("estimates"))
  const pastDueClients = companyRows.filter((company) => company.client_state === "past_due")
  const newClients = companyRows.filter((company) => (dayAge(company.created_at) ?? 999) <= 7)
  const leadFirstTouch = openLeads.filter((lead) => lead.outreach_activities.length === 0)
  const leadFollowUpDue = openLeads.filter((lead) => isSalesFollowUpDue(lead.outreach_activities[0] as SalesActivity | undefined))
  const staleLeads = openLeads.filter((lead) => lead.outreach_activities.length === 0 && (dayAge(lead.created_at) ?? 0) >= 14)
  const campaignAudiences: CampaignAudience[] = [
    {
      id: "trialing-inactive",
      title: "Trialing clients inactive",
      description: "Protect trials before they fade.",
      members: trialingInactiveClients.map((company) => campaignMemberForCompany(company, "Trialing and quiet", activityMessageForCompany(company))),
    },
    {
      id: "inactive-clients",
      title: "Clients inactive 15+ days",
      description: "Retention list for customers who stopped using Found.",
      members: inactiveClients.map((company) => campaignMemberForCompany(company, "No customer use in 15+ days", activityMessageForCompany(company))),
    },
    {
      id: "lead-follow-up-due",
      title: "Leads due for follow-up",
      description: "Sales conversations that should be touched now.",
      members: leadFollowUpDue.map((prospect) => prospectMember(prospect, "Follow-up due")),
    },
    {
      id: "lead-first-touch",
      title: "Leads needing first touch",
      description: "New leads with no outreach logged yet.",
      members: leadFirstTouch.map((prospect) => prospectMember(prospect, "No outreach logged")),
    },
    {
      id: "stale-leads",
      title: "Stale leads",
      description: "Leads older than 14 days with no outreach.",
      members: staleLeads.map((prospect) => prospectMember(prospect, "Stale")),
    },
    {
      id: "upgrade-ready",
      title: "Upgrade-ready clients",
      description: "Starter and Pro accounts that may be ready for a plan conversation.",
      members: upgradeReadyClients.map((company) => campaignMemberForCompany(company, "Upgrade opportunity")),
    },
    {
      id: "past-due-risk",
      title: "Past due billing risk",
      description: "Accounts where revenue or access may be at risk.",
      members: pastDueClients.map((company) => campaignMemberForCompany(company, "Past due")),
    },
    {
      id: "new-client-first-week",
      title: "New clients first 7 days",
      description: "Early customers who need momentum and confidence.",
      members: newClients.map((company) => campaignMemberForCompany(company, "First week")),
    },
    {
      id: "no-activity-clients",
      title: "Clients with no activity",
      description: "Accounts where no true customer-side activity has been captured.",
      members: noActivityClients.map((company) => campaignMemberForCompany(company, "No activity yet", activityMessageForCompany(company))),
    },
    {
      id: "dashboard-only-clients",
      title: "Dashboard only",
      description: "Clients who opened Found but have not used a working tool yet.",
      members: dashboardOnlyClients.map((company) => campaignMemberForCompany(company, "Dashboard only", activityMessageForCompany(company))),
    },
    {
      id: "no-leads-usage",
      title: "Never used leads",
      description: "Clients who have not opened the lead/inbox workflow.",
      members: noLeadsUsageClients.map((company) => campaignMemberForCompany(company, "No leads usage", activityMessageForCompany(company))),
    },
    {
      id: "no-photos-usage",
      title: "Never used photos",
      description: "Clients who have not used the photo/gallery workflow.",
      members: noPhotosUsageClients.map((company) => campaignMemberForCompany(company, "No photos usage", activityMessageForCompany(company))),
    },
    {
      id: "no-estimates-usage",
      title: "Never used estimates",
      description: "Clients who have not used estimate workflows.",
      members: noEstimatesUsageClients.map((company) => campaignMemberForCompany(company, "No estimates usage", activityMessageForCompany(company))),
    },
  ]
  const automationDrafts: AutomationDraft[] = [
    automationDraft({
      id: "lead-first-touch-day-1",
      title: "Lead first touch",
      trigger: "Lead added and no outreach logged after 1 day",
      audience: "Leads needing first touch",
      channel: "Text",
      message: "Hey {{first_name}}, this is Super Shawn with Found. I wanted to follow up about {{business_name}} and see if getting a real working website live is still something worth looking at this week.",
      members: audienceById(campaignAudiences, "lead-first-touch").filter((member) => (dayAge(openLeads.find((lead) => lead.id === member.id)?.created_at) ?? 0) >= 1),
    }, audienceById(campaignAudiences, "lead-first-touch")),
    automationDraft({
      id: "lead-follow-up-due",
      title: "Lead follow-up due",
      trigger: "Lead follow-up date is today or overdue",
      audience: "Leads due for follow-up",
      channel: "Text",
      message: "Hey {{first_name}}, quick follow-up. Want to take a look at what your business site could look like and what we can get working for you?",
      members: audienceById(campaignAudiences, "lead-follow-up-due"),
    }, audienceById(campaignAudiences, "lead-follow-up-due")),
    automationDraft({
      id: "trialing-inactive-7",
      title: "Trial rescue",
      trigger: "Trialing client inactive for 7 days",
      audience: "Trialing clients inactive",
      channel: "Email",
      message: "Hey {{business_name}}, this is Super Shawn with Found. I noticed your dashboard has been quiet while your account is still in trial. Want me to help you take the next step so the site starts working harder for you?",
      members: audienceById(campaignAudiences, "trialing-inactive").filter(clientDraftReady),
    }, audienceById(campaignAudiences, "trialing-inactive")),
    automationDraft({
      id: "client-inactive-15",
      title: "Inactive client",
      trigger: "Client inactive for 15+ days",
      audience: "Clients inactive 15+ days",
      channel: "Email",
      message: "Hey {{business_name}}, this is Super Shawn with Found. If the system has not been useful lately, I want to know what is blocking you so we can tighten it up.",
      members: audienceById(campaignAudiences, "inactive-clients").filter(clientDraftReady),
    }, audienceById(campaignAudiences, "inactive-clients")),
    automationDraft({
      id: "dashboard-only-nudge",
      title: "Dashboard-only nudge",
      trigger: "Client opened Found but has not used a working tool",
      audience: "Dashboard only",
      channel: "Manual",
      message: "Hey {{business_name}}, this is Super Shawn with Found. I saw the dashboard was opened, but it does not look like any of the working tools have been used yet. Want me to help you use one real tool, like Photos, Leads, Site updates, or Estimates?",
      members: audienceById(campaignAudiences, "dashboard-only-clients").filter(clientDraftReady),
    }, audienceById(campaignAudiences, "dashboard-only-clients")),
    automationDraft({
      id: "tool-adoption-nudge",
      title: "Tool adoption nudge",
      trigger: "Client has not used a core Found tool",
      audience: "Never used leads, photos, or estimates",
      channel: "Manual",
      message: "Hey {{business_name}}, this is Super Shawn with Found. I noticed one of the core tools has not been used yet, and that is usually where Found starts becoming more useful. Want me to help you get one set up?",
      members: [
        ...audienceById(campaignAudiences, "no-leads-usage"),
        ...audienceById(campaignAudiences, "no-photos-usage"),
        ...audienceById(campaignAudiences, "no-estimates-usage"),
      ].filter((member, index, members) => members.findIndex((item) => item.type === member.type && item.id === member.id) === index).filter(clientDraftReady),
    }, [
      ...audienceById(campaignAudiences, "no-leads-usage"),
      ...audienceById(campaignAudiences, "no-photos-usage"),
      ...audienceById(campaignAudiences, "no-estimates-usage"),
    ].filter((member, index, members) => members.findIndex((item) => item.type === member.type && item.id === member.id) === index)),
    automationDraft({
      id: "new-client-first-week",
      title: "First-week check-in",
      trigger: "New client in first 7 days",
      audience: "New clients first 7 days",
      channel: "Manual",
      message: "Hey {{business_name}}, this is Super Shawn with Found. Just checking in on your first week. I want to make sure you know where to go next and that the system is already helping.",
      members: audienceById(campaignAudiences, "new-client-first-week").filter(clientDraftReady),
    }, audienceById(campaignAudiences, "new-client-first-week")),
  ]
  const testSandboxMembers = [
    ...testCompanyRows.map((company) => companyMember(company, company.account_kind === "test" ? "Test account" : "Test email account")),
    ...testOpenLeads.map((prospect) => prospectMember(prospect, "Test lead")),
  ]
  const testSandboxDraft: AutomationDraft = {
    id: "test-send-sandbox",
    title: "Test send sandbox",
    trigger: "Test identities only - excluded from real campaign counts",
    audience: "Shawn, Sayitmarketing, marketing, and test accounts/leads",
    channel: "Manual",
    status: "Test only",
    readyNow: testSandboxMembers.length,
    suppressedByFollowUp: 0,
    missingContact: testSandboxMembers.filter((member) => !memberHasContact(member, "Manual")).length,
    lastSent: lastSentLabel(testSandboxMembers),
    message: "Hey {{first_name}}, this is Super Shawn with Found. This is a test of the Found outreach system. If you got this, email and text workflows are ready to test without touching real client outreach.",
    members: testSandboxMembers,
  }

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Growth</h1><p className="hq-subtitle">Who to reach out to next, and the leads you're tracking by hand.</p></div>
        <span className="hq-count">{openLeads.length} leads</span>
      </header>
      <GrowthWorkspace accounts={accounts} cohorts={cohorts} prospects={openLeads} campaignAudiences={campaignAudiences} automationDrafts={automationDrafts} testSandboxDraft={testSandboxDraft} recentSignupCount={recentSignupCount} windowDays={COHORT_WINDOW_DAYS} />
    </div>
  )
}
