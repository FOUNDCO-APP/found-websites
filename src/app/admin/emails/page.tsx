import { getAdminClient, requireAdmin } from "../lib"
import { getAdminEmailHistory } from "@/lib/admin/emailHistory"
import EmailsWorkspace from "./EmailsWorkspace"
import Link from "next/link"
import MailNavigation from "./MailNavigation"

export const metadata = { title: "Emails - Found HQ" }

export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const params = await searchParams
  const text = (key: string) => typeof params[key] === "string" ? params[key].trim() : ""
  const categoryValue = text("category")
  const category = categoryValue === "business" || categoryValue === "admin_alerts" || categoryValue === "unclassified" || categoryValue === "all" ? categoryValue : "found_clients"
  const statusValue = text("status")
  const status = statusValue === "issues" || statusValue === "handled" || statusValue === "flagged" ? statusValue : "all"
  const pageValue = Number(text("page"))
  const filters = { category, clientId: text("client"), q: text("q"), status, page: Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1 } as const
  const data = await getAdminEmailHistory(getAdminClient(), filters)
  return <div className="hq-page">
    <header className="hq-header"><div>
      <p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Emails</h1>
      <p className="hq-subtitle">Found correspondence with our clients.</p>
    </div><Link href="/admin/emails/templates" className="hq-button hq-button-quiet">Templates</Link></header>
    <MailNavigation active="sent" />
    <EmailsWorkspace data={data} filters={data.filters} />
  </div>
}
