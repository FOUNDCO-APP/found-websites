import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function displayName(name: string) {
  if (!name) return name
  if (name === name.toLowerCase() && !name.includes(" ")) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#000000" : "#ffffff"
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { method } = await req.json() as { method: "email" | "sms" | "link" | "payment_link" }

  // Cookie-aware company lookup — same as all other dashboard routes
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 })

  const admin = createAdminClient()

  // Fetch extra fields getCompany doesn't include
  const { data: companyExtra } = await admin
    .from("companies")
    .select("logo_url")
    .eq("id", company.id)
    .single()

  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status, client_name, client_email, client_phone, property_address, total, deposit_amount")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 })

  const link = `https://${company.slug}.${ROOT_DOMAIN}/q/${id}`
  const firstName = (estimate.client_name ?? "there").split(" ")[0]
  const now = new Date().toISOString()

  if (method === "payment_link") {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.error("[estimates/send] RESEND_API_KEY not set")
      return NextResponse.json({ error: "Email is not configured yet" }, { status: 503 })
    }
    if (!estimate.client_email) {
      return NextResponse.json({ error: "No email address on file for this client" }, { status: 400 })
    }

    const color = company.primary_color ?? "#30D158"
    const btnTextColor = contrastColor(color)
    const companyName = displayName(company.name)
    const amountDue = fmtCurrency(Number(estimate.deposit_amount ?? estimate.total))

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <tr><td style="background:${color};height:5px;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:34px 36px 28px;text-align:center">
    <div style="color:#111;font-size:20px;font-weight:800;letter-spacing:-0.02em;margin-bottom:22px">${companyName}</div>
    <p style="margin:0 0 12px;color:#111;font-size:18px;font-weight:700;line-height:1.45">Hi ${firstName}, your estimate is ready for payment.</p>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.65">You can finish securely from your phone.</p>
    <div style="background:#f7f7f7;border:1px solid #e8e8e8;border-radius:14px;padding:22px 24px;margin-bottom:26px;text-align:center">
      <div style="color:#999;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px">Amount Due</div>
      <div style="color:#111;font-size:38px;font-weight:700;letter-spacing:-0.03em">${amountDue}</div>
    </div>
    <a href="${link}" style="display:inline-block;background:${color};color:${btnTextColor};font-size:15px;font-weight:800;text-decoration:none;padding:16px 44px;border-radius:14px;letter-spacing:-0.01em">Pay Securely</a>
    <p style="margin:18px 0 0;color:#999;font-size:12px;line-height:1.6">Card and supported wallet options appear on compatible devices.</p>
  </td></tr>
  <tr><td style="padding:18px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;color:#bbb;font-size:12px;line-height:1.8">${companyName}${company.phone ? " &nbsp;-&nbsp; " + company.phone : ""}${company.email ? " &nbsp;-&nbsp; " + company.email : ""}</p>
    <p style="margin:6px 0 0;color:#ddd;font-size:11px">Powered by Found</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${companyName} <hello@foundco.app>`,
        to: [estimate.client_email],
        subject: `Payment link for ${companyName}`,
        html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}))
      console.error("[estimates/send] Resend payment link error:", JSON.stringify(err))
      return NextResponse.json({ error: "Failed to send payment link", detail: err }, { status: 502 })
    }

    await admin.from("estimates").update({
      payment_link_sent_at: now,
      updated_at: now,
    }).eq("id", id)

    return NextResponse.json({ success: true, method: "payment_link" })
  }

  if (method === "email") {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      console.error("[estimates/send] RESEND_API_KEY not set")
      return NextResponse.json({ error: "Email not configured — RESEND_API_KEY missing" }, { status: 503 })
    }
    if (!estimate.client_email) {
      return NextResponse.json({ error: "No email address on file for this client" }, { status: 400 })
    }

    const color = company.primary_color ?? "#30D158"
    const btnTextColor = contrastColor(color)
    const logo = companyExtra?.logo_url as string | null
    const companyName = displayName(company.name)

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="format-detection" content="telephone=no,address=no,email=no"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
  <tr><td style="background:${color};height:5px;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="background:white;padding:28px 36px 20px;text-align:center;border-bottom:1px solid #f0f0f0">
    ${logo
      ? `<img src="${logo}" alt="${companyName}" style="height:44px;max-width:200px;object-fit:contain;display:block;margin:0 auto">`
      : `<div style="color:#111;font-size:20px;font-weight:800;letter-spacing:-0.02em">${companyName}</div>`
    }
  </td></tr>
  <tr><td style="padding:36px 36px 28px">
    <p style="margin:0 0 14px;color:#111;font-size:17px;font-weight:600;line-height:1.5">Hi ${firstName},</p>
    <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.7">Here's your estimate${estimate.property_address ? ` for <strong style="color:#111">${estimate.property_address}</strong>` : ""} from ${companyName}.</p>
    <div style="background:#f7f7f7;border:1px solid #e8e8e8;border-radius:14px;padding:22px 24px;margin-bottom:28px;text-align:center">
      <div style="color:#999;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:10px">Total Estimate</div>
      <div style="color:#111;font-size:38px;font-weight:700;letter-spacing:-0.03em">${fmtCurrency(estimate.total)}</div>
    </div>
    <div style="text-align:center;margin-bottom:14px">
      <a href="${link}" style="display:inline-block;background:${color};color:${btnTextColor};font-size:15px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:14px;letter-spacing:-0.01em">View &amp; Accept Estimate</a>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <a href="${link}/print" style="display:inline-block;border:2px solid ${color};color:${color};background:transparent;font-size:14px;font-weight:700;text-decoration:none;padding:12px 32px;border-radius:12px;letter-spacing:-0.01em">Download PDF</a>
    </div>
    <p style="margin:0;text-align:center;color:#bbb;font-size:12px;line-height:1.6">Review all line items and accept or save from any device</p>
  </td></tr>
  <tr><td style="padding:18px 36px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;color:#bbb;font-size:12px;line-height:1.8">${companyName}${company.phone ? " &nbsp;·&nbsp; " + company.phone : ""}${company.email ? " &nbsp;·&nbsp; " + company.email : ""}</p>
    <p style="margin:6px 0 0;color:#ddd;font-size:11px">Powered by Found</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

    const emailSubject = `Your estimate from ${companyName}${estimate.property_address ? ` — ${estimate.property_address}` : ""}`

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${companyName} <hello@foundco.app>`,
        to: [estimate.client_email],
        subject: emailSubject,
        html,
      }),
    })

    if (!emailRes.ok) {
      const err = await emailRes.json().catch(() => ({}))
      console.error("[estimates/send] Resend error:", JSON.stringify(err))
      return NextResponse.json({ error: "Failed to send email", detail: err }, { status: 502 })
    }

    // Mark email sent separately so we can track it independent of link/sms
    await admin.from("estimates").update({
      status: "sent",
      sent_at: now,
      email_sent_at: now,
      updated_at: now,
    }).eq("id", id)

    return NextResponse.json({ success: true, method: "email" })
  }

  // SMS and link: just mark sent (native SMS opened client-side, link copied client-side)
  await admin.from("estimates").update({
    status: "sent",
    sent_at: now,
    updated_at: now,
  }).eq("id", id)

  return NextResponse.json({ success: true, method })
}
