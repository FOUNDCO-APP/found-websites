import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import HomeClient from "@/components/dashboard/HomeClient"
import { getCompanyActiveAddonSlugs } from "@/lib/dashboard/entitlements"
import { getEffectiveAddons, getFeatureAccess } from "@/lib/featureAccess"
import { smartNextStepFor } from "@/lib/dashboard/smartNextStep"
import SignOutButton from "@/components/dashboard/SignOutButton"
import { TYPE, TEXT_OPACITY, GREEN as SIGNAL_GREEN, BLACK as FOUND_BLACK, albumLabelFor } from "@/lib/dashboard/typography"

export default async function HomePage() {
  const user = await requireDashboardAccess()

  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")
  if (!(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) {
    const admin = createAdminClient()
    const [{ data: albums }, { data: recentPhotos }] = await Promise.all([
      admin
        .from("photo_albums")
        .select("id, name, album_type, customer_name, service_address, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("company_photos")
        .select("id, album_id, created_at")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(12),
    ])
    const albumLabel = albumLabelFor(company.industry_category)
    const jobs = (albums ?? []).filter(album => album.album_type === "job" || ["Job", "Project"].includes(albumLabel.singular))
    const photoCount = recentPhotos?.length ?? 0

    return (
      <main style={{ minHeight: "100dvh", padding: "30px 22px 120px", display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            {company.name}
          </p>
          <h1 style={{ margin: 0, ...TYPE.largeTitle, color: "white" }}>Field Photos</h1>
          <p style={{ margin: "8px 0 0", ...TYPE.subhead, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
            Pick a job, take photos, and keep the owner updated.
          </p>
        </div>

        <Link href="/photos?camera=1" style={{ textDecoration: "none" }}>
          <div style={{
            minHeight: 172,
            borderRadius: 24,
            background: `linear-gradient(180deg, ${SIGNAL_GREEN}, #25B864)`,
            color: FOUND_BLACK,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            boxShadow: `0 18px 44px ${SIGNAL_GREEN}24`,
          }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
            <span style={{ ...TYPE.title, color: FOUND_BLACK, fontWeight: 900 }}>Open Camera</span>
          </div>
        </Link>

        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <h2 style={{ margin: 0, ...TYPE.title, color: "white" }}>{albumLabel.plural}</h2>
            <Link href="/photos?tab=jobs" style={{ ...TYPE.footnote, color: SIGNAL_GREEN, fontWeight: 800, textDecoration: "none" }}>
              View all
            </Link>
          </div>
          {jobs.length > 0 ? jobs.map(job => (
            <Link key={job.id} href={`/photos?album=${encodeURIComponent(job.id)}`} style={{ textDecoration: "none" }}>
              <div style={{ borderRadius: 18, padding: "15px 16px", backgroundColor: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.075)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: "0 0 4px", ...TYPE.headline, color: "white", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.name}</p>
                  <p style={{ margin: 0, ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[job.customer_name, job.service_address].filter(Boolean).join(" - ") || "Add photos to this job"}
                  </p>
                </div>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.32)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          )) : (
            <div style={{ borderRadius: 18, padding: 18, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ margin: "0 0 4px", ...TYPE.headline, color: "white" }}>No jobs yet</p>
              <p style={{ margin: 0, ...TYPE.footnote, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                Photos you take can still upload for the owner to organize.
              </p>
            </div>
          )}
        </section>

        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <p style={{ margin: "0 0 14px", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})` }}>
            Recent uploads this session: {photoCount}
          </p>
          <SignOutButton />
        </div>
      </main>
    )
  }

  const admin = createAdminClient()

  const [{ data: allLeadsRaw }, { data: lastPhotoRow }, { data: siteConfig }] = await Promise.all([
    admin
      .from("leads")
      .select("id, name, email, phone, message, created_at, partial_answers, temperature, source, type, status")
      .eq("company_id", company.id)
      .neq("type", "onboarding_abandoned")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("photos")
      .select("created_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("website_config")
      .select("custom_domain")
      .eq("company_id", company.id)
      .single(),
  ])

  // Deduplicate by phone → email → id (array is already ordered newest-first,
  // so first occurrence = most recent submission per unique person)
  const seen = new Set<string>()
  const allLeads = (allLeadsRaw ?? []).filter(l => {
    if (l.status === "spam") return false
    const key = l.phone?.replace(/\D/g, "") || l.email?.toLowerCase() || l.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const newCount = allLeads.filter(l => {
    if (!l.created_at) return false
    return Date.now() - new Date(l.created_at).getTime() < 7 * 86400000
  }).length

  const top = allLeads[0] ?? null

  const recentLeads = allLeads.slice(0, 8).map(l => ({
    id: l.id,
    name: l.name ?? null,
    email: l.email ?? null,
    phone: l.phone ?? null,
    message: l.message || l.partial_answers?.message || l.partial_answers?.services || l.partial_answers?.description || null,
    created_at: l.created_at ?? null,
    source: l.source ?? l.type ?? null,
  }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const businessName = (company.name ?? "").trim() || "there"
  const isActive = company.subscription_status === "active" || company.subscription_status === "trialing"
  const paidAddonSlugs = await getCompanyActiveAddonSlugs(company.id)
  const effectiveAddons = getEffectiveAddons(company.plan, paidAddonSlugs, company.included_addon_slug, company.disabled_addons ?? [])
  const hasContacts = getFeatureAccess(company.plan, "contact_database", effectiveAddons)
  const smartNextStep = isActive ? smartNextStepFor({
    industry: company.industry_category ?? null,
    subIndustry: company.sub_industry ?? null,
    activeAddons: effectiveAddons,
  }) : null

  return (
    <HomeClient
      businessName={businessName}
      greeting={greeting}
      newCount={newCount}
      totalCount={allLeads.length}
      topName={top?.name ?? null}
      topCreatedAt={top?.created_at ?? null}
      siteSlug={company.slug}
      customDomain={siteConfig?.custom_domain ?? null}
      isActive={isActive}
      recentLeads={recentLeads}
      lastPhotoAt={lastPhotoRow?.created_at ?? null}
      industry={company.industry_category ?? null}
      smartNextStep={smartNextStep}
      hasContacts={hasContacts}
    />
  )
}
