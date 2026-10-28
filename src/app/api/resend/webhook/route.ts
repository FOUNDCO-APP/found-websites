import { after, NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { acceptReceivedEvent, createReceivingAdapter, processIncomingMail } from "@/lib/admin/mailStore"
import { recordReplyDelivery } from "@/lib/admin/mailReplies"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// Resend signs webhook payloads via Svix. Maps each Resend event type to the
// delivery_status we store on the matching email_log row (matched by
// resend_email_id, captured at send time in src/lib/emailLog.ts). Team
// decision 2026-08-14: real delivery/bounce visibility, not just "did the
// API call succeed."
const STATUS_BY_EVENT: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const body = await req.text()
  const svixId = req.headers.get("svix-id")
  const svixTimestamp = req.headers.get("svix-timestamp")
  const svixSignature = req.headers.get("svix-signature")
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 })
  }

  let event: { type?: string; created_at?: string; data?: { email_id?: string } }
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event
  } catch (err) {
    console.error("[resend webhook] signature verification failed:", err)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  if (event.type === "email.received") {
    if (process.env.FOUND_INBOUND_ENABLED !== "true") {
      return NextResponse.json({ error: "Incoming mail is not enabled" }, { status: 503 })
    }
    try {
      const admin = getAdminClient()
      const result = await acceptReceivedEvent(admin, svixId, event.data)
      if (result.success) {
        // Queue is committed first. The immediate attempt is best-effort;
        // durable recovery still requires the separately enabled retry trigger.
        after(async () => { await processIncomingMail(admin, createReceivingAdapter(), 1) })
      }
      return NextResponse.json(result.success ? { received: true } : { error: result.error }, { status: result.success ? 200 : 503 })
    } catch { return NextResponse.json({ error: "Incoming mail queue unavailable" }, { status: 503 }) }
  }

  const status = event.type ? STATUS_BY_EVENT[event.type] : undefined
  const resendEmailId = event.data?.email_id
  if (!status || !resendEmailId) {
    // Event type we don't track (e.g. email.opened/clicked) - acknowledge and ignore.
    return NextResponse.json({ received: true })
  }

  try {
    const admin = getAdminClient()
    const updated = await admin
      .from("email_log")
      .update({ delivery_status: status, delivery_status_at: new Date().toISOString() })
      .eq("resend_email_id", resendEmailId)
    if (updated.error) return NextResponse.json({ error: "Delivery update unavailable" }, { status: 503 })
    if (process.env.FOUND_INBOUND_ENABLED === "true") {
      const receipt = await recordReplyDelivery(admin, resendEmailId, status, event.created_at)
      if (!receipt.success) return NextResponse.json({ error: "Reply delivery receipt unavailable" }, { status: 503 })
    }
  } catch { return NextResponse.json({ error: "Delivery persistence unavailable" }, { status: 503 }) }

  return NextResponse.json({ received: true })
}
