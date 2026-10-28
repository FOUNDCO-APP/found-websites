import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/admin/lib"
import { getAdminMailConfig } from "@/lib/admin/mailConfig"

export const dynamic = "force-dynamic"
export const maxDuration = 30
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" }

export async function GET(req: NextRequest) {
  try { await requireAdmin() }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers }) }
  if (req.nextUrl.search) return NextResponse.json({ error: "This readiness check accepts no query parameters." }, { status: 400, headers })
  try { return NextResponse.json(await getAdminMailConfig(), { headers }) }
  catch { return NextResponse.json({ error: "Mail configuration could not be verified." }, { status: 503, headers }) }
}
