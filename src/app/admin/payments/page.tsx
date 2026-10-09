import Link from "next/link"
import { requireAdmin } from "../lib"
import { getAdminBillingLedger, type CompanyLedger } from "@/lib/stripe/billingLedger"

export const metadata = { title: "Payments - Found HQ" }
export const dynamic = "force-dynamic"

function money(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() })
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(amount / 10 ** digits)
}

function date(timestamp: number | null | undefined) {
  return timestamp == null ? "Not recorded" : new Date(timestamp * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC")
}

function RecordDetails({ title, value }: { title: string; value: unknown }) {
  return <details style={{ minWidth: 0, marginTop: 8 }}><summary className="hq-row-meta">{title}</summary>
    <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 12, maxWidth: "100%" }}>{JSON.stringify(value, null, 2)}</pre>
  </details>
}

function ClientLedger({ row }: { row: CompanyLedger }) {
  return <section className="hq-section" style={{ minWidth: 0 }}>
    <div className="hq-section-head"><h2 className="hq-section-title">{row.company.name}</h2>
      <span className={`hq-badge hq-badge-${row.complete ? "success" : "warning"}`}>{row.complete ? "Live verified" : "Unknown / incomplete"}</span></div>
    <p className="hq-row-meta" style={{ overflowWrap: "anywhere" }}>{row.company.stripe_customer_id ?? "No customer linked"} | Verified: {row.verified_at ?? "Unknown"}</p>
    {row.errors.map((error, index) => <p key={index} role="alert" className="hq-row-meta">{error}</p>)}
    {!row.complete && <p className="hq-row-meta">Totals unknown. Records below are partial.</p>}
    {row.totals_by_currency && Object.entries(row.totals_by_currency).map(([currency, totals]) => <div key={currency} className="hq-row" style={{ flexWrap: "wrap", gap: 12 }}>
      <div><p className="hq-row-title">Invoice paid {money(totals.invoice_paid, currency)}</p><p className="hq-row-meta">Open remaining {money(totals.open_remaining, currency)} | Uncollectible {money(totals.uncollectible_remaining, currency)}</p></div>
      <div><p className="hq-row-title">Captured charges {money(totals.captured_charges, currency)}</p><p className="hq-row-meta">Card captured {money(totals.captured_card_charges, currency)} | Successful refunds {money(totals.succeeded_refunds, currency)}</p></div>
    </div>)}
    {row.complete && row.totals_by_currency && Object.keys(row.totals_by_currency).length === 0 && <p className="hq-row-meta">No invoices or charges recorded.</p>}
    <h3 className="hq-section-title">Customer balance</h3>
    <p className="hq-row-meta">{row.customer ? `${row.customer.currency ? money(row.customer.balance, row.customer.currency) : `${row.customer.balance} minor units; currency not recorded`} | Delinquent: ${row.customer.delinquent ? "Yes" : "No"}` : "Unknown"}</p>
    <RecordDetails title="Customer credits and balance transactions" value={{ customer: row.customer, transactions: row.balance_transactions }} />
    <h3 className="hq-section-title" style={{ marginTop: 24 }}>Invoices</h3>
    {row.invoices.map(({ invoice, lines, payments, credit_notes }) => <article key={invoice.id} className="hq-row" style={{ display: "block", overflowWrap: "anywhere" }}>
      <p className="hq-row-title">{invoice.number ?? invoice.id} <span className="hq-badge hq-badge-quiet">{invoice.status ?? "Unknown"}</span></p>
      <p className="hq-row-meta">Total {money(invoice.total, invoice.currency)} | Due {money(invoice.amount_due, invoice.currency)} | Paid {money(invoice.amount_paid, invoice.currency)} | Remaining {money(invoice.amount_remaining, invoice.currency)}</p>
      <p className="hq-row-meta">Created {date(invoice.created)} | Paid {date(invoice.status_transitions?.paid_at)}</p>
      <p className="hq-row-meta">Due date {date(invoice.due_date)} | Next attempt {date(invoice.next_payment_attempt)} | Attempts {invoice.attempt_count} | {invoice.collection_method}</p>
      {lines.map((line) => <p className="hq-row-meta" key={line.id}>{line.description ?? line.id}: {money(line.amount, line.currency)} | {date(line.period.start)} to {date(line.period.end)}</p>)}
      {payments.map((payment) => <p className="hq-row-meta" key={payment.id}>Allocation {payment.id}: {payment.status} | {payment.payment.type} | Paid {payment.amount_paid == null ? "Unknown" : money(payment.amount_paid, payment.currency)} | {date(payment.status_transitions.paid_at)}</p>)}
      {credit_notes.map(({ note }) => <p className="hq-row-meta" key={note.id}>Credit {note.id}: {note.status} | {money(note.amount, note.currency)} | {note.reason ?? "No reason recorded"} | {date(note.created)}</p>)}
      <RecordDetails title="Invoice, allocations, and credit details" value={{ invoice, lines, payments, credit_notes }} />
    </article>)}
    <h3 className="hq-section-title" style={{ marginTop: 24 }}>Charges and refunds</h3>
    {row.charges.map(({ charge, refunds }) => <article key={charge.id} className="hq-row" style={{ display: "block", overflowWrap: "anywhere" }}>
      <p className="hq-row-title">{charge.status} | {money(charge.amount, charge.currency)} | {charge.payment_method_details?.type ?? "Unknown method"}</p>
      <p className="hq-row-meta">{charge.id} | Created {date(charge.created)} | Captured {money(charge.amount_captured, charge.currency)} | Refunded {money(charge.amount_refunded, charge.currency)}</p>
      {(charge.failure_code || charge.failure_message) && <p className="hq-row-meta">Failure: {charge.failure_code} {charge.failure_message}</p>}
      {refunds.map((refund) => <p className="hq-row-meta" key={refund.id}>Refund {refund.id}: {refund.status ?? "Unknown"} | {money(refund.amount, refund.currency)} | {date(refund.created)} | {refund.reason ?? "No reason recorded"}</p>)}
      <RecordDetails title="Charge and refund details" value={{ charge, refunds }} />
    </article>)}
    <RecordDetails title="Payment intent status and errors" value={row.payment_intents} />
    <h3 className="hq-section-title" style={{ marginTop: 24 }}>Subscriptions</h3>
    {row.subscriptions.map(({ subscription: sub, items }) => <article key={sub.id} className="hq-row" style={{ display: "block", overflowWrap: "anywhere" }}>
      <p className="hq-row-title">{sub.status} | {sub.collection_method}</p>
      <p className="hq-row-meta">{sub.id} | Created {date(sub.created)} | Trial ends {date(sub.trial_end)}</p>
      <p className="hq-row-meta">Cancel at period end: {sub.cancel_at_period_end ? "Yes" : "No"} | Cancel at {date(sub.cancel_at)} | Canceled {date(sub.canceled_at)} | Ended {date(sub.ended_at)}</p>
      <p className="hq-row-meta">Collection pause: {sub.pause_collection ? `${sub.pause_collection.behavior}, resumes ${date(sub.pause_collection.resumes_at)}` : "None"}</p>
      {items.map((item) => <p className="hq-row-meta" key={item.id}>{item.price.id} | {item.price.unit_amount == null ? "Variable pricing" : money(item.price.unit_amount, item.price.currency)} | Quantity {item.quantity ?? "Unknown"} | {item.price.recurring?.interval_count} {item.price.recurring?.interval} | {date(item.current_period_start)} to {date(item.current_period_end)}</p>)}
      <RecordDetails title="Subscription settings and items" value={{ subscription: sub, items }} />
    </article>)}
    <RecordDetails title="Subscription schedules and phases" value={row.schedules} />
  </section>
}

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin()
  const ledger = await getAdminBillingLedger()
  const params = await searchParams
  const q = typeof params.q === "string" ? params.q.trim().toLowerCase() : ""
  const clients = ledger.clients.filter((row) => !q || [row.company.name, row.company.slug, row.customer_id].some((value) => value.toLowerCase().includes(q)))
  return <div className="hq-page">
    <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
    <header className="hq-header"><div><p className="hq-eyebrow">Found HQ</p><h1 className="hq-title">Payments</h1>
      <p className="hq-subtitle">Live billing ledger</p></div><a href="/api/admin/billing-audit" className="hq-button hq-button-secondary">Export JSON</a></header>
    <p className="hq-row-meta">Mode: {ledger.mode} | {ledger.complete ? "Complete" : "Unknown / incomplete"} | Checked {ledger.finished_at}</p>
    <p className="hq-row-meta">Invoice paid amounts may include credits or payments outside Stripe. Captured charges are separate from bank payouts.</p>
    <section className="hq-section">
      <h2 className="hq-section-title">Portfolio</h2>
      <p className="hq-row-meta">{ledger.summary.companies} clients | {ledger.summary.verified} verified | {ledger.summary.unknown} unknown</p>
      {ledger.summary.totals_by_currency === null && <p className="hq-row-meta">Portfolio totals unknown.</p>}
      {Object.entries(ledger.summary.totals_by_currency ?? {}).map(([currency, totals]) => <p key={currency} className="hq-row-meta">Invoice paid {money(totals.invoice_paid, currency)} | Open remaining {money(totals.open_remaining, currency)} | Captured {money(totals.captured_charges, currency)} | Card captured {money(totals.captured_card_charges, currency)} | Refunds {money(totals.succeeded_refunds, currency)} | Uncollectible {money(totals.uncollectible_remaining, currency)}</p>)}
      <h3 className="hq-section-title" style={{ marginTop: 16 }}>Unpaid invoices</h3>
      {ledger.summary.open_invoices.map((row) => <p key={`${row.company_id}-${row.invoice_id}`} className="hq-row-meta">{row.company_name} | {row.invoice_id} | Remaining {money(row.amount_remaining, row.currency)} | {row.attempt_count ? `${row.attempt_count} collection attempts` : "Not yet attempted"} | Next attempt {row.next_payment_attempt ?? "Not recorded"}{!row.company_complete ? " | Partial company ledger" : ""}</p>)}
      {ledger.summary.open_invoices.length === 0 && <p className="hq-row-meta">{ledger.complete ? "No open unpaid invoices." : "Unpaid balances not fully verified."}</p>}
      <h3 className="hq-section-title" style={{ marginTop: 16 }}>Past Recorded Due Date</h3>
      {ledger.summary.overdue_invoices.map((row) => <p key={`${row.company_id}-${row.invoice_id}`} className="hq-row-meta">{row.company_name} | {row.invoice_id} | Remaining {money(row.amount_remaining, row.currency)} | Due {row.due_at}{!row.company_complete ? " | Partial company ledger" : ""}</p>)}
      {ledger.summary.overdue_invoices.length === 0 && <p className="hq-row-meta">{ledger.complete ? "No open invoices past a recorded due date." : "Overdue exceptions unknown; no verified exceptions available."}</p>}
    </section>
    <form action="/admin/payments" className="hq-section" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <label htmlFor="billing-search" className="hq-row-meta">Search clients</label>
      <input id="billing-search" className="hq-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, slug, or customer ID" style={{ maxWidth: "100%", minWidth: 0 }} />
      <button type="submit" className="hq-button hq-button-secondary">Search</button>
    </form>
    {ledger.errors.map((error) => <p key={error} role="alert" className="hq-row-meta">{error}</p>)}
    {ledger.clients.length === 0 && <p className="hq-row-meta">{ledger.errors.length ? "Company ledger unavailable." : "No eligible companies found."}</p>}
    {ledger.clients.length > 0 && clients.length === 0 && <p className="hq-row-meta">No matching clients.</p>}
    {clients.map((row) => <ClientLedger key={row.company.id} row={row} />)}
  </div>
}
