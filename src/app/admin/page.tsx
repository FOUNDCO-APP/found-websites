import Link from "next/link"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export const metadata = { title: "Overview - Found HQ" }

function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business"
  if (plan === "found_pro") return "Pro"
  if (plan === "found") return "Starter"
  return "No plan"
}

function ageLabel(date: string | null) {
  if (!date) return ""
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default async function AdminOverviewPage() {
  const admin = getAdminClient()
  const [{ data: companies }, { data: configs }] = await Promise.all([
    admin.from("companies")
      .select("id, name, slug, plan, subscription_status, is_comp, created_at, logo_url, logo_white_url, primary_intent, stripe_connect_account_id")
      .order("created_at", { ascending: false }),
    admin.from("website_config").select("company_id, copy_generated"),
  ])

  const rows = companies ?? []
  const copyByCompany = new Map((configs ?? []).map((row) => [row.company_id, row.copy_generated]))
  const active = rows.filter((row) => row.subscription_status === "active" || row.subscription_status === "trialing").length
  const weekAgo = Date.now() - 7 * 86400000
  const newThisWeek = rows.filter((row) => row.created_at && new Date(row.created_at).getTime() >= weekAgo).length
  const inactive = rows.filter((row) => row.subscription_status !== "active" && row.subscription_status !== "trialing").length
  const fallback = rows.filter((row) => copyByCompany.get(row.id) !== true).length
  const missingLogo = rows.filter((row) => !row.logo_url && !row.logo_white_url).length
  const paymentIntents = new Set(["estimates", "bookings", "appointments", "reservations", "orders"])
  const missingPayments = rows.filter((row) => paymentIntents.has(row.primary_intent ?? "") && !row.stripe_connect_account_id).length

  const attention = [
    { label: "Inactive businesses", detail: "Onboarding or activation is not complete", count: inactive, href: "/admin/businesses?filter=inactive", tone: "warning" },
    { label: "Fallback website copy", detail: "Review before publishing generated copy", count: fallback, href: "/admin/copy", tone: "warning" },
    { label: "Missing logos", detail: "Brand presentation is incomplete", count: missingLogo, href: "/admin/businesses?filter=logo", tone: "info" },
    { label: "Payment setup needed", detail: "Payment-relevant businesses without Stripe", count: missingPayments, href: "/admin/businesses?filter=payments", tone: "info" },
  ].filter((item) => item.count > 0)

  return (
    <div className="hq-page">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Overview</h1>
          <p className="hq-subtitle">What needs attention across Found right now.</p>
        </div>
      </header>

      <form action="/admin/businesses" style={{ marginBottom: 18 }}>
        <input className="hq-input" name="q" aria-label="Search businesses" placeholder="Search every business" />
      </form>

      <div className="hq-stat-strip">
        <div className="hq-stat"><div className="hq-stat-value">{rows.length}</div><div className="hq-stat-label">Businesses</div></div>
        <div className="hq-stat"><div className="hq-stat-value">{active}</div><div className="hq-stat-label">Active</div></div>
        <div className="hq-stat"><div className="hq-stat-value">{newThisWeek}</div><div className="hq-stat-label">New this week</div></div>
        <div className="hq-stat"><div className="hq-stat-value">{attention.reduce((sum, item) => sum + item.count, 0)}</div><div className="hq-stat-label">Checks flagged</div></div>
      </div>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Needs attention</h2>
          <span className="hq-section-meta">Actionable setup and quality issues</span>
        </div>
        <div className="hq-panel">
          {attention.length === 0 ? (
            <div className="hq-row"><div><p className="hq-row-title">Nothing needs attention</p><p className="hq-row-meta">All current setup checks are clear.</p></div><span className="hq-badge hq-badge-success">Clear</span></div>
          ) : attention.map((item) => (
            <Link key={item.label} href={item.href} className="hq-row hq-link-row">
              <div><p className="hq-row-title">{item.label}</p><p className="hq-row-meta">{item.detail}</p></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className={`hq-badge ${item.tone === "warning" ? "hq-badge-warning" : "hq-badge-info"}`}>{item.count}</span>
                <span className="hq-chevron" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">New businesses</h2>
          <Link href="/admin/businesses" className="hq-section-meta" style={{ textDecoration: "none" }}>View all</Link>
        </div>
        <div className="hq-panel">
          {rows.slice(0, 7).map((row) => {
            const isActive = row.subscription_status === "active" || row.subscription_status === "trialing"
            return (
              <Link key={row.id} href={`/admin/businesses?q=${encodeURIComponent(row.name)}`} className="hq-row hq-link-row">
                <div style={{ minWidth: 0 }}>
                  <p className="hq-row-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</p>
                  <p className="hq-row-meta">{row.slug}.foundco.app / {planLabel(row.plan)} / {ageLabel(row.created_at)}</p>
                </div>
                <span className={`hq-badge ${isActive ? "hq-badge-success" : "hq-badge-warning"}`}>{isActive ? "Active" : "Setup"}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
