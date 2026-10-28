import Link from "next/link"
import { requireAdmin, getAdminClient } from "../../../lib"
import { getReceivedMessage } from "@/lib/admin/mailStore"
import MailNavigation from "../../MailNavigation"
import Conversation from "../Conversation"
import { getManualReplyTarget } from "@/lib/mailSafety"
import { randomUUID } from "node:crypto"

export const metadata = { title: "Received message - Found HQ" }
export default async function ReceivedMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  if (process.env.FOUND_INBOUND_ENABLED !== "true") return <div className="hq-page"><p className="hq-eyebrow">Found HQ</p><MailNavigation active="received" /><h1 className="hq-title">Receiving is not enabled yet.</h1><p className="hq-subtitle">Message access and reply actions are unavailable until Found receiving is enabled.</p><Link href="/admin/emails/received">Back to Received</Link></div>
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return <div className="hq-page"><p role="alert">Invalid message address.</p><Link href="/admin/emails/received">Back to Received</Link></div>
  const data = await getReceivedMessage(getAdminClient(), id)
  const replyTarget = data.message ? getManualReplyTarget(data.message) : { to: null, from: "Not configured", warnings: [] }
  return <div className="hq-page"><p className="hq-eyebrow">Found HQ</p><MailNavigation active="received" /><Link href="/admin/emails/received">Back to Received</Link><Conversation data={data} replyTarget={replyTarget} draftId={randomUUID()} receivingEnabled sendEnabled={process.env.FOUND_INBOUND_ENABLED === "true" && process.env.FOUND_MAIL_SEND_ENABLED === "true"} /></div>
}
