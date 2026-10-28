"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminClient, requireAdmin } from "../../lib"
import { saveManualComposeDraft, saveManualReplyDraft, sendSavedCompose, sendSavedReply } from "@/lib/admin/mailReplies"
import { createReceivingAdapter, processIncomingMail } from "@/lib/admin/mailStore"

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? form.get(key) as string : ""
const enabled = () => process.env.FOUND_INBOUND_ENABLED === "true"
const disabled = { success: false, error: "Found mail changes are not enabled yet." }
function refresh(id: string) {
  try {
    revalidatePath("/admin/emails/received")
    revalidatePath(`/admin/emails/received/${id}`)
  } catch { /* A committed change must not appear failed because cache refresh failed. */ }
}

export async function saveReplyDraft(form: FormData) {
  await requireAdmin()
  if (!enabled()) return disabled
  try {
    const messageId = text(form, "messageId")
    if (!uuid.test(messageId)) return { success: false, error: "Message is unavailable." }
    const result = await saveManualReplyDraft(getAdminClient(), { messageId, replyId: text(form, "replyId"), body: text(form, "body"), from: text(form, "from") || undefined })
    if (result.success) refresh(messageId)
    return result
  } catch { return { success: false, error: "Draft save could not be confirmed. Keep your text and refresh." } }
}

export async function sendManualReply(form: FormData) {
  await requireAdmin()
  if (!enabled() || process.env.FOUND_MAIL_SEND_ENABLED !== "true" || !process.env.RESEND_API_KEY) {
    return { success: false, error: "Reply sending is not enabled yet." }
  }
  try {
    const messageId = text(form, "messageId")
    if (!uuid.test(messageId)) return { success: false, error: "Message is unavailable." }
    const result = await sendSavedReply(getAdminClient(), { messageId, replyId: text(form, "replyId"),
      expectedTo: text(form, "expectedTo"), expectedVersion: text(form, "expectedVersion"),
      expectedFrom: text(form, "expectedFrom") || undefined,
      confirmDifferentRecipient: text(form, "confirmDifferentRecipient") === "1" })
    refresh(messageId)
    return result
  } catch { return { success: false, error: "Send status could not be confirmed. Refresh before taking another action." } }
}

async function change(form: FormData, action: "read" | "move" | "rule" | "retry", value: string) {
  if (!enabled()) return disabled
  const messageId = text(form, "messageId")
  if (!uuid.test(messageId)) return { success: false, error: "Message is unavailable." }
  if ((action === "read" && !["1", "0"].includes(value)) ||
    (action === "move" && !["inbox", "spam"].includes(value)) ||
    (action === "rule" && !["allow", "block", "clear"].includes(value))) {
    return { success: false, error: "Choose a valid mail change." }
  }
  try {
    const admin = getAdminClient()
    const result = await admin.rpc("found_mail_change", { p_id: messageId, p_action: action, p_value: value })
    if (result.error || result.data !== true) return { success: false, error: "Change could not be saved. Retrieval or sending may be in progress; refresh and review." }
    refresh(messageId)
    if (action === "retry") {
      // Incoming retrieval only: this never calls the reply transport.
      try { after(async () => { await processIncomingMail(admin, createReceivingAdapter(), 1) }) }
      catch { /* The durable pending row remains for the separately enabled retry trigger. */ }
    }
    return { success: true, message: action === "retry" ? "Message retrieval queued. No reply was sent." : "Saved." }
  } catch { return { success: false, error: "Change could not be confirmed. Refresh to check." } }
}

export async function markMailRead(form: FormData) {
  await requireAdmin()
  return change(form, "read", text(form, "read"))
}

function unsupportedComposeFields(form: FormData) {
  return ["cc", "bcc", "attachments", "attachment", "recipients", "bulk", "html", "ai"].some(key => form.has(key)) ||
    ["to", "from", "subject", "body", "draftId", "replyId"].some(key => form.getAll(key).length > 1)
}

export async function saveComposeDraft(form: FormData) {
  await requireAdmin()
  if (!enabled()) return disabled
  if (unsupportedComposeFields(form)) return { success: false, error: "Compose supports one recipient and plain text only." }
  try {
    const result = await saveManualComposeDraft(getAdminClient(), { replyId: text(form, "draftId") || text(form, "replyId"),
      to: text(form, "to"), from: text(form, "from"), subject: text(form, "subject"), body: text(form, "body") })
    if (result.success) { try { revalidatePath("/admin/emails/compose") } catch { /* Draft already saved. */ } }
    return { ...result, draftId: result.replyId }
  } catch { return { success: false, error: "Draft save could not be confirmed. Keep your text and refresh." } }
}

export async function sendComposeDraft(form: FormData) {
  await requireAdmin()
  if (!enabled() || process.env.FOUND_MAIL_SEND_ENABLED !== "true" || !process.env.RESEND_API_KEY) {
    return { success: false, error: "Sending is not enabled yet." }
  }
  if (unsupportedComposeFields(form) || ["expectedTo", "expectedFrom", "expectedSubject", "expectedVersion"].some(key => form.getAll(key).length !== 1)) {
    return { success: false, error: "Refresh and review one saved Compose draft before sending." }
  }
  try {
    const result = await sendSavedCompose(getAdminClient(), { replyId: text(form, "draftId") || text(form, "replyId"),
      expectedTo: text(form, "expectedTo"), expectedFrom: text(form, "expectedFrom"),
      expectedSubject: text(form, "expectedSubject"), expectedVersion: text(form, "expectedVersion") })
    try { revalidatePath("/admin/emails/compose"); revalidatePath("/admin/emails") } catch { /* Send state is durable. */ }
    return result
  } catch { return { success: false, error: "Send status is uncertain. Refresh and reconcile; do not resend blindly." } }
}
export async function moveMail(form: FormData) {
  await requireAdmin()
  return change(form, "move", text(form, "folder"))
}
export async function setSenderRule(form: FormData) {
  await requireAdmin()
  return change(form, "rule", text(form, "rule"))
}
export async function retryMailRetrieval(form: FormData) {
  await requireAdmin()
  return change(form, "retry", "")
}
