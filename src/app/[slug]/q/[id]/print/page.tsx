import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import AutoPrint from "./AutoPrint"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function displayName(name: string) {
  if (!name) return name
  if (name === name.toLowerCase() && !name.includes(" ")) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name
}

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? "#000000" : "#ffffff"
}

export default async function EstimatePrintPage({
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

  const items = [...(estimate.estimate_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const color = company.primary_color ?? "#1A7A3C"
  const onColor = contrastColor(color)
  const isLight = onColor === "#000000"
  const companyName = displayName(company.name)

  const estimateNumber = estimate.estimate_number
    ? String(estimate.estimate_number).padStart(4, "0")
    : id.slice(-8).toUpperCase()

  const dateFormatted = new Date(estimate.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })

  const validUntilFormatted = estimate.valid_until
    ? new Date(estimate.valid_until).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null

  const depositPct = (estimate.deposit_pct as number | null) ?? 50
  const depositDue = depositPct >= 100 ? estimate.total : estimate.total * (depositPct / 100)
  const balanceDue = Math.max(estimate.total - depositDue, 0)
  const paymentStatus = estimate.payment_status ?? (estimate.deposit_paid_at ? "deposit_paid" : "unpaid")
  const isPaid = paymentStatus === "paid" || Boolean(estimate.paid_at)
  const isDepositPaid = paymentStatus === "deposit_paid" || Boolean(estimate.deposit_paid_at)
  const isAccepted = estimate.status === "accepted"
  const isDeclined = estimate.status === "declined"
  const isExpired  = estimate.status === "expired"

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
      <AutoPrint />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Screen canvas ── */
        @media screen {
          html, body { background: #D0D0D0; }
        }

        /* ── Outer wrapper ── */
        .pg-outer {
          padding: 48px 16px 80px;
          display: flex;
          justify-content: center;
          min-height: 100vh;
        }

        /* ── Paper card ── */
        .pg-card {
          width: 100%;
          max-width: 816px;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 0 8px 60px rgba(0,0,0,0.22), 0 2px 16px rgba(0,0,0,0.10);
          align-self: flex-start;
        }

        /* ── Masthead ── */
        .pg-head { padding: 44px 56px 40px; }
        .pg-head-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }
        .pg-head-left { flex: 1; min-width: 0; }
        .pg-head-right { text-align: right; flex-shrink: 0; }
        .pg-num { font-size: 54px; font-weight: 900; letter-spacing: -0.045em; line-height: 1; margin-bottom: 12px; }

        /* ── Content ── */
        .pg-body { padding: 0 56px; }
        .pg-foot { padding: 20px 56px; }

        /* ── Client + project columns ── */
        .pg-client-row {
          display: flex;
          gap: 48px;
          padding: 32px 0 28px;
          border-bottom: 1px solid #EFEFEF;
        }



        /* ── Mobile ── */
        @media screen and (max-width: 620px) {
          .pg-outer { padding: 0 0 40px; }
          .pg-card { border-radius: 0; box-shadow: none; }

          .pg-head { padding: 28px 20px 24px; }
          .pg-head-row { flex-direction: column; gap: 12px; }
          .pg-head-right { text-align: left; }
          .pg-num { font-size: 38px; }

          .pg-body { padding: 0 20px; }
          .pg-foot { padding: 16px 20px; }

          .pg-client-row { flex-direction: column; gap: 20px; padding: 24px 0 20px; }

        }

        /* ── Print ── */
        @media print {
          html, body { background: white; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .no-print { display: none !important; }

          @page { margin: 0; size: letter; }

          .pg-outer {
            padding: 0;
            display: block;
            min-height: 0;
          }
          .pg-card {
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          .pg-head { padding: 44px 52px 40px !important; }
          .pg-head-row { flex-direction: row !important; gap: 20px !important; }
          .pg-head-right { text-align: right !important; }
          .pg-num { font-size: 54px !important; }
          .pg-body { padding: 0 52px !important; }
          .pg-foot { padding: 20px 52px !important; }
          .pg-client-row { flex-direction: row !important; gap: 48px !important; padding: 32px 0 28px !important; }
        }

        a { color: inherit; text-decoration: none; }
      `}</style>

      <div className="pg-outer">
        <div className="pg-card">

          {/* ─── MASTHEAD ─── */}
          <div className="pg-head" style={{ background: color }}>
            <div className="pg-head-row">

              {/* Company */}
              <div className="pg-head-left">
                {company.logo_url ? (
                  <div style={{ background: "white", borderRadius: 8, padding: "7px 12px", display: "inline-block", marginBottom: 12 }}>
                    <img src={company.logo_url} alt={companyName} style={{ height: 34, maxWidth: 160, objectFit: "contain", display: "block" }} />
                  </div>
                ) : (
                  <div style={{ fontSize: 24, fontWeight: 900, color: textHigh, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>{companyName}</div>
                )}
                <div style={{ lineHeight: 1.9 }}>
                  {company.logo_url && (
                    <div style={{ fontSize: 14, fontWeight: 700, color: textHigh, marginBottom: 1 }}>{companyName}</div>
                  )}
                  {(company.city || company.state) && (
                    <div style={{ fontSize: 13, color: textMid }}>{[company.city, company.state].filter(Boolean).join(", ")}</div>
                  )}
                  {company.phone && <div style={{ fontSize: 13, color: textMid }}>{company.phone}</div>}
                  {company.email && <div style={{ fontSize: 13, color: textMid }}>{company.email}</div>}
                </div>
              </div>

              {/* Estimate identity */}
              <div className="pg-head-right">
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: textLow, marginBottom: 8 }}>
                  Estimate
                </div>
                <div className="pg-num" style={{ color: textHigh }}>#{estimateNumber}</div>
                <div style={{ fontSize: 13, color: textMid, lineHeight: 2 }}>
                  <div>{dateFormatted}</div>
                  {validUntilFormatted && !isAccepted && !isDeclined && !isExpired && (
                    <div>Valid until {validUntilFormatted}</div>
                  )}
                </div>

                {isAccepted && (
                  <div style={{
                    marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6,
                    background: badgeBg, borderRadius: 24, padding: "5px 14px",
                    border: `1px solid ${badgeBdr}`,
                  }}>
                    <span style={{ fontSize: 13, color: textHigh }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textHigh }}>Accepted</span>
                    {estimate.accepted_at && (
                      <span style={{ fontSize: 11, color: textMid }}>
                        {new Date(estimate.accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}
                {isDeclined && (
                  <div style={{ marginTop: 12, display: "inline-block", background: badgeBg, borderRadius: 24, padding: "5px 14px" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textMid }}>Declined</span>
                  </div>
                )}
                {isExpired && (
                  <div style={{ marginTop: 12, display: "inline-block", background: badgeBg, borderRadius: 24, padding: "5px 14px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: textLow }}>Expired</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── CONTENT ─── */}
          <div className="pg-body">

            {/* Client + project */}
            <div className="pg-client-row">
              <div style={{ flex: 3, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C0C0C0", marginBottom: 10 }}>
                  Prepared For
                </div>
                {clientDisplayName && (
                  <div style={{ fontSize: 19, fontWeight: 800, color: "#111", letterSpacing: "-0.025em", marginBottom: 4, lineHeight: 1.2 }}>
                    {clientDisplayName}
                  </div>
                )}
                {estimate.client_company && (estimate.client_first_name || estimate.client_name) && (
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 3 }}>
                    c/o {estimate.client_first_name ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim() : estimate.client_name}
                  </div>
                )}
                {estimate.property_address && (
                  <div style={{ fontSize: 14, color: "#555", marginTop: 5, lineHeight: 1.55 }}>{estimate.property_address}</div>
                )}
                {estimate.client_phone && <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>{estimate.client_phone}</div>}
                {estimate.client_email && <div style={{ fontSize: 13, color: "#888" }}>{estimate.client_email}</div>}
              </div>

              {estimate.title && (
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C0C0C0", marginBottom: 10 }}>
                    Project
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111", lineHeight: 1.4 }}>{estimate.title}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            {items.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0 0 11px", textAlign: "left", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", borderBottom: `2px solid ${color}`, width: "46%" }}>Description</th>
                      <th style={{ padding: "0 14px 11px", textAlign: "center", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", borderBottom: `2px solid ${color}`, width: "14%" }}>Qty</th>
                      <th style={{ padding: "0 14px 11px", textAlign: "right", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", borderBottom: `2px solid ${color}`, width: "20%" }}>Unit Price</th>
                      <th style={{ padding: "0 0 11px", textAlign: "right", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", borderBottom: `2px solid ${color}`, width: "20%" }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                        <td style={{ padding: "14px 0", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.45 }}>{item.description}</div>
                          {item.category && (
                            <div style={{ fontSize: 10, color: "#BBBBBB", marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {item.category}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px", textAlign: "center", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          <span style={{ fontSize: 14, color: "#444" }}>{item.quantity}</span>
                          {item.unit && <div style={{ fontSize: 11, color: "#BBBBBB", marginTop: 2 }}>{item.unit}</div>}
                        </td>
                        <td style={{ padding: "14px", textAlign: "right", fontSize: 14, color: "#666", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          {fmt(item.unit_price)}
                        </td>
                        <td style={{ padding: "14px 0", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#111", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          {fmt(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, marginBottom: 44 }}>
                  <div style={{ minWidth: 280 }}>
                    {estimate.tax_rate > 0 && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <span style={{ fontSize: 14, color: "#999" }}>Subtotal</span>
                          <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.subtotal)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <span style={{ fontSize: 14, color: "#999" }}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
                          <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.tax_amount)}</span>
                        </div>
                      </>
                    )}
                    <div style={{
                      background: color, borderRadius: 10, padding: "16px 22px", marginTop: 10,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: textLow, letterSpacing: "0.14em", textTransform: "uppercase" }}>Total Due</span>
                      <span style={{ fontSize: 28, fontWeight: 900, color: textHigh, letterSpacing: "-0.03em" }}>{fmt(estimate.total)}</span>
                    </div>
                    {balanceDue > 0 && (
                      <div style={{ marginTop: 10, border: "1px solid #EDEDED", borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
                          <span style={{ fontSize: 13, color: "#777", fontWeight: 700 }}>{Math.round(depositPct)}% deposit due now</span>
                          <span style={{ fontSize: 14, color: "#111", fontWeight: 800 }}>{fmt(depositDue)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 14px", background: "white" }}>
                          <span style={{ fontSize: 13, color: "#777", fontWeight: 700 }}>Balance due at completion</span>
                          <span style={{ fontSize: 14, color: "#111", fontWeight: 800 }}>{fmt(balanceDue)}</span>
                        </div>
                      </div>
                    )}
                    {(isPaid || isDepositPaid) && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#F0FBF4", borderRadius: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 13, color: "#16803C", fontWeight: 600 }}>{isPaid ? "Payment received" : "Deposit paid"}</span>
                        <span style={{ fontSize: 14, color: "#16803C", fontWeight: 700 }}>{fmt(isPaid ? estimate.total : (estimate.deposit_amount ?? depositDue))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {estimate.notes && (
              <div style={{ marginBottom: 40, padding: "18px 22px", background: "#FAFAFA", borderRadius: 10, borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", marginBottom: 10 }}>Notes</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{estimate.notes}</div>
              </div>
            )}

          </div>

          {/* ─── FOOTER ─── */}
          <div className="pg-foot" style={{ background: "#F7F7F7", borderTop: "1px solid #EFEFEF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#999", lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "#555" }}>{companyName}</span>
              {company.phone && <span style={{ color: "#BBBBBB" }}> · {company.phone}</span>}
              {company.email && <span style={{ color: "#BBBBBB" }}> · {company.email}</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#CCCCCC", letterSpacing: "0.05em", flexShrink: 0, marginLeft: 16 }}>
              Powered by Found
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
