import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Stripe from "stripe"
import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"

function formatDate(value: number | null | undefined) {
  if (!value) return "Not dated"
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value * 1000))
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

function cleanStatus(status: string | null | undefined) {
  if (status === "paid") return "Paid"
  if (status === "open") return "Open"
  if (status === "void") return "Void"
  if (status === "draft") return "Draft"
  if (status === "uncollectible") return "Uncollectible"
  return "Receipt"
}

export default async function FoundReceiptPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const user = await requireDashboardAccess()
  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")
  if (!(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) redirect("/photos")
  if (!company.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) notFound()

  const { invoiceId } = await params
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

  let invoice: Stripe.Invoice
  try {
    invoice = await stripe.invoices.retrieve(invoiceId, { expand: ["lines.data.price.product"] })
  } catch {
    notFound()
  }

  const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id
  if (invoiceCustomer !== company.stripe_customer_id) notFound()

  const amount = invoice.amount_paid || invoice.amount_due || invoice.total || 0
  const currency = invoice.currency || "usd"
  const receiptNumber = invoice.number || invoice.id
  const rows = invoice.lines.data.length > 0 ? invoice.lines.data : []

  return (
    <main style={{ padding: "24px 20px 60px" }}>
      <Link href="/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 22, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, textDecoration: "none", ...TYPE.footnote, fontWeight: 800 }}>
        <span aria-hidden="true">{"<"}</span>
        Billing
      </Link>

      <section style={{ borderRadius: 22, padding: "22px 20px", backgroundColor: "rgba(255,255,255,0.96)", color: BLACK }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ margin: "0 0 5px", ...TYPE.caption, color: "rgba(8,10,9,0.48)" }}>Found receipt</p>
            <h1 style={{ margin: 0, ...TYPE.title, color: BLACK }}>Receipt</h1>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <p style={{ margin: 0, ...TYPE.caption, color: "rgba(8,10,9,0.48)" }}>Status</p>
            <p style={{ margin: "4px 0 0", ...TYPE.subhead, fontWeight: 850, color: invoice.status === "paid" ? "#188A42" : BLACK }}>{cleanStatus(invoice.status)}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14, marginBottom: 26 }}>
          <div>
            <p style={{ margin: "0 0 3px", ...TYPE.caption, color: "rgba(8,10,9,0.45)" }}>Business</p>
            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 850, color: BLACK }}>{company.name}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <p style={{ margin: "0 0 3px", ...TYPE.caption, color: "rgba(8,10,9,0.45)" }}>Receipt</p>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 800, color: BLACK }}>{receiptNumber}</p>
            </div>
            <div>
              <p style={{ margin: "0 0 3px", ...TYPE.caption, color: "rgba(8,10,9,0.45)" }}>Date</p>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 800, color: BLACK }}>{formatDate(invoice.created)}</p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid rgba(8,10,9,0.12)", borderBottom: "1px solid rgba(8,10,9,0.12)", marginBottom: 22 }}>
          {rows.map((line) => (
            <div key={line.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "14px 0", borderTop: line === rows[0] ? "none" : "1px solid rgba(8,10,9,0.08)" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 850, color: BLACK }}>{line.description || "Found plan"}</p>
                <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: "rgba(8,10,9,0.52)" }}>{line.period?.start ? `${formatDate(line.period.start)} to ${formatDate(line.period.end)}` : "Found subscription"}</p>
              </div>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 850, color: BLACK, flexShrink: 0 }}>{formatMoney(line.amount, currency)}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
          <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 850, color: BLACK }}>Total paid</p>
          <p style={{ margin: 0, ...TYPE.title, color: BLACK }}>{formatMoney(amount, currency)}</p>
        </div>

        <p style={{ margin: "24px 0 0", ...TYPE.footnote, lineHeight: 1.5, color: "rgba(8,10,9,0.58)" }}>
          This is your Found receipt for account billing. For help with your plan, reply to Found or text 520.222.6308.
        </p>
      </section>

      <a href={`sms:+15202226308?&body=${encodeURIComponent(`Hi Found, I have a question about receipt ${receiptNumber} for ${company.name}.`)}`} style={{ display: "block", marginTop: 18, textAlign: "center" as const, color: GREEN, textDecoration: "none", ...TYPE.footnote, fontWeight: 850 }}>
        Ask Found about this receipt
      </a>
    </main>
  )
}
