import Link from "next/link"
import { getAdminClient } from "../lib"
import { markClientOutreach } from "./actions"

export const metadata = { title: "Client Health - Found HQ" }

type CompanyRow = {
  id: string
  name: string
  slug: string
  email: string | null
  phone: string | null
  plan: string | null
  subscription_status: string | null
  client_state: string | null
  trial_ends_at: string | null
  created_at: string
}

type ActivityRow = {
  company_id: string
  event_type: string
  surface: string
  feature: string | null
  created_at: string
}

type OutreachRow = {
  company_id: string
  activity_type: string
  summary: string
  created_at: string
  metadata: Record<string, unknown> | null
}

type Bucket = "all" | "active_week" | "quiet" | "stagnant" | "no_activity" | "trialing_inactive"
type ActivityView = Bucket | "needs_follow_up" | "recently_contacted" | "follow_up_due" | "follow_up_later"

const FILTERS: { key: ActivityView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_follow_up", label: "Needs follow-up" },
  { key: "follow_up_due", label: "Follow-up due" },
  { key: "follow_up_later", label: "Follow-up later" },
  { key: "recently_contacted", label: "Recently contacted" },
  { key: "active_week", label: "Active this week" },
  { key: "quiet", label: "Quiet 8-14d" },
  { key: "stagnant", label: "Stagnant 15+d" },
  { key: "no_activity", label: "No activity" },
  { key: "trialing_inactive", label: "Trialing inactive" },
]

function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business / $69"
  if (plan === "found_pro") return "Pro / $39"
  if (plan === "found") return "Starter / $29"
  return "No plan"
}

function dayAge(value: string | null) {
  if (!value) return null
  return Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
}

function activityLabel(value: string | null) {
  if (!value) return "No activity yet"
  const days = dayAge(value)
  if (days === null) return "No activity yet"
  if (days <= 0) return "Used today"
  if (days === 1) return "Used yesterday"
  return `Used ${days}d ago`
}

function bucketFor(company: CompanyRow, lastActivityAt: string | null): Bucket {
  const days = dayAge(lastActivityAt)
  if (company.subscription_status === "trialing" && (days === null || days >= 7)) return "trialing_inactive"
  if (days === null) return "no_activity"
  if (days <= 7) return "active_week"
  if (days <= 14) return "quiet"
  return "stagnant"
}

function bucketLabel(bucket: ActivityView) {
  return FILTERS.find((filter) => filter.key === bucket)?.label ?? "All"
}

function surfaceLabel(value: string | null | undefined) {
  if (!value) return "No tracked area"
  return value.replace(/_/g, " ")
}

function outreachPriority(bucket: Bucket) {
  if (bucket === "trialing_inactive") return 1
  if (bucket === "no_activity") return 2
  if (bucket === "stagnant") return 3
  if (bucket === "quiet") return 4
  return 99
}

function outreachReason(bucket: Bucket, latestAt: string | null) {
  const days = dayAge(latestAt)
  if (bucket === "trialing_inactive") return days === null ? "Trialing and no customer activity" : `Trialing and quiet for ${days}d`
  if (bucket === "no_activity") return "No first customer action"
  if (bucket === "stagnant") return days === null ? "No recent use" : `No use in ${days}d`
  if (bucket === "quiet") return days === null ? "Activity slowing down" : `Activity slowing down: ${days}d`
  return "Healthy usage"
}

function outreachLabel(value: string | null) {
  if (!value) return "No outreach logged"
  const days = dayAge(value)
  if (days === null) return "No outreach logged"
  if (days <= 0) return "Contacted today"
  if (days === 1) return "Contacted yesterday"
  return `Contacted ${days}d ago`
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

function nextFollowUpAt(outreach: OutreachRow | undefined) {
  const value = outreach?.metadata?.next_follow_up_at
  return typeof value === "string" ? value : null
}

function isFollowUpDue(outreach: OutreachRow | undefined) {
  const value = nextFollowUpAt(outreach)
  if (value) return new Date(value).getTime() <= Date.now()
  const days = dayAge(outreach?.created_at ?? null)
  return days !== null && days >= 7
}

function isFollowUpLater(outreach: OutreachRow | undefined) {
  const value = nextFollowUpAt(outreach)
  if (value) return new Date(value).getTime() > Date.now()
  const days = dayAge(outreach?.created_at ?? null)
  return days !== null && days < 7
}

function outreachCopy(company: CompanyRow, bucket: Bucket, latestAt: string | null) {
  const reason = outreachReason(bucket, latestAt).toLowerCase()
  const dashboardUrl = `https://my.foundco.app`
  const intro = `Hey ${company.name}, this is Super Shawn with Found.`
  if (bucket === "trialing_inactive") {
    return `${intro} I noticed your dashboard has been quiet while your account is still in trial. Want me to help you take the next step so the site starts working harder for you? ${dashboardUrl}`
  }
  if (bucket === "no_activity") {
    return `${intro} I wanted to help you get your first useful action done. A good next step is adding a photo, checking leads, or updating one section of your site. ${dashboardUrl}`
  }
  if (bucket === "stagnant") {
    return `${intro} I noticed things have been quiet for a bit (${reason}). Want me to help you tighten anything up or find what would make it more useful day to day? ${dashboardUrl}`
  }
  return `${intro} Quick check-in. I noticed activity has slowed down. Anything feeling confusing, missing, or worth improving for your business? ${dashboardUrl}`
}

function mailtoHref(company: CompanyRow, bucket: Bucket, latestAt: string | null) {
  const subject = `Checking in on ${company.name}'s Found site`
  return `mailto:${company.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(outreachCopy(company, bucket, latestAt))}`
}

function smsHref(company: CompanyRow, bucket: Bucket, latestAt: string | null) {
  const phone = company.phone?.replace(/[^\d+]/g, "")
  return phone ? `sms:${phone}?&body=${encodeURIComponent(outreachCopy(company, bucket, latestAt))}` : null
}

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view
  const filter = FILTERS.some((item) => item.key === requestedView) ? requestedView as ActivityView : "all"
  const admin = getAdminClient()
  const activitySince = new Date(Date.now() - 90 * 86400000).toISOString()

  const outreachSince = new Date(Date.now() - 30 * 86400000).toISOString()

  const [{ data: companies }, activityResult, { data: outreachEvents }] = await Promise.all([
    admin
      .from("companies")
      .select("id, name, slug, email, phone, plan, subscription_status, client_state, trial_ends_at, created_at")
      .eq("account_kind", "client")
      .order("created_at", { ascending: false }),
    admin
      .from("customer_activity_events")
      .select("company_id, event_type, surface, feature, created_at")
      .eq("is_admin_view", false)
      .gte("created_at", activitySince)
      .order("created_at", { ascending: false })
      .limit(10000),
    admin
      .from("client_activities")
      .select("company_id, activity_type, summary, created_at, metadata")
      .in("activity_type", ["outreach_call", "outreach_text", "outreach_email", "outreach_skip", "outreach_reviewed"])
      .gte("created_at", outreachSince)
      .order("created_at", { ascending: false })
      .limit(1000),
  ])

  const activityReady = !activityResult.error
  const activityByCompany = new Map<string, ActivityRow[]>()
  if (activityReady) {
    for (const activity of (activityResult.data ?? []) as ActivityRow[]) {
      const list = activityByCompany.get(activity.company_id) ?? []
      list.push(activity)
      activityByCompany.set(activity.company_id, list)
    }
  }

  const rows = (companies ?? []).map((company: CompanyRow) => {
    const activities = activityByCompany.get(company.id) ?? []
    const latest = activities[0] ?? null
    const bucket = activityReady ? bucketFor(company, latest?.created_at ?? null) : "no_activity"
    return {
      company,
      activities,
      latest,
      bucket,
      action:
        bucket === "trialing_inactive" ? "Reach out before trial fades"
        : bucket === "no_activity" ? "Help them take first action"
        : bucket === "stagnant" ? "Re-engage"
        : bucket === "quiet" ? "Check in"
        : "Keep warm",
    }
  })

  const lastOutreachByCompany = new Map<string, OutreachRow>()
  for (const outreach of (outreachEvents ?? []) as OutreachRow[]) {
    if (!lastOutreachByCompany.has(outreach.company_id)) lastOutreachByCompany.set(outreach.company_id, outreach)
  }
  const riskRows = rows.filter((row) => outreachPriority(row.bucket) < 99)
  const needsFollowUpRows = riskRows
    .filter((row) => outreachPriority(row.bucket) < 99)
    .filter((row) => {
      const lastOutreach = lastOutreachByCompany.get(row.company.id)
      return !lastOutreach || isFollowUpDue(lastOutreach)
    })
  const recentlyContactedRows = riskRows
    .filter((row) => {
      const lastOutreach = lastOutreachByCompany.get(row.company.id)
      return Boolean(lastOutreach)
    })
  const followUpDueRows = riskRows.filter((row) => isFollowUpDue(lastOutreachByCompany.get(row.company.id)))
  const followUpLaterRows = riskRows.filter((row) => isFollowUpLater(lastOutreachByCompany.get(row.company.id)))
  const outreachRows = [...needsFollowUpRows]
    .sort((a, b) => outreachPriority(a.bucket) - outreachPriority(b.bucket) || (dayAge(b.latest?.created_at ?? null) ?? 999) - (dayAge(a.latest?.created_at ?? null) ?? 999))
  const counts = FILTERS.reduce<Record<ActivityView, number>>((acc, item) => {
    acc[item.key] =
      item.key === "all" ? rows.length
      : item.key === "needs_follow_up" ? needsFollowUpRows.length
      : item.key === "follow_up_due" ? followUpDueRows.length
      : item.key === "follow_up_later" ? followUpLaterRows.length
      : item.key === "recently_contacted" ? recentlyContactedRows.length
      : rows.filter((row) => row.bucket === item.key).length
    return acc
  }, {} as Record<ActivityView, number>)
  const visibleRows =
    filter === "all" ? rows
    : filter === "needs_follow_up" ? needsFollowUpRows
    : filter === "follow_up_due" ? followUpDueRows
    : filter === "follow_up_later" ? followUpLaterRows
    : filter === "recently_contacted" ? recentlyContactedRows
    : rows.filter((row) => row.bucket === filter)

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Client Health</h1>
          <p className="hq-subtitle">True customer-side usage. Admin and view-as sessions are excluded.</p>
        </div>
      </header>

      <div className="hq-detail-snapshot hq-health-snapshot">
        <Link href="/admin/activity?view=needs_follow_up"><span>Needs follow-up</span><strong>{activityReady ? counts.needs_follow_up : "-"}</strong></Link>
        <Link href="/admin/activity?view=follow_up_due"><span>Follow-up due</span><strong>{activityReady ? counts.follow_up_due : "-"}</strong></Link>
        <Link href="/admin/activity?view=follow_up_later"><span>Follow-up later</span><strong>{activityReady ? counts.follow_up_later : "-"}</strong></Link>
        <Link href="/admin/activity?view=recently_contacted"><span>Recently contacted</span><strong>{activityReady ? counts.recently_contacted : "-"}</strong></Link>
        <Link href="/admin/activity?view=active_week"><span>Active this week</span><strong>{activityReady ? counts.active_week : "-"}</strong></Link>
      </div>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Outreach queue</h2>
          <span className="hq-section-meta">{outreachRows.length} account{outreachRows.length === 1 ? "" : "s"} to review</span>
        </div>
        <div className="hq-business-list hq-outreach-list">
          {!activityReady && (
            <div className="hq-empty-state"><strong>Activity table is not ready.</strong><span>Apply the Supabase migration before outreach can use customer activity.</span></div>
          )}
          {activityReady && outreachRows.slice(0, 20).map(({ company, activities, latest, bucket }) => {
            const latestAt = latest?.created_at ?? null
            const textHref = smsHref(company, bucket, latestAt)
            const reason = outreachReason(bucket, latestAt)
            const lastOutreach = lastOutreachByCompany.get(company.id)
            return (
              <div key={company.id} className="hq-business-row">
                <div className="hq-business-main hq-health-row">
                  <div className="hq-business-copy">
                    <div className="hq-business-name-line">
                      <h2>{company.name}</h2>
                      <span className="hq-badge hq-badge-warning">{bucketLabel(bucket)}</span>
                    </div>
                    <p className="hq-client-summary">
                      <span>{reason}</span>
                      <span><i aria-hidden="true" />{planLabel(company.plan)}</span>
                      <span><i aria-hidden="true" />{activities.length} action{activities.length === 1 ? "" : "s"} in 90d</span>
                    </p>
                    <p className="hq-client-activity">
                      {surfaceLabel(latest?.surface)}{latest?.event_type ? ` - ${latest.event_type.replace(/_/g, " ")}` : ""} / {outreachLabel(lastOutreach?.created_at ?? null)}
                      {nextFollowUpAt(lastOutreach) ? ` / ${followUpLabel(nextFollowUpAt(lastOutreach))}` : ""}
                    </p>
                  </div>
                  <div className="hq-contact-actions hq-outreach-actions">
                    {company.phone && <a href={`tel:${company.phone}`}>Call</a>}
                    {textHref && <a href={textHref}>Text</a>}
                    {company.email && <a href={mailtoHref(company, bucket, latestAt)}>Email</a>}
                    <Link href={`/admin/clients/${company.id}`}>Open</Link>
                  </div>
                  <div className="hq-contact-actions hq-outreach-log-actions">
                    {["call", "text", "email", "skip"].map((method) => (
                      <form key={method} action={markClientOutreach}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="method" value={method} />
                        <input type="hidden" name="reason" value={reason} />
                        <button type="submit">{method === "skip" ? "Skip" : `Log ${method}`}</button>
                      </form>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          {activityReady && outreachRows.length === 0 && <div className="hq-empty-state"><strong>No outreach needed.</strong><span>Quiet and inactive clients will appear here automatically.</span></div>}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">{bucketLabel(filter)}</h2>
          <span className="hq-section-meta">{visibleRows.length} account{visibleRows.length === 1 ? "" : "s"}</span>
        </div>
        <div className="hq-filter-row hq-health-filters">
          {FILTERS.map((item) => (
            <Link key={item.key} href={`/admin/activity?view=${item.key}`} data-active={filter === item.key}>{item.label}</Link>
          ))}
        </div>
        <div className="hq-business-list hq-health-list">
          {!activityReady && (
            <div className="hq-empty-state"><strong>Activity table is not ready.</strong><span>Apply the Supabase migration before this page can read customer activity.</span></div>
          )}
          {activityReady && visibleRows.map(({ company, activities, latest, bucket, action }) => {
            const lastOutreach = lastOutreachByCompany.get(company.id)
            return (
              <Link key={company.id} href={`/admin/clients/${company.id}`} className="hq-business-row hq-business-row-link">
                <div className="hq-business-main hq-health-row">
                  <div className="hq-business-copy">
                    <div className="hq-business-name-line">
                      <h2>{company.name}</h2>
                      <span className={`hq-badge ${bucket === "active_week" ? "hq-badge-success" : bucket === "quiet" ? "hq-badge-info" : "hq-badge-warning"}`}>{bucketLabel(bucket)}</span>
                    </div>
                    <p className="hq-client-summary">
                      <span>{planLabel(company.plan)}</span>
                      <span><i aria-hidden="true" />{company.subscription_status ?? "not active"}</span>
                      <span><i aria-hidden="true" />{activityLabel(latest?.created_at ?? null)}</span>
                      <span><i aria-hidden="true" />{activities.length} action{activities.length === 1 ? "" : "s"} in 90d</span>
                    </p>
                    <p className="hq-client-activity">
                      {surfaceLabel(latest?.surface)}{latest?.event_type ? ` - ${latest.event_type.replace(/_/g, " ")}` : ""} / {action} / {outreachLabel(lastOutreach?.created_at ?? null)}
                      {nextFollowUpAt(lastOutreach) ? ` / ${followUpLabel(nextFollowUpAt(lastOutreach))}` : ""}
                    </p>
                  </div>
                  <span className="hq-chevron" />
                </div>
              </Link>
            )
          })}
          {activityReady && !visibleRows.length && <div className="hq-empty-state"><strong>No accounts in this view.</strong><span>When a client crosses this threshold, they will appear here.</span></div>}
        </div>
      </section>
    </div>
  )
}
