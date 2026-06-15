import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { getFeatureAccess } from "@/lib/featureAccess"
import { redirect } from "next/navigation"

const SIGNAL_GREEN = "#32D074"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function LockBadge({ label = "Pro" }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0110 0v4"/>
      </svg>
      <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.06)", padding: "3px 8px", borderRadius: 20 }}>
        {label}
      </span>
    </div>
  )
}

function SoonBadge() {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.05)", padding: "3px 10px", borderRadius: 20 }}>
      Coming soon
    </span>
  )
}

function EditRow({ label, locked, lockedLabel, soon, href }: {
  label: string
  locked?: boolean
  lockedLabel?: string
  soon?: boolean
  href?: string
}) {
  const content = (
    <div style={{
      borderRadius: 14,
      padding: "15px 18px",
      backgroundColor: locked || soon ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 14, color: locked || soon ? "rgba(255,255,255,0.35)" : "white" }}>{label}</span>
      {locked ? <LockBadge label={lockedLabel} /> : soon ? <SoonBadge /> : <ChevronRight />}
    </div>
  )
  if (href && !locked && !soon) {
    return <a href={href} style={{ textDecoration: "none" }}>{content}</a>
  }
  return content
}

export default async function SitePage() {
  const user = await getAuthUser()
  if (!user) redirect("/login")

  const company = await getCompany(user.id, user.email ?? "")

  if (!company) {
    return (
      <main style={{ padding: "28px 20px" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>No site found for this account.</p>
      </main>
    )
  }

  const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
  const displayUrl = `${company.slug}.${ROOT_DOMAIN}`
  const canCustomDomain = getFeatureAccess(company.plan, "custom_domain")
  const canWorkerUploads = getFeatureAccess(company.plan, "worker_uploads")

  return (
    <main style={{ padding: "28px 20px" }}>
      <h1 style={{ margin: "0 0 24px", fontSize: 22, fontWeight: 300, color: "white", letterSpacing: "-0.02em" }}>
        Your Site
      </h1>

      {/* Live site card */}
      <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: 20 }}>
        <div style={{ height: 2, backgroundColor: SIGNAL_GREEN }} />
        <div style={{ padding: "20px", backgroundColor: "rgba(255,255,255,0.04)" }}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: SIGNAL_GREEN }}>
            Live at
          </p>
          <p style={{ margin: "0 0 18px", fontSize: 16, color: "white", fontWeight: 300, wordBreak: "break-all" }}>
            {displayUrl}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={siteUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              borderRadius: 10, padding: "11px 20px",
              fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em",
              backgroundColor: SIGNAL_GREEN, color: "#080A09", textDecoration: "none",
            }}>
              Open →
            </a>
            <a href={`https://wa.me/?text=${encodeURIComponent(`Check out my website: ${siteUrl}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                borderRadius: 10, padding: "11px 20px",
                fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em",
                backgroundColor: "rgba(255,255,255,0.07)", color: "white", textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.1)",
              }}>
              Share ↗
            </a>
          </div>
        </div>
      </div>

      {/* Customize section */}
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)" }}>
        Customize
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 20 }}>
        <EditRow label="Edit business info" soon />
        <EditRow label="Update services" soon />
        <EditRow label="Change colors & theme" soon />
        <EditRow label="Add photos" locked={!canWorkerUploads} lockedLabel="Pro" soon={canWorkerUploads} />
        <EditRow label="Upload logo" soon />
      </div>

      {/* Domain section */}
      <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.28)" }}>
        Domain
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {canCustomDomain ? (
          <EditRow label="Connect your domain" href={`/connect-domain?slug=${company.slug}`} />
        ) : (
          <div>
            <div style={{
              borderRadius: 14,
              padding: "15px 18px",
              backgroundColor: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>Connect your domain</span>
              <LockBadge label="Pro" />
            </div>
            {/* Inline upgrade prompt */}
            <div style={{
              borderRadius: 14,
              padding: "14px 18px",
              backgroundColor: `${SIGNAL_GREEN}08`,
              border: `1px solid ${SIGNAL_GREEN}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "white" }}>
                  Use your own domain
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  Upgrade to Found Pro — $39/month founding rate
                </p>
              </div>
              <a href="https://foundco.app#pricing" target="_blank" rel="noopener noreferrer" style={{
                flexShrink: 0,
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 11,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                backgroundColor: SIGNAL_GREEN,
                color: "#080A09",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                Upgrade
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
