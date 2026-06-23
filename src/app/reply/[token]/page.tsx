import { notFound } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import ReplyForm from "./ReplyForm"
import { getSiteCopy } from "@/lib/siteCopy"

export default async function ReplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createAdminClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("*, companies(name, phone, logo_url, primary_color, slug, primary_intent)")
    .eq("reply_token", token)
    .single()

  if (!lead) notFound()

  const company = lead.companies as {
    name: string
    phone: string | null
    logo_url: string | null
    primary_color: string
    slug: string
    primary_intent: string
  }

  const primary = company.primary_color || "#111111"
  const firstName = lead.name.split(" ")[0]
  const websiteUrl = `https://${company.slug}.foundco.app`
  const leadTypeLabel = lead.type === "reservation_request"
    ? "Reservation request"
    : getSiteCopy(company.primary_intent, { name: company.name }).leadTypeLabel

  const isReservation = lead.type === "reservation_request"
  const pa = (lead.partial_answers ?? {}) as Record<string, string>

  const subjectWordMap: Record<string, string> = {
    reservations: "reservation",
    bookings: "booking",
    appointments: "appointment",
    estimates: "estimate request",
    orders: "order",
  }
  const subjectWord = isReservation
    ? "reservation"
    : subjectWordMap[company.primary_intent] ?? "inquiry"
  const defaultSubject = `Re: Your ${subjectWord} — ${company.name}`

  const bodyVerbMap: Record<string, string> = {
    reservations: "confirm your reservation",
    bookings: "get you on the schedule",
    appointments: "get you on the schedule",
    estimates: "put together an estimate for you",
    orders: "process your order",
  }
  const bodyVerb = bodyVerbMap[company.primary_intent] ?? "help you out"

  let defaultMessage: string
  if (isReservation) {
    const reservationLine = pa.date && pa.time
      ? ` for ${pa.date} at ${pa.time}`
      : ""
    defaultMessage = `Hi ${firstName},\n\nThank you for your reservation request${reservationLine}. We're confirming your reservation and will make sure everything is ready for you.\n\nIf you need to make any changes or have questions, reply here or give us a call${company.phone ? ` at ${company.phone}` : ""}.\n\nLooking forward to seeing you!`
  } else {
    defaultMessage = `Hi ${firstName},\n\nThank you for reaching out to ${company.name}${lead.service ? ` about ${lead.service.toLowerCase()}` : ""}. I'd love to ${bodyVerb}.\n\nWhat's a good time for a quick call this week? I'm usually available mornings and afternoons. You can also call me directly${company.phone ? ` at ${company.phone}` : ""}.\n\nLooking forward to connecting!`
  }

  const alreadyReplied = !!lead.replied_at

  // Build a list of lead detail rows to display
  const detailRows: { label: string; value: string }[] = []
  if (lead.phone)                detailRows.push({ label: "Phone", value: lead.phone })
  if (lead.email)                detailRows.push({ label: "Email", value: lead.email })
  if (lead.service)              detailRows.push({ label: "Service", value: lead.service })
  if (pa.job_address)            detailRows.push({ label: "Address", value: pa.job_address })
  if (pa.home_type)              detailRows.push({ label: "Property", value: pa.home_type })
  if (pa.sq_footage)             detailRows.push({ label: "Size", value: pa.sq_footage })
  if (pa.frequency)              detailRows.push({ label: "Frequency", value: pa.frequency })
  if (pa.event_date)             detailRows.push({ label: "Date", value: pa.event_date })
  if (pa.guest_count)            detailRows.push({ label: "Guests", value: pa.guest_count })
  if (pa.vehicle_info)           detailRows.push({ label: "Vehicle", value: pa.vehicle_info })
  if (pa.timeline)               detailRows.push({ label: "Timeline", value: pa.timeline })
  if (pa.budget)                 detailRows.push({ label: "Budget", value: pa.budget })
  if (lead.message)              detailRows.push({ label: "Notes", value: lead.message })

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
              : `${leadTypeLabel}${lead.service ? ` · ${lead.service}` : ""}`
            }
          </p>
        </div>

        {/* Lead details card */}
        {!alreadyReplied && detailRows.length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "20px 24px", marginBottom: "16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <p style={{ margin: "0 0 14px", fontSize: "11px", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "#bbbbbb" }}>
              Their Request
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px" }}>
              {detailRows.map(({ label, value }) => (
                <>
                  <span key={label + "-l"} style={{ fontSize: "12px", fontWeight: 700, color: "#aaaaaa", whiteSpace: "nowrap", paddingTop: "1px" }}>{label}</span>
                  <span key={label + "-v"} style={{ fontSize: "13px", color: "#333333", lineHeight: "1.5" }}>{value}</span>
                </>
              ))}
            </div>
          </div>
        )}

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
