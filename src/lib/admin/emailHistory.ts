import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"

export type EmailCategory = "found_clients" | "business" | "admin_alerts" | "unclassified"
export interface EmailHistoryMetadata {
  id: string
  company_id: string | null
  lead_id: string | null
  recipient_email: string | null
  recipient_type: string | null
  email_type: string | null
  source: string | null
  email_scope: string | null
  subject: string | null
  success: boolean | null
  delivery_status: string | null
  handled_at: string | null
  handled_note: string | null
  created_at: string
}
export interface EmailHistoryRow extends EmailHistoryMetadata {
  staff_flagged: boolean
  category: EmailCategory
  history_category: EmailCategory
  company_name: string | null
  company_slug: string | null
}
export interface EmailClientSummary {
  id: string
  name: string
  slug: string
  /** Stored application state only; never a verification of payment. */
  subscription_status: string | null
  client_state: string | null
  latest: EmailHistoryRow | null
  messageCount: number
  issueCount: number
}
export interface EmailHistoryFilters {
  category?: EmailCategory | "all"
  clientId?: string
  q?: string
  status?: "all" | "issues" | "handled" | "flagged"
  page?: number
}
export interface AdminEmailHistoryResult {
  filters: Required<EmailHistoryFilters>
  clients: EmailClientSummary[]
  rows: EmailHistoryRow[]
  total: number | null
  page: number
  pageSize: 25
  categoryCounts: Record<EmailCategory, number> | null
  unlinkedFoundCount: number | null
  unlinkedLoginCount: number | null
  error: string | null
  handlingReady: boolean
}

// Exact tuples verified in the sending source. A default/legacy scope must
// neither promote business notifications into client correspondence nor hide it.
const rules: Array<[string, string, string, EmailCategory]> = [
  ["site_live", "client_owner", "activationEmails/sendSiteLiveEmailOnce", "found_clients"],
  ["activation_reminder", "client_owner", "activationEmails/sendActivationReminderEmailOnce", "found_clients"],
  ["magic_link_login", "client_owner", "dashboard/api/send-login", "found_clients"],
  ["deferred_billing_add_card", "client_owner", "admin/new-client/deferClientBilling", "found_clients"],
  ["deferred_billing_add_card", "client_owner", "admin/new-client/resendCardLinkEmail", "found_clients"],
  ["permanent_comp_live", "client_owner", "admin/new-client/setPermanentComp", "found_clients"],
  ["automation_draft", "client_owner", "admin/growth/sendApprovedAutomationEmail", "found_clients"],
  ["new_signup_alert", "admin", "adminAlerts/sendNewSignupAlert", "admin_alerts"],
  ["domain_help_request", "admin", "site/actions/requestDomainHelp", "admin_alerts"],
  ["owner_reply_to_lead", "lead", "actions/reply/sendReply", "business"],
  ["reservation_notification", "client_owner", "actions/leads/submitReservation", "business"],
  ["reservation_auto_reply", "lead", "actions/leads/submitReservation", "business"],
  ["lead_notification", "client_owner", "actions/leads/submitLead", "business"],
  ["lead_auto_reply", "lead", "actions/leads/submitLead", "business"],
  ["booking_notification", "client_owner", "api/bookings/create", "business"],
  ["booking_confirmation", "lead", "api/bookings/create", "business"],
  ["online_order_notification", "client_owner", "api/online-order/complete", "business"],
  ["online_order_receipt", "lead", "api/online-order/complete", "business"],
  ["online_order_notification_webhook", "client_owner", "api/stripe/webhook/handleOnlineOrderCheckout", "business"],
  ["shop_order_notification", "client_owner", "api/shopping-cart/complete", "business"],
  ["shop_order_receipt", "lead", "api/shopping-cart/complete", "business"],
  ["team_invite", "team_member", "dashboard/team", "business"],
  ...["lead_followup_day1", "lead_followup_day3", "lead_followup_day7"].map(type =>
    [type, "lead", "api/cron/lead-followup", "business"] as [string, string, string, EmailCategory]),
  ...["estimate_deposit_owner", "estimate_balance_owner"].map(type =>
    [type, "client_owner", "api/stripe/webhook/payment_intent.succeeded", "business"] as [string, string, string, EmailCategory]),
  ...["estimate_deposit_receipt", "estimate_balance_receipt"].map(type =>
    [type, "lead", "api/stripe/webhook/payment_intent.succeeded", "business"] as [string, string, string, EmailCategory]),
]

export function classifyEmail(row: {
  email_type?: string | null; recipient_type?: string | null
  source?: string | null; email_scope?: string | null; lead_id?: string | null
}): EmailCategory {
  if (row.email_type === "billing_payment_attention" &&
    /^billing-notification\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.source ?? "") && !row.lead_id) {
    if (row.recipient_type === "admin") return "admin_alerts"
    if (row.recipient_type === "client_owner") return "found_clients"
  }
  const category = rules.find(([purpose, recipient, source]) =>
    row.email_type === purpose && row.recipient_type === recipient && row.source === source
  )?.[3] ?? "unclassified"
  return row.lead_id && (category === "found_clients" || category === "admin_alerts") ? "unclassified" : category
}

export function emailDeliveryLabel(row: { success: boolean | null; delivery_status: string | null }): string {
  if (row.success === false) return "Failed"
  const labels: Record<string, string> = {
    delivered: "Delivered", sent: "Accepted — delivery unconfirmed", bounced: "Bounced", complained: "Marked spam",
    delayed: "Delayed", failed: "Failed",
  }
  const status = row.delivery_status?.replace(/^email\./, "").replace(/^delivery_delayed$/, "delayed")
  if (status) return labels[status] ?? "Unknown delivery status"
  return row.success === true ? "Accepted by provider; delivery unknown" : "Delivery unknown"
}

function hasIssue(row: EmailHistoryMetadata): boolean {
  const status = row.delivery_status?.replace(/^email\./, "").replace(/^delivery_delayed$/, "delayed")
  return row.success === false || ["bounced", "complained", "delayed", "failed"].includes(status ?? "")
}
const metadataFields = "id,company_id,lead_id,recipient_email,recipient_type,email_type,source,email_scope,subject,success,delivery_status,created_at"
interface CompanyMetadata {
  id: string; name: string; slug: string; email: string | null
  account_kind: string | null; is_test: boolean | null; retired_at: string | null
  subscription_status: string | null; client_state: string | null
}

// Scan metadata only, not bodies. Exact counts prevent silent truncation at a
// server row cap (which can be lower than the requested range). Never filter
// or page the display until every metadata page has succeeded.
async function scan<T extends { id: string }>(
  admin: Pick<SupabaseClient, "from">, table: string, fields: string, chronological: boolean,
): Promise<T[]> {
  const rows: T[] = [], seen = new Set<string>()
  let total: number | null = null
  do {
    let query = admin.from(table).select(fields, { count: "exact" })
    if (chronological) query = query.order("created_at", { ascending: false })
    const result = await query.order("id", { ascending: false }).range(rows.length, rows.length + 499)
    if (result.error) throw result.error
    if (!Array.isArray(result.data) || !Number.isSafeInteger(result.count) || (result.count ?? -1) < 0) {
      throw new Error("Incomplete metadata response")
    }
    if (total !== null && total !== result.count) throw new Error("History changed during scan")
    total = result.count
    for (const row of result.data as unknown as T[]) {
      if (!row.id || seen.has(row.id)) throw new Error("History changed during scan")
      seen.add(row.id); rows.push(row)
    }
    if (rows.length > total! || (!result.data.length && rows.length < total!)) throw new Error("Incomplete metadata response")
  } while (rows.length < total!)
  return rows
}

/** Caller must authenticate the admin before supplying its service client. Read-only. */
export async function getAdminEmailHistory(
  admin: Pick<SupabaseClient, "from">, input: EmailHistoryFilters = {},
): Promise<AdminEmailHistoryResult> {
  const categories: EmailCategory[] = ["found_clients", "business", "admin_alerts", "unclassified"]
  const filters: Required<EmailHistoryFilters> = {
    category: input.category === "all" || categories.includes(input.category as EmailCategory) ? input.category! : "found_clients",
    clientId: input.clientId?.trim() ?? "", q: input.q?.trim() ?? "",
    status: input.status === "issues" || input.status === "handled" || input.status === "flagged" ? input.status : "all",
    page: Number.isSafeInteger(input.page) && input.page! > 0 ? input.page! : 1,
  }
  const unavailable: AdminEmailHistoryResult = {
    filters, clients: [], rows: [], total: null, page: filters.page, pageSize: 25,
    categoryCounts: null, unlinkedFoundCount: null, unlinkedLoginCount: null,
    error: "Email history is unavailable. Please try again.", handlingReady: false,
  }
  try {
    let handlingReady = true
    let metadata: EmailHistoryMetadata[]
    try {
      metadata = await scan<EmailHistoryMetadata>(admin, "email_log", `${metadataFields},handled_at,handled_note`, true)
    } catch (error) {
      const failure = error as { code?: string; message?: string }
      if (failure.code !== "42703" || !/handled_(at|note)/.test(failure.message ?? "")) throw error
      handlingReady = false
      metadata = (await scan<EmailHistoryMetadata>(admin, "email_log", metadataFields, true))
        .map(row => ({ ...row, handled_at: null, handled_note: null }))
    }
    const companies = await scan<CompanyMetadata>(admin, "companies",
      "id,name,slug,email,account_kind,is_test,retired_at,subscription_status,client_state", false)
    const leads = await scan<{ id: string; flagged: boolean | null }>(admin, "leads", "id,flagged", false)
    const flaggedLeads = new Set(leads.filter(lead => lead.flagged === true).map(lead => lead.id))
    const byId = new Map(companies.map(company => [company.id, company]))
    const categoryCounts = { found_clients: 0, business: 0, admin_alerts: 0, unclassified: 0 }
    const rows: EmailHistoryRow[] = metadata.map(row => {
      const company = row.company_id ? byId.get(row.company_id) : null
      const category = classifyEmail(row)
      categoryCounts[category]++
      return { ...row, category, history_category: category,
        staff_flagged: !!row.lead_id && flaggedLeads.has(row.lead_id),
        company_name: company?.name ?? null, company_slug: company?.slug ?? null }
    })
    // Stable tie-break identical to the server scan; no display reordering by category.
    rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
    const direct = rows.filter(row => row.category === "found_clients")
    const clients: EmailClientSummary[] = companies.filter(company =>
      company.account_kind === "client" && !company.retired_at && company.is_test !== true
    ).map(company => {
      const history = direct.filter(row => row.company_id === company.id)
      return { id: company.id, name: company.name, slug: company.slug,
        subscription_status: company.subscription_status, client_state: company.client_state,
        latest: history[0] ?? null, messageCount: history.length, issueCount: history.filter(hasIssue).length }
    }).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
    const query = filters.q.toLowerCase()
    const filtered = rows.filter(row =>
      (filters.category === "all" || row.category === filters.category) &&
      (!filters.clientId || (filters.clientId === "unlinked"
        ? row.category === "found_clients" && !row.company_id : row.company_id === filters.clientId)) &&
      (filters.status !== "issues" || hasIssue(row)) &&
      (filters.status !== "handled" || !!row.handled_at) &&
      (filters.status !== "flagged" || row.staff_flagged) &&
      (!query || [row.company_name, row.company_slug, row.recipient_email, row.subject, row.email_type, row.source]
        .some(value => value?.toLowerCase().includes(query)))
    )
    return { filters, clients, rows: filtered.slice((filters.page - 1) * 25, filters.page * 25),
      total: filtered.length, page: filters.page, pageSize: 25, categoryCounts,
      unlinkedFoundCount: direct.filter(row => !row.company_id).length,
      unlinkedLoginCount: direct.filter(row => !row.company_id && row.email_type === "magic_link_login").length,
      error: null, handlingReady }
  } catch { return unavailable }
}
