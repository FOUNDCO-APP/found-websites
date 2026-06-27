import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import AcceptButton from "./AcceptButton"
import PrintButton from "./PrintButton"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

export default async function EstimateClientPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) notFound()

  const admin = createAdminClient()
  const { data: estimate } = await admin
    .from("estimates")
    .select("*, estimate_line_items(id, sort_order, description, quantity, unit, unit_price, category)")
    .eq("id", id)
    .eq("company_id", company.id)
    .single()

  if (!estimate) notFound()

  // Mark as viewed if it's been sent but not yet viewed/accepted
  if (estimate.status === "sent") {
    const now = new Date().toISOString()
    await admin.from("estimates").update({ status: "viewed", viewed_at: now, updated_at: now }).eq("id", id)
    // Notify owner
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && company.email) {
      const clientName = estimate.client_first_name
        ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
        : (estimate.client_name ?? "Your client")
      const color = company.primary_color ?? "#30D158"
      const ownerLink = `https://foundco.app/dashboard/estimates`
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `Found <hello@foundco.app>`,
          to: [company.email],
          subject: `${clientName} just opened your estimate`,
          html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0"><tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:white;border-radius:16px;overflow:hidden;border:1px solid #eee">
  <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #f0f0f0">
    <div style="font-size:13px;color:#999;margin-bottom:8px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Estimate Activity</div>
    <h1 style="margin:0 0 6px;color:#111;font-size:22px;font-weight:700;letter-spacing:-0.02em">${clientName} opened your estimate</h1>
    <p style="margin:0;color:#666;font-size:14px">They viewed it${estimate.property_address ? ` for ${estimate.property_address}` : ""}. This is your moment to follow up.</p>
  </td></tr>
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 20px;color:#444;font-size:15px;line-height:1.6">If they haven't accepted yet, a quick text or call right now could be the difference. Strike while it's fresh.</p>
    <a href="${ownerLink}" style="display:inline-block;background:${color};color:white;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:12px">View Estimate in Dashboard</a>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;text-align:center">
    <p style="margin:0;color:#bbb;font-size:12px">Found · Your business, always on.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
        }),
      }).catch(() => {}) // non-blocking
    }
  }

  const items = [...(estimate.estimate_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const color = company.primary_color ?? "#30D158"
  const logo = company.logo_url
  const companyDisplayName = (() => {
    const n = company.name
    if (!n) return n
    if (n === n.toLowerCase() && !n.includes(" ")) return n.charAt(0).toUpperCase() + n.slice(1)
    return n
  })()

  const isAccepted = estimate.status === "accepted"
  const isDeclined = estimate.status === "declined"
  const isExpired = estimate.status === "expired"
  const isClosed = isAccepted || isDeclined || isExpired

  return (
    <>
      <meta name="format-detection" content="telephone=no, address=no, email=no" />
      <style>{`
        a { color: inherit; text-decoration: none; }
        .estimate-link { color: ${color} !important; }
      `}</style>

      <div style={{
        minHeight: "100dvh",
        backgroundColor: "#0C0E0D",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: "0 0 80px",
      }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(180deg, ${color}22 0%, transparent 100%)`,
          padding: "48px 24px 32px",
          textAlign: "center",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {logo && (
            <img src={logo} alt={company.name} style={{ height: 48, objectFit: "contain", marginBottom: 16, borderRadius: 10, display: "block", margin: "0 auto 16px" }} />
          )}
          {!logo && (
            <div style={{
              display: "inline-block", padding: "8px 18px", borderRadius: 12,
              backgroundColor: `${color}22`, marginBottom: 16,
              color, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
            }}>
              {companyDisplayName}
            </div>
          )}
          <h1 style={{ margin: "0 0 8px", color: "white", fontSize: "1.875rem", fontWeight: 300, letterSpacing: "-0.03em" }}>
            Your Estimate
          </h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.45)", fontSize: 14 }}>
            From {companyDisplayName}
            {company.city ? ` · ${company.city}${company.state ? `, ${company.state}` : ""}` : ""}
          </p>
        </div>

        <div style={{ maxWidth: 540, margin: "0 auto", padding: "32px 20px 0" }}>

          {/* Client / job info */}
          <div className="estimate-card" style={{
            borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)", padding: "20px 22px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>Prepared for</div>
            <div style={{ color: "white", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{estimate.client_name}</div>
            {estimate.property_address && (
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, marginTop: 4 }}>{estimate.property_address}</div>
            )}
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 8 }}>
              Created {new Date(estimate.created_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div className="estimate-card" style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 16, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>Scope of Work</div>
              {items.map((item, i) => (
                <div key={i} className="line-row" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
                  padding: "14px 22px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "white", fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{item.description}</div>
                    <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                      {item.quantity > 1 || item.unit ? `${item.quantity}${item.unit ? " " + item.unit : ""} · ${fmt(item.unit_price)}` : fmt(item.unit_price)}
                    </div>
                  </div>
                  <div style={{ color: "white", fontSize: 16, fontWeight: 700, flexShrink: 0 }}>
                    {fmt(item.quantity * item.unit_price)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="estimate-card" style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "18px 22px", marginBottom: 24 }}>
            {estimate.tax_rate > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Subtotal</span>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: 600 }}>{fmt(estimate.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
                  <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, fontWeight: 600 }}>{fmt(estimate.tax_amount)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "white", fontSize: 18, fontWeight: 700 }}>Total</span>
              <span style={{ color, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>{fmt(estimate.total)}</span>
            </div>
          </div>

          {/* Accept / Status */}
          {!isClosed && (
            <AcceptButton
              estimateId={id}
              color={color}
              stripeAccountId={company.stripe_connect_account_id}
              total={estimate.total}
              depositPct={(estimate.deposit_pct as number) ?? 50}
              companyName={company.name}
            />
          )}

          {isAccepted && (
            <div style={{ borderRadius: 20, backgroundColor: `${color}12`, border: `1px solid ${color}30`, padding: "24px 22px", textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
              <div style={{ color, fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Estimate Accepted</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                {estimate.accepted_at
                  ? `Accepted on ${new Date(estimate.accepted_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`
                  : "Thank you for accepting this estimate."}
              </div>
            </div>
          )}

          {isDeclined && (
            <div style={{ borderRadius: 20, backgroundColor: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", padding: "20px 22px", textAlign: "center" }}>
              <div style={{ color: "#FF453A", fontSize: 15, fontWeight: 700 }}>Estimate Declined</div>
            </div>
          )}

          {isExpired && (
            <div style={{ borderRadius: 20, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "20px 22px", textAlign: "center" }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 15, fontWeight: 600 }}>This estimate has expired</div>
            </div>
          )}

          {/* Print */}
          <div style={{ marginBottom: 24 }}>
            <PrintButton estimateId={id} slug={company.slug} />
          </div>

          {/* Footer */}
          <div style={{ marginTop: 8, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.7 }}>
            <div>{companyDisplayName}</div>
            {company.phone && <div>{company.phone}</div>}
            {company.email && <div>{company.email}</div>}
          </div>
        </div>
      </div>
    </>
  )
}
