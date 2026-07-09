import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSitesNeedingCopy } from "./actions"
import CopyRegenPanel from "./CopyRegenPanel"

export const metadata = { title: "Website copy - Found HQ" }

export default async function AdminCopyPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  const isAuthed = !!adminKey && adminKey === process.env.ADMIN_KEY

  if (!isAuthed) redirect("/admin")

  const sites = await getSitesNeedingCopy()

  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header">
        <div><p className="hq-eyebrow">Quality</p><h1 className="hq-title">Website copy</h1><p className="hq-subtitle">Review fallback content and safely regenerate one live site at a time.</p></div>
        <span className="hq-count">{sites.length}</span>
      </header>
      <CopyRegenPanel initialSites={sites} />
      <section className="hq-section">
        <div className="hq-panel"><div className="hq-row"><div><p className="hq-row-title">Protected workflow</p><p className="hq-row-meta">Found saves the current version before publishing generated copy. Every change can be undone.</p></div></div></div>
      </section>
    </div>
  )
}
