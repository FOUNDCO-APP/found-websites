"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { setViewAsCookie, toggleTest, setIncludedAddon, setDisabledAddon } from "../../businesses/actions"
import { getAllAddonsRanked, ALL_ADDONS, BUSINESS_INCLUDED_ADDONS } from "@/lib/featureAccess"
import { activityEventLabel, activitySurfaceLabel } from "../../customerActivitySignals"
import { adminTestIdentityReason, isAdminTestIdentity } from "../../testIdentity"
import { updateClientRecord, addClientNote, updateClientContactName, updateClientAddress } from "../actions"
import { deferClientBilling, setPermanentComp, resendCardLinkEmail } from "../../new-client/actions"
import type { StoredBillingSummary } from "@/lib/stripe/billingSummary"
import type { ClientBillingFacts } from "@/lib/stripe/clientBillingFacts"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const ADMIN_TIME_ZONE = "America/Phoenix"

export type ClientDetail = {
  id: string
  name: string
  slug: string
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  address_visible: boolean | null
  plan: string | null
  subscription_status: string | null
  billing: StoredBillingSummary | null
  billing_facts: ClientBillingFacts
  email_history_ready: boolean
  client_state: string
  account_kind: string
  comp_reason: string | null
  is_comp: boolean | null
  trial_ends_at: string | null
  billing_cycle_day: number | null
  deferred_payment_amount: number | null
  deferred_payment_method: string | null
  deferred_payment_note: string | null
  industry_category: string | null
  is_test: boolean | null
  included_addon_slug: string | null
  disabled_addons: string[] | null
  stripe_customer_id: string | null
  stripe_connect_account_id: string | null
  billing_payment_signal: {
    status: "card_on_file" | "no_card" | "no_stripe_customer" | "stripe_unavailable" | "lookup_failed"
    label: string
    detail: string | null
  }
  created_at: string
  activities: { summary: string; activity_type: string; metadata?: Record<string, unknown> | null; created_at: string }[]
  emails: { subject: string; email_type: string; recipient_email: string; success: boolean | null; created_at: string; delivery_status?: string | null; history_category: "owner_account" | "lead_automation" | "business_operations" | "unknown" }[]
  customer_activities: { event_type: string; surface: string; feature: string | null; created_at: string }[]
  customer_activity_ready: boolean
}

function planLabel(plan: string | null) {
  if (plan === "found_business") return "Business / $69"
  if (plan === "found_pro") return "Pro / $39"
  if (plan === "found") return "Starter / $29"
  return "No plan"
}

function planDisplay(plan: string | null) {
  if (plan === "found_business") return { name: "Found Business", price: "$69/month" }
  if (plan === "found_pro") return { name: "Found Pro", price: "$39/month" }
  if (plan === "found") return { name: "Found Starter", price: "$29/month" }
  return { name: "No plan", price: "No monthly price" }
}

function ordinalSuffix(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st"
  if (n % 10 === 2 && n % 100 !== 12) return "nd"
  if (n % 10 === 3 && n % 100 !== 13) return "rd"
  return "th"
}

function formatStoredDate(value: string | null | undefined) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: ADMIN_TIME_ZONE })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: ADMIN_TIME_ZONE,
  })
}

function adminDayNumber(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ADMIN_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000)
}

function formatLastActivity(value: string | null) {
  if (!value) return "No recorded client activity"
  const date = new Date(value)
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: ADMIN_TIME_ZONE })
  const days = adminDayNumber(new Date()) - adminDayNumber(date)
  if (days <= 0) return `Used today at ${time}`
  if (days === 1) return `Used yesterday at ${time}`
  return `Used ${days} days ago`
}

function followUpLabel(value: string | null | undefined) {
  if (!value) return "No follow-up date"
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000)
  if (days >= 0) return days === 0 ? "Follow up today" : `Follow-up overdue ${days} days`
  const daysAway = Math.abs(days)
  if (daysAway === 1) return "Follow up tomorrow"
  return `Follow up in ${daysAway} days`
}

function nextFollowUpAt(activity: { metadata?: Record<string, unknown> | null } | undefined) {
  const value = activity?.metadata?.next_follow_up_at
  return typeof value === "string" ? value : null
}

function outreachMethodLabel(value: string) {
  if (value === "outreach_call") return "Call"
  if (value === "outreach_text") return "Text"
  if (value === "outreach_email") return "Email"
  if (value === "outreach_skip") return "Skipped"
  return activityEventLabel(value)
}

function emailDeliveryLabel(email: ClientDetail["emails"][number]) {
  if (email.success === false) return "Failed"
  const status = email.delivery_status?.replace(/^email\./, "")
  if (status === "delivered") return "Delivered"
  if (status === "bounced") return "Bounced"
  if (status === "delivery_delayed" || status === "delayed") return "Delayed"
  if (status === "complained") return "Spam complaint"
  if (status === "failed") return "Failed"
  if (status === "sent" || (!status && email.success === true)) return "Accepted - delivery unconfirmed"
  return "Delivery unknown"
}

function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
  return formatter.format(amount / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2))
}

async function openViewAs(companyId: string) {
  const tab = window.open("about:blank", "_blank")
  try {
    const result = await setViewAsCookie(companyId)
    if (result.success && tab) tab.location.href = `https://my.${ROOT_DOMAIN}/?admin_view=1`
    else tab?.close()
  } catch { tab?.close() }
}

export default function ClientDetailWorkspace({ client }: { client: ClientDetail }) {
  const [state, setState] = useState(client.client_state)
  const [isTest, setIsTest] = useState(Boolean(client.is_test))
  const [testPending, startTestTransition] = useTransition()
  const [includedAddon, setIncludedAddonState] = useState(client.included_addon_slug)
  const [addonPending, startAddonTransition] = useTransition()
  const [disabledAddons, setDisabledAddons] = useState<string[]>(client.disabled_addons ?? [])
  const [bundledPending, startBundledTransition] = useTransition()
  const [editingContact, setEditingContact] = useState(false)
  const [editingAddress, setEditingAddress] = useState(false)
  const relevantAddons = client.plan === "found_pro" ? getAllAddonsRanked(client.industry_category ?? "") : []
  const bundledAddons = client.plan === "found_business"
    ? BUSINESS_INCLUDED_ADDONS.map(slug => ALL_ADDONS.find(a => a.slug === slug)).filter((a): a is NonNullable<typeof a> => !!a)
    : []
  const isTestIdentity = isAdminTestIdentity(client)
  const testIdentityReason = isTestIdentity ? adminTestIdentityReason(client) : null
  const returnTo = `/admin/clients/${client.id}`
  const siteUrl = `https://${client.slug}.${ROOT_DOMAIN}`
  const activateUrl = `https://${ROOT_DOMAIN}/activate?slug=${client.slug}`
  const addressLine = [client.address, [client.city, client.state].filter(Boolean).join(", "), client.zip].filter(Boolean).join(" · ")
  const plan = planDisplay(client.plan)
  const cardDueLabel = formatStoredDate(client.trial_ends_at)
  const billingAnchorLabel = client.billing_cycle_day
    ? `${client.billing_cycle_day}${ordinalSuffix(client.billing_cycle_day)} of every month`
    : "Not anchored"
  const confirmedNoCard = client.billing_payment_signal.status === "no_card" || client.billing_payment_signal.status === "no_stripe_customer"
  const collectedLabel = client.deferred_payment_amount != null
    ? `$${Number(client.deferred_payment_amount).toFixed(2)}${client.deferred_payment_method ? ` (${client.deferred_payment_method})` : ""}${client.deferred_payment_note ? ` - ${client.deferred_payment_note}` : ""}`
    : "No manual payment recorded"
  const lastBillingActivity = client.activities.find((activity) =>
    activity.activity_type === "billing" || activity.summary.toLowerCase().includes("billing"),
  )
  const outreachActivities = client.activities.filter((activity) => activity.activity_type.startsWith("outreach_"))
  const lastOutreachActivity = outreachActivities[0] ?? null
  const lastCustomerActivity = client.customer_activities[0] ?? null
  const accountStatusLabel = isTestIdentity ? "Test account" : client.client_state.replace("_", " ")
  const billingUrl = `/admin/payments?q=${encodeURIComponent(client.slug)}`
  const accountEmails = client.emails.filter(email => email.history_category === "owner_account")
  const leadEmails = client.emails.filter(email => email.history_category === "lead_automation")
  const otherEmails = client.emails.filter(email => email.history_category === "business_operations" || email.history_category === "unknown")
  const facts = client.billing_facts
  const balanceLabel = facts.outstandingInvoices.balanceByCurrency === null ? "Unknown - review live billing"
    : Object.entries(facts.outstandingInvoices.balanceByCurrency).map(([currency, amount]) => money(amount, currency)).join(" + ") || "No outstanding balance"
  const lastPayment = facts.lastSuccessfulPayment.payment
  const failedPayment = facts.latestFailedPayment.payment
  const nextAttempt = facts.nextCharge.scheduledAttempt
  const nextRenewal = facts.nextCharge.expectedRenewal
  const billingStatusLabel = facts.subscriptionStatus === "multiple" ? "Multiple subscriptions - review billing"
    : facts.subscriptionStatus ? `Billing ${facts.subscriptionStatus.replace(/_/g, " ")}`
    : "Live billing status not confirmed"

  function handleTestToggle() {
    const next = !isTest
    setIsTest(next)
    startTestTransition(() => { toggleTest(client.id, next) })
  }

  function handleAddonChange(slug: string | null) {
    if (slug === includedAddon) return
    setIncludedAddonState(slug)
    startAddonTransition(() => { setIncludedAddon(client.id, slug) })
  }

  function handleBundledToggle(slug: string) {
    const hide = !disabledAddons.includes(slug)
    setDisabledAddons((prev) => hide ? [...prev, slug] : prev.filter((s) => s !== slug))
    startBundledTransition(() => { setDisabledAddon(client.id, slug, hide) })
  }

  return (
    <div className="hq-client-detail">
      <header className="hq-header">
        <div>
          {client.contact_name && <p className="hq-eyebrow">{client.contact_name}</p>}
          <h1 className="hq-title">{client.name}</h1>
          <p className="hq-subtitle">
            {planLabel(client.plan)}
          </p>
        </div>
      </header>

      {isTestIdentity && (
        <section className="hq-command-status" style={{ marginBottom: 16 }}>
          <div>
            <span>Admin-only test account</span>
            <strong>Safe for QA</strong>
            <p>{testIdentityReason}. This label is only shown inside Found HQ and is excluded from public site pages.</p>
          </div>
          <a href="/admin/test-center">Open Test Center<span className="hq-chevron" /></a>
        </section>
      )}

      <section className="hq-client-overview">
        <div className="hq-client-command-head">
          <div>
            <p className="hq-row-title">{billingStatusLabel}</p>
            <p className="hq-row-meta">{facts.completeness === "complete" ? `Live ledger checked ${formatDateTime(facts.checkedAt)}` : "Live ledger incomplete - review billing"}</p>
          </div>
          <div className="hq-client-command-actions">
            <a className="hq-button hq-button-primary" href={billingUrl}>Review billing</a>
            <a className="hq-button hq-button-secondary" href={siteUrl} target="_blank" rel="noopener noreferrer">Site</a>
            <button className="hq-button hq-button-secondary" type="button" onClick={() => openViewAs(client.id)}>View as</button>
          </div>
        </div>
        <dl className="hq-client-facts">
          <div><dt>Outstanding balance</dt><dd>{balanceLabel}</dd></div>
          <div><dt>Last successful payment</dt><dd>{lastPayment ? <>{money(lastPayment.amountCaptured, lastPayment.currency)}<small>Charge dated {formatDateTime(lastPayment.timestamp)}</small></> : facts.lastSuccessfulPayment.status === "none" ? "No captured payments recorded" : "Unknown"}</dd></div>
          <div><dt>Latest failed payment</dt><dd>{failedPayment ? <>{failedPayment.reason || failedPayment.code?.replace(/_/g, " ") || "Reason not recorded"}<small>{formatDateTime(failedPayment.timestamp)}</small></> : facts.latestFailedPayment.status === "none" ? "No failed charges recorded" : "Unknown"}</dd></div>
          <div><dt>Next automatic charge</dt><dd>{nextAttempt ? <>{money(nextAttempt.amountRemaining, nextAttempt.currency)}<small>{formatDateTime(nextAttempt.at)}</small></> : facts.nextCharge.status === "renewal_expected" && nextRenewal ? <>Renewal expected {formatDateTime(nextRenewal.at)}<small>No collection attempt scheduled yet</small></> : facts.nextCharge.status === "none" ? "No charge scheduled" : "Not confirmed"}</dd></div>
          <div><dt>Live billing check</dt><dd>{formatDateTime(facts.checkedAt)}<small>{facts.completeness === "complete" ? "Complete ledger" : "Incomplete - amounts may be unknown"}</small></dd></div>
          <div><dt>Relationship</dt><dd>{accountStatusLabel}</dd></div>
          <div><dt>Site access</dt><dd>{client.billing?.preserveAccess ? "Protected - no billing hold" : `Stored service status: ${client.subscription_status ?? "Unknown"}`}</dd></div>
          <div><dt>Last tracked activity</dt><dd>{client.customer_activity_ready ? formatLastActivity(lastCustomerActivity?.created_at ?? null) : "Activity unavailable"}</dd></div>
          <div><dt>Follow-up</dt><dd>{lastOutreachActivity ? followUpLabel(nextFollowUpAt(lastOutreachActivity)) : "No outreach logged"}</dd></div>
        </dl>
        <div className="hq-client-contact-actions">
          {client.phone && <a className="hq-button hq-button-secondary" href={`tel:${client.phone}`}>Call</a>}
          {client.phone && <a className="hq-button hq-button-secondary" href={`sms:${client.phone}`}>Text</a>}
          {client.email && <a className="hq-button hq-button-secondary" href={`mailto:${client.email}`}>Email</a>}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Client activity</h2>
          <span className="hq-section-meta">Recorded dashboard events</span>
        </div>
        <div>
          {!client.customer_activity_ready && (
            <p className="hq-client-compact-empty">Activity unavailable</p>
          )}
          {client.customer_activity_ready && client.customer_activities.length === 0 && (
            <p className="hq-client-compact-empty">No recorded client activity in the last 90 days</p>
          )}
          {client.customer_activity_ready && client.customer_activities.length > 0 && <details className="hq-client-history"><summary>Recent activity</summary>{client.customer_activities.slice(0, 12).map((activity, index) => (
            <div key={`${activity.created_at}-${index}`} className="hq-row">
              <div>
                <p className="hq-row-title">{activityEventLabel(activity.event_type)}</p>
                <p className="hq-row-meta">{activitySurfaceLabel(activity.surface)}{activity.feature ? ` / ${activitySurfaceLabel(activity.feature)}` : ""}</p>
              </div>
              <span className="hq-row-meta">{formatDateTime(activity.created_at)}</span>
            </div>
          ))}</details>}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head">
          <h2 className="hq-section-title">Outreach</h2>
          <span className="hq-section-meta">Admin follow-up</span>
        </div>
        <div>
          {outreachActivities.length === 0 && (
            <p className="hq-client-compact-empty">No outreach logged</p>
          )}
          {outreachActivities.slice(0, 12).map((activity, index) => (
            <div key={`${activity.created_at}-${index}`} className="hq-row">
              <div>
                <p className="hq-row-title">{outreachMethodLabel(activity.activity_type)}</p>
                <p className="hq-row-meta">{activity.summary}{nextFollowUpAt(activity) ? ` / ${followUpLabel(nextFollowUpAt(activity))}` : ""}</p>
              </div>
              <span className="hq-row-meta">{formatDateTime(activity.created_at)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Billing</h2></div>
        {facts.outstandingInvoices.invoices.map(invoice => <div className="hq-row" key={invoice.id}><div><p className="hq-row-title">{money(invoice.amountRemaining, invoice.currency)} remaining</p><p className="hq-row-meta">{invoice.status === "uncollectible" ? "Marked uncollectible" : "Open invoice"}{invoice.dueAt ? ` - due ${formatDateTime(invoice.dueAt)}` : ""}</p></div><a href={billingUrl} className="hq-button hq-button-secondary">Review invoice</a></div>)}
        {facts.errors.length > 0 && <p className="hq-client-compact-empty" role="status">Live billing is not fully verified. <a href={billingUrl}>Review billing</a></p>}
        <details className="hq-client-history"><summary>Payment method and local records</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div>
              <p className="hq-row-meta">Saved payment method</p>
              <p className="hq-row-title">{client.billing_payment_signal.label}</p>
              {client.billing_payment_signal.detail && <p className="hq-row-meta">{client.billing_payment_signal.detail}</p>}
            </div>
            <div>
              <p className="hq-row-meta">Stripe status</p>
              <p className="hq-row-title">{facts.subscriptionStatus ?? "Not confirmed"}</p>
            </div>
            <div>
              <p className="hq-row-meta">Current plan</p>
              <p className="hq-row-title">{plan.name}</p>
              <p className="hq-row-meta">Catalog price: {plan.price}</p>
            </div>
            <div>
              <p className="hq-row-meta">Local card deadline</p>
              <p className="hq-row-title">{cardDueLabel ?? "No date set"}</p>
            </div>
            <div>
              <p className="hq-row-meta">Locally recorded billing day</p>
              <p className="hq-row-title">{billingAnchorLabel}</p>
            </div>
            <div>
              <p className="hq-row-meta">Stripe customer</p>
              <p className="hq-row-title">{client.stripe_customer_id ? "Connected" : "Not connected"}</p>
              {client.stripe_customer_id && <p className="hq-row-meta">{client.stripe_customer_id}</p>}
            </div>
            <div>
              <p className="hq-row-meta">Manual payment recorded</p>
              <p className="hq-row-title">{collectedLabel}</p>
            </div>
            {lastBillingActivity && (
              <div>
                <p className="hq-row-meta">Last billing record</p>
                <p className="hq-row-title">{formatDateTime(lastBillingActivity.created_at)}</p>
                <p className="hq-row-meta">{lastBillingActivity.summary}</p>
              </div>
            )}
          </div>
        </details>
          {confirmedNoCard && !client.is_comp && <details className="hq-client-manage"><summary>Billing setup</summary>
          {confirmedNoCard && !client.is_comp && client.trial_ends_at && (
            <form action={resendCardLinkEmail} style={{ marginTop: 10 }}>
              <input type="hidden" name="companyId" value={client.id} />
              <button className="hq-button hq-button-secondary" type="submit" disabled={!client.email} style={{ width: "100%" }}>
                {client.email ? "Resend card link + copy me" : "No email on file to resend to"}
              </button>
              {client.email && <p className="hq-row-meta" style={{ marginTop: 8 }}>Sends to {client.email} and copies Shawn.</p>}
            </form>
          )}
        {confirmedNoCard && !client.is_comp && (
          <>
            <div style={{ paddingBlock: 16 }}>
              <p className="hq-row-title">Activate now</p>
              <p className="hq-row-meta">Collect a card immediately - open this link with them:</p>
              <p className="hq-row-meta"><a href={activateUrl}>{activateUrl}</a></p>
            </div>
            <div style={{ paddingBlock: 16 }}>
              <p className="hq-row-title">Defer billing</p>
              <p className="hq-row-meta">No card yet - give them a window to add one before the site pauses.</p>
              <form action={deferClientBilling} className="hq-create-form" style={{ marginTop: 12 }}>
                <input type="hidden" name="companyId" value={client.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label>Term
                  <select name="termDays" required defaultValue="30">
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </label>
                <label>Billing day (optional)
                  <input type="number" name="billingDay" min={1} max={28} placeholder="e.g. 25" />
                </label>
                <label>Manual payment amount
                  <input type="number" name="paymentAmount" min={0} step="0.01" placeholder="e.g. 69.00" />
                </label>
                <label>Method
                  <select name="paymentMethod" defaultValue="">
                    <option value="">-</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="hq-form-wide">Notes (for your own records)
                  <textarea name="reason" rows={2} required placeholder="e.g. paid $69 cash for this cycle, needs a card on file for next" />
                </label>
                <label className="hq-form-wide" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="sendEmail" value="1" style={{ width: "auto" }} />
                  Also email {client.name} the card link now and copy Shawn
                </label>
                <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Defer billing</button></div>
              </form>
            </div>
            <div style={{ paddingBlock: 16 }}>
              <p className="hq-row-title">Permanent</p>
              <p className="hq-row-meta">Free forever, no card ever needed.</p>
              <form action={setPermanentComp} className="hq-create-form" style={{ marginTop: 12 }}>
                <input type="hidden" name="companyId" value={client.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="hq-form-wide">Reason (for your own records)
                  <textarea name="reason" rows={2} required placeholder="e.g. personal friend, permanent comp" />
                </label>
                <label className="hq-form-wide" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="sendEmail" value="1" style={{ width: "auto" }} />
                  Also email {client.name} that their site is live now and copy Shawn
                </label>
                <div className="hq-form-wide"><button className="hq-button hq-button-secondary" type="submit">Set as permanent</button></div>
              </form>
            </div>
          </>
        )}
        </details>}
      </section>

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Contact</h2></div>
        <div className="hq-panel" style={{ padding: 16 }}>
          {editingContact ? (
            <form
              action={async (formData) => { await updateClientContactName(formData); setEditingContact(false) }}
              className="hq-inline-form"
            >
              <input type="hidden" name="id" value={client.id} />
              <label className="hq-form-grow">Contact name<input name="contactName" defaultValue={client.contact_name ?? ""} placeholder="First and last name" autoFocus /></label>
              <button className="hq-button hq-button-primary" type="submit">Save</button>
              <button className="hq-button hq-button-secondary" type="button" onClick={() => setEditingContact(false)}>Cancel</button>
            </form>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p className="hq-row-title">{client.contact_name || "No contact name on file"}</p>
              <button className="hq-button hq-button-secondary" type="button" onClick={() => setEditingContact(true)}>Edit</button>
            </div>
          )}
          <p className="hq-row-meta" style={{ marginTop: 10 }}>{client.email ?? "No email"}{client.phone ? ` / ${client.phone}` : ""}</p>

          {editingAddress ? (
            <form
              action={async (formData) => { await updateClientAddress(formData); setEditingAddress(false) }}
              className="hq-create-form"
              style={{ marginTop: 10 }}
            >
              <input type="hidden" name="id" value={client.id} />
              <label className="hq-form-wide">Street address<input name="address" defaultValue={client.address ?? ""} placeholder="e.g. 428 N. Fremont Ave" autoFocus /></label>
              <label>City<input name="city" defaultValue={client.city ?? ""} /></label>
              <label>State<input name="state" defaultValue={client.state ?? ""} maxLength={2} placeholder="AZ" /></label>
              <label>ZIP<input name="zip" defaultValue={client.zip ?? ""} /></label>
              <div className="hq-form-wide" style={{ display: "flex", gap: 8 }}>
                <button className="hq-button hq-button-primary" type="submit">Save</button>
                <button className="hq-button hq-button-secondary" type="button" onClick={() => setEditingAddress(false)}>Cancel</button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p className="hq-row-meta">
                {addressLine || "No address on file"}
                {client.address && !client.address_visible ? " (hidden from public site)" : ""}
              </p>
              <button className="hq-button hq-button-secondary" type="button" onClick={() => setEditingAddress(true)}>Edit</button>
            </div>
          )}
        </div>
      </section>

      <details className="hq-section hq-client-manage">
        <summary>Manage client</summary>
        <div className="hq-panel" style={{ padding: 16 }}>
          <form action={updateClientRecord} className="hq-inline-form">
            <input type="hidden" name="id" value={client.id} />
            <label>Client state
              <select name="client_state" value={state} onChange={(event) => setState(event.target.value)}>
                <option value="onboarding">Onboarding</option>
                <option value="active">Active</option>
                <option value="comp">Comp</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>Account type<select name="account_kind" defaultValue={client.account_kind}><option value="client">Client</option><option value="test">Test</option></select></label>
            {state === "comp" && <label>Comp reason<input name="comp_reason" required defaultValue={client.comp_reason ?? ""} /></label>}
            <label className="hq-form-grow">Optional note<input name="activity_note" placeholder="Why this changed" /></label>
            <button className="hq-button hq-button-primary" type="submit">Save</button>
          </form>
          {client.plan === "found_pro" && relevantAddons.length > 0 && (
            <div className="hq-inline-form" style={{ marginTop: 12 }}>
              <label className="hq-form-grow">Included add-on (Pro plan, one pick, free)
                <select value={includedAddon ?? ""} disabled={addonPending} onChange={event => handleAddonChange(event.target.value || null)}>
                  <option value="">None</option>
                  {relevantAddons.map((addon) => (
                    <option key={addon.slug} value={addon.slug}>{addon.label}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {client.plan === "found_business" && bundledAddons.length > 0 && (
            <div className="hq-inline-form" style={{ marginTop: 12 }}>
              <label className="hq-form-grow">Bundled add-ons (Business plan, all free - tap to hide one that doesn&apos;t apply)
                <div className="hq-filter-row">
                  {bundledAddons.map((addon) => (
                    <button key={addon.slug} type="button" data-active={!disabledAddons.includes(addon.slug)} disabled={bundledPending} onClick={() => handleBundledToggle(addon.slug)}>{addon.label}</button>
                  ))}
                </div>
              </label>
            </div>
          )}
          <div className="hq-inline-form" style={{ marginTop: 12 }}>
            <button type="button" onClick={handleTestToggle} disabled={testPending} className="hq-button hq-button-secondary">{isTest ? "Show in search" : "Hide from search"}</button>
          </div>
        </div>
      </details>
      <section className="hq-section">
          <form action={addClientNote} className="hq-inline-form">
            <input type="hidden" name="id" value={client.id} />
            <label className="hq-form-grow">Dated note<input name="note" required placeholder="Conversation, promise, or context" /></label>
            <button className="hq-button hq-button-secondary" type="submit">Add note</button>
          </form>
      </section>

        <section className="hq-section">
          <div className="hq-section-head"><h2 className="hq-section-title">History</h2></div>
          <div className="hq-panel" style={{ padding: 16 }}>
            {!client.email_history_ready && <p className="hq-client-compact-empty">Email history unavailable</p>}
            {client.activities.length > 0 && (
              <div className="hq-form-note">
                <strong>Activity</strong>
                <ul style={{ margin: "4px 0 12px", paddingLeft: 18 }}>
                  {client.activities.map((a, i) => (
                    <li key={i}>{formatShortDate(a.created_at)} - {a.summary}</li>
                  ))}
                </ul>
              </div>
            )}
            {accountEmails.length > 0 && (
              <div className="hq-form-note">
                <strong>Recent Found emails</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {accountEmails.map((email, i) => (
                    <li key={i}>{formatShortDate(email.created_at)} - {emailDeliveryLabel(email)}: {email.subject || email.email_type.replace(/_/g, " ")} to {email.recipient_email}</li>
                  ))}
                </ul>
              </div>
            )}
            {client.email_history_ready && accountEmails.length === 0 && <p className="hq-client-compact-empty">No Found account emails in the recent history</p>}
            <p className="hq-form-note"><Link href={`/admin/emails?category=found_clients&client=${encodeURIComponent(client.id)}`}>View Found email history</Link></p>
            <p className="hq-form-note"><Link href={`/admin/emails?category=business&client=${encodeURIComponent(client.id)}`}>View business email history</Link></p>
            {leadEmails.length > 0 && <details className="hq-client-history"><summary>Website lead emails</summary><ul>
              {leadEmails.map((email, i) => <li key={i}>{formatShortDate(email.created_at)} - {emailDeliveryLabel(email)}: {email.subject || email.email_type.replace(/_/g, " ")} to {email.recipient_email}</li>)}
            </ul></details>}
            {otherEmails.length > 0 && <details className="hq-client-history"><summary>Other business emails</summary><ul>{otherEmails.map((email, i) => <li key={i}>{formatShortDate(email.created_at)} - {emailDeliveryLabel(email)}: {email.subject || email.email_type.replace(/_/g, " ")} to {email.recipient_email}</li>)}</ul></details>}
          </div>
        </section>
    </div>
  )
}
