import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import ReplyForm from "./ReplyForm"

export default async function ReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("*, companies(name, phone, logo_url, primary_color, slug, website_config(*))")
    .eq("reply_token", token)
    .single()

  if (!lead) notFound()

  const company = lead.companies as {
    name: string
    phone: string | null
    logo_url: string | null
    primary_color: string
    slug: string
  }

  const primary = company.primary_color || "#111111"
  const firstName = lead.name.split(" ")[0]
  const websiteUrl = `https://${company.slug}.foundco.app`

  const defaultSubject = `Re: Your estimate request — ${company.name}`
  const defaultMessage = `Hi ${firstName},\n\nThank you for reaching out to ${company.name}!${lead.service ? ` I'd love to help with your ${lead.service.toLowerCase()} project` : ""} and will be in touch soon.\n\n${company.name}${company.phone ? `\n${company.phone}` : ""}\n${websiteUrl}`

  const alreadyReplied = !!lead.replied_at

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "40px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ background: "#111111", borderRadius: "16px 16px 0 0", padding: "32px", textAlign: "center" }}>
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} style={{ height: "48px", width: "auto", margin: "0 auto", display: "block" }} />
          ) : (
            <>
              <div style={{
                width: "52px", height: "52px", borderRadius: "50%",
                background: primary, display: "inline-flex",
                alignItems: "center", justifyContent: "center", marginBottom: "12px"
              }}>
                <span style={{ fontSize: "22px", fontWeight: 900, color: "#ffffff" }}>{company.name.charAt(0)}</span>
              </div>
              <p style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#ffffff" }}>{company.name}</p>
            </>
          )}
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#888888", letterSpacing: "2px", textTransform: "uppercase", fontWeight: 700 }}>
            Reply to Estimate Request
          </p>
        </div>

        {/* Body */}
        <div style={{ background: "#ffffff", padding: "36px 32px", borderRadius: "0 0 16px 16px" }}>
          {alreadyReplied ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#111111", margin: "0 0 8px" }}>Already sent.</p>
              <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>You've already replied to this request from {lead.name}.</p>
            </div>
          ) : !lead.email ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ fontSize: "18px", fontWeight: 800, color: "#111111", margin: "0 0 8px" }}>No email on file.</p>
              <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>{lead.name} didn't provide an email. Give them a call at {lead.phone}.</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "28px", padding: "16px 20px", background: "#f9f9f9", borderRadius: "12px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#999999" }}>Request from</p>
                <p style={{ margin: "0 0 2px", fontSize: "17px", fontWeight: 800, color: "#111111" }}>{lead.name}</p>
                {lead.service && <p style={{ margin: 0, fontSize: "13px", color: "#666666" }}>{lead.service}</p>}
              </div>

              <ReplyForm
                token={token}
                customerName={lead.name}
                customerEmail={lead.email}
                defaultSubject={defaultSubject}
                defaultMessage={defaultMessage}
                primaryColor={primary}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <p style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 800, color: "#888888" }}>You've been Found.</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#bbbbbb" }}>
            Powered by <a href="https://foundco.app" style={{ color: "#bbbbbb", textDecoration: "underline" }}>Found</a>
          </p>
        </div>

      </div>
    </div>
  )
}
