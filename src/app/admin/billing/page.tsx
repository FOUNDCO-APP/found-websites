import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { getAdminClient, planLabel } from "../lib"
import { isAdminTestIdentity } from "../testIdentity"
import { getStripe } from "@/lib/stripe/connect"
import BillingTable, { type BillingRow } from "./BillingTable"

export const metadata = { title: "Test Billing - Found HQ" }

export default async function AdminBillingPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin")

  const admin = getAdminClient()
  const stripe = getStripe()

  const { data: companies } = await admin
    .from("companies")
    .select("id, name, slug, email, account_kind, is_test, plan, stripe_customer_id")
    .eq("subscription_status", "active")
    .not("stripe_customer_id", "is", null)
    .order("name")

  const rows: BillingRow[] = []
  if (stripe && companies) {
    await Promise.all(companies.filter(isAdminTestIdentity).map(async (company) => {
      if (!company.stripe_customer_id) return
      try {
        const subs = await stripe.subscriptions.list({ customer: company.stripe_customer_id, status: "active", limit: 20 })
        const monthlyCents = subs.data.reduce((sum, sub) =>
          sum + sub.items.data.reduce((itemSum, item) => itemSum + (item.price.unit_amount ?? 0) * (item.quantity ?? 1), 0), 0)
        if (subs.data.length === 0) return
        rows.push({
          id: company.id,
          name: company.name,
          slug: company.slug,
          email: company.email,
          plan: planLabel(company.plan),
          monthly: monthlyCents / 100,
          subscriptionCount: subs.data.length,
        })
      } catch {
        // Customer/subscription lookup failed (e.g. stale id) - skip rather than block the whole list
      }
    }))
  }

  rows.sort((a, b) => b.monthly - a.monthly)
  const totalMonthly = rows.reduce((sum, r) => sum + r.monthly, 0)

  return (
    <div className="hq-page">
      <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Operate</p>
          <h1 className="hq-title">Test Billing</h1>
          <p className="hq-subtitle">Test identities with a live Stripe subscription still billing. Cancel the ones you're done with.</p>
        </div>
        <span className="hq-count">${totalMonthly.toFixed(2)}/mo</span>
      </header>
      {!stripe && (
        <p className="hq-row-meta">Stripe is not configured in this environment.</p>
      )}
      <BillingTable rows={rows} />
    </div>
  )
}
