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

type Params = { params: Promise<{ slug: string; id: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("id, status, client_name, client_first_name, client_last_name, property_address, total")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (estimate.status === "declined") return NextResponse.json({ success: true })
  if (estimate.status === "accepted") return NextResponse.json({ error: "Already accepted" }, { status: 409 })

  const now = new Date().toISOString()
  await admin.from("estimates").update({ status: "declined", updated_at: now }).eq("id", id)

  const resendKey = process.env.RESEND_API_KEY
  if (resendKey && company.email) {
    const clientName = estimate.client_first_name
      ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
      : (estimate.client_name ?? "Your client")
    const companyName = displayName(company.name)
    const color = company.primary_color ?? "#30D158"
    const dashboardLink = `https://my.${ROOT_DOMAIN}/estimates?estimate=${id}`

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `Found <hello@foundco.app>`,
        to: [company.email],
        subject: `${clientName} declined your estimate`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="background:#f9f9f9;padding:32px 32px 24px;border-bottom:1px solid #f0f0f0;text-align:center">
    <h1 style="margin:0 0 6px;color:#111;font-size:22px;font-weight:800;letter-spacing:-0.02em">${clientName} passed</h1>
    <p style="margin:0;color:#666;font-size:15px">They declined your estimate${estimate.property_address ? ` for ${estimate.property_address}` : ""}.</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">This happens. A follow-up call to learn why can turn a no into a later yes — and helps you sharpen future estimates. Open the estimate in Found to see the full details.</p>
    <a href="${dashboardLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">Open in Found</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;color:#bbb;font-size:12px">Found · ${companyName}</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
      }),
    }).catch(() => {})
  }

  return NextResponse.json({ success: true })
}
