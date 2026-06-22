import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/dashboard/SignOutButton"
import Link from "next/link"
import { openBillingPortal, startUpgradeCheckout } from "./actions"
import { TYPE, TEXT_OPACITY, ICON, GREEN, BLACK } from "@/lib/dashboard/typography"

const PLAN_META: Record<string, { label: string; founding: number; normal: number; color: string }> = {
  found:          { label: "Found",          founding: 29, normal: 39,  color: GREEN },
  found_pro:      { label: "Found Pro",      founding: 39, normal: 69,  color: GREEN },
  found_business: { label: "Found Business", founding: 69, normal: 99,  color: "#8B5CF6" },
}

const UPGRADE_TO: Record<string, { plan: string; label: string; foundingPrice: number; normalPrice: number; features: string[] }> = {
  found: {
    plan: "found_pro",
    label: "Found Pro",
    foundingPrice: 39,
    normalPrice: 69,
    features: ["Custom domain", "Auto-reply to new leads", "Branded social exports", "Priority support"],
  },
  found_pro: {
    plan: "found_business",
    label: "Found Business",
    foundingPrice: 69,
    normalPrice: 99,
    features: ["Online booking", "Quote requests", "Review collection", "Priority support"],
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

  const plan = company?.plan ?? "found"
  const meta = PLAN_META[plan] ?? PLAN_META.found
  const upgrade = UPGRADE_TO[plan]
  const isFoundingMember = !!company?.is_founding_member
  const hasStripe = !!company?.stripe_customer_id
  const isActive = company?.subscription_status === "active" || company?.subscription_status === "trialing"
  const displayPrice = isFoundingMember ? meta.founding : meta.normal
  const upgradePrice = upgrade ? (isFoundingMember ? upgrade.foundingPrice : upgrade.normalPrice) : 0

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", ...TYPE.largeTitle, color: "white" }}>
        More
      </h1>

      {/* My Site */}
      <section style={{ marginBottom: 20 }}>
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


      {/* Current plan */}
      <section style={{ marginBottom: upgrade ? 10 : 20 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your Plan
        </p>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ padding: "16px 18px", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}`, flexShrink: 0 }} />
                <span style={{ ...TYPE.caption, color: meta.color }}>
                  {meta.label}
                </span>
                {isFoundingMember && (
                  <span style={{ ...TYPE.footnote, fontWeight: 800, textTransform: "uppercase" as const, letterSpacing: "0.12em", color: GREEN, backgroundColor: `${GREEN}15`, padding: "2px 7px", borderRadius: 20 }}>
                    Intro
                  </span>
                )}
              </div>
              <span style={{ ...TYPE.subhead, fontWeight: 300, color: "white" }}>
                ${displayPrice}<span style={{ ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>/mo</span>
              </span>
            </div>
            <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
              {isActive
                ? isFoundingMember
                  ? `Intro rate locked in forever.`
                  : `Active subscription.`
                : "Activate to lock in your rate."}
            </p>
          </div>
        </div>
      </section>

      {/* Upgrade card */}
      {upgrade && company?.id && (
        <section style={{ marginBottom: 20 }}>
          <div style={{
            borderRadius: 14,
            padding: "18px 20px",
            backgroundColor: `${GREEN}08`,
            border: `1px solid ${GREEN}22`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 3px", ...TYPE.subhead, fontWeight: 600, color: "white" }}>
                  Upgrade to {upgrade.label}
                </p>
                <p style={{ margin: 0, ...TYPE.footnote, fontWeight: 400, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
                  ${upgradePrice}/month{isFoundingMember ? " intro rate" : ""}
                </p>
              </div>
              <form action={startUpgradeCheckout}>
                <input type="hidden" name="companyId" value={company.id} />
                <input type="hidden" name="targetPlan" value={upgrade.plan} />
                <button type="submit" style={{
                  flexShrink: 0,
                  borderRadius: 8,
                  padding: "9px 16px",
                  ...TYPE.caption,
                  backgroundColor: GREEN,
                  color: BLACK,
                  border: "none",
                  cursor: "pointer",
                }}>
                  Upgrade →
                </button>
              </form>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upgrade.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ ...TYPE.subhead, color: `rgba(255,255,255,${TEXT_OPACITY.secondary})` }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
