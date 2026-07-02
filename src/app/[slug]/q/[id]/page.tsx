import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import AcceptButton from "./AcceptButton"
import DeclineButton from "./DeclineButton"

export const dynamic = "force-dynamic"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#000000" : "#ffffff"
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
    const resendKey = process.env.RESEND_API_KEY
    if (resendKey && company.email) {
      const clientName = estimate.client_first_name
        ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
        : (estimate.client_name ?? "Your client")
      const color = company.primary_color ?? "#30D158"
      const ownerLink = `https://my.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"}/estimates?estimate=${id}`
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
      }).catch(() => {})
    }
  }

  const items = [...(estimate.estimate_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const color = company.primary_color ?? "#30D158"
  const onColor = contrastColor(color)
  const isLight = onColor === "#000000"
  const companyDisplayName = (() => {
    const n = company.name
    if (!n) return n
    if (n === n.toLowerCase() && !n.includes(" ")) return n.charAt(0).toUpperCase() + n.slice(1)
    return n
  })()

  const estimateNumber = estimate.estimate_number
    ? String(estimate.estimate_number).padStart(4, "0")
    : id.slice(-8).toUpperCase()

  const dateFormatted = new Date(estimate.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })
  const validUntilFormatted = estimate.valid_until
    ? new Date(estimate.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  const isAccepted = estimate.status === "accepted"
  const isDeclined = estimate.status === "declined"
  let isExpired = estimate.status === "expired"

  if (!isAccepted && !isDeclined && !isExpired && estimate.valid_until && new Date(estimate.valid_until) < new Date()) {
    isExpired = true
    await admin.from("estimates").update({ status: "expired", updated_at: new Date().toISOString() }).eq("id", id)
  }

  const isClosed = isAccepted || isDeclined || isExpired

  const clientDisplayName = estimate.client_company
    ? estimate.client_company
    : (estimate.client_first_name && estimate.client_last_name)
      ? `${estimate.client_first_name} ${estimate.client_last_name}`
      : estimate.client_name ?? ""

  const textHigh = isLight ? "rgba(0,0,0,0.90)" : "rgba(255,255,255,0.96)"
  const textMid  = isLight ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.65)"
  const textLow  = isLight ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.42)"
  const badgeBg  = isLight ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.16)"
  const badgeBdr = isLight ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.28)"

  return (
    <>
      <meta name="format-detection" content="telephone=no, address=no, email=no" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          background: #EDEDEB;
        }
        a { color: inherit; text-decoration: none; }

        .eq-head { padding: 36px 24px 32px; }
        .eq-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .eq-num { font-size: 44px; font-weight: 900; letter-spacing: -0.04em; line-height: 1; margin-bottom: 10px; }

        @media (max-width: 480px) {
          .eq-head { padding: 28px 20px 24px; }
          .eq-head-row { flex-direction: column; gap: 14px; }
          .eq-head-right { text-align: left !important; }
          .eq-num { font-size: 36px; }
        }
      `}</style>

      <div style={{ minHeight: "100dvh", background: "#EDEDEB" }}>

        {/* ── MASTHEAD ── */}
        <div className="eq-head" style={{ background: color }}>
          <div className="eq-head-row">

            {/* Company */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {company.logo_url ? (
                <div style={{ background: "white", borderRadius: 8, padding: "7px 12px", display: "inline-block", marginBottom: 12 }}>
                  <img src={company.logo_url} alt={companyDisplayName ?? ""} style={{ height: 32, maxWidth: 150, objectFit: "contain", display: "block" }} />
                </div>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 900, color: textHigh, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 10 }}>
                  {companyDisplayName}
                </div>
              )}
              <div style={{ lineHeight: 1.85 }}>
                {company.logo_url && (
                  <div style={{ fontSize: 14, fontWeight: 700, color: textHigh, marginBottom: 1 }}>{companyDisplayName}</div>
                )}
                {(company.city || company.state) && (
                  <div style={{ fontSize: 13, color: textMid }}>{[company.city, company.state].filter(Boolean).join(", ")}</div>
                )}
              </div>
            </div>

            {/* Estimate number */}
            <div className="eq-head-right" style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: textLow, marginBottom: 8 }}>
                Estimate
              </div>
              <div className="eq-num" style={{ color: textHigh }}>#{estimateNumber}</div>
              <div style={{ fontSize: 13, color: textMid, lineHeight: 1.9 }}>
                <div>{dateFormatted}</div>
                {validUntilFormatted && !isClosed && <div>Valid until {validUntilFormatted}</div>}
              </div>
              {isAccepted && (
                <div style={{
                  marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6,
                  background: badgeBg, borderRadius: 20, padding: "4px 12px",
                  border: `1px solid ${badgeBdr}`,
                }}>
                  <span style={{ fontSize: 12, color: textHigh }}>✓</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: textHigh }}>Accepted</span>
                </div>
              )}
              {isDeclined && (
                <div style={{ marginTop: 10, display: "inline-block", background: badgeBg, borderRadius: 20, padding: "4px 12px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: textMid }}>Declined</span>
                </div>
              )}
              {isExpired && (
                <div style={{ marginTop: 10, display: "inline-block", background: badgeBg, borderRadius: 20, padding: "4px 12px" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: textLow }}>Expired</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px 80px" }}>

          {/* Status banners */}
          {isAccepted && (
            <div style={{
              background: "white", borderRadius: 16, border: `2px solid ${color}40`,
              padding: "20px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color, flexShrink: 0,
              }}>✓</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 2 }}>Estimate Accepted</div>
                <div style={{ fontSize: 13, color: "#777" }}>
                  {estimate.accepted_at
                    ? new Date(estimate.accepted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "Thank you for accepting."}
                </div>
              </div>
            </div>
          )}

          {isDeclined && (
            <div style={{ background: "white", borderRadius: 16, border: "1.5px solid rgba(255,69,58,0.25)", padding: "18px 22px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#FF453A" }}>Estimate Declined</div>
            </div>
          )}

          {isExpired && (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #E0E0DA", padding: "18px 22px", marginBottom: 20, textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#999" }}>This estimate has expired</div>
            </div>
          )}

          {/* Client info */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #E5E5E0", padding: "20px 22px", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B8B8B2", marginBottom: 10 }}>
              Prepared For
            </div>
            {clientDisplayName && (
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", marginBottom: 4 }}>{clientDisplayName}</div>
            )}
            {estimate.property_address && (
              <div style={{ fontSize: 14, color: "#555", lineHeight: 1.5, marginTop: 4 }}>{estimate.property_address}</div>
            )}
            {estimate.client_phone && <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{estimate.client_phone}</div>}
            {estimate.client_email && <div style={{ fontSize: 13, color: "#888" }}>{estimate.client_email}</div>}
          </div>

          {/* Line items */}
          {items.length > 0 && (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #E5E5E0", marginBottom: 14, overflow: "hidden" }}>
              <div style={{ padding: "16px 22px 10px", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B8B8B2" }}>
                Scope of Work
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
                  padding: "14px 22px",
                  borderTop: "1px solid #F0F0EB",
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 3 }}>{item.description}</div>
                    <div style={{ fontSize: 13, color: "#888" }}>
                      {item.quantity}{item.unit ? ` ${item.unit}` : ""}{item.unit_price ? ` · ${fmt(item.unit_price)}` : ""}
                      {item.category ? <span style={{ marginLeft: 6, color: "#C0C0C0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.category}</span> : null}
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111", flexShrink: 0 }}>
                    {fmt(item.quantity * item.unit_price)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #E5E5E0", padding: "18px 22px", marginBottom: 24 }}>
            {estimate.tax_rate > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "#888" }}>Subtotal</span>
                  <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #F0F0EB" }}>
                  <span style={{ fontSize: 14, color: "#888" }}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
                  <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.tax_amount)}</span>
                </div>
              </>
            )}
            <div style={{
              background: color, borderRadius: 10, padding: "14px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: textLow, letterSpacing: "0.14em", textTransform: "uppercase" }}>Total Due</span>
              <span style={{ fontSize: 26, fontWeight: 900, color: textHigh, letterSpacing: "-0.03em" }}>{fmt(estimate.total)}</span>
            </div>
            {estimate.deposit_paid_at && estimate.deposit_amount && (
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, padding: "10px 14px", background: "#F0FBF4", borderRadius: 8 }}>
                <span style={{ fontSize: 13, color: "#16803C", fontWeight: 600 }}>✓ Deposit Paid</span>
                <span style={{ fontSize: 13, color: "#16803C", fontWeight: 700 }}>{fmt(estimate.deposit_amount)}</span>
              </div>
            )}
          </div>

          {/* Notes */}
          {estimate.notes && (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #E5E5E0", padding: "18px 22px", marginBottom: 20, borderLeft: `3px solid ${color}` }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#B8B8B2", marginBottom: 8 }}>Notes</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{estimate.notes}</div>
            </div>
          )}

          {/* CTA */}
          {!isClosed && (
            <div style={{ marginBottom: 16 }}>
              <AcceptButton
                estimateId={id}
                color={color}
                stripeAccountId={company.stripe_connect_account_id}
                total={estimate.total}
                depositPct={(estimate.deposit_pct as number) ?? 50}
                companyName={company.name}
              />
              <DeclineButton estimateId={id} companyName={companyDisplayName ?? company.name} />
            </div>
          )}

          {/* Download PDF */}
          <a
            href={`/q/${id}/print`}
            target="_blank"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "14px 20px", borderRadius: 14,
              border: `2px solid ${color}`,
              color, background: "transparent",
              fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 32,
              letterSpacing: "-0.01em",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download PDF
          </a>

          {/* Footer */}
          <div style={{ textAlign: "center", color: "#AAA", fontSize: 13, lineHeight: 1.9 }}>
            <div style={{ fontWeight: 700, color: "#888", marginBottom: 2 }}>{companyDisplayName}</div>
            {company.phone && <div>{company.phone}</div>}
            {company.email && <div>{company.email}</div>}
            <div style={{ marginTop: 12, fontSize: 11, color: "#CCC", fontWeight: 600, letterSpacing: "0.04em" }}>Powered by Found</div>
          </div>

        </div>
      </div>
    </>
  )
}
