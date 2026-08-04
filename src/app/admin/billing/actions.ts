"use server"
import { getAdminClient, requireAdmin } from "../lib"
import { getStripe } from "@/lib/stripe/connect"

// Immediate cancel, not cancel_at_period_end - these are test accounts
// Shawn is paying for out of pocket, the whole point is to stop the next
// charge from happening, not ride out the current period.
export async function cancelTestSubscription(companyId: string): Promise<{ success: boolean; error?: string }> {
  await requireAdmin()
  const admin = getAdminClient()
  const stripe = getStripe()
  if (!stripe) return { success: false, error: "Stripe is not configured." }

  const { data: company } = await admin
    .from("companies")
    .select("id, is_test, stripe_customer_id")
    .eq("id", companyId)
    .single()

  if (!company) return { success: false, error: "Company not found." }
  if (!company.is_test) return { success: false, error: "Refusing to cancel a non-test account from this tool." }
  if (!company.stripe_customer_id) return { success: false, error: "No Stripe customer on file." }

  const subs = await stripe.subscriptions.list({ customer: company.stripe_customer_id, status: "active", limit: 20 })
  for (const sub of subs.data) {
    await stripe.subscriptions.cancel(sub.id)
  }

  await admin.from("companies").update({ subscription_status: "canceled" }).eq("id", companyId)

  return { success: true }
}
