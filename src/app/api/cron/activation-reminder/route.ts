import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendActivationReminderEmailOnce } from "@/lib/activationEmails"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = getAdminClient()
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, slug, email, subscription_status, preview_completed_at, activation_reminder_sent_at, site_live_email_sent_at")
    .not("email", "is", null)
    .not("preview_completed_at", "is", null)
    .lte("preview_completed_at", cutoff)
    .is("activation_reminder_sent_at", null)
    .is("site_live_email_sent_at", null)
    .or("subscription_status.is.null,subscription_status.not.in.(active,trialing)")
    .limit(25)

  if (error) {
    console.error("[cron/activation-reminder] query error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  const skipped: Record<string, number> = {}

  for (const company of companies ?? []) {
    const result = await sendActivationReminderEmailOnce(supabase as any, company).catch((err) => {
      console.error("[cron/activation-reminder] send error:", err)
      return { sent: false, reason: "send_error" }
    })

    if (result.sent) sent++
    else skipped[result.reason ?? "unknown"] = (skipped[result.reason ?? "unknown"] ?? 0) + 1
  }

  return NextResponse.json({ ok: true, checked: companies?.length ?? 0, sent, skipped })
}
