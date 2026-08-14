import { NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

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

  let event: { type?: string; data?: { email_id?: string } }
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

  const status = event.type ? STATUS_BY_EVENT[event.type] : undefined
  const resendEmailId = event.data?.email_id
  if (!status || !resendEmailId) {
    // Event type we don't track (e.g. email.opened/clicked) - acknowledge and ignore.
    return NextResponse.json({ received: true })
  }

  const admin = getAdminClient()
  await admin
    .from("email_log")
    .update({ delivery_status: status, delivery_status_at: new Date().toISOString() })
    .eq("resend_email_id", resendEmailId)

  return NextResponse.json({ received: true })
}
