import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { processIncomingMail } from "@/lib/admin/mailStore"

export const maxDuration = 60

// Deliberately not registered in vercel.json. Release enables scheduling separately.
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (process.env.FOUND_INBOUND_ENABLED !== "true") {
    return NextResponse.json({ error: "Incoming mail is not enabled" }, { status: 503 })
  }
  try {
    const result = await processIncomingMail(createAdminClient())
    return NextResponse.json(result, { status: result.error ? 503 : 200 })
  } catch { return NextResponse.json({ error: "Incoming mail processing unavailable" }, { status: 503 }) }
}
