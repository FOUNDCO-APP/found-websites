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

type Params = { params: Promise<{ slug: string; id: string }> }

export async function POST(req: Request, { params }: Params) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => ({})) as { paid?: boolean }

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status, client_name, client_first_name, client_last_name, client_company, property_address, total, deposit_amount, deposit_paid_at, accepted_at")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (estimate.status === "accepted" && !body.paid) return NextResponse.json({ success: true })

  const now = new Date().toISOString()
  const patch: Record<string, string> = {
    status: "accepted",
    accepted_at: estimate.accepted_at ?? now,
    updated_at: now,
  }
  if (body.paid) patch.deposit_paid_at = now

  await admin.from("estimates").update(patch).eq("id", id)

  // Owner notification email
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && company.email) {
    const clientName = estimate.client_first_name
      ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
      : (estimate.client_company ?? estimate.client_name ?? "Your client")
    const companyName = displayName(company.name)
    const color = company.primary_color ?? "#30D158"
    const dashboardLink = `https://foundco.app/dashboard/estimates`
    const depositLine = body.paid && estimate.deposit_amount
      ? `<div style="background:#f0f9f3;border-radius:10px;padding:12px 16px;margin-top:14px;font-size:14px;color:#1A7A3C;font-weight:600">✓ ${fmt(estimate.deposit_amount)} deposit paid</div>`
      : ""

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Found <hello@foundco.app>`,
        to: [company.email],
        subject: `You got one. ${clientName} accepted your estimate.`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="background:linear-gradient(135deg,${color}18 0%,${color}06 100%);padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;text-align:center">
    <div style="font-size:36px;margin-bottom:12px">🎉</div>
    <h1 style="margin:0 0 6px;color:#111;font-size:24px;font-weight:800;letter-spacing:-0.02em">You got one.</h1>
    <p style="margin:0;color:#666;font-size:15px">${clientName} accepted your estimate.</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <div style="background:#f8f8f8;border-radius:12px;padding:18px 20px;margin-bottom:20px">
      <div style="font-size:12px;color:#999;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">Estimate Summary</div>
      <div style="font-size:15px;color:#111;font-weight:700;margin-bottom:4px">${clientName}</div>
      ${estimate.property_address ? `<div style="font-size:13px;color:#666;margin-bottom:4px">${estimate.property_address}</div>` : ""}
      <div style="font-size:22px;color:${color};font-weight:800;letter-spacing:-0.02em;margin-top:8px">${fmt(estimate.total)}</div>
      ${depositLine}
    </div>
    <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">${companyName}, you're up. Reach out to ${clientName.split(" ")[0]} to confirm the schedule and get the job started.</p>
    <a href="${dashboardLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;color:#bbb;font-size:12px">Found · ${companyName}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
      }),
    }).catch(() => {}) // non-blocking
  }

  return NextResponse.json({ success: true })
}
