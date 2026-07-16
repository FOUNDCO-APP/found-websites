import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe/connect"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_BASE = `https://my.${ROOT_DOMAIN}`

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

function stripeRaw(err: unknown) {
  if (err && typeof err === "object" && "raw" in err) return (err as { raw?: unknown }).raw
  return null
}

function stripeCode(err: unknown) {
  if (err && typeof err === "object" && "code" in err) return (err as { code?: unknown }).code
  return null
}

function stripeStatusCode(err: unknown) {
  if (err && typeof err === "object" && "statusCode" in err) return (err as { statusCode?: unknown }).statusCode
  return null
}

function isInvalidStoredConnectAccount(err: unknown) {
  const raw = stripeRaw(err)
  const rawMessage = raw && typeof raw === "object" && "message" in raw ? String((raw as { message?: unknown }).message ?? "") : ""
  const message = `${errorMessage(err)} ${rawMessage}`
  return (
    stripeCode(err) === "account_invalid" ||
    stripeStatusCode(err) === 403 ||
    /not connected to your platform|does not exist|does not have access to account|account_invalid/i.test(message)
  )
}

function paymentSetupErrorResponse(err: unknown) {
  const rawMessage = errorMessage(err)
  const platformActionNeeded = /platform-profile|signed up for Connect|responsibilities of managing losses|dashboard\.stripe\.com\/settings\/connect/i.test(rawMessage)

  return NextResponse.json({
    code: platformActionNeeded ? "stripe_connect_platform_review_needed" : "payment_setup_failed",
    error: platformActionNeeded
      ? "Payment setup needs one more review from Found support before it can continue."
      : "Payment setup could not start. Please try again in a minute or contact Found support.",
  }, { status: platformActionNeeded ? 503 : 500 })
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const authUser = user

    const company = await getCompany(authUser.id, authUser.email ?? "")
    if (!company) return NextResponse.json({ error: "No company" }, { status: 404 })
    const companyRecord = company

    const stripe = getStripe()
    if (!stripe) return NextResponse.json({ error: "Payments are not configured yet." }, { status: 503 })
    const stripeClient = stripe

    const body = await req.json().catch(() => ({})) as { returnTo?: string }
    const returnTo = cleanReturnPath(body.returnTo)
    const admin = createAdminClient()

    async function createConnectedAccount() {
      const account = await stripeClient.accounts.create({
        country: "US",
        email: companyRecord.email ?? authUser.email ?? undefined,
        business_profile: {
          name: companyRecord.name ?? undefined,
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
          company_id: companyRecord.id,
          found_slug: companyRecord.slug,
        },
      })

      const { error } = await admin
        .from("companies")
        .update({ stripe_connect_account_id: account.id })
        .eq("id", companyRecord.id)

      if (error) throw new Error(error.message)
      return account.id
    }

    let accountId = companyRecord.stripe_connect_account_id
    if (!accountId) accountId = await createConnectedAccount()

    async function createAccountLink(id: string) {
      return stripeClient.accountLinks.create({
        account: id,
        refresh_url: `${APP_BASE}/more?payments=refresh`,
        return_url: `${APP_BASE}${returnTo}`,
        type: "account_onboarding",
        collection_options: { fields: "eventually_due" },
      })
    }

    let accountLink
    try {
      accountLink = await createAccountLink(accountId)
    } catch (err) {
      if (!isInvalidStoredConnectAccount(err)) throw err
      console.warn("[payments/connect] Replacing invalid stored Stripe Connect account", { companyId: companyRecord.id, accountId })
      accountId = await createConnectedAccount()
      accountLink = await createAccountLink(accountId)
    }

    return NextResponse.json({ url: accountLink.url })
  } catch (err) {
    console.error("[payments/connect] setup failed", err)
    return paymentSetupErrorResponse(err)
  }
}
