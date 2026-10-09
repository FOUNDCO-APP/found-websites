import { NextResponse } from "next/server"
import { authorizeBillingAdmin, getAdminBillingLedger } from "@/lib/stripe/billingLedger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const headers = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const key = request.headers.get("x-admin-key")
  try { await authorizeBillingAdmin(key) }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers }) }
  try {
    const ledger = await getAdminBillingLedger(key)
    return NextResponse.json(ledger, { headers: { ...headers, "Content-Disposition": 'attachment; filename="found-billing-ledger.json"' } })
  } catch {
    return NextResponse.json({ complete: false, error: "Billing unavailable; balances and payments are unknown." }, { status: 503, headers })
  }
}
