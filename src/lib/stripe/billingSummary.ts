import "server-only"
import { getAdminClient } from "@/app/admin/lib"

type ObjectRow = { company_id: string; object_type: string; facts: Record<string, unknown>; verified_at: string }
type InvoiceRow = { company_id: string; status: string | null; currency: string; amount_remaining: number; facts: Record<string, unknown>; verified_at: string }
export type StoredBillingSummary = {
  status: string | null
  label: string
  needsAttention: boolean
  verifiedAt: string | null
  stale: boolean
  preserveAccess: boolean
  balances: Record<string, number>
}

function amount(cents: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
  return formatter.format(cents / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2))
}

export function summarizeStoredBilling(objects: ObjectRow[], invoices: InvoiceRow[], now = Date.now()): StoredBillingSummary {
  const subscriptions = objects.filter(row => row.object_type === "subscription")
    .sort((a, b) => b.verified_at.localeCompare(a.verified_at))
  const current = subscriptions.filter(row => row.facts.status === "active" || row.facts.status === "trialing")
  const status = current.length > 1 ? "multiple" : String((current[0] ?? subscriptions[0])?.facts.status ?? "") || null
  const verification = objects.find(row => row.object_type === "customer" && row.facts.ledger_complete === true)
  const verifiedAt = verification?.verified_at ?? null
  const stale = !verifiedAt || now - Date.parse(verifiedAt) > 24 * 3600000
  const preserveAccess = objects.some(row => row.object_type === "service_access_override" && row.facts.preserve_access === true)
  const balances: Record<string, number> = {}
  for (const invoice of invoices) {
    if (invoice.status === "open" && invoice.amount_remaining > 0) {
      balances[invoice.currency] = (balances[invoice.currency] ?? 0) + Number(invoice.amount_remaining)
    }
  }
  const balanceLabel = Object.entries(balances).map(([currency, value]) => amount(value, currency)).join(" + ")
  const failed = invoices.some(row => row.status === "open" && row.amount_remaining > 0 &&
    (row.facts.failure_kind === "payment_failed" || row.facts.failure_kind === "action_required"))
  const needsAttention = failed || ["past_due", "unpaid", "canceled", "paused", "incomplete", "incomplete_expired", "multiple"].includes(status ?? "")
  let label = !status ? "Billing not verified" : status === "multiple" ? "Multiple subscriptions - review"
    : status === "active" ? "Billing active" : status === "trialing" ? "Billing trial"
    : `Billing ${status.replace(/_/g, " ")}`
  if (balanceLabel) label += ` - ${balanceLabel} unpaid`
  if (stale) label += " - verification needed"
  return { status, label, needsAttention, verifiedAt, stale, preserveAccess, balances }
}

export async function getStoredBillingSummaries(companyIds: string[]) {
  const summaries = new Map<string, StoredBillingSummary>()
  const admin = getAdminClient()
  for (let offset = 0; offset < companyIds.length; offset += 200) {
    const ids = companyIds.slice(offset, offset + 200)
    const objects: ObjectRow[] = []
    const invoices: InvoiceRow[] = []
    try {
      for (let page = 0; ; page += 500) {
        const result = await admin.from("billing_objects").select("company_id,object_type,facts,verified_at")
          .eq("account_scope", "platform").eq("livemode", true).in("company_id", ids)
          .in("object_type", ["customer", "subscription", "service_access_override"]).order("object_id").range(page, page + 499)
        if (result.error) throw result.error
        objects.push(...(result.data ?? []))
        if ((result.data?.length ?? 0) < 500) break
      }
      for (let page = 0; ; page += 500) {
        const result = await admin.from("billing_invoices").select("company_id,status,currency,amount_remaining,facts,verified_at")
          .eq("account_scope", "platform").eq("livemode", true).in("company_id", ids).order("id").range(page, page + 499)
        if (result.error) throw result.error
        invoices.push(...(result.data ?? []))
        if ((result.data?.length ?? 0) < 500) break
      }
      for (const id of ids) summaries.set(id, summarizeStoredBilling(objects.filter(row => row.company_id === id), invoices.filter(row => row.company_id === id)))
    } catch {
      for (const id of ids) summaries.set(id, summarizeStoredBilling([], []))
    }
  }
  return summaries
}
