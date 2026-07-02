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
        @media screen {
          html, body { background: #D5D5D5; }
        }
        @media print {
          html, body { background: white; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; color-adjust: exact; }
          .no-print { display: none !important; }
          .page-outer { padding: 0 !important; display: block !important; min-height: 0 !important; }
          .page-card { box-shadow: none !important; width: 100% !important; border-radius: 0 !important; }
          @page { margin: 0; size: letter; }
        }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div className="page-outer" style={{ padding: "52px 20px 80px", display: "flex", justifyContent: "center", minHeight: "100vh" }}>
        <div className="page-card" style={{
          width: 816,
          background: "white",
          boxShadow: "0 8px 64px rgba(0,0,0,0.22), 0 2px 16px rgba(0,0,0,0.10)",
          borderRadius: 4,
          overflow: "hidden",
        }}>

          {/* ─── MASTHEAD ─── */}
          <div style={{ background: color, padding: "44px 64px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>

              {/* Company identity */}
              <div>
                {company.logo_url ? (
                  <div style={{
                    background: "white", borderRadius: 10, padding: "8px 14px",
                    display: "inline-block", marginBottom: 14,
                  }}>
                    <img
                      src={company.logo_url}
                      alt={companyName}
                      style={{ height: 38, maxWidth: 180, objectFit: "contain", display: "block" }}
                    />
                  </div>
                ) : (
                  <div style={{
                    fontSize: 26, fontWeight: 900, color: textHigh,
                    letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 14,
                  }}>
                    {companyName}
                  </div>
                )}
                <div style={{ lineHeight: 1.9 }}>
                  {company.logo_url && (
                    <div style={{ fontSize: 15, fontWeight: 700, color: textHigh, marginBottom: 1 }}>{companyName}</div>
                  )}
                  {(company.city || company.state) && (
                    <div style={{ fontSize: 13, color: textMid }}>{[company.city, company.state].filter(Boolean).join(", ")}</div>
                  )}
                  {company.phone && <div style={{ fontSize: 13, color: textMid }}>{company.phone}</div>}
                  {company.email && <div style={{ fontSize: 13, color: textMid }}>{company.email}</div>}
                </div>
              </div>

              {/* Estimate number + status */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.22em",
                  textTransform: "uppercase", color: textLow, marginBottom: 10,
                }}>
                  Estimate
                </div>
                <div style={{
                  fontSize: 54, fontWeight: 900, color: textHigh,
                  letterSpacing: "-0.045em", lineHeight: 1, marginBottom: 14,
                }}>
                  #{estimateNumber}
                </div>
                <div style={{ fontSize: 13, color: textMid, lineHeight: 2 }}>
                  <div>{dateFormatted}</div>
                  {validUntilFormatted && !isAccepted && !isDeclined && !isExpired && (
                    <div>Valid until {validUntilFormatted}</div>
                  )}
                </div>

                {isAccepted && (
                  <div style={{
                    marginTop: 14, display: "inline-flex", alignItems: "center", gap: 7,
                    background: badgeBg, borderRadius: 24, padding: "6px 16px",
                    border: `1px solid ${badgeBdr}`,
                  }}>
                    <span style={{ fontSize: 14, color: textHigh }}>✓</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textHigh }}>Accepted</span>
                    {estimate.accepted_at && (
                      <span style={{ fontSize: 12, color: textMid }}>
                        {new Date(estimate.accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}
                {isDeclined && (
                  <div style={{ marginTop: 14, display: "inline-block", background: badgeBg, borderRadius: 24, padding: "6px 16px" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: textMid }}>Declined</span>
                  </div>
                )}
                {isExpired && (
                  <div style={{ marginTop: 14, display: "inline-block", background: badgeBg, borderRadius: 24, padding: "6px 16px" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: textLow }}>Expired</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── CONTENT ─── */}
          <div style={{ padding: "0 64px" }}>

            {/* Client + project strip */}
            <div style={{ display: "flex", gap: 56, padding: "36px 0 32px", borderBottom: "1px solid #EFEFEF" }}>
              <div style={{ flex: 3 }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
                  textTransform: "uppercase", color: "#C0C0C0", marginBottom: 12,
                }}>
                  Prepared For
                </div>
                {clientDisplayName && (
                  <div style={{
                    fontSize: 19, fontWeight: 800, color: "#111",
                    letterSpacing: "-0.025em", marginBottom: 5, lineHeight: 1.2,
                  }}>
                    {clientDisplayName}
                  </div>
                )}
                {estimate.client_company && (estimate.client_first_name || estimate.client_name) && (
                  <div style={{ fontSize: 13, color: "#888", marginBottom: 4 }}>
                    c/o {estimate.client_first_name
                      ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim()
                      : estimate.client_name}
                  </div>
                )}
                {estimate.property_address && (
                  <div style={{ fontSize: 14, color: "#555", marginTop: 6, lineHeight: 1.55 }}>{estimate.property_address}</div>
                )}
                {estimate.client_phone && <div style={{ fontSize: 13, color: "#888", marginTop: 5 }}>{estimate.client_phone}</div>}
                {estimate.client_email && <div style={{ fontSize: 13, color: "#888" }}>{estimate.client_email}</div>}
              </div>

              {estimate.title && (
                <div style={{ flex: 2 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "#C0C0C0", marginBottom: 12,
                  }}>
                    Project
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#111", lineHeight: 1.4 }}>{estimate.title}</div>
                </div>
              )}
            </div>

            {/* Line items */}
            {items.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: "0 0 12px", textAlign: "left", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0",
                        borderBottom: `2px solid ${color}`, width: "46%",
                      }}>Description</th>
                      <th style={{
                        padding: "0 16px 12px", textAlign: "center", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0",
                        borderBottom: `2px solid ${color}`, width: "14%",
                      }}>Qty</th>
                      <th style={{
                        padding: "0 16px 12px", textAlign: "right", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0",
                        borderBottom: `2px solid ${color}`, width: "20%",
                      }}>Unit Price</th>
                      <th style={{
                        padding: "0 0 12px", textAlign: "right", fontSize: 10, fontWeight: 800,
                        letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0",
                        borderBottom: `2px solid ${color}`, width: "20%",
                      }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? "white" : "#FAFAFA" }}>
                        <td style={{ padding: "15px 0", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#111", lineHeight: 1.45 }}>{item.description}</div>
                          {item.category && (
                            <div style={{ fontSize: 10, color: "#BBBBBB", marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              {item.category}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "15px 16px", textAlign: "center", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          <span style={{ fontSize: 14, color: "#444" }}>{item.quantity}</span>
                          {item.unit && <div style={{ fontSize: 11, color: "#BBBBBB", marginTop: 2 }}>{item.unit}</div>}
                        </td>
                        <td style={{ padding: "15px 16px", textAlign: "right", fontSize: 14, color: "#666", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          {fmt(item.unit_price)}
                        </td>
                        <td style={{ padding: "15px 0", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#111", verticalAlign: "top", borderBottom: "1px solid #F2F2F2" }}>
                          {fmt(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 28, marginBottom: 48 }}>
                  <div style={{ minWidth: 292 }}>
                    {estimate.tax_rate > 0 && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <span style={{ fontSize: 14, color: "#999" }}>Subtotal</span>
                          <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.subtotal)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderBottom: "1px solid #F0F0F0" }}>
                          <span style={{ fontSize: 14, color: "#999" }}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
                          <span style={{ fontSize: 14, color: "#444", fontWeight: 600 }}>{fmt(estimate.tax_amount)}</span>
                        </div>
                      </>
                    )}
                    <div style={{
                      background: color, borderRadius: 12, padding: "18px 24px", marginTop: 10,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: textLow, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Total Due
                      </span>
                      <span style={{ fontSize: 30, fontWeight: 900, color: textHigh, letterSpacing: "-0.035em" }}>
                        {fmt(estimate.total)}
                      </span>
                    </div>
                    {estimate.deposit_paid_at && estimate.deposit_amount && (
                      <div style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 16px", background: "#F0FBF4", borderRadius: 10, marginTop: 8,
                      }}>
                        <span style={{ fontSize: 13, color: "#16803C", fontWeight: 600 }}>✓ Deposit Paid</span>
                        <span style={{ fontSize: 14, color: "#16803C", fontWeight: 700 }}>{fmt(estimate.deposit_amount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {estimate.notes && (
              <div style={{
                marginBottom: 44, padding: "20px 24px",
                background: "#FAFAFA", borderRadius: 10,
                borderLeft: `3px solid ${color}`,
              }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#C0C0C0", marginBottom: 10 }}>
                  Notes
                </div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{estimate.notes}</div>
              </div>
            )}

            {/* Authorization / Signature */}
            <div style={{ borderTop: "1px solid #EFEFEF", paddingTop: 36, marginBottom: 44 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#C0C0C0", marginBottom: 28 }}>
                Authorization
              </div>
              <div style={{ display: "flex", gap: 36 }}>
                <div style={{ flex: 5 }}>
                  <div style={{ height: 44, borderBottom: "1.5px solid #D8D8D8", marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#C0C0C0", letterSpacing: "0.06em" }}>Client Signature</div>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ height: 44, borderBottom: "1.5px solid #D8D8D8", marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#C0C0C0", letterSpacing: "0.06em" }}>Date</div>
                </div>
                <div style={{ flex: 3 }}>
                  <div style={{ height: 44, borderBottom: "1.5px solid #D8D8D8", marginBottom: 8 }} />
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#C0C0C0", letterSpacing: "0.06em" }}>Printed Name</div>
                </div>
              </div>
            </div>

          </div>

          {/* ─── FOOTER ─── */}
          <div style={{
            background: "#F7F7F7", borderTop: "1px solid #EFEFEF",
            padding: "20px 64px", display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: 12, color: "#999", lineHeight: 1.7 }}>
              <span style={{ fontWeight: 700, color: "#555" }}>{companyName}</span>
              {company.phone && <span style={{ color: "#BBBBBB" }}> · {company.phone}</span>}
              {company.email && <span style={{ color: "#BBBBBB" }}> · {company.email}</span>}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#CCCCCC", letterSpacing: "0.05em" }}>
              Powered by Found
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
