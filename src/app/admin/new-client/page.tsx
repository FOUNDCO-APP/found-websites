import Link from "next/link"
import { getAdminClient } from "../lib"
import { createManualClientSite, deferClientBilling } from "./actions"

export const metadata = { title: "New Client - Found HQ" }

const INDUSTRIES = [
  "home_services", "food", "wellness", "events", "retail", "fitness", "beauty",
  "automotive", "pet_services", "cleaning", "landscaping", "real_estate",
  "creative_services", "home_based_food", "education", "music_performance",
  "professional_services", "healthcare", "childcare", "makers_crafts",
  "home_property", "audio_visual", "nonprofit",
]

export default async function AdminNewClientPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const createdId = typeof params.created === "string" ? params.created : null
  const deferred = params.deferred === "1"

  if (createdId) {
    const admin = getAdminClient()
    const { data: company } = await admin
      .from("companies")
      .select("id, name, slug, trial_ends_at")
      .eq("id", createdId)
      .maybeSingle()

    let lastActivitySummary: string | null = null
    if (deferred && company) {
      const { data: activity } = await admin
        .from("client_activities")
        .select("summary")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      lastActivitySummary = activity?.summary ?? null
    }

    if (!company) {
      return (
        <div className="hq-page hq-page-narrow">
          <p className="hq-row-meta">Could not find that company.</p>
          <Link href="/admin/new-client" className="hq-back-link">Start over</Link>
        </div>
      )
    }

    const siteUrl = `https://${company.slug}.foundco.app`
    const activateUrl = `https://foundco.app/activate?slug=${company.slug}`

    return (
      <div className="hq-page hq-page-narrow">
        <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
        <header className="hq-header">
          <div>
            <p className="hq-eyebrow">New client</p>
            <h1 className="hq-title">{company.name}</h1>
            <p className="hq-subtitle">Site is live at <a href={siteUrl} target="_blank" rel="noreferrer">{siteUrl}</a></p>
          </div>
        </header>

        {deferred ? (
          <section className="hq-section">
            <div className="hq-panel" style={{ padding: 16 }}>
              <p className="hq-row-title">Billing deferred</p>
              <p className="hq-row-meta">
                Card due by {company.trial_ends_at ? new Date(company.trial_ends_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "-"}.
                If no card is added by then, the public site pauses automatically.
              </p>
              <p className="hq-row-meta" style={{ marginTop: 10 }}>
                Send this link yourself anytime:<br />
                <a href={activateUrl}>{activateUrl}</a>
              </p>
              {lastActivitySummary?.includes("Card-link email sent") && (
                <p className="hq-row-meta" style={{ marginTop: 10, color: "var(--hq-success, #32D074)" }}>Card-link email sent.</p>
              )}
              {lastActivitySummary?.includes("Card-link email FAILED") && (
                <p className="hq-row-meta" style={{ marginTop: 10, color: "var(--hq-danger, #F43F5E)" }}>The automated email failed to send - use the link above manually.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="hq-section">
            <div className="hq-section-head"><h2 className="hq-section-title">Billing</h2></div>
            <div className="hq-panel" style={{ padding: 16 }}>
              <p className="hq-row-title">Activate now</p>
              <p className="hq-row-meta">Collect a card immediately - open this link with them:</p>
              <p className="hq-row-meta"><a href={activateUrl}>{activateUrl}</a></p>
            </div>
            <div className="hq-panel" style={{ padding: 16, marginTop: 12 }}>
              <p className="hq-row-title">Defer billing</p>
              <p className="hq-row-meta">No card yet - give them a window to add one before the site pauses.</p>
              <form action={deferClientBilling} className="hq-create-form" style={{ marginTop: 12 }}>
                <input type="hidden" name="companyId" value={company.id} />
                <label>Term
                  <select name="termDays" required defaultValue="30">
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </label>
                <label className="hq-form-wide">Reason (for your own records)
                  <textarea name="reason" rows={2} required placeholder="e.g. Richard Zelle'd this month directly, still old-school about entering a card - needs one on file by next cycle." />
                </label>
                <label className="hq-form-wide" style={{ display: "flex", alignItems: "center", gap: 8, flexDirection: "row" }}>
                  <input type="checkbox" name="sendEmail" value="1" style={{ width: "auto" }} />
                  Also email {company.name} the card link now (you'll still get the link either way to send yourself)
                </label>
                <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Defer billing</button></div>
              </form>
            </div>
          </section>
        )}

        <p style={{ marginTop: 16 }}><Link href="/admin/new-client" className="hq-back-link">Build another site</Link></p>
      </div>
    )
  }

  return (
    <div className="hq-page hq-page-narrow">
      <Link href="/admin/more" className="hq-back-link"><span className="hq-back-chevron" />More</Link>
      <header className="hq-header">
        <div>
          <p className="hq-eyebrow">Operate</p>
          <h1 className="hq-title">New client</h1>
          <p className="hq-subtitle">Build a real site for someone yourself - phone calls, in-person signups, migrations. Same questions the public onboarding flow asks; this just isn&apos;t customer-facing.</p>
        </div>
      </header>

      <form action={createManualClientSite} className="hq-create-form">
        <label>Business name<input name="name" required /></label>
        <label>Phone<input name="phone" type="tel" required /></label>
        <label>Email<input name="email" type="email" required /></label>
        <label>Industry
          <select name="industry" required defaultValue="">
            <option value="" disabled>Choose one</option>
            {INDUSTRIES.map((key) => <option key={key} value={key}>{key.replace(/_/g, " ")}</option>)}
          </select>
        </label>
        <label>Sub-industry<input name="subIndustry" required placeholder="e.g. HVAC, flooring, tacos" /></label>
        <label>Plan
          <select name="plan" required defaultValue="found_pro">
            <option value="found">Found Starter</option>
            <option value="found_pro">Found Pro</option>
            <option value="found_business">Found Business</option>
          </select>
        </label>
        <label>City<input name="city" required /></label>
        <label>State<input name="state" required placeholder="AZ" /></label>
        <label className="hq-form-wide">What they do (short description)<textarea name="description" rows={2} required /></label>
        <label className="hq-form-wide">What makes them different<textarea name="different" rows={2} required /></label>
        <label className="hq-form-wide">Services (comma or line separated)<textarea name="services" rows={2} required placeholder="AC repair, furnace installation, duct cleaning" /></label>
        <label className="hq-form-wide">Testimonials (optional, one per line: Name - quote)<textarea name="testimonials" rows={2} /></label>
        <label>Primary color<input name="primaryColor" type="color" defaultValue="#2E7D32" /></label>
        <label>Vibe
          <select name="vibe" defaultValue="bold">
            <option value="bold">Bold</option>
            <option value="calm">Calm</option>
            <option value="modern">Modern</option>
            <option value="warm">Warm</option>
          </select>
        </label>
        <div className="hq-form-wide"><button className="hq-button hq-button-primary" type="submit">Build the site</button></div>
      </form>
    </div>
  )
}
