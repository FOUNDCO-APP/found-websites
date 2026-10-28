import { getAdminClient, requireAdmin } from "../../lib"
import { getReceivedMail } from "@/lib/admin/mailStore"
import MailNavigation from "../MailNavigation"
import InboxWorkspace from "./InboxWorkspace"

export const metadata = { title: "Received - Found HQ" }
export default async function ReceivedMailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  if (process.env.FOUND_INBOUND_ENABLED !== "true") return <div className="hq-page"><header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Emails</h1></div></header><MailNavigation active="received" /><section aria-label="Receiving disabled"><h2 className="hq-section-title">Receiving is not enabled yet.</h2><p className="hq-subtitle">Found is not receiving messages in this inbox yet. Setup must be completed and verified before it is enabled.</p></section></div>
  const params = await searchParams
  const folder = params.folder === "spam" ? "spam" : "inbox"
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const data = await getReceivedMail(getAdminClient(), { folder, page })
  return <div className="hq-page"><header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Emails</h1><p className="hq-subtitle">Messages received by Found.</p></div></header><MailNavigation active="received" /><InboxWorkspace data={data} folder={folder} page={page} /></div>
}
