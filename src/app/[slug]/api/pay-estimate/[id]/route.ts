import { NextRequest, NextResponse } from "next/server"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe, getStripeConnectStatus } from "@/lib/stripe/connect"

type Params = { params: Promise<{ slug: string; id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const connectAccountId = company.stripe_connect_account_id as string | null
  if (!connectAccountId) return NextResponse.json({ error: "No payment account" }, { status: 409 })

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: "Payments not configured" }, { status: 503 })

  const stripeConnect = await getStripeConnectStatus(connectAccountId)
  if (!stripeConnect.ready) return NextResponse.json({ error: "Payment account is not ready" }, { status: 409 })

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status, total, deposit_pct, client_name, client_email")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const depositPct = (estimate.deposit_pct as number) ?? 50
  const totalCents = Math.round(Number(estimate.total ?? 0) * 100)
  const depositCents = depositPct >= 100 ? totalCents : Math.round(totalCents * (depositPct / 100))
  const depositAmount = depositCents / 100

  if (depositCents < 50) return NextResponse.json({ error: "Deposit amount too small" }, { status: 400 })

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: depositCents,
      currency: "usd",
      receipt_email: (estimate.client_email as string) ?? undefined,
      description: `${company.name} — ${depositPct}% deposit · ${estimate.client_name}`,
      automatic_payment_methods: { enabled: true },
      application_fee_amount: Math.round(depositCents * 0.005),
      metadata: {
        kind: "estimate_deposit",
        company_id: company.id,
        estimate_id: id,
        deposit_pct: String(depositPct),
      },
    },
    { stripeAccount: connectAccountId }
  )

  await admin.from("estimates").update({
    stripe_payment_intent_id: paymentIntent.id,
    deposit_amount: depositAmount,
    updated_at: new Date().toISOString(),
  }).eq("id", id)

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    stripeAccountId: connectAccountId,
    depositAmount,
    depositPct,
  })
}
