import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import Stripe from "stripe"
import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"
import ReceiptPrintButton from "@/components/dashboard/ReceiptPrintButton"

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
  const subtotal = invoice.subtotal ?? amount
  const tax = Math.max(0, (invoice.total ?? amount) - subtotal)
  const currency = invoice.currency || "usd"
  const receiptNumber = invoice.number || invoice.id
  const rows = invoice.lines.data.length > 0 ? invoice.lines.data : []

  return (
    <main style={{ padding: "24px 20px 60px" }}>
      <Link className="receipt-no-print" href="/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 22, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, textDecoration: "none", ...TYPE.footnote, fontWeight: 800 }}>
        <span aria-hidden="true">{"<"}</span>
        Billing
      </Link>

      <section className="found-receipt" style={{ borderRadius: 22, padding: "24px 22px", backgroundColor: "rgba(255,255,255,0.98)", color: BLACK, boxShadow: "0 22px 80px rgba(0,0,0,0.24)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ margin: "0 0 5px", ...TYPE.caption, color: "rgba(8,10,9,0.48)" }}>FOUND</p>
            <h1 style={{ margin: 0, ...TYPE.title, color: BLACK }}>Billing Receipt</h1>
            <p style={{ margin: "7px 0 0", ...TYPE.footnote, color: "rgba(8,10,9,0.58)" }}>Found Co. account billing</p>
          </div>
          <div style={{ textAlign: "right" as const }}>
            <p style={{ margin: 0, ...TYPE.caption, color: "rgba(8,10,9,0.48)" }}>Status</p>
            <p style={{ margin: "4px 0 0", ...TYPE.subhead, fontWeight: 850, color: invoice.status === "paid" ? "#188A42" : BLACK }}>{cleanStatus(invoice.status)}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14, marginBottom: 26 }}>
          <div>
            <p style={{ margin: "0 0 3px", ...TYPE.caption, color: "rgba(8,10,9,0.45)" }}>Billed to</p>
            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 850, color: BLACK }}>{company.name}</p>
            {company.email && <p style={{ margin: "3px 0 0", ...TYPE.footnote, color: "rgba(8,10,9,0.52)" }}>{company.email}</p>}
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

        <div style={{ display: "grid", gap: 9, maxWidth: 280, marginLeft: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <p style={{ margin: 0, ...TYPE.footnote, color: "rgba(8,10,9,0.58)" }}>Subtotal</p>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 800, color: BLACK }}>{formatMoney(subtotal, currency)}</p>
          </div>
          {tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <p style={{ margin: 0, ...TYPE.footnote, color: "rgba(8,10,9,0.58)" }}>Tax</p>
              <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 800, color: BLACK }}>{formatMoney(tax, currency)}</p>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", paddingTop: 10, borderTop: "1px solid rgba(8,10,9,0.12)" }}>
            <p style={{ margin: 0, ...TYPE.subhead, fontWeight: 850, color: BLACK }}>Total paid</p>
            <p style={{ margin: 0, ...TYPE.title, color: BLACK }}>{formatMoney(amount, currency)}</p>
          </div>
        </div>

        <p style={{ margin: "24px 0 0", ...TYPE.footnote, lineHeight: 1.5, color: "rgba(8,10,9,0.58)" }}>
          This is your Found receipt for account billing. For help with your plan, reply to Found or text 520.222.6308.
        </p>
      </section>

      <div className="receipt-no-print">
        <ReceiptPrintButton />
      </div>

      <a className="receipt-no-print" href={`sms:+15202226308?&body=${encodeURIComponent(`Hi Found, I have a question about receipt ${receiptNumber} for ${company.name}.`)}`} style={{ display: "block", marginTop: 18, textAlign: "center" as const, color: GREEN, textDecoration: "none", ...TYPE.footnote, fontWeight: 850 }}>
        Ask Found about this receipt
      </a>
      <style>{`
        @page {
          size: Letter;
          margin: 0.55in;
        }
        @media print {
          html,
          body {
            background: white !important;
            color: #080A09 !important;
            min-height: auto !important;
          }
          body * {
            visibility: hidden !important;
          }
          .found-receipt,
          .found-receipt * {
            visibility: visible !important;
          }
          main {
            background: white !important;
            padding: 0 !important;
          }
          .found-receipt {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            max-width: none !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .receipt-no-print,
          .receipt-no-print * {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>
    </main>
  )
}
