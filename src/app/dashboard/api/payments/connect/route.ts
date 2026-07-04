import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_BASE = `https://my.${ROOT_DOMAIN}`

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null
  return new Stripe(process.env.STRIPE_SECRET_KEY)
}

function cleanReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/more?payments=connected"
  if (value.startsWith("//")) return "/more?payments=connected"
  return value
}

function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "Payment setup failed"
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const company = await getCompany(user.id, user.email ?? "")
    if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 })

    const body = await req.json().catch(() => ({})) as { returnTo?: string }
    const returnTo = cleanReturnPath(body.returnTo)
    const admin = createAdminClient()

    let accountId = company.stripe_connect_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        country: "US",
        email: company.email ?? user.email ?? undefined,
        business_profile: {
          name: company.name ?? undefined,
          product_description: "Local business services sold through Found estimates and online ordering.",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        controller: {
          fees: { payer: "application" },
          losses: { payments: "application" },
          requirement_collection: "stripe",
          stripe_dashboard: { type: "express" },
        },
        metadata: {
          company_id: company.id,
          found_slug: company.slug,
        },
      })

      accountId = account.id
      const { error } = await admin
        .from("companies")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", company.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_BASE}/more?payments=refresh`,
      return_url: `${APP_BASE}${returnTo}`,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error("[payments/connect] setup failed", err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}