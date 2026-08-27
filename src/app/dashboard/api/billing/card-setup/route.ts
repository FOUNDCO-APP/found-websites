import { NextResponse } from "next/server"
import Stripe from "stripe"
import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

export async function POST() {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
  }
  if (!company.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account was found." }, { status: 404 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 })

  const setupIntent = await stripe.setupIntents.create({
    customer: company.stripe_customer_id,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: {
      company_id: company.id,
      source: "dashboard_billing_card_update",
    },
  })

  if (!setupIntent.client_secret) {
    return NextResponse.json({ error: "Card update could not start." }, { status: 500 })
  }

  return NextResponse.json({ clientSecret: setupIntent.client_secret })
}

export async function PATCH(req: Request) {
  const identity = await resolveDashboardIdentity()
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) {
    return NextResponse.json({ error: "Not available for your account" }, { status: 403 })
  }
  if (!company.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account was found." }, { status: 404 })
  }

  const stripe = getStripe()
  if (!stripe) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 })

  const body = await req.json().catch(() => ({})) as { setupIntentId?: string }
  if (!body.setupIntentId) return NextResponse.json({ error: "Missing setup intent." }, { status: 400 })

  const setupIntent = await stripe.setupIntents.retrieve(body.setupIntentId)
  const customerId = typeof setupIntent.customer === "string" ? setupIntent.customer : setupIntent.customer?.id
  if (customerId !== company.stripe_customer_id) {
    return NextResponse.json({ error: "Not available for this account." }, { status: 403 })
  }
  if (setupIntent.status !== "succeeded" || typeof setupIntent.payment_method !== "string") {
    return NextResponse.json({ error: "Card update is not complete." }, { status: 400 })
  }

  await stripe.customers.update(company.stripe_customer_id, {
    invoice_settings: { default_payment_method: setupIntent.payment_method },
  })

  const subs = await stripe.subscriptions.list({
    customer: company.stripe_customer_id,
    status: "all",
    limit: 10,
  })
  await Promise.all(
    subs.data
      .filter((sub) => sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")
      .map((sub) => stripe.subscriptions.update(sub.id, { default_payment_method: setupIntent.payment_method as string })),
  )

  return NextResponse.json({ ok: true })
}
