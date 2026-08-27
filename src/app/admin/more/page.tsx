import Link from "next/link"
import { adminLogout } from "../adminAuth"
import { getAdminClient } from "../lib"

export const metadata = { title: "More - Found HQ" }

type MoreLink = {
  href: string
  title: string
  meta: string
  badge?: {
    label: string
    tone: "success" | "warning" | "info" | "quiet"
  }
}

function MoreSection({ title, meta, links }: { title: string; meta: string; links: MoreLink[] }) {
  return (
    <section className="hq-section">
      <div className="hq-section-head">
        <h2 className="hq-section-title">{title}</h2>
        <span className="hq-section-meta">{meta}</span>
      </div>
      <div className="hq-panel">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hq-row hq-link-row">
            <div>
              <p className="hq-row-title">{link.title}</p>
              <p className="hq-row-meta">{link.meta}</p>
            </div>
            <div className="hq-action-end">
              {link.badge && <span className={`hq-badge hq-badge-${link.badge.tone}`}>{link.badge.label}</span>}
              <span className="hq-chevron" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default async function AdminMorePage() {
  const admin = getAdminClient()
  const { data: configs } = await admin.from("website_config").select("copy_generated")
  const fallbackCount = (configs ?? []).filter((row) => row.copy_generated !== true).length
  const copyBadge = fallbackCount
    ? { label: `${fallbackCount} review`, tone: "warning" as const }
    : { label: "Clear", tone: "success" as const }

  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Found HQ</p>
          <h1 className="hq-title">Manage</h1>
          <p className="hq-subtitle">The quieter tools for setup, quality control, testing, and system checks.</p>
        </div>
      </header>

      <section className="hq-command-status">
        <div>
          <span>Next admin move</span>
          <strong>{fallbackCount ? "Review copy" : "Run QA"}</strong>
          <p>{fallbackCount ? `${fallbackCount} site${fallbackCount === 1 ? "" : "s"} still use fallback copy. Check those before ads or demos.` : "Website copy is clear. Use the test center before pushing traffic harder."}</p>
        </div>
        <Link href={fallbackCount ? "/admin/copy" : "/admin/test-center"}>{fallbackCount ? "Open copy" : "Open tests"}<span className="hq-chevron" /></Link>
      </section>

      <MoreSection
        title="Start & onboard"
        meta="Create accounts"
        links={[
          { href: "/admin/new-client", title: "New client", meta: "Build a client site manually when you are setting someone up directly." },
        ]}
      />

      <MoreSection
        title="Growth"
        meta="Where traffic comes from"
        links={[
          { href: "/admin/traffic", title: "Traffic Report", meta: "Visitors and paid signups by channel — ranked by what converts. Includes tagged-link builder for your social and ads." },
        ]}
      />

      <MoreSection
        title="Client health"
        meta="Keep relationships warm"
        links={[
          { href: "/admin/activity", title: "Usage and outreach", meta: "See who is using Found, who went quiet, and who needs a follow-up." },
          { href: "/admin/test-center", title: "Test center", meta: "Check safe test accounts and QA flows before real traffic goes live.", badge: { label: "Sandbox", tone: "info" } },
        ]}
      />

      <MoreSection
        title="Website quality"
        meta="Content and proof"
        links={[
          { href: "/admin/copy", title: "Website copy", meta: "Review generated content and replace fallback copy before a site gets promoted.", badge: copyBadge },
          { href: "/admin/photos", title: "Photo library", meta: "Curate shared industry photos so new sites do not look generic." },
        ]}
      />

      <MoreSection
        title="System"
        meta="Trust checks"
        links={[
          { href: "/admin/health", title: "System health", meta: "Check uptime, error tracking, lead flow, and marketing funnel signals." },
          { href: "/admin/billing", title: "Test billing", meta: "Cancel Stripe subscriptions on your own test accounts.", badge: { label: "Test only", tone: "info" } },
        ]}
      />

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Account</h2>
          <span className="hq-section-meta">External links</span>
        </div>
        <div className="hq-panel">
          <a href="https://my.foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Customer dashboard</p><p className="hq-row-meta">Open the business-owner product.</p></div><span className="hq-chevron" /></a>
          <a href="https://foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Found website</p><p className="hq-row-meta">Open the public marketing site.</p></div><span className="hq-chevron" /></a>
          <form action={adminLogout} className="hq-row"><div><p className="hq-row-title">Sign out</p><p className="hq-row-meta">End this Found HQ session.</p></div><button type="submit" className="hq-button hq-button-secondary">Sign out</button></form>
        </div>
      </section>
    </div>
  )
}
