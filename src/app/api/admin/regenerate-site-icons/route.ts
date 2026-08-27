import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  regenerateSiteIconsForCompany,
  SITE_ICON_REGEN_SELECT,
  type SiteIconRegenResult,
} from "@/lib/siteIconRegen"

export const runtime = "nodejs"
export const maxDuration = 300

// One-time / occasional admin tool: rebuild every tenant's browser + app icons
// with the current generation pipeline (real BMP favicon.ico, transparent
// favicons, opaque apple-touch/PWA icons) and stamp a fresh
// site_icon_generated_at so tenant <head> ?v= hashes change.
//
//   POST /api/admin/regenerate-site-icons?key=ADMIN_KEY
//   POST /api/admin/regenerate-site-icons?key=ADMIN_KEY&slug=a,b,c
export async function POST(request: Request) {
  const url = new URL(request.url)
  const provided = request.headers.get("x-admin-key") || url.searchParams.get("key")
  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slugFilter = (url.searchParams.get("slug") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)

  const admin = createAdminClient()
  let query = admin.from("companies").select(SITE_ICON_REGEN_SELECT).eq("active", true)
  if (slugFilter.length) query = query.in("slug", slugFilter)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const companies = (data ?? []).filter(
    (c): c is typeof c & { website_config: object } => Boolean(c.website_config),
  )

  const results: SiteIconRegenResult[] = []
  for (const company of companies) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.push(await regenerateSiteIconsForCompany(admin, company as any))
  }

  const ok = results.filter(r => r.ok)
  const failed = results.filter(r => !r.ok)
  return NextResponse.json(
    {
      regenerated: ok.length,
      failed: failed.length,
      total: results.length,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}
