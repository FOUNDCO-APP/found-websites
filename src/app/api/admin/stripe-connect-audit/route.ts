import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, isStripeConnectReady } from "@/lib/stripe/connect"

type AuditRow = {
  name: string | null
  slug: string | null
  plan: string | null
  subscriptionStatus: string | null
  industry: string | null
  primaryIntent: string | null
  accountId: string | null
  access: "ok" | "failed"
  ready: boolean
  detailsSubmitted: boolean | null
  chargesEnabled: boolean | null
  payoutsEnabled: boolean | null
  cardPayments: string | null
  transfers: string | null
  issue: "connect_incomplete" | "stale_or_wrong_platform_account" | "stripe_retrieve_failed" | null
}

function stripeMessage(err: unknown) {
  const raw = err && typeof err === "object" && "raw" in err ? (err as { raw?: { message?: unknown } }).raw : null
  return String(raw?.message || (err instanceof Error ? err.message : err) || "")
}

function stripeCode(err: unknown) {
  return err && typeof err === "object" && "code" in err ? (err as { code?: unknown }).code : null
}

function stripeStatusCode(err: unknown) {
  return err && typeof err === "object" && "statusCode" in err ? (err as { statusCode?: unknown }).statusCode : null
}

function issueFromStripeError(err: unknown): AuditRow["issue"] {
  const message = stripeMessage(err)
  if (
    stripeCode(err) === "account_invalid" ||
    stripeStatusCode(err) === 403 ||
    /not connected to your platform|does not exist|does not have access to account|account_invalid/i.test(message)
  ) {
    return "stale_or_wrong_platform_account"
  }
  return "stripe_retrieve_failed"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const provided = request.headers.get("x-admin-key") || url.searchParams.get("key")
  if (!process.env.ADMIN_KEY || provided !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })

  const admin = createAdminClient()
  const { data: companies, error } = await admin
    .from("companies")
    .select("name, slug, plan, subscription_status, industry_category, primary_intent, stripe_connect_account_id, created_at")
    .not("stripe_connect_account_id", "is", null)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows: AuditRow[] = []
  for (const company of companies ?? []) {
    const accountId = company.stripe_connect_account_id as string | null
    const row: AuditRow = {
      name: company.name ?? null,
      slug: company.slug ?? null,
      plan: company.plan ?? null,
      subscriptionStatus: company.subscription_status ?? null,
      industry: company.industry_category ?? null,
      primaryIntent: company.primary_intent ?? null,
      accountId,
      access: "failed",
      ready: false,
      detailsSubmitted: null,
      chargesEnabled: null,
      payoutsEnabled: null,
      cardPayments: null,
      transfers: null,
      issue: null,
    }

    try {
      if (!accountId) throw new Error("Missing account ID")
      const account = await stripe.accounts.retrieve(accountId)
      row.access = "ok"
      row.ready = isStripeConnectReady(account)
      row.detailsSubmitted = Boolean(account.details_submitted)
      row.chargesEnabled = Boolean(account.charges_enabled)
      row.payoutsEnabled = Boolean(account.payouts_enabled)
      row.cardPayments = account.capabilities?.card_payments ?? null
      row.transfers = account.capabilities?.transfers ?? null
      if (!row.ready) row.issue = "connect_incomplete"
    } catch (err) {
      row.access = "failed"
      row.issue = issueFromStripeError(err)
    }

    rows.push(row)
  }

  const summary = {
    checkedAt: new Date().toISOString(),
    mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test_or_unknown",
    checked: rows.length,
    accessible: rows.filter((row) => row.access === "ok").length,
    ready: rows.filter((row) => row.ready).length,
    incomplete: rows.filter((row) => row.issue === "connect_incomplete").length,
    staleOrWrongPlatform: rows.filter((row) => row.issue === "stale_or_wrong_platform_account").length,
    otherStripeFailures: rows.filter((row) => row.issue === "stripe_retrieve_failed").length,
  }

  return NextResponse.json({ summary, rows }, { headers: { "Cache-Control": "no-store" } })
}