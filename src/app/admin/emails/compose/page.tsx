import { randomUUID } from "node:crypto"
import { getAdminClient, requireAdmin } from "../../lib"
import { getComposeDraft } from "@/lib/admin/mailStore"
import { FOUND_MAIL_ADDRESSES } from "@/lib/mailSafety"
import MailNavigation from "../MailNavigation"
import ComposeWorkspace from "./ComposeWorkspace"

export const metadata = { title: "New email - Found HQ" }
export default async function ComposePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin()
  const params = await searchParams
  const requestedId = typeof params.draft === "string" ? params.draft : ""
  const valid = !requestedId || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedId)
  const enabled = process.env.FOUND_INBOUND_ENABLED === "true"
  const result = enabled && valid && requestedId ? await getComposeDraft(getAdminClient(), requestedId) : { draft: null, error: valid ? null : "Invalid draft address." }
  const draftError = result.error || (enabled && requestedId && !result.draft ? "Saved draft not found." : null)
  return <div className="hq-page"><header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">New email</h1></div></header><MailNavigation active="compose" /><ComposeWorkspace key={requestedId || "new"} draftId={requestedId || randomUUID()} draft={result.draft} error={draftError} approvedFromAddresses={FOUND_MAIL_ADDRESSES} enabled={enabled} sendEnabled={enabled && process.env.FOUND_MAIL_SEND_ENABLED === "true"} /></div>
}
