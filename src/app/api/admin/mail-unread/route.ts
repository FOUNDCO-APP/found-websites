import { NextResponse } from "next/server"
import { getAdminClient, requireAdmin } from "@/app/admin/lib"
import { getUnreadMailCount } from "@/lib/admin/mailStore"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" }

export async function GET() {
  try { await requireAdmin() }
  catch { return NextResponse.json({ count: null, error: "Unauthorized" }, { status: 401, headers }) }
  if (process.env.FOUND_INBOUND_ENABLED !== "true") {
    return NextResponse.json({ count: null, error: "Incoming mail is not enabled" }, { status: 503, headers })
  }
  try {
    const result = await getUnreadMailCount(getAdminClient())
    return NextResponse.json(result, { status: result.error ? 503 : 200, headers })
  } catch { return NextResponse.json({ count: null, error: "Unread count unavailable" }, { status: 503, headers }) }
}
