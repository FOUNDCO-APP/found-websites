import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

// Temporary: confirms Sentry is actually receiving events end to end from the
// live deployment, not just that the DSN itself is valid. Remove once verified.
export async function GET(req: NextRequest) {
  const provided = req.nextUrl.searchParams.get("key")
  if (!process.env.SENTRY_TEST_KEY || provided !== process.env.SENTRY_TEST_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  Sentry.captureException(new Error("Found HQ Sentry wiring test - safe to ignore/resolve"))
  await Sentry.flush(3000)

  return NextResponse.json({ sent: true })
}
