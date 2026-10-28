import "server-only"
import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getReceivedMessage, type ReceivedReply } from "@/lib/admin/mailStore"
import { getManualReplyTarget, safeMessageId } from "@/lib/mailSafety"

type Admin = Pick<SupabaseClient, "from" | "rpc">
type Result = { success: boolean; error?: string; message?: string; state?: string; replyId?: string }
export type ReplyTransport = { send(input: { from: string; to: string; subject: string; text: string; headers: Record<string, string>; idempotencyKey: string }): Promise<{ kind: "accepted"; id: string } | { kind: "rejected" | "unconfirmed" }> }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export function replySendingEnabled() { return process.env.FOUND_INBOUND_ENABLED === "true" && process.env.FOUND_MAIL_SEND_ENABLED === "true" }

/** Fixed HTTPS provider endpoint. No recipient body or provider error is logged. */
export function createReplyTransport(): ReplyTransport {
  return { async send(input) {
    if (!process.env.RESEND_API_KEY) return { kind: "rejected" }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(20000),
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
        body: JSON.stringify({ from: `Found <${input.from}>`, to: [input.to], subject: input.subject, text: input.text, headers: input.headers }),
      })
      if ([400, 401, 403, 404, 422, 429].includes(response.status)) return { kind: "rejected" }
      if (!response.ok) return { kind: "unconfirmed" }
      if (!response.body) return { kind: "unconfirmed" }
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      for (;;) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 65536) { await reader.cancel(); return { kind: "unconfirmed" } }
        chunks.push(chunk.value)
      }
      const result = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { id?: unknown }
      return typeof result.id === "string" && uuid.test(result.id) ? { kind: "accepted", id: result.id } : { kind: "unconfirmed" }
    } catch { return { kind: "unconfirmed" } }
  } }
}

/** Caller must requireAdmin first. Saving is never sending. */
export async function saveManualReplyDraft(admin: Admin, input: { messageId: string; replyId: string; body: string }): Promise<Result> {
  if (!uuid.test(input.messageId) || !uuid.test(input.replyId) || !input.body.trim() || input.body.length > 20000 || input.body.includes("\0")) return { success: false, error: "Enter a reply of up to 20,000 characters." }
  const thread = await getReceivedMessage(admin, input.messageId)
  if (thread.error || !thread.message) return { success: false, error: "Message could not be loaded." }
  const target = getManualReplyTarget(thread.message)
  if (!target.to || !target.from || thread.message.folder !== "inbox" || thread.message.processing_state !== "ready") return { success: false, error: "Review this message before replying." }
  const subject = /^re:/i.test(thread.message.subject ?? "") ? thread.message.subject! : `Re: ${thread.message.subject || "No subject"}`
  const result = await admin.rpc("found_mail_save_reply", { p_parent_id: input.messageId, p_reply_id: input.replyId, p_body: input.body, p_to: target.to, p_from: target.from, p_subject: subject })
  if (result.error || !result.data?.id) return { success: false, error: "Draft could not be saved. Keep your text and refresh to check." }
  return { success: true, replyId: result.data.id, state: "draft", message: "Draft saved. Review it before sending." }
}

/** Every send claims a persisted immutable draft once. Ambiguity never retries. */
export async function sendSavedReply(admin: Admin, input: { messageId: string; replyId: string; expectedTo: string; expectedVersion: string; confirmDifferentRecipient: boolean }, transport: ReplyTransport = createReplyTransport()): Promise<Result> {
  if (!replySendingEnabled()) return { success: false, error: "Reply sending is not enabled yet." }
  if (!uuid.test(input.messageId) || !uuid.test(input.replyId) || !Number.isFinite(Date.parse(input.expectedVersion))) return { success: false, error: "Refresh and review the saved draft before sending." }
  const thread = await getReceivedMessage(admin, input.messageId)
  if (thread.error || !thread.message) return { success: false, error: "Message could not be loaded. Nothing was sent." }
  const target = getManualReplyTarget(thread.message)
  if (!target.to || !target.from || target.to !== input.expectedTo || thread.message.folder !== "inbox" || thread.message.processing_state !== "ready") return { success: false, error: "Recipient or message state changed. Review before sending." }
  if (target.warnings.length && !input.confirmDifferentRecipient) return { success: false, error: "Confirm the different Reply-To recipient before sending." }
  const token = randomUUID()
  const claim = await admin.rpc("found_mail_claim_reply", { p_id: input.replyId, p_parent_id: input.messageId, p_to: input.expectedTo, p_token: token, p_expected_updated_at: input.expectedVersion })
  if (claim.error || !claim.data) return { success: false, error: "Draft changed or a send is already recorded. Refresh; do not resend blindly." }
  const draft = claim.data as ReceivedReply
  // SQL claim is authoritative; distrust malformed adapter responses too.
  if (draft.to_address !== target.to || draft.from_address !== target.from || draft.id !== input.replyId) return { success: false, error: "Send state could not be confirmed. Review required." }
  const headers: Record<string, string> = {}
  const messageId = safeMessageId(thread.message.message_id)
  if (messageId) {
    headers["In-Reply-To"] = messageId
    headers.References = [...new Set([...thread.message.reference_ids.map(safeMessageId).filter((id): id is string => !!id), messageId])].slice(-20).join(" ")
  }
  let outcome: Awaited<ReturnType<ReplyTransport["send"]>>
  try { outcome = await transport.send({ from: draft.from_address, to: draft.to_address, subject: draft.subject, text: draft.body_text, headers, idempotencyKey: draft.idempotency_key }) }
  catch { outcome = { kind: "unconfirmed" } }
  const status = outcome.kind === "accepted" ? "accepted" : outcome.kind === "rejected" ? "failed" : "unconfirmed"
  const providerId = outcome.kind === "accepted" ? outcome.id : null
  const error = status === "failed" ? "Provider rejected this send. Nothing is confirmed delivered." : status === "unconfirmed" ? "Provider acceptance is unconfirmed. Reconcile before sending again." : null
  let confirmed = false
  try {
    const finish = await admin.rpc("found_mail_finish_reply", { p_id: draft.id, p_token: token, p_status: status, p_provider_id: providerId, p_error: error })
    confirmed = !finish.error && finish.data === true
  } catch { /* The provider may already have accepted it. Never retry the send. */ }
  if (!confirmed) {
    // Preserve the known provider ID even if atomic Sent logging failed.
    try {
      await admin.rpc("found_mail_finish_reply", { p_id: draft.id, p_token: token, p_status: "unconfirmed", p_provider_id: providerId, p_error: "Send confirmation could not be stored. Reconcile before sending again." })
    } catch { /* A durable sending claim still blocks another transport attempt. */ }
    return { success: false, state: "unconfirmed", error: "Send status could not be confirmed. Refresh; do not resend." }
  }
  return status === "accepted" ? { success: true, state: "accepted", message: "Provider accepted the reply. Delivery is not yet confirmed." } : { success: false, state: status, error: error! }
}

/** Called only after the existing Svix signature validation. */
export async function recordReplyDelivery(admin: Admin, providerId: string, status: string, eventCreatedAt?: string) {
  if (!uuid.test(providerId) || !["sent", "delivered", "delayed", "bounced", "complained"].includes(status)) return { success: false, error: "Invalid delivery identity." }
  const timestamp = eventCreatedAt && Number.isFinite(Date.parse(eventCreatedAt)) ? new Date(eventCreatedAt).toISOString() : new Date().toISOString()
  const result = await admin.rpc("found_mail_record_reply_delivery", { p_provider_id: providerId, p_status: status, p_event_at: timestamp })
  return { success: !result.error && result.data === true, error: result.error || result.data !== true ? "Delivery receipt could not be stored." : null }
}
