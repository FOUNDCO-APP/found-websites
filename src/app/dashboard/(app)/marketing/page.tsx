import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { TYPE, TEXT_OPACITY, GREEN, BLACK } from "@/lib/dashboard/typography"
import MarketingComposer from "@/components/dashboard/MarketingComposer"

const TEMPLATES = [
  { slug: "slow_week",        label: "Slow Week Special",       hint: "Fill a gap in your schedule with a time-limited offer." },
  { slug: "new_service",      label: "New Service",             hint: "Announce something new you're now offering." },
  { slug: "seasonal",         label: "Seasonal Promotion",      hint: "Tie an offer to the current season or upcoming holiday." },
  { slug: "holiday",          label: "Holiday Greeting",        hint: "A warm note to your customer list — no sales pitch needed." },
  { slug: "thank_you",        label: "Thank You",               hint: "Show appreciation to your customers." },
  { slug: "re_engagement",    label: "Re-engagement",           hint: "Reach out to customers you haven't heard from in a while." },
  { slug: "announcement",     label: "Announcement",            hint: "Share news — new hours, new location, new team member." },
  { slug: "birthday",         label: "Birthday",                hint: "Send to contacts whose birthday is this month." },
  { slug: "follow_up",        label: "Follow-Up",               hint: "Check in after a job or appointment." },
]

export default async function MarketingPage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")
  if (!company) redirect("/login")

  const admin = createAdminClient()

  const [{ data: contacts }, { data: campaigns }] = await Promise.all([
    admin.from("contacts")
      .select("id, name, email, birthday_month, birthday_day")
      .eq("company_id", company.id)
      .eq("email_subscribed", true)
      .not("email", "is", null),
    admin.from("email_campaigns")
      .select("id, template_slug, subject, sent_at, recipient_count, status")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const subscriberCount = contacts?.length ?? 0
  const sentCampaigns = (campaigns ?? []).filter(c => c.status === "sent")

  const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
  const subscribeUrl = `https://${company.slug}.${ROOT_DOMAIN}/subscribe`

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 6px", ...TYPE.largeTitle, color: "white" }}>Email</h1>
      <p style={{ margin: "0 0 24px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
        Send to your list. Grow it with your subscribe link.
      </p>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { label: "Subscribers", value: subscriberCount },
          { label: "Campaigns Sent", value: sentCampaigns.length },
        ].map(({ label, value }) => (
          <div key={label} style={{ borderRadius: 14, padding: "16px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: "0 0 2px", ...TYPE.largeTitle, fontSize: "1.6rem", color: "white" }}>{value}</p>
            <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Subscribe link */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Your Subscribe Link</p>
        <div style={{ borderRadius: 14, padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ margin: "0 0 4px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})`, wordBreak: "break-all" }}>
            {subscribeUrl}
          </p>
          <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Share on Instagram, add to receipts, put on a QR code at your counter.
          </p>
        </div>
      </section>

      {/* Composer */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>New Campaign</p>
        <MarketingComposer
          companyId={company.id}
          companyName={company.name}
          companySlug={company.slug}
          industry={company.industry_category ?? null}
          subscriberCount={subscriberCount}
          templates={TEMPLATES}
          rootDomain={ROOT_DOMAIN}
        />
      </section>

      {/* Send history */}
      {sentCampaigns.length > 0 && (
        <section>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Sent</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {sentCampaigns.map(c => (
              <div key={c.id} style={{ borderRadius: 14, padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.subject}
                    </p>
                    <p style={{ margin: 0, ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      {c.recipient_count ? ` · ${c.recipient_count} sent` : ""}
                    </p>
                  </div>
                  <span style={{ flexShrink: 0, width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
