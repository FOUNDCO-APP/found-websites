import Link from "next/link"
import { adminLogout } from "../adminAuth"
import { getAdminClient } from "../lib"

export const metadata = { title: "More - Found HQ" }

export default async function AdminMorePage() {
  const admin = getAdminClient()
  const [{ data: configs }, { count: companyCount }] = await Promise.all([
    admin.from("website_config").select("copy_generated"),
    admin.from("companies").select("id", { count: "exact", head: true }),
  ])
  const fallbackCount = (configs ?? []).filter((row) => row.copy_generated !== true).length
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">More</h1><p className="hq-subtitle">Quality tools and secondary destinations.</p></div></header>
      <section>
        <div className="hq-section-head"><h2 className="hq-section-title">Quality</h2></div>
        <div className="hq-panel">
          <Link href="/admin/copy" className="hq-row hq-link-row"><div><p className="hq-row-title">Website copy</p><p className="hq-row-meta">Review and safely regenerate live content</p></div><div className="hq-action-end"><span className={`hq-badge ${fallbackCount ? "hq-badge-warning" : "hq-badge-success"}`}>{fallbackCount ? `${fallbackCount} review` : "Clear"}</span><span className="hq-chevron" /></div></Link>
          <Link href="/admin/photos" className="hq-row hq-link-row"><div><p className="hq-row-title">Photo library</p><p className="hq-row-meta">Curate shared industry photo pools</p></div><span className="hq-chevron" /></Link>
          <Link href="/admin/emails" className="hq-row hq-link-row"><div><p className="hq-row-title">Email previews</p><p className="hq-row-meta">Inspect owner and customer templates</p></div><div className="hq-action-end"><span className="hq-badge hq-badge-info">{companyCount ?? 0}</span><span className="hq-chevron" /></div></Link>
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Destinations</h2></div>
        <div className="hq-panel">
          <a href="https://my.foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Customer dashboard</p><p className="hq-row-meta">Open the business-owner product</p></div><span className="hq-chevron" /></a>
          <a href="https://foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Found website</p><p className="hq-row-meta">Open the public marketing site</p></div><span className="hq-chevron" /></a>
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Account</h2></div>
        <div className="hq-panel"><form action={adminLogout} className="hq-row"><div><p className="hq-row-title">Sign out</p><p className="hq-row-meta">End this Found HQ session</p></div><button type="submit" className="hq-button hq-button-secondary">Sign out</button></form></div>
      </section>
    </div>
  )
}
