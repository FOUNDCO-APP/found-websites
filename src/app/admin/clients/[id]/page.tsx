import { notFound } from "next/navigation"
import Link from "next/link"
import { getAdminClient, requireAdmin } from "../../lib"
import ClientDetailWorkspace, { type ClientDetail } from "./ClientDetailWorkspace"
import { getStripe } from "@/lib/stripe/connect"
import type Stripe from "stripe"
import { getStoredBillingSummaries } from "@/lib/stripe/billingSummary"
import { getClientBillingFacts, type ClientBillingFacts } from "@/lib/stripe/clientBillingFacts"
import { classifyEmail, getAdminEmailHistory } from "@/lib/admin/emailHistory"

export const metadata = { title: "Client - Found HQ" }

type CustomerActivityRow = {
  event_type: string
  surface: string
  feature: string | null
  created_at: string
}

type ClientEmailHistory = ClientDetail["emails"][number] & {
  id: string
  recipient_type: string
  lead_id: string | null
  source: string
  email_scope: string
  delivery_status?: string | null
  delivery_status_at?: string | null
  resend_email_id?: string | null
  history_category: "owner_account" | "lead_automation" | "business_operations" | "unknown"
}

function emailHistoryCategory(row: Omit<ClientEmailHistory, "history_category">): ClientEmailHistory["history_category"] {
  const category = classifyEmail(row)
  if (category === "found_clients") return "owner_account"
  if (category === "business") return "business_operations"
  return "unknown"
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
    const { exp_month, exp_year } = paymentMethod.card
    const expiry = exp_month && exp_year ? ` - Expires ${String(exp_month).padStart(2, "0")}/${exp_year}` : ""
    return `${brand} ending ${paymentMethod.card.last4}${expiry}`
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
        label: "Saved payment method",
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
        label: "Saved payment method",
        detail: paymentMethodLabel(card),
      }
    }

    return { status: "no_card", label: "No saved card found", detail: "No default payment method or saved card was returned by Stripe." }
  } catch (err) {
    console.error("[admin/client] Stripe payment method lookup failed", err)
    return { status: "lookup_failed", label: "Could not check card", detail: stripeCustomerId }
  }
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const admin = getAdminClient()
  const activitySince = new Date(Date.now() - 90 * 86400000).toISOString()

  const [{ data: company }, { data: activities }, { data: emails, error: emailError }, customerActivityResult] = await Promise.all([
    admin
      .from("companies")
      .select(`
        id, name, slug, contact_name, email, phone, address, city, state, zip, address_visible,
        plan, subscription_status, client_state, account_kind, comp_reason, is_comp,
        trial_ends_at, billing_cycle_day, deferred_payment_amount, deferred_payment_method, deferred_payment_note,
        industry_category, is_test, included_addon_slug, disabled_addons, stripe_customer_id, stripe_connect_account_id, created_at, retired_at
      `)
      .eq("id", id)
      .maybeSingle(),
    admin.from("client_activities").select("summary, activity_type, metadata, created_at").eq("company_id", id).order("created_at", { ascending: false }).limit(30),
    getAdminEmailHistory(admin, { category: "found_clients", clientId: id }).then(history => ({ data: history.rows.map(row => ({ ...row, subject: row.subject ?? "", email_type: row.email_type ?? "", recipient_email: row.recipient_email ?? "", recipient_type: row.recipient_type ?? "", source: row.source ?? "", email_scope: row.email_scope ?? "" })), error: history.error })),
    admin.from("customer_activity_events").select("event_type, surface, feature, created_at").eq("company_id", id).eq("is_admin_view", false).gte("created_at", activitySince).order("created_at", { ascending: false }).limit(80),
  ])

  if (!company) notFound()
  if (company.retired_at) {
    return <div className="hq-page hq-page-narrow">
      <Link href="/admin/clients?retired=1" className="hq-back-link"><span className="hq-back-chevron" />Retired clients</Link>
      <header className="hq-header"><div><p className="hq-eyebrow">Historical Record</p><h1 className="hq-title">{company.name}</h1>
        <p className="hq-subtitle">{company.slug}</p></div><span className="hq-badge">Retired</span></header>
      <p className="hq-row-meta">Retired {new Date(company.retired_at).toLocaleDateString("en-US", { timeZone: "UTC" })}</p>
      <section><h2 className="hq-section-title">Activity History</h2><div className="hq-list">
        {(activities ?? []).map((activity, index) => <div className="hq-row" key={`${activity.created_at}-${index}`}>
          <div><p className="hq-row-title">{activity.summary}</p><p className="hq-row-meta">{activity.created_at}</p></div>
        </div>)}
      </div></section>
      <section><h2 className="hq-section-title">Recent Found Emails</h2><div className="hq-list">
        {(emails ?? []).map(email => <div className="hq-row" key={email.id}>
          <div><p className="hq-row-title">{email.subject}</p><p className="hq-row-meta">{email.created_at}</p></div>
        </div>)}
      </div></section>
      <Link href={`/admin/emails?category=all&client=${encodeURIComponent(id)}`}>View all recorded email history</Link>
    </div>
  }
  const [billingPaymentSignal, summaries, billingFacts] = await Promise.all([
    getBillingPaymentSignal(company.stripe_customer_id),
    getStoredBillingSummaries([id]),
    getClientBillingFacts(company.stripe_customer_id),
  ])
  const billing = summaries.get(id) ?? null

  const detail: ClientDetail & { billing_facts: ClientBillingFacts; emails: ClientEmailHistory[]; email_history_ready: boolean } = {
    ...company,
    activities: activities ?? [],
    emails: (emails ?? []).map(row => ({ ...row, history_category: emailHistoryCategory(row) })),
    email_history_ready: !emailError,
    customer_activities: (customerActivityResult.data ?? []) as CustomerActivityRow[],
    customer_activity_ready: !customerActivityResult.error,
    billing_payment_signal: billingPaymentSignal,
    billing,
    billing_facts: billingFacts,
  }

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/clients" className="hq-back-link"><span className="hq-back-chevron" />Clients</Link>
      <ClientDetailWorkspace client={detail} />
    </div>
  )
}
