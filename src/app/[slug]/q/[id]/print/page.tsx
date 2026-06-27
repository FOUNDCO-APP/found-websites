import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { createAdminClient } from "@/lib/supabase/admin"
import AutoPrint from "./AutoPrint"

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
}

function displayName(name: string) {
  if (!name) return name
  // If already has mixed case or spaces, return as-is; otherwise capitalize first letter
  if (name === name.toLowerCase() && !name.includes(" ")) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return name
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
  const companyName = displayName(company.name)

  const estimateNumber = id.slice(-8).toUpperCase()
  const dateFormatted = new Date(estimate.created_at).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  })

  return (
    <>
      <AutoPrint />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: white; color: #111; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
        @media print {
          html, body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 0.6in; size: letter; }
        }
        a { color: inherit; text-decoration: none; }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 40px", minHeight: "100vh", backgroundColor: "white" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, paddingBottom: 28, borderBottom: `3px solid ${color}` }}>
          <div>
            {company.logo_url ? (
              <img src={company.logo_url} alt={companyName} style={{ height: 52, objectFit: "contain", marginBottom: 8, display: "block" }} />
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: "-0.02em", marginBottom: 4 }}>{companyName}</div>
            )}
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
              {company.city && company.state && <div>{company.city}, {company.state}</div>}
              {company.phone && <div>{company.phone}</div>}
              {company.email && <div>{company.email}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color, letterSpacing: "-0.03em", marginBottom: 6 }}>ESTIMATE</div>
            <div style={{ fontSize: 13, color: "#555", lineHeight: 1.8 }}>
              <div><span style={{ color: "#999" }}>No.</span> {estimateNumber}</div>
              <div><span style={{ color: "#999" }}>Date</span> {dateFormatted}</div>
              {estimate.status === "accepted" && estimate.accepted_at && (
                <div style={{ color, fontWeight: 700, marginTop: 4 }}>✓ Accepted {new Date(estimate.accepted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              )}
            </div>
          </div>
        </div>

        {/* Client info */}
        <div style={{ display: "flex", gap: 40, marginBottom: 36 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>Prepared For</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111", marginBottom: 4 }}>
              {estimate.client_company
                ? estimate.client_company
                : (estimate.client_first_name && estimate.client_last_name)
                  ? `${estimate.client_first_name} ${estimate.client_last_name}`
                  : estimate.client_name}
            </div>
            {estimate.client_company && (estimate.client_first_name || estimate.client_name) && (
              <div style={{ fontSize: 13, color: "#666", marginBottom: 2 }}>
                Attn: {estimate.client_first_name ? `${estimate.client_first_name} ${estimate.client_last_name ?? ""}`.trim() : estimate.client_name}
              </div>
            )}
            {estimate.property_address && (
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{estimate.property_address}</div>
            )}
            {estimate.client_phone && <div style={{ fontSize: 13, color: "#555" }}>{estimate.client_phone}</div>}
            {estimate.client_email && <div style={{ fontSize: 13, color: "#555" }}>{estimate.client_email}</div>}
          </div>
          {estimate.title && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: 8 }}>Project</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>{estimate.title}</div>
            </div>
          )}
        </div>

        {/* Line items table */}
        {items.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 0 }}>
            <thead>
              <tr style={{ backgroundColor: color }}>
                <th style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", width: "45%" }}>Description</th>
                <th style={{ padding: "10px 14px", textAlign: "center", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", width: "15%" }}>Qty</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", width: "20%" }}>Unit Price</th>
                <th style={{ padding: "10px 14px", textAlign: "right", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "white", width: "20%" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f9f9f9" }}>
                  <td style={{ padding: "13px 14px", borderBottom: "1px solid #eee" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 2 }}>{item.description}</div>
                    {item.category && <div style={{ fontSize: 12, color: "#888" }}>{item.category}</div>}
                  </td>
                  <td style={{ padding: "13px 14px", textAlign: "center", fontSize: 14, color: "#444", borderBottom: "1px solid #eee" }}>
                    {item.quantity} {item.unit || ""}
                  </td>
                  <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 14, color: "#444", borderBottom: "1px solid #eee" }}>
                    {fmt(item.unit_price)}
                  </td>
                  <td style={{ padding: "13px 14px", textAlign: "right", fontSize: 14, fontWeight: 700, color: "#111", borderBottom: "1px solid #eee" }}>
                    {fmt(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 0, marginBottom: 40 }}>
          <div style={{ width: 260 }}>
            {estimate.tax_rate > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontSize: 13, color: "#555" }}>Subtotal</span>
                  <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{fmt(estimate.subtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", borderBottom: "1px solid #eee" }}>
                  <span style={{ fontSize: 13, color: "#555" }}>Tax ({(estimate.tax_rate * 100).toFixed(2)}%)</span>
                  <span style={{ fontSize: 13, color: "#333", fontWeight: 600 }}>{fmt(estimate.tax_amount)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", backgroundColor: color }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "white", letterSpacing: "0.04em", textTransform: "uppercase" }}>Total</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>{fmt(estimate.total)}</span>
            </div>
            {estimate.deposit_paid_at && estimate.deposit_amount && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px", backgroundColor: "#f0f9f3" }}>
                <span style={{ fontSize: 13, color: "#1A7A3C" }}>Deposit Paid</span>
                <span style={{ fontSize: 13, color: "#1A7A3C", fontWeight: 700 }}>{fmt(estimate.deposit_amount)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 700, color: "#555", marginBottom: 2 }}>{companyName}</div>
            {company.phone && <div>{company.phone}</div>}
            {company.email && <div>{company.email}</div>}
          </div>
          <div style={{ fontSize: 11, color: "#ccc", textAlign: "right" }}>
            <div>Thank you for the opportunity.</div>
            <div style={{ marginTop: 4, color: "#ddd" }}>Powered by Found</div>
          </div>
        </div>

      </div>
    </>
  )
}
