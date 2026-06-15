import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/dashboard/SignOutButton"

const SIGNAL_GREEN = "#32D074"

const PLAN_META: Record<string, { label: string; founding: number; normal: number; color: string }> = {
  found:          { label: "Found",          founding: 29, normal: 39,  color: "#6B7280" },
  found_pro:      { label: "Found Pro",      founding: 39, normal: 69,  color: SIGNAL_GREEN },
  found_business: { label: "Found Business", founding: 69, normal: 99,  color: "#8B5CF6" },
}

const UPGRADE_TO: Record<string, { plan: string; label: string; founding: number; features: string[] }> = {
  found: {
    plan: "found_pro",
    label: "Found Pro",
    founding: 39,
    features: ["Custom domain", "Lead tracking", "Auto-reply to leads", "Contact database", "Photo uploads"],
  },
  found_pro: {
    plan: "found_business",
    label: "Found Business",
    founding: 69,
    features: ["Online booking", "Quote requests", "Review collection", "Priority support"],
  },
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  const isActive = company?.subscription_status === "active"

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
        More
      </h1>

      {/* Account */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)" }}>
          Account
        </p>
        <div style={{ borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          {company?.name && (
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Business</p>
              <p style={{ margin: 0, fontSize: 14, color: "white" }}>{company.name}</p>
            </div>
          )}
          <div style={{ padding: "14px 18px" }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Email</p>
            <p style={{ margin: 0, fontSize: 14, color: "white" }}>{user.email}</p>
          </div>
        </div>
      </section>

      {/* Current plan */}
      <section style={{ marginBottom: upgrade ? 10 : 20 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)" }}>
          Your Plan
        </p>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ height: 2, backgroundColor: meta.color }} />
          <div style={{ padding: "16px 18px", backgroundColor: "rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}`, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: meta.color }}>
                  {meta.label}
                </span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 300, color: "white" }}>
                ${meta.founding}<span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>/mo</span>
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
              {isActive ? `Founding rate locked in. Renews at $${meta.normal}/mo.` : "Activate to lock in your founding rate."}
            </p>
          </div>
        </div>
      </section>

      {/* Upgrade card */}
      {upgrade && (
        <section style={{ marginBottom: 20 }}>
          <div style={{
            borderRadius: 14,
            padding: "18px 20px",
            backgroundColor: `${SIGNAL_GREEN}08`,
            border: `1px solid ${SIGNAL_GREEN}22`,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 600, color: "white" }}>
                  Upgrade to {upgrade.label}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  ${upgrade.founding}/month founding rate
                </p>
              </div>
              <a href="https://foundco.app#pricing" target="_blank" rel="noopener noreferrer" style={{
                flexShrink: 0,
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                backgroundColor: SIGNAL_GREEN,
                color: "#080A09",
                textDecoration: "none",
              }}>
                Upgrade →
              </a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upgrade.features.map((f) => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={SIGNAL_GREEN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Settings */}
      <section style={{ marginBottom: 20 }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)" }}>
          Settings
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {company?.slug && (
            <a href={`/connect-domain?slug=${company.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: "white" }}>Connect your domain</span>
                <ChevronRight />
              </div>
            </a>
          )}
          <a href="mailto:hello@foundco.app" style={{ textDecoration: "none" }}>
            <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: "white" }}>Get help</span>
              <ChevronRight />
            </div>
          </a>
        </div>
      </section>

      <SignOutButton />
    </main>
  )
}
