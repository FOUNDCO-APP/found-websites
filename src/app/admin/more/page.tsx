import Link from "next/link"
import { adminLogout } from "../adminAuth"
import { getAdminClient } from "../lib"

export const metadata = { title: "More - Found HQ" }

export default async function AdminMorePage() {
  const admin = getAdminClient()
  const { data: configs } = await admin.from("website_config").select("copy_generated")
  const fallbackCount = (configs ?? []).filter((row) => row.copy_generated !== true).length
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">More</h1><p className="hq-subtitle">Secondary tools.</p></div></header>
      <section>
        <div className="hq-section-head"><h2 className="hq-section-title">Create</h2></div>
        <div className="hq-panel">
          <Link href="/admin/new-client" className="hq-row hq-link-row"><div><p className="hq-row-title">New client</p><p className="hq-row-meta">Build a site for a client you are onboarding manually.</p></div><span className="hq-chevron" /></Link>
        </div>
      </section>
      <section>
        <div className="hq-section-head"><h2 className="hq-section-title">Quality</h2></div>
        <div className="hq-panel">
          <Link href="/admin/test-center" className="hq-row hq-link-row"><div><p className="hq-row-title">Test Center</p><p className="hq-row-meta">Run QA checks and see safe test accounts before ads go live</p></div><span className="hq-chevron" /></Link>
          <Link href="/admin/activity" className="hq-row hq-link-row"><div><p className="hq-row-title">Client health</p><p className="hq-row-meta">See real customer-side activity and outreach risk</p></div><span className="hq-chevron" /></Link>
          <Link href="/admin/copy" className="hq-row hq-link-row"><div><p className="hq-row-title">Website copy</p><p className="hq-row-meta">Review and safely regenerate live content</p></div><div className="hq-action-end"><span className={`hq-badge ${fallbackCount ? "hq-badge-warning" : "hq-badge-success"}`}>{fallbackCount ? `${fallbackCount} review` : "Clear"}</span><span className="hq-chevron" /></div></Link>
          <Link href="/admin/photos" className="hq-row hq-link-row"><div><p className="hq-row-title">Photo library</p><p className="hq-row-meta">Curate shared industry photo pools</p></div><span className="hq-chevron" /></Link>
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">System</h2></div>
        <div className="hq-panel">
          <Link href="/admin/health" className="hq-row hq-link-row"><div><p className="hq-row-title">Health</p><p className="hq-row-meta">Uptime status and error tracking</p></div><span className="hq-chevron" /></Link>
          <Link href="/admin/billing" className="hq-row hq-link-row"><div><p className="hq-row-title">Test billing</p><p className="hq-row-meta">Cancel Stripe subscriptions on your own test accounts</p></div><span className="hq-chevron" /></Link>
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Account</h2></div>
        <div className="hq-panel">
          <a href="https://my.foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Customer dashboard</p><p className="hq-row-meta">Open the business-owner product.</p></div><span className="hq-chevron" /></a>
          <a href="https://foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Found website</p><p className="hq-row-meta">Open the public marketing site.</p></div><span className="hq-chevron" /></a>
          <form action={adminLogout} className="hq-row"><div><p className="hq-row-title">Sign out</p><p className="hq-row-meta">End this Found HQ session.</p></div><button type="submit" className="hq-button hq-button-secondary">Sign out</button></form>
        </div>
      </section>
    </div>
  )
}
