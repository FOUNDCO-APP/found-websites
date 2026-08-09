import { requireDashboardAccess } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import Link from "next/link"
import InstallButton from "@/components/dashboard/InstallButton"
import { TYPE, TEXT_OPACITY, ICON, GREEN } from "@/lib/dashboard/typography"

function ChevronRight() {
  return (
    <svg width={ICON.action} height={ICON.action} viewBox="0 0 24 24" fill="none"
      stroke={`rgba(255,255,255,${TEXT_OPACITY.disabled})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function Row({ href, external, label, sub, children }: { href: string; external?: boolean; label: string; sub?: string; children?: React.ReactNode }) {
  return (
    <Link href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        padding: "15px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>{label}</p>
          {sub && <p style={{ margin: "2px 0 0", ...TYPE.footnote, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>{sub}</p>}
        </div>
        {children ?? <ChevronRight />}
      </div>
    </Link>
  )
}

export default async function BusinessInfoPage() {
  const user = await requireDashboardAccess()

  const company = await getCompany(user?.id ?? "", user?.email ?? "")
  if (!company) redirect(user ? "/login" : "/admin")
  if (!(await requireOwnerAccess(user?.id ?? "", user?.email ?? "", company))) redirect("/photos")

  return (
    <main style={{ padding: "28px 20px 60px" }}>
      <h1 style={{ margin: "0 0 24px", ...TYPE.largeTitle, color: "white" }}>
        Business Info
      </h1>

      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your Business
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Row href="/site" label="Logo, name & contact info" sub="Shown on your public website" />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          Your Account
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ borderRadius: 14, padding: "15px 18px", backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ margin: "0 0 2px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>Signed in as</p>
            <p style={{ margin: 0, ...TYPE.subhead, color: "white" }}>{user?.email ?? "Found Admin (viewing as)"}</p>
          </div>
          <Row href="/auth/set-password" label="Change password" />
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 8px", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.tertiary})` }}>
          More
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InstallButton />
          <Row href="mailto:hello@foundco.app" label="Get help" />
        </div>
      </section>

      <p style={{ textAlign: "center", ...TYPE.caption, color: `rgba(255,255,255,${TEXT_OPACITY.disabled})`, padding: "8px 0 0" }}>
        v2026.5
      </p>
    </main>
  )
}
