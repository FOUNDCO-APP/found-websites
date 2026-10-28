import "server-only"
import { randomUUID } from "node:crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { parseInboundEmail, type ParsedInboundMail } from "@/lib/mailSafety"

type Admin = Pick<SupabaseClient, "from" | "rpc">
export interface ReceivedMessage extends Omit<ParsedInboundMail, "subject" | "body_text"> {
  id: string; provider_email_id: string; subject: string | null; body_text: string | null
  read_at: string | null; processing_state: "pending" | "processing" | "ready" | "failed"
  received_at: string; last_error: string | null
}
export interface ReceivedReply {
  id: string; parent_id: string; body_text: string; to_address: string; from_address: string; subject: string
  status: "draft" | "sending" | "accepted" | "delivered" | "failed" | "unconfirmed"
  provider_email_id: string | null; provider_message_id: string | null; idempotency_key: string
  lease_until: string | null; lease_token: string | null; last_error: string | null
  created_at: string; updated_at: string
}
export interface ReceivingAdapter { get(id: string): Promise<unknown> }
const unavailable = "Received mail is unavailable. Please try again."
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Admin authorization belongs to callers. These helpers perform no sends. */
export async function getReceivedMail(admin: Admin, filters: { folder: "inbox" | "spam"; page?: number }) {
  try {
    if (filters.folder !== "inbox" && filters.folder !== "spam") throw new Error("Invalid folder")
    const page = Number.isSafeInteger(filters.page) && filters.page! > 0 ? filters.page! : 1
    const { data, error, count } = await admin.from("found_mail_received").select("*", { count: "exact" })
      .eq("folder", filters.folder).order("received_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * 25, page * 25 - 1)
    if (error || !Array.isArray(data) || count === null) throw new Error("Unavailable")
    return { rows: data as ReceivedMessage[], total: count as number | null, error: null as string | null }
  } catch { return { rows: [] as ReceivedMessage[], total: null, error: unavailable } }
}

export async function getReceivedMessage(admin: Admin, id: string) {
  try {
    if (!uuid.test(id)) throw new Error("Invalid message")
    const { data: message, error } = await admin.from("found_mail_received").select("*").eq("id", id).maybeSingle()
    if (error) throw error
    if (!message) return { message: null, replies: [] as ReceivedReply[], error: null as string | null }
    const replies = await admin.from("found_mail_replies").select("*").eq("parent_id", id)
      .order("created_at", { ascending: true }).order("id", { ascending: true })
    if (replies.error || !Array.isArray(replies.data)) throw new Error("Unavailable")
    // A crashed send is uncertain, never a candidate for automatic resend.
    // Project the expired lease for display without mutating its durable record.
    const projected = (replies.data as ReceivedReply[]).map(reply => {
      const expires = reply.lease_until ? Date.parse(reply.lease_until) : NaN
      return reply.status === "sending" && (!Number.isFinite(expires) || expires <= Date.now())
        ? { ...reply, status: "unconfirmed" as const,
          last_error: reply.last_error || "Send confirmation was interrupted. Reconcile before sending again." }
        : reply
    })
    return { message: message as ReceivedMessage | null, replies: projected, error: null as string | null }
  } catch { return { message: null, replies: [] as ReceivedReply[], error: unavailable } }
}

export async function getUnreadMailCount(admin: Admin) {
  try {
    const { count, error } = await admin.from("found_mail_received").select("id", { count: "exact", head: true })
      .eq("folder", "inbox").eq("processing_state", "ready").is("read_at", null)
    if (error || count === null) throw new Error("Unavailable")
    return { count: count as number | null, error: null as string | null }
  } catch { return { count: null, error: unavailable } }
}

/** Call only with an already signature-verified email.received event. */
export async function acceptReceivedEvent(admin: Admin, eventId: string, data: unknown) {
  try {
    const providerId = data && typeof data === "object" ? (data as { email_id?: unknown }).email_id : null
    if (typeof providerId !== "string" || !uuid.test(providerId) || !eventId || eventId.length > 256) throw new Error("Invalid event")
    const result = await admin.rpc("found_mail_accept", { p_event_id: eventId, p_provider_id: providerId })
    if (result.error || typeof result.data !== "string" || !uuid.test(result.data)) throw new Error("Queue unavailable")
    return { success: true, error: null as string | null }
  } catch { return { success: false, error: "Could not durably queue incoming mail." } }
}

/** Fixed receiving endpoint; never fetch raw/attachment URLs from message data. */
export function createReceivingAdapter(): ReceivingAdapter {
  return { async get(id) {
    if (!uuid.test(id) || !process.env.RESEND_API_KEY) throw new Error("Receiving API is unavailable.")
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}?html_format=cid`, {
        method: "GET", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        signal: AbortSignal.timeout(15_000), redirect: "error", cache: "no-store",
      })
      if (!response.ok || !response.body || Number(response.headers.get("content-length") ?? 0) > 2 * 1024 * 1024) {
        await response.body?.cancel(); throw new Error("Receiving API is unavailable.")
      }
      reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > 2 * 1024 * 1024) throw new Error("Response exceeds safe size.")
        chunks.push(chunk.value)
      }
      const raw = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>
      if (!raw || typeof raw !== "object" || raw.id !== id) throw new Error("Unexpected receiving response.")
      return raw
    } catch { throw new Error("Could not retrieve incoming mail.") }
    finally { await reader?.cancel().catch(() => undefined) }
  } }
}

/** Durable lease worker. Maximum three 15-second fetches per invocation. */
export async function processIncomingMail(admin: Admin, adapter: ReceivingAdapter = createReceivingAdapter(), limit = 3) {
  let processed = 0, failed = 0
  try {
    const bounded = Number.isSafeInteger(limit) && limit > 0 ? Math.min(limit, 3) : 3
    for (let i = 0; i < bounded; i++) {
      const token = randomUUID()
      const claim = await admin.rpc("found_mail_claim", { p_token: token })
      if (claim.error) throw new Error("Queue unavailable")
      if (!claim.data) break
      const message = claim.data as { id: string; provider_email_id: string }
      try {
        const raw = await adapter.get(message.provider_email_id)
        const parsed = parseInboundEmail(raw)
        let blocked = false, allowed = false, recentCount = 0
        if (parsed.from_address) {
          const rule = await admin.from("found_mail_rules").select("action").eq("sender_address", parsed.from_address).maybeSingle()
          if (rule.error) throw new Error("Rule lookup unavailable")
          blocked = rule.data?.action === "block"; allowed = rule.data?.action === "allow"
          const recent = await admin.from("found_mail_received").select("id", { count: "exact", head: true })
            .eq("from_address", parsed.from_address).gte("received_at", new Date(Date.now() - 10 * 60_000).toISOString())
          if (recent.error || recent.count === null) throw new Error("Review context unavailable")
          recentCount = recent.count
        }
        const content = parseInboundEmail(raw, { blocked, allowed, recentCount })
        const complete = await admin.rpc("found_mail_complete", { p_id: message.id, p_token: token, p_content: content })
        if (complete.error || complete.data !== true) throw new Error("Lease or persistence unavailable")
        processed++
      } catch {
        failed++
        const result = await admin.rpc("found_mail_fail", { p_id: message.id, p_token: token })
        if (result.error || result.data !== true) throw new Error("Queue retry unavailable")
      }
    }
    return { processed, failed, error: failed ? "Some incoming messages could not be processed; their durable retry state is retained." : null }
  } catch { return { processed, failed, error: "Incoming mail processing is unavailable; durable queued messages are retained." } }
}
