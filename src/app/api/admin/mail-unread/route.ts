import { NextResponse } from "next/server"
import { requireAdmin } from "@/app/admin/lib"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" }

export async function GET() {
  try { await requireAdmin() }
  catch { return NextResponse.json({ count: null, error: "Unauthorized" }, { status: 401, headers }) }
  return NextResponse.json({ count: 0, retired: true }, { headers })
}
