import { NextResponse } from "next/server"
import { cookies, headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveChannel } from "@/lib/channel"
import { checkPublicRateLimit } from "@/lib/security/rateLimit"

export const runtime = "nodejs"

// Visit beacon for the Traffic Report. Root marketing site only for now
// (company_id stays null); a future tenant version passes company_id.
export async function POST(request: Request) {
  // Don't record Shawn's own browsing - a Found-admin session (View As or
  // just logged into HQ in the same browser) would otherwise skew the
  // channel mix on the founder report.
  const cookieStore = await cookies()
  if (cookieStore.get("admin_key")?.value || cookieStore.get("found_admin_view")?.value) {
    return NextResponse.json({ ok: true })
  }

  const limit = checkPublicRateLimit(await headers(), {
    key: "site-visit",
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!limit.allowed) return NextResponse.json({ ok: true })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const str = (v: unknown, max: number) =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null

  const path = str(body.path, 500)
  const sessionId = str(body.session_id, 100)
  if (!path || !sessionId) return NextResponse.json({ ok: true })

  const referrer = str(body.referrer, 1000)
  const utm_source = str(body.utm_source, 120)
  const utm_medium = str(body.utm_medium, 120)
  const utm_campaign = str(body.utm_campaign, 120)
  const utm_content = str(body.utm_content, 120)
  const utm_term = str(body.utm_term, 120)

  const admin = createAdminClient()
  await admin.from("site_visits").insert({
    company_id: null,
    session_id: sessionId,
    path,
    referrer,
    entry_channel: resolveChannel(utm_source, utm_medium, referrer),
    landing_path: str(body.landing_path, 500),
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  })

  return NextResponse.json({ ok: true })
}
