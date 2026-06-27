import { NextRequest, NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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
  const { method } = await req.json() as { method: "email" | "sms" | "link" }

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
    .select("id, status, client_name, client_email, client_phone, property_address, total")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Estimate not found" }, { status: 404 })

  const link = `https://${company.slug}.${ROOT_DOMAIN}/q/${id}`
  const firstName = (estimate.client_name ?? "there").split(" ")[0]
  const now = new Date().toISOString()

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

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0C0E0D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#141614;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.06)">
  <tr><td style="background:linear-gradient(180deg,${color}22 0%,transparent 100%);padding:40px 36px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
    ${logo
      ? `<img src="${logo}" alt="${company.name}" style="height:44px;object-fit:contain;border-radius:8px;margin:0 auto 16px;display:block">`
      : `<div style="display:inline-block;padding:6px 18px;border-radius:10px;background:${color}22;color:${color};font-size:14px;font-weight:800;margin-bottom:16px">${company.name}</div>`
    }
    <h1 style="margin:0 0 6px;color:white;font-size:26px;font-weight:300;letter-spacing:-0.03em">Your Estimate</h1>
    <p style="margin:0;color:rgba(255,255,255,0.4);font-size:14px">From ${company.name}</p>
  </td></tr>
  <tr><td style="padding:32px 36px">
    <p style="margin:0 0 18px;color:rgba(255,255,255,0.8);font-size:16px;line-height:1.65">Hi ${firstName},</p>
    <p style="margin:0 0 24px;color:rgba(255,255,255,0.8);font-size:16px;line-height:1.65">${company.name} has prepared an estimate for you${estimate.property_address ? ` for <strong style="color:white">${estimate.property_address}</strong>` : ""}.</p>
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:22px 24px;margin-bottom:28px;text-align:center">
      <div style="color:rgba(255,255,255,0.35);font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:8px">Total Estimate</div>
      <div style="color:${color};font-size:40px;font-weight:700;letter-spacing:-0.04em">${fmtCurrency(estimate.total)}</div>
    </div>
    <div style="text-align:center;margin-bottom:8px">
      <a href="${link}" style="display:inline-block;background:${color};color:${btnTextColor};font-size:16px;font-weight:800;text-decoration:none;padding:17px 48px;border-radius:16px;letter-spacing:-0.01em">View &amp; Accept Estimate</a>
    </div>
    <p style="margin:12px 0 0;text-align:center;color:rgba(255,255,255,0.2);font-size:12px">You can view, review all line items, and accept right from your phone.</p>
  </td></tr>
  <tr><td style="padding:18px 36px;border-top:1px solid rgba(255,255,255,0.06);text-align:center">
    <p style="margin:0;color:rgba(255,255,255,0.2);font-size:12px;line-height:1.7">${company.name}${company.phone ? " &nbsp;·&nbsp; " + company.phone : ""}${company.email ? " &nbsp;·&nbsp; " + company.email : ""}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

    const emailSubject = `Your estimate from ${company.name}${estimate.property_address ? ` — ${estimate.property_address}` : ""}`

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${company.name} <hello@foundco.app>`,
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
