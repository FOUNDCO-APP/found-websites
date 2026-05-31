import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import ReplyForm from "./ReplyForm"

export default async function ReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("*, companies(name, phone, logo_url, primary_color, slug)")
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
  const defaultMessage = `Hi ${firstName},\n\nThank you for reaching out! I'd love to help${lead.service ? ` with your ${lead.service.toLowerCase()} project` : ""} and will be in touch soon.`

  const alreadyReplied = !!lead.replied_at

  return (
    <div style={{
      background: "#f7f7f7",
      minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    }}>
      {/* Found wordmark */}
      <div style={{ textAlign: "center", padding: "32px 20px 0" }}>
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, letterSpacing: "4px", textTransform: "uppercase", color: "#aaaaaa" }}>
          Found
        </p>
      </div>

      <div style={{ maxWidth: "560px", margin: "20px auto", padding: "0 20px 60px" }}>

        {/* Context */}
        <div style={{ textAlign: "center", padding: "20px 0 28px" }}>
          <p style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 800, color: "#111111" }}>
            {alreadyReplied ? "Already replied." : `Reply to ${firstName}`}
          </p>
          <p style={{ margin: 0, fontSize: "14px", color: "#888888" }}>
            {alreadyReplied
              ? `You've already sent a reply to this request from ${lead.name}.`
              : `Estimate request${lead.service ? ` · ${lead.service}` : ""}`
            }
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#ffffff", borderRadius: "16px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          {!alreadyReplied && !lead.email ? (
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#111111", margin: "0 0 8px" }}>No email on file.</p>
              <p style={{ fontSize: "14px", color: "#888888", margin: 0 }}>
                {lead.name} didn't provide an email address. Give them a call at <strong>{lead.phone}</strong>.
              </p>
            </div>
          ) : (
            <ReplyForm
              token={token}
              customerName={lead.name}
              customerEmail={lead.email || ""}
              defaultSubject={defaultSubject}
              defaultMessage={defaultMessage}
              primaryColor={primary}
              companyName={company.name}
              companyPhone={company.phone}
              companyLogoUrl={company.logo_url}
              websiteUrl={websiteUrl}
              alreadyReplied={alreadyReplied}
            />
          )}
        </div>

      </div>
    </div>
  )
}
