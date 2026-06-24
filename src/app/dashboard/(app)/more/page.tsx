import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/dashboard/SignOutButton"
import MoreActivateButton from "@/components/dashboard/MoreActivateButton"
import DashboardPages from "@/components/dashboard/DashboardPages"
import Link from "next/link"
import { openBillingPortal, startUpgradeCheckout, startAddonCheckout } from "./actions"
import { TYPE, TEXT_OPACITY, ICON, GREEN, BLACK } from "@/lib/dashboard/typography"
import { getRelevantAddons, ALL_ADDONS } from "@/lib/featureAccess"
import { createAdminClient } from "@/lib/supabase/admin"

const PLAN_META: Record<string, { label: string; founding: number; normal: number; color: string }> = {
  found:          { label: "Found Starter",  founding: 29, normal: 39,  color: GREEN },
  found_pro:      { label: "Found Pro",      founding: 39, normal: 69,  color: GREEN },
  found_business: { label: "Found Business", founding: 69, normal: 99,  color: GREEN },
}

const PLAN_FEATURES: Record<string, string[]> = {
  found: [
    "Complete five-page website",
    "Your own web address",
    "Professional copy written for you",
    "Every inquiry saved and sent to you",
    "Automatic reply to every new lead",
    "Heart a photo and it appears on your site",
  ],
  found_pro: [
    "Everything in Found Starter",
    "Every lead followed up automatically",
    "See who's interested and ready to hire",
    "Your contact list organizes itself",
    "Your crew can upload job photos",
    "Rewrite any page on your site",
  ],
  found_business: [
    "Everything in Found Pro",
    "Clients book themselves",
    "Send estimates and collect deposits",
    "Review requests go out for you",
    "Reach your full client list",
    "Show clients their finished job",
  ],
}

const PLAN_PROMISE: Record<string, string> = {
  found: "Your business is online, trusted, and ready to get calls.",
  found_pro: "Found helps every lead get answered, followed up, and remembered.",
  found_business: "Found helps run the job from first booking to final review.",
}

const UPGRADE_TO: Record<string, { plan: string; label: string; eyebrow: string; headline: string; body: string; foundingPrice: number; normalPrice: number; features: string[] }> = {
  found: {
    plan: "found_pro",
    label: "Found Pro",
    eyebrow: "Recommended next",
    headline: "Stop losing leads when the day gets busy.",
    body: "Starter gets you found. Pro keeps every inquiry warm after it arrives, even when you're on a job, driving, or done for the day.",
    foundingPrice: 39,
    normalPrice: 69,
    features: [
      "Every new lead gets followed up automatically",
      "See who's interested and ready to hire",
      "Every lead becomes an organized contact",
      "Your crew can upload photos from the field",
      "Rewrite your site copy whenever your business changes",
    ],
  },
  found_pro: {
    plan: "found_business",
    label: "Found Business",
    eyebrow: "For growing crews",
    headline: "Run the job, not just the website.",
    body: "Pro helps with leads. Business helps with the work after the lead says yes: bookings, estimates, deposits, reviews, and client galleries.",
    foundingPrice: 69,
    normalPrice: 99,
    features: [
      "Clients book themselves without back-and-forth texts",
      "Send professional estimates and collect deposits",
      "Review requests go out after finished jobs",
      "Reach past clients with one clean message",
      "Share finished project galleries clients remember",
    ],
  },
}

function ChevronRight() {
  return (
    <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none"
      stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

export default async function MorePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")

  const isActive = company?.subscription_status === "active" || company?.subscription_status === "trialing"
  const plan = isActive ? (company?.plan ?? "found") : "found"
  const meta = PLAN_META[plan] ?? PLAN_META.found
  const upgrade = UPGRADE_TO[plan]
  const isFoundingMember = !!company?.is_founding_member
  const hasStripe = !!company?.stripe_customer_id
  const displayPrice = isFoundingMember ? meta.founding : meta.normal
  const upgradePrice = upgrade ? (isFoundingMember ? upgrade.foundingPrice : upgrade.normalPrice) : 0

  const industryCategory = company?.industry_category ?? ""
  const relevantAddons = getRelevantAddons(industryCategory)

  let activeAddonSlugs: string[] = []
  if (company?.id) {
    const admin = createAdminClient()
    const { data: addonRows } = await admin
      .from("addon_subscriptions")
      .select("addon_slug")
      .eq("company_id", company.id)
      .eq("active", true)
    activeAddonSlugs = (addonRows ?? []).map((r: { addon_slug: string }) => r.addon_slug)
  }

  const availableAddons = relevantAddons.filter((a) => !activeAddonSlugs.includes(a.slug))

  const activeAddonSum = activeAddonSlugs.reduce((sum, slug) => {
    const def = ALL_ADDONS.find(a => a.slug === slug)
    return sum + (def?.price ?? 0)
  }, 0)
  const totalMonthly = displayPrice + activeAddonSum
  const showUpsellBanner = upgrade && activeAddonSum > 0 && totalMonthly >= (upgradePrice - 15)

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", ...TYPE.largeTitle, color: "white" }}>
        More
      </h1>
      {/* My Site */}
      <section style={{ marginBottom: 12 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          My Site
        </p>
        <Link href="/site" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
            padding: "16px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: `${GREEN}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: "0 0 2px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>Edit My Site</p>
                <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Words, photos, services · Rewrite for me</p>
              </div>
            </div>
            <ChevronRight />
          </div>
        </Link>
      </section>

      {/* Pages — merged nav + tab customization */}
      <DashboardPages
        companyName={company?.name ?? null}
        industry={industryCategory}
        activeAddons={activeAddonSlugs}
      />

      {/* Plan */}
      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your Plan
        </p>
        <div style={{
          borderRadius: 22,
          overflow: "hidden",
          border: `1px solid ${GREEN}24`,
          background: "linear-gradient(180deg, rgba(50,208,116,0.10) 0%, rgba(255,255,255,0.035) 52%, rgba(255,255,255,0.025) 100%)",
          boxShadow: "0 22px 70px rgba(0,0,0,0.22)",
        }}>
          <div style={{ padding: "22px 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}`, flexShrink: 0 }} />
                  <span style={{ ...TYPE.caption, color: meta.color }}>{meta.label}</span>
                  {isFoundingMember && (
                    <span style={{ ...TYPE.footnote, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: GREEN, backgroundColor: `${GREEN}15`, padding: "2px 7px", borderRadius: 20 }}>
                      Intro
                    </span>
                  )}
                </div>
                <h2 style={{ margin: 0, ...TYPE.title, fontWeight: 300, color: "white", letterSpacing: 0 }}>
                  {PLAN_PROMISE[plan] ?? PLAN_PROMISE.found}
                </h2>
              </div>
              <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                <p style={{ margin: 0, ...TYPE.largeTitle, fontSize: "1.85rem", color: "white" }}>${displayPrice}</p>
                <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/month</p>
              </div>
            </div>

            <p style={{ margin: "0 0 16px", ...TYPE.footnote, fontWeight: 400, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              {isActive
                ? isFoundingMember
                  ? `Your intro rate is locked in. You save $${meta.normal - meta.founding}/month compared with the regular $${meta.normal}/month price.`
                  : "Your subscription is active."
                : `Activate today to lock in $${meta.founding}/month before the regular $${meta.normal}/month price.`}
            </p>

            <div style={{ display: "grid", gap: 8 }}>
              {(PLAN_FEATURES[plan] ?? PLAN_FEATURES.found).map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}
                    stroke={meta.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ ...TYPE.footnote, fontWeight: 500, lineHeight: 1.45, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
                </div>
              ))}
            </div>

            {!isActive && company?.slug && (
              <div style={{ marginTop: 18 }}>
                <MoreActivateButton
                  slug={company.slug}
                  companyName={company.name}
                  targetPlan={plan}
                >
                  Lock In My Rate - ${displayPrice}/mo
                </MoreActivateButton>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Upgrade */}
      {upgrade && company?.id && (
        <section style={{ marginBottom: 24 }}>
          <div style={{
            borderRadius: 22,
            padding: "22px 20px",
            backgroundColor: GREEN,
            color: BLACK,
            boxShadow: `0 22px 80px ${GREEN}1F`,
          }}>
            <p style={{ margin: "0 0 8px", ...TYPE.caption, color: "rgba(8,10,9,0.58)" }}>
              {upgrade.eyebrow}
            </p>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 10 }}>
              <h2 style={{ margin: 0, ...TYPE.title, fontWeight: 300, lineHeight: 1.12, color: BLACK }}>
                {upgrade.headline}
              </h2>
              <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                <p style={{ margin: 0, ...TYPE.largeTitle, fontSize: "1.85rem", color: BLACK }}>${upgradePrice}</p>
                <p style={{ margin: "-2px 0 0", ...TYPE.footnote, fontWeight: 700, color: "rgba(8,10,9,0.54)" }}>/month</p>
              </div>
            </div>
            <p style={{ margin: "0 0 16px", ...TYPE.subhead, fontWeight: 500, lineHeight: 1.55, color: "rgba(8,10,9,0.68)" }}>
              {upgrade.body}
            </p>
            <div style={{ display: "grid", gap: 9, marginBottom: 18 }}>
              {upgrade.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 3 }}
                    stroke={BLACK} strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ ...TYPE.footnote, fontWeight: 800, lineHeight: 1.45, color: "rgba(8,10,9,0.78)" }}>{f}</span>
                </div>
              ))}
            </div>
            {isActive ? (
              <form action={startUpgradeCheckout}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="targetPlan" value={upgrade.plan} />
                <button type="submit" style={{
                  width: "100%",
                  minHeight: 52,
                  borderRadius: 999,
                  padding: "0 18px",
                  ...TYPE.subhead,
                  fontWeight: 900,
                  backgroundColor: BLACK,
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 12px 34px rgba(8,10,9,0.22)",
                }}>
                  Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
                </button>
              </form>
            ) : company?.slug ? (
              <MoreActivateButton
                slug={company.slug}
                companyName={company.name}
                targetPlan={upgrade.plan}
                variant="black"
              >
                Upgrade to {upgrade.label} for +${Math.max(upgradePrice - displayPrice, 0)}/mo
              </MoreActivateButton>
            ) : null}
            <p style={{ margin: "12px 0 0", ...TYPE.footnote, fontWeight: 700, textAlign: "center" as const, color: "rgba(8,10,9,0.46)" }}>
              {isFoundingMember
                ? `Intro price locked. Regular price is $${upgrade.normalPrice}/month.`
                : "Upgrade anytime. Your site, leads, and photos stay with you."}
            </p>
          </div>
        </section>
      )}

      {!upgrade && (
        <section style={{ marginBottom: 24 }}>
          <div style={{ borderRadius: 18, padding: "18px 20px", border: `1px solid ${GREEN}24`, backgroundColor: `${GREEN}08` }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 700, color: GREEN }}>You have the top plan.</p>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, lineHeight: 1.55, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              Found Business includes every core upgrade: booking, estimates, review requests, client messaging, team access, and project galleries.
            </p>
          </div>
        </section>
      )}

      {/* Smart upsell banner - fires when add-ons push total within $15 of next tier */}
      {isActive && showUpsellBanner && upgrade && company?.id && (
        <section style={{ marginBottom: 24 }}>
          <div style={{
            borderRadius: 18,
            padding: "16px 18px",
            background: `linear-gradient(135deg, ${GREEN}12 0%, ${GREEN}06 100%)`,
            border: `1px solid ${GREEN}30`,
          }}>
            <p style={{ margin: "0 0 4px", ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
              Better value available
            </p>
            <p style={{ margin: "0 0 12px", ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>
              You're paying <strong style={{ color: "white" }}>${totalMonthly}/month</strong> with add-ons. {upgrade.label} is <strong style={{ color: "white" }}>${upgradePrice}/month</strong> and keeps it all in one plan.
            </p>
            <form action={startUpgradeCheckout}>
              <input type="hidden" name="companyId" value={company.id} />
              <input type="hidden" name="targetPlan" value={upgrade.plan} />
              <button type="submit" style={{
                width: "100%", padding: "12px 0", borderRadius: 999,
                backgroundColor: GREEN, color: BLACK, border: "none",
                ...TYPE.subhead, fontWeight: 800, cursor: "pointer",
              }}>
                Switch to {upgrade.label}
              </button>
            </form>
          </div>
        </section>
      )}

      <div style={{ marginBottom: 24 }}>
        <Link href="https://foundco.app/plans" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "15px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Compare all plans</span>
            <ChevronRight />
          </div>
        </Link>
      </div>

      {/* Add Features */}
      {availableAddons.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Add Features
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {availableAddons.map((addon) => (
              <div key={addon.slug} style={{
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                padding: "16px 18px",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>
                      {addon.label}
                    </p>
                    <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                      {addon.description}
                    </p>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: "right" as const }}>
                    <p style={{ margin: "0 0 6px", ...TYPE.subhead, fontWeight: 700, color: GREEN }}>
                      +${addon.price}/mo
                    </p>
                    {company?.id && isActive && (
                      <form action={startAddonCheckout}>
                        <input type="hidden" name="companyId" value={company.id} />
                        <input type="hidden" name="addonSlug" value={addon.slug} />
                        <button type="submit" style={{
                          minHeight: 34,
                          borderRadius: 999,
                          padding: "0 15px",
                          ...TYPE.caption,
                          backgroundColor: `${GREEN}18`,
                          color: GREEN,
                          border: `1px solid ${GREEN}35`,
                          cursor: "pointer",
                          boxShadow: `0 0 18px ${GREEN}10`,
                        }}>
                          Add
                        </button>
                      </form>
                    )}
                    {company?.slug && !isActive && (
                      <div style={{ width: 112 }}>
                        <MoreActivateButton
                          slug={company.slug}
                          companyName={company.name}
                          targetPlan={plan}
                          targetAddonSlug={addon.slug}
                          targetAddonLabel={addon.label}
                          targetAddonPrice={addon.price}
                          size="compact"
                        >
                          Activate
                        </MoreActivateButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Add-ons */}
      {activeAddonSlugs.length > 0 && (
        <section style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
            Active Add-ons
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {activeAddonSlugs.map((slug) => {
              const def = relevantAddons.find((a) => a.slug === slug)
              if (!def) return null
              return (
                <div key={slug} style={{
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: GREEN, boxShadow: `0 0 6px ${GREEN}`, flexShrink: 0 }} />
                    <span style={{ ...TYPE.subhead, color: "white" }}>{def.label}</span>
                  </div>
                  <span style={{ ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                    Active · ${def.price}/mo
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Account */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Account
        </p>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 2 }}>
          <div style={{ padding: "14px 18px", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <p style={{ margin: "0 0 2px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Signed in as</p>
            <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>{user.email}</p>
          </div>
        </div>
        <Link href="/auth/set-password" style={{ textDecoration: "none", display: "block" }}>
          <div style={{
            borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            padding: "14px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none" stroke={`rgba(255,255,255,${TEXT_OPACITY.tertiary})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>Change Password</span>
            </div>
            <ChevronRight />
          </div>
        </Link>
      </section>

      {/* Settings */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {hasStripe && company?.id && (
            <form action={openBillingPortal}>
              <input type="hidden" name="companyId" value={company.id} />
              <button type="submit" style={{
                width: "100%",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}>
                <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ ...TYPE.subhead, color: "white" }}>Manage billing</span>
                  <ChevronRight />
                </div>
              </button>
            </form>
          )}
          <a href="mailto:hello@foundco.app" style={{ textDecoration: "none" }}>
            <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ ...TYPE.subhead, color: "white" }}>Get help</span>
              <ChevronRight />
            </div>
          </a>
        </div>
      </section>

      <SignOutButton />
    </main>
  )
}


