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
  { id: "growth-sandbox-send-email", area: "Growth sandbox", title: "Send a Resend test email", detail: "Use Test send sandbox to send one email to a test identity and confirm it lands.", href: "/admin/growth" },
  { id: "growth-sandbox-open-text", area: "Growth sandbox", title: "Open a prefilled text", detail: "Use Open text on a test identity and confirm the message sounds personal from Super Shawn.", href: "/admin/growth" },
  { id: "growth-sandbox-exclusion", area: "Growth sandbox", title: "Confirm test exclusion", detail: "Test identities should not change real Growth counts, real campaign lists, MRR, or signup goals.", href: "/admin/growth" },
  { id: "client-activity-real", area: "Client activity", title: "Capture real customer activity", detail: "Log in as a true client and confirm customer-side activity appears in Client health.", href: "/admin/activity" },
  { id: "client-activity-admin-excluded", area: "Client activity", title: "Exclude admin and view-as usage", detail: "Admin HQ usage and admin view-as sessions must not count as client-side activity.", href: "/admin/activity" },
  { id: "client-outreach-followup", area: "Client activity", title: "Log outreach follow-up", detail: "Log call/text/email/review and confirm next follow-up timing moves the client to the right queue.", href: "/admin/activity" },
  { id: "client-rows-mobile", area: "Clients", title: "Scan client rows on mobile", detail: "Rows should be compact, readable, tappable, and should not show confusing stray lines.", href: "/admin/clients" },
  { id: "client-detail-hierarchy", area: "Clients", title: "Open client detail quickly", detail: "Tap a full row, verify the detail page hierarchy is clear, and confirm relationship/activity sections make sense.", href: "/admin/clients" },
  { id: "growth-periods", area: "Growth", title: "Test growth periods", detail: "Switch week, month, quarter, and year; graph, goals, MRR, and pace should stay readable.", href: "/admin/growth" },
  { id: "growth-campaign-lists", area: "Growth", title: "Review campaign lists", detail: "Open each list and confirm members match the stated reason, with no test identities in real lists.", href: "/admin/growth" },
  { id: "growth-lead-followup", area: "Growth", title: "Test lead follow-up filters", detail: "Check needs follow-up, due, later, recently contacted, stale, and all.", href: "/admin/growth" },
  { id: "email-log", area: "Emails", title: "Verify email log", detail: "After a test send, confirm Emails shows success/failure and delivery status when available.", href: "/admin/emails" },
  { id: "today-actions", area: "Today", title: "Verify Today priority", detail: "Today should show the work Sean needs first: payment, launch, follow-up, and client activity risks.", href: "/admin" },
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
