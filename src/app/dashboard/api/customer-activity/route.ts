import { recordCustomerActivity } from "@/lib/customerActivity"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  let body: { pathname?: unknown; eventType?: unknown; metadata?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const pathname = typeof body.pathname === "string" ? body.pathname : ""
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.json({ error: "Invalid dashboard path" }, { status: 400 })
  }

  const eventType = typeof body.eventType === "string" && body.eventType.trim()
    ? body.eventType.trim()
    : "dashboard_page_viewed"

  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata as Record<string, unknown>
    : undefined

  const result = await recordCustomerActivity({ eventType, pathname, metadata })
  return NextResponse.json(result)
}
