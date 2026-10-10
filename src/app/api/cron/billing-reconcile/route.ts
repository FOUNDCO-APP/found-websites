import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { billingFlag, runBillingReconciliation } from "@/lib/stripe/billingReliability"

export const maxDuration = 300
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!["BILLING_DURABLE_INTAKE_ENABLED", "BILLING_RECONCILIATION_ENABLED", "BILLING_ADMIN_EMAIL_ENABLED", "BILLING_CLIENT_EMAIL_ENABLED"].some(billingFlag)) {
    return NextResponse.json({ enabled: false })
  }
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Billing not configured" }, { status: 503 })
  try {
    const result = await runBillingReconciliation(createAdminClient(), new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 15000, maxNetworkRetries: 1 }))
    return NextResponse.json(result, { status: result.ok ? 200 : 503 })
  } catch {
    return NextResponse.json({ error: "Billing worker failed; inspect configuration and reconciliation health" }, { status: 503 })
  }
}
