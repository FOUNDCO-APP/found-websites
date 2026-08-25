import Link from "next/link"
import { getAdminClient } from "../lib"
import { adminTestIdentityReason, isAdminTestEmail, isAdminTestIdentity } from "../testIdentity"
import TestCenterWorkspace, { type QaCheck, type TestIdentity } from "./TestCenterWorkspace"

export const metadata = { title: "Test Center - Found HQ" }

type CompanyRow = {
  id: string
  name: string
  slug: string | null
  email: string | null
  account_kind: string | null
  is_test: boolean | null
  client_state: string | null
  subscription_status: string | null
}

type ProspectRow = {
  id: string
  person_name: string | null
  business_name: string
  email: string | null
  stage: string | null
}

const QA_CHECKS: QaCheck[] = [
  { id: "today-test-exclusion", area: "Today", title: "Exclude test accounts", detail: "Today should not count test clients or test leads in real numbers or next actions.", href: "/admin" },
  { id: "today-priority", area: "Today", title: "Verify priority order", detail: "Today should show payment risk, launch blockers, follow-up, inactive trials, no activity, dashboard-only, then stagnant clients.", href: "/admin" },
  { id: "today-links", area: "Today", title: "Open each next action", detail: "Each action should open the right Growth, Client Health, or client detail screen.", href: "/admin" },

  { id: "client-health-real-activity", area: "Client Health", title: "Capture real client activity", detail: "Log in as a true client and confirm customer-side activity appears in Client Health.", href: "/admin/activity" },
  { id: "client-health-admin-excluded", area: "Client Health", title: "Exclude admin usage", detail: "Admin HQ usage and admin view-as sessions must not count as client-side activity.", href: "/admin/activity" },
  { id: "client-health-filters", area: "Client Health", title: "Test health filters", detail: "Check quiet, stagnant, no activity, trialing inactive, needs follow-up, due, later, and recently contacted.", href: "/admin/activity" },
  { id: "client-health-log-followup", area: "Client Health", title: "Log outreach timing", detail: "Call, text, and email logs should create a 3-day follow-up; Skip should create a 7-day follow-up.", href: "/admin/activity" },
  { id: "client-health-suppression", area: "Client Health", title: "Confirm queue suppression", detail: "Clients with a future follow-up should stay out of the main outreach queue until the follow-up date.", href: "/admin/activity" },
  { id: "client-health-copy", area: "Client Health", title: "Review outreach copy", detail: "Text and email copy should change for trialing inactive, no activity, dashboard-only, stagnant, and missing-tool clients.", href: "/admin/activity" },

  { id: "clients-mobile-rows", area: "Clients", title: "Scan client rows on mobile", detail: "Rows should be compact, readable, tappable, and not break with long business names.", href: "/admin/clients" },
  { id: "clients-row-open", area: "Clients", title: "Tap full client row", detail: "The entire row should open the client detail page without requiring a tiny tap target.", href: "/admin/clients" },
  { id: "clients-row-signals", area: "Clients", title: "Check row signals", detail: "Rows should show plan, billing, health, activity reason, outreach, and 90-day tool action count clearly.", href: "/admin/clients" },
  { id: "clients-detail-command", area: "Clients", title: "Review client command center", detail: "Client detail should answer: are they active, paying, using Found, and what should Shawn do next?", href: "/admin/clients" },
  { id: "clients-detail-activity", area: "Clients", title: "Review client usage detail", detail: "Client detail should show top tools, missing tools, dashboard-only/no-activity language, and outreach history correctly.", href: "/admin/clients" },

  { id: "growth-periods", area: "Growth", title: "Test growth periods", detail: "Switch week, month, quarter, and year; chart, goals, MRR, and pace should stay readable.", href: "/admin/growth" },
  { id: "growth-layout", area: "Growth", title: "Check mobile hierarchy", detail: "Upgrade opportunities and leads should not crowd the growth chart or make the page hard to scan.", href: "/admin/growth" },
  { id: "growth-lead-followup", area: "Growth", title: "Test lead follow-up filters", detail: "Check needs follow-up, due, later, recently contacted, stale, and all.", href: "/admin/growth" },
  { id: "growth-campaign-lists", area: "Growth", title: "Review campaign lists", detail: "Open each list and confirm members match the reason, with no test identities in real lists.", href: "/admin/growth" },
  { id: "growth-campaign-actions", area: "Growth", title: "Test campaign actions", detail: "Email actions should only appear for people with emails; text/email should open one person at a time.", href: "/admin/growth" },
  { id: "growth-copy", area: "Growth", title: "Review outreach copy", detail: "Automation draft copy should sound personal from Super Shawn, not like a generic brand blast.", href: "/admin/growth" },
  { id: "growth-rules", area: "Growth", title: "Review outreach rules", detail: "Rules should show status, ready now, suppressed by follow-up, missing contact, and last sent.", href: "/admin/growth" },
  { id: "growth-no-auto-send", area: "Growth", title: "Confirm no auto-send", detail: "No real client should receive automation unless a rule is explicitly armed in a future release.", href: "/admin/growth" },

  { id: "growth-sandbox-send-email", area: "Test Sandbox", title: "Send a Resend test email", detail: "Use Test send sandbox to send one email to a test identity and confirm it lands.", href: "/admin/growth" },
  { id: "growth-sandbox-open-text", area: "Test Sandbox", title: "Open a prefilled text", detail: "Use Open text on a test identity and confirm the message sounds personal from Super Shawn.", href: "/admin/growth" },
  { id: "growth-sandbox-exclusion", area: "Test Sandbox", title: "Confirm test exclusion", detail: "Test identities should not change real Growth counts, real campaign lists, MRR, or signup goals.", href: "/admin/growth" },
  { id: "growth-sandbox-actions", area: "Test Sandbox", title: "Test sandbox actions", detail: "Open text, Open email, Copy, Mark reviewed, and Send email should work without changing real outreach queues.", href: "/admin/growth" },

  { id: "emails-tabs", area: "Emails", title: "Review inbox views", detail: "Emails should open as an operations inbox with Needs review, Handled, and All views.", href: "/admin/emails" },
  { id: "emails-needs-review", area: "Emails", title: "Check Needs review rules", detail: "Failed, bounced, complained, delayed, and flagged-lead emails should stay in Needs review until handled.", href: "/admin/emails" },
  { id: "emails-row-detail", area: "Emails", title: "Check email rows", detail: "Rows should show sender scope, recipient, related client or lead, subject, time, status, and next action.", href: "/admin/emails" },
  { id: "emails-handled-reopen", area: "Emails", title: "Test handled workflow", detail: "Mark handled should remove the email from Needs review; Reopen should bring it back.", href: "/admin/emails" },
  { id: "emails-detail-workflow", area: "Emails", title: "Test email detail", detail: "The email detail page should have the same handled/reopen workflow as the inbox.", href: "/admin/emails" },
]

export default async function TestCenterPage() {
  const admin = getAdminClient()
  const activitySince = new Date(Date.now() - 30 * 86400000).toISOString()
  const [{ data: companies }, { data: prospects }, customerActivityCount, foundEmailCount] = await Promise.all([
    admin.from("companies").select("id, name, slug, email, account_kind, is_test, client_state, subscription_status").order("created_at", { ascending: false }),
    admin.from("sales_prospects").select("id, person_name, business_name, email, stage").order("created_at", { ascending: false }),
    admin.from("customer_activity_events").select("id", { count: "exact", head: true }).eq("is_admin_view", false).gte("created_at", activitySince),
    admin.from("email_log").select("id", { count: "exact", head: true }).eq("email_scope", "found").gte("created_at", activitySince),
  ])

  const companyRows = (companies ?? []) as CompanyRow[]
  const prospectRows = (prospects ?? []) as ProspectRow[]
  const testCompanies = companyRows.filter(isAdminTestIdentity)
  const realCompanies = companyRows.filter((company) => company.account_kind === "client" && !testCompanies.some((test) => test.id === company.id))
  const testProspects = prospectRows.filter((prospect) => prospect.stage !== "won" && prospect.stage !== "lost" && isAdminTestEmail(prospect.email))
  const activeRealClients = realCompanies.filter((company) => ["active", "onboarding", "comp"].includes(company.client_state ?? "")).length
  const testIdentities: TestIdentity[] = [
    ...testCompanies.map((company) => ({
      id: company.id,
      type: "account" as const,
      name: company.name,
      email: company.email,
      reason: adminTestIdentityReason(company),
      href: `/admin/clients/${company.id}`,
    })),
    ...testProspects.map((prospect) => ({
      id: prospect.id,
      type: "lead" as const,
      name: prospect.business_name,
      email: prospect.email,
      reason: adminTestIdentityReason(prospect),
      href: "/admin/growth",
    })),
  ]

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Test Center</h1>
          <p className="hq-subtitle">One place to test Found without touching real client signals.</p>
        </div>
      </header>

      <section className="hq-command-status">
        <div>
          <span>Readiness</span>
          <strong>{testIdentities.length > 0 ? "Ready to test" : "Needs test account"}</strong>
          <p>{activeRealClients} real operating accounts. {testIdentities.length} safe test identit{testIdentities.length === 1 ? "y" : "ies"}. {customerActivityCount.count ?? 0} customer events and {foundEmailCount.count ?? 0} Found emails in the last 30 days.</p>
        </div>
        <Link href="/admin/growth">Open sandbox<span className="hq-chevron" /></Link>
      </section>

      <TestCenterWorkspace checks={QA_CHECKS} testIdentities={testIdentities} />
    </div>
  )
}
