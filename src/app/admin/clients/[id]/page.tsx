import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminClient } from "../../lib"
import ClientDetailWorkspace, { type ClientDetail } from "./ClientDetailWorkspace"
import { getStripe } from "@/lib/stripe/connect"
import type Stripe from "stripe"

export const metadata = { title: "Client - Found HQ" }

type CustomerActivityRow = {
  event_type: string
  surface: string
  feature: string | null
  created_at: string
}

type BillingPaymentSignal = {
  status: "card_on_file" | "no_card" | "no_stripe_customer" | "stripe_unavailable" | "lookup_failed"
  label: string
  detail: string | null
}

function paymentMethodLabel(paymentMethod: Stripe.PaymentMethod | null | undefined) {
  if (!paymentMethod) return null
  if (paymentMethod.card) {
    const brand = paymentMethod.card.brand ? paymentMethod.card.brand.replace(/\b[a-z]/g, (letter) => letter.toUpperCase()) : "Card"
    return `${brand} ending ${paymentMethod.card.last4}`
  }
  if (paymentMethod.us_bank_account) return `Bank ending ${paymentMethod.us_bank_account.last4}`
  return "Payment method saved"
}

async function getBillingPaymentSignal(stripeCustomerId: string | null | undefined): Promise<BillingPaymentSignal> {
  if (!stripeCustomerId) {
    return { status: "no_stripe_customer", label: "No Stripe customer", detail: "No card can be confirmed yet." }
  }

  const stripe = getStripe()
  if (!stripe) {
    return { status: "stripe_unavailable", label: "Stripe not configured", detail: "Cannot check card status in this environment." }
  }

  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    })
    if (customer.deleted) {
      return { status: "lookup_failed", label: "Stripe customer deleted", detail: stripeCustomerId }
    }

    const defaultPaymentMethod = customer.invoice_settings.default_payment_method
    if (defaultPaymentMethod && typeof defaultPaymentMethod !== "string") {
      return {
        status: "card_on_file",
        label: "Card on file",
        detail: paymentMethodLabel(defaultPaymentMethod),
      }
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: "card",
      limit: 1,
    })
    const card = paymentMethods.data[0]
    if (card) {
      return {
        status: "card_on_file",
        label: "Card on file",
        detail: paymentMethodLabel(card),
      }
    }

    return { status: "no_card", label: "No card on file", detail: "Send the card link before billing starts." }
  } catch (err) {
    console.error("[admin/client] Stripe payment method lookup failed", err)
    return { status: "lookup_failed", label: "Could not check card", detail: stripeCustomerId }
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = getAdminClient()
  const activitySince = new Date(Date.now() - 90 * 86400000).toISOString()

  const [{ data: company }, { data: activities }, { data: emails }, customerActivityResult] = await Promise.all([
    admin
      .from("companies")
      .select(`
        id, name, slug, contact_name, email, phone, address, city, state, zip, address_visible,
        plan, subscription_status, client_state, account_kind, comp_reason, is_comp,
        trial_ends_at, billing_cycle_day, deferred_payment_amount, deferred_payment_method, deferred_payment_note,
        industry_category, is_test, included_addon_slug, disabled_addons, stripe_customer_id, stripe_connect_account_id, created_at
      `)
      .eq("id", id)
      .maybeSingle(),
    admin.from("client_activities").select("summary, activity_type, metadata, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(30),
    admin.from("email_log").select("subject, email_type, recipient_email, success, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(15),
    admin.from("customer_activity_events").select("event_type, surface, feature, created_at").eq("company_id", id).eq("is_admin_view", false).gte("created_at", activitySince).order("created_at", { ascending: false }).limit(80),
  ])

  if (!company) notFound()
  const billingPaymentSignal = await getBillingPaymentSignal(company.stripe_customer_id)

  const detail: ClientDetail = {
    ...company,
    activities: activities ?? [],
    emails: emails ?? [],
    customer_activities: (customerActivityResult.data ?? []) as CustomerActivityRow[],
    customer_activity_ready: !customerActivityResult.error,
    billing_payment_signal: billingPaymentSignal,
  }

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/clients" className="hq-back-link"><span className="hq-back-chevron" />Clients</Link>
      <ClientDetailWorkspace client={detail} />
    </div>
  )
}
