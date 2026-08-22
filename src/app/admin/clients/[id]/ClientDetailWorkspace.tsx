"use client"

import { useState, useTransition } from "react"
import { setViewAsCookie, toggleTest, setIncludedAddon, setDisabledAddon } from "../../businesses/actions"
import { getAllAddonsRanked, ALL_ADDONS, BUSINESS_INCLUDED_ADDONS } from "@/lib/featureAccess"
import { updateClientRecord, addClientNote, updateClientContactName, updateClientAddress } from "../actions"
import { deferClientBilling, setPermanentComp, resendCardLinkEmail } from "../../new-client/actions"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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
  created_at: string
  activities: { summary: string; activity_type: string; metadata?: Record<string, unknown> | null; created_at: string }[]
  emails: { subject: string; email_type: string; recipient_email: string; success: boolean; created_at: string }[]
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
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function stateTone(state: string) {
  if (state === "active" || state === "comp") return "success"
  if (state === "past_due" || state === "cancelled") return "warning"
  return "info"
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
  const isActiveSubscription = client.subscription_status === "active" || client.subscription_status === "trialing"
  const returnTo = `/admin/clients/${client.id}`
  const siteUrl = `https://${client.slug}.${ROOT_DOMAIN}`
  const activateUrl = `https://${ROOT_DOMAIN}/activate?slug=${client.slug}`
  const addressLine = [client.address, [client.city, client.state].filter(Boolean).join(", "), client.zip].filter(Boolean).join(" · ")
  const plan = planDisplay(client.plan)
  const cardDueLabel = formatStoredDate(client.trial_ends_at)
  const billingAnchorLabel = client.billing_cycle_day
    ? `${client.billing_cycle_day}${ordinalSuffix(client.billing_cycle_day)} of every month`
    : "Not anchored"
  const stripeStatus = client.subscription_status ?? "not connected"
  const billingStatusLabel = isActiveSubscription
    ? client.subscription_status === "trialing" && cardDueLabel
      ? `Active in Stripe - trial until ${cardDueLabel}`
      : `Active in Stripe - ${stripeStatus}`
    : client.is_comp
      ? "Permanent comp - no card needed"
      : cardDueLabel
        ? "Card not on file yet"
        : "Not activated"
  const collectedLabel = client.deferred_payment_amount != null
    ? `$${Number(client.deferred_payment_amount).toFixed(2)}${client.deferred_payment_method ? ` (${client.deferred_payment_method})` : ""}${client.deferred_payment_note ? ` - ${client.deferred_payment_note}` : ""}`
    : "Nothing recorded"
  const lastBillingActivity = client.activities.find((activity) =>
    activity.activity_type === "billing" || activity.summary.toLowerCase().includes("billing"),
  )
  const expectedChargeLabel = plan.price === "No monthly price" ? plan.price : plan.price
  const nextAction = client.client_state === "past_due"
    ? "Fix payment risk"
    : !isActiveSubscription && !client.is_comp
      ? "Get card on file"
      : client.client_state === "onboarding"
        ? "Finish launch"
        : "Keep relationship warm"

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
    <>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">{client.contact_name || "No contact name yet"}</p>
          <h1 className="hq-title">{client.name}</h1>
          <p className="hq-subtitle">
            <span className={`hq-badge hq-badge-${stateTone(client.client_state)}`} style={{ marginRight: 6 }}>
              {client.account_kind === "test" ? "Test" : client.client_state.replace("_", " ")}
            </span>
            {planLabel(client.plan)}
          </p>
        </div>
      </header>

      <div className="hq-form-wide" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <a className="hq-button hq-button-secondary" href={siteUrl} target="_blank" rel="noopener noreferrer">Site</a>
        <button className="hq-button hq-button-primary" type="button" onClick={() => openViewAs(client.id)}>View as</button>
      </div>

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Status</h2></div>
        <div className="hq-detail-snapshot">
          <div><span>State</span><strong>{client.client_state.replace("_", " ")}</strong></div>
          <div><span>Plan</span><strong>{plan.name}</strong></div>
          <div><span>Billing</span><strong>{billingStatusLabel}</strong></div>
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Next action</h2></div>
        <div className="hq-panel hq-next-action">
          <div>
            <p className="hq-row-title">{nextAction}</p>
            <p className="hq-row-meta">{client.client_state === "past_due" ? "This account is a revenue risk." : !isActiveSubscription && !client.is_comp ? "Activation is not complete until billing is handled." : client.client_state === "onboarding" ? "Finish the setup work that blocks launch." : "No urgent risk is visible."}</p>
          </div>
        </div>
      </section>

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Billing</h2></div>
        <div className="hq-panel" style={{ padding: 16 }}>
          <p className="hq-row-title">Billing snapshot</p>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <div>
              <p className="hq-row-meta">Stripe status</p>
              <p className="hq-row-title">{billingStatusLabel}</p>
            </div>
            <div>
              <p className="hq-row-meta">Current plan</p>
              <p className="hq-row-title">{plan.name}</p>
              <p className="hq-row-meta">Expected charge: {expectedChargeLabel}</p>
            </div>
            <div>
              <p className="hq-row-meta">{client.subscription_status === "trialing" ? "First automatic charge" : "Card due / billing starts"}</p>
              <p className="hq-row-title">{cardDueLabel ?? "No date set"}</p>
            </div>
            <div>
              <p className="hq-row-meta">Billing day</p>
              <p className="hq-row-title">{billingAnchorLabel}</p>
            </div>
            <div>
              <p className="hq-row-meta">Stripe customer</p>
              <p className="hq-row-title">{client.stripe_customer_id ? "Connected" : "Not connected"}</p>
              {client.stripe_customer_id && <p className="hq-row-meta">{client.stripe_customer_id}</p>}
            </div>
            <div>
              <p className="hq-row-meta">Already collected</p>
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
          {!isActiveSubscription && !client.is_comp && client.trial_ends_at && (
            <form action={resendCardLinkEmail} style={{ marginTop: 10 }}>
              <input type="hidden" name="companyId" value={client.id} />
              <button className="hq-button hq-button-secondary" type="submit" disabled={!client.email} style={{ width: "100%" }}>
                {client.email ? "Resend card link + copy me" : "No email on file to resend to"}
              </button>
              {client.email && <p className="hq-row-meta" style={{ marginTop: 8 }}>Sends to {client.email} and copies Shawn.</p>}
            </form>
          )}
        </div>

        {!isActiveSubscription && !client.is_comp && (
          <>
            <div className="hq-panel" style={{ padding: 16, marginTop: 12 }}>
              <p className="hq-row-title">Activate now</p>
              <p className="hq-row-meta">Collect a card immediately - open this link with them:</p>
              <p className="hq-row-meta"><a href={activateUrl}>{activateUrl}</a></p>
            </div>
            <div className="hq-panel" style={{ padding: 16, marginTop: 12 }}>
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
                <label>Already collected? Amount
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
            <div className="hq-panel" style={{ padding: 16, marginTop: 12 }}>
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

      <section className="hq-section">
        <div className="hq-section-head"><h2 className="hq-section-title">Relationship</h2></div>
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
                <div className="hq-filter-row">
                  <button type="button" data-active={!includedAddon} disabled={addonPending} onClick={() => handleAddonChange(null)}>None</button>
                  {relevantAddons.map((addon) => (
                    <button key={addon.slug} type="button" data-active={includedAddon === addon.slug} disabled={addonPending} onClick={() => handleAddonChange(addon.slug)}>{addon.label}</button>
                  ))}
                </div>
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
          <form action={addClientNote} className="hq-inline-form" style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={client.id} />
            <label className="hq-form-grow">Dated note<input name="note" required placeholder="Conversation, promise, or context" /></label>
            <button className="hq-button hq-button-secondary" type="submit">Add note</button>
          </form>
        </div>
      </section>

      {(client.activities.length > 0 || client.emails.length > 0) && (
        <section className="hq-section">
          <div className="hq-section-head"><h2 className="hq-section-title">History</h2></div>
          <div className="hq-panel" style={{ padding: 16 }}>
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
            {client.emails.length > 0 && (
              <div className="hq-form-note">
                <strong>Emails sent</strong>
                <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                  {client.emails.map((email, i) => (
                    <li key={i}>{formatShortDate(email.created_at)} - {email.success ? "Sent" : "FAILED"}: {email.email_type} to {email.recipient_email}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  )
}
