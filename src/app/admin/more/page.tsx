import Link from "next/link"
import { adminLogout } from "../adminAuth"

export const metadata = { title: "More - Found HQ" }
export default function AdminMorePage() {
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">More</h1><p className="hq-subtitle">Secondary destinations and account controls.</p></div></header>
      <section>
        <div className="hq-section-head"><h2 className="hq-section-title">Destinations</h2></div>
        <div className="hq-panel">
          <a href="https://my.foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Customer dashboard</p><p className="hq-row-meta">Open the business-owner product</p></div><span className="hq-chevron">?</span></a>
          <a href="https://foundco.app" target="_blank" rel="noreferrer" className="hq-row hq-link-row"><div><p className="hq-row-title">Found website</p><p className="hq-row-meta">Open the public marketing site</p></div><span className="hq-chevron">?</span></a>
          <Link href="/admin/emails" className="hq-row hq-link-row"><div><p className="hq-row-title">Email previews</p><p className="hq-row-meta">Secondary transactional template review</p></div><span className="hq-chevron">?</span></Link>
        </div>
      </section>
      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Account</h2></div>
        <div className="hq-panel"><form action={adminLogout} className="hq-row"><div><p className="hq-row-title">Sign out</p><p className="hq-row-meta">End this Found HQ session</p></div><button type="submit" className="hq-button hq-button-secondary">Sign out</button></form></div>
      </section>
    </div>
  )
}
