import ConnectDomainForm from "./ConnectDomainForm"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { notFound } from "next/navigation"

async function getCompanyBySlug(slug: string) {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data } = await supabase
    .from("companies")
    .select("id, name, slug, website_config(custom_domain)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle()
  return data
}

export default async function ConnectDomainPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const { slug } = await searchParams
  if (!slug) notFound()

  const company = await getCompanyBySlug(slug)
  if (!company) notFound()

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "foundco.app"
  const siteUrl = `https://${slug}.${ROOT_DOMAIN}`
  const existingDomain = (company.website_config as { custom_domain?: string } | null)?.custom_domain ?? null

  return (
    <div className="min-h-screen bg-[#f5f5f5]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#080A09", padding: "28px 24px", textAlign: "center" }}>
        <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#32D074" }}>
          Found
        </p>
        <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          Connect your domain
        </p>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "40px 24px" }}>

        {/* Current site URL */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", marginBottom: "20px" }}>
          <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#999" }}>
            {company.name}
          </p>
          <a href={siteUrl} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "16px", fontWeight: 900, color: "#32D074", textDecoration: "none" }}>
            {siteUrl.replace("https://", "")}
          </a>
          {existingDomain && (
            <p style={{ margin: "10px 0 0", fontSize: "13px", color: "#555" }}>
              Currently connected: <strong>{existingDomain}</strong>
            </p>
          )}
        </div>

        {/* Form */}
        <ConnectDomainForm slug={slug} existingDomain={existingDomain} />

        {/* DNS instructions */}
        <div style={{ background: "#ffffff", borderRadius: "14px", padding: "24px", marginTop: "20px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "13px", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", color: "#111" }}>
            How to connect your domain
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#555", lineHeight: 1.65 }}>
            After entering your domain above, add these two records at your registrar (GoDaddy, Namecheap, Google Domains, etc.):
          </p>
          <div style={{ background: "#f7f7f7", borderRadius: "10px", padding: "16px", fontFamily: "monospace", fontSize: "13px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Type", "Name", "Value"].map(h => (
                    <th key={h} style={{ padding: "4px 12px 10px 0", textAlign: "left", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#999", fontFamily: "-apple-system, sans-serif" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: "6px 12px 6px 0", color: "#111", borderTop: "1px solid #ebebeb" }}>A</td>
                  <td style={{ padding: "6px 12px 6px 0", color: "#111", borderTop: "1px solid #ebebeb" }}>@</td>
                  <td style={{ padding: "6px 0 6px 0", color: "#32D074", borderTop: "1px solid #ebebeb" }}>76.76.21.21</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 12px 6px 0", color: "#111", borderTop: "1px solid #ebebeb" }}>CNAME</td>
                  <td style={{ padding: "6px 12px 6px 0", color: "#111", borderTop: "1px solid #ebebeb" }}>www</td>
                  <td style={{ padding: "6px 0 6px 0", color: "#32D074", borderTop: "1px solid #ebebeb" }}>cname.vercel-dns.com</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ margin: "16px 0 0", fontSize: "13px", color: "#999", lineHeight: 1.65 }}>
            DNS changes typically take 10–60 minutes to propagate. SSL is provisioned automatically — no extra steps needed.
          </p>
        </div>

        {/* Help */}
        <p style={{ textAlign: "center", marginTop: "28px", fontSize: "13px", color: "#aaa" }}>
          Need help? Reply to your welcome email or{" "}
          <a href="mailto:hello@foundco.app" style={{ color: "#555", fontWeight: 700 }}>email us</a>.
        </p>
      </div>
    </div>
  )
}
