import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function displayName(name: string) {
  if (!name) return name
  if (name === name.toLowerCase() && !name.includes(" ")) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function clientDisplayName(estimate: {
  client_name: string | null
  client_first_name: string | null
  client_last_name: string | null
  client_company: string | null
}) {
  if (estimate.client_first_name) return `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
  return estimate.client_company ?? estimate.client_name ?? "Your client"
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return false
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Found <hello@foundco.app>", to: [to], subject, html }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

function ownerAcceptedHtml(args: {
  companyName: string
  clientName: string
  color: string
  dashboardLink: string
  propertyAddress: string | null
  total: number
  depositAmount: number | null
  paid: boolean
  payLater: boolean
}) {
  const depositLine = args.paid && args.depositAmount
    ? `<div style="background:#f0f9f3;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:14px;color:#1A7A3C;font-weight:600">${fmt(args.depositAmount)} paid</div>`
    : args.payLater
      ? `<div style="background:#fff8e8;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:14px;color:#8A6418;font-weight:600">Accepted - payment link sent</div>`
      : ""

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="background:linear-gradient(135deg,${args.color}18 0%,${args.color}06 100%);padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;text-align:center">
    <h1 style="margin:0 0 6px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">You got one.</h1>
    <p style="margin:0;color:#666;font-size:15px">${args.clientName} accepted your estimate.</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <div style="background:#f8f8f8;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Estimate Summary</div>
      <div style="font-size:15px;color:#111;font-weight:700;margin-bottom:4px">${args.clientName}</div>
      ${args.propertyAddress ? `<div style="font-size:13px;color:#666;margin-bottom:4px">${args.propertyAddress}</div>` : ""}
      <div style="font-size:22px;color:${args.color};font-weight:800;letter-spacing:-0.02em;margin-top:8px">${fmt(args.total)}</div>
      ${depositLine}
    </div>
    <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">${args.companyName}, reach out while the decision is fresh.</p>
    <a href="${args.dashboardLink}" style="display:inline-block;background:${args.color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${args.companyName}</p></td></tr>
</table>
</td></tr></table>
</body></html>`
}

function customerReceiptHtml(args: {
  companyName: string
  clientName: string
  color: string
  estimateLink: string
  amountPaid: number
  total: number
  remaining: number
}) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f0f0f0">
    <h1 style="margin:0 0 8px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">Payment received</h1>
    <p style="margin:0;color:#666;font-size:15px">${args.companyName} has been notified.</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <div style="background:#f0f9f3;border-radius:12px;padding:20px;margin-bottom:20px;border:1px solid #d0eeda;text-align:center">
      <div style="font-size:12px;color:#1A7A3C;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Paid Today</div>
      <div style="font-size:30px;color:#1A7A3C;font-weight:800;letter-spacing:-0.03em">${fmt(args.amountPaid)}</div>
      ${args.remaining > 0 ? `<div style="font-size:13px;color:#4A8C5C;margin-top:6px">${fmt(args.remaining)} remaining later</div>` : ""}
    </div>
    <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">Thanks, ${args.clientName}. Your estimate is accepted and your payment is confirmed.</p>
    <a href="${args.estimateLink}" style="display:inline-block;background:${args.color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">View Estimate</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${args.companyName}</p></td></tr>
</table>
</td></tr></table>
</body></html>`
}

function estimateDepositDue(total: number, depositPct: number | null | undefined, depositAmount: number | null | undefined) {
  if (depositAmount && depositAmount > 0) return depositAmount
  const pct = depositPct ?? 50
  const totalCents = Math.round(Number(total ?? 0) * 100)
  const depositCents = pct >= 100 ? totalCents : Math.round(totalCents * (pct / 100))
  return depositCents / 100
}

function payLaterHtml(args: { companyName: string; clientName: string; color: string; estimateLink: string; amountDue: number }) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f0f0f0">
    <h1 style="margin:0 0 8px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">Estimate accepted</h1>
    <p style="margin:0;color:#666;font-size:15px">Here is your payment link for ${args.companyName}.</p>
  </td></tr>
  <tr><td style="padding:28px 32px;text-align:center">
    <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Amount Due</div>
    <div style="font-size:34px;color:${args.color};font-weight:800;letter-spacing:-0.03em;margin-bottom:22px">${fmt(args.amountDue)}</div>
    <a href="${args.estimateLink}" style="display:inline-block;background:${args.color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:15px 34px;border-radius:12px">Pay Securely</a>
    <p style="margin:18px 0 0;color:#888;font-size:13px;line-height:1.6">You can pay by card or supported wallet from your phone.</p>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center"><p style="margin:0;color:#bbb;font-size:12px">Found - ${args.companyName}</p></td></tr>
</table>
</td></tr></table>
</body></html>`
}

type Params = { params: Promise<{ slug: string; id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { paid?: boolean; pay_later?: boolean }

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status, client_name, client_first_name, client_last_name, client_company, client_email, property_address, total, deposit_pct, deposit_amount, deposit_paid_at, payment_status, paid_at, accepted_at, receipt_sent_at")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (estimate.status === "accepted" && !body.paid && !body.pay_later) return NextResponse.json({ success: true })

  const now = new Date().toISOString()
  const companyName = displayName(company.name)
  const color = company.primary_color ?? "#30D158"
  const clientName = clientDisplayName(estimate)
  const dashboardLink = `https://my.${ROOT_DOMAIN}/estimates?estimate=${id}`
  const estimateLink = `https://${company.slug}.${ROOT_DOMAIN}/q/${id}`
  const total = Number(estimate.total ?? 0)
  const depositAmount = estimateDepositDue(total, estimate.deposit_pct as number | null, estimate.deposit_amount as number | null)
  const hadDeposit = Boolean(estimate.deposit_paid_at) || estimate.payment_status === "deposit_paid"
  const amountPaid = body.paid ? (hadDeposit ? total : depositAmount) : 0
  const remaining = Math.max(total - amountPaid, 0)

  const patch: Record<string, string> = {
    status: "accepted",
    accepted_at: estimate.accepted_at ?? now,
    updated_at: now,
  }

  if (body.paid) {
    if (!hadDeposit) patch.deposit_paid_at = estimate.deposit_paid_at ?? now
    patch.accepted_payment_choice = "pay_now"
    patch.payment_status = amountPaid >= total ? "paid" : "deposit_paid"
    if (amountPaid >= total) patch.paid_at = estimate.paid_at ?? now
  }

  if (body.pay_later) {
    patch.accepted_payment_choice = "pay_later"
    patch.accepted_pay_later_at = now
    patch.payment_status = "unpaid"
    patch.payment_link_sent_at = now
  }

  await admin.from("estimates").update(patch).eq("id", id)

  if (company.email) {
    await sendEmail(
      company.email,
      body.pay_later ? `${clientName} accepted your estimate` : `You got one. ${clientName} accepted your estimate.`,
      ownerAcceptedHtml({
        companyName,
        clientName,
        color,
        dashboardLink,
        propertyAddress: estimate.property_address,
        total,
        depositAmount: amountPaid || null,
        paid: Boolean(body.paid),
        payLater: Boolean(body.pay_later),
      }),
    )
  }

  if (estimate.client_email && body.paid && !estimate.receipt_sent_at) {
    const sent = await sendEmail(
      estimate.client_email,
      `Payment received by ${companyName}`,
      customerReceiptHtml({ companyName, clientName, color, estimateLink, amountPaid, total, remaining }),
    )
    if (sent) await admin.from("estimates").update({ receipt_sent_at: now }).eq("id", id)
  }

  if (estimate.client_email && body.pay_later) {
    await sendEmail(
      estimate.client_email,
      `Payment link for ${companyName}`,
      payLaterHtml({ companyName, clientName, color, estimateLink, amountDue: depositAmount }),
    )
  }

  return NextResponse.json({ success: true })
}