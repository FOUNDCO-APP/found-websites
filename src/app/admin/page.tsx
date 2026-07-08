import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import Link from "next/link"

const SIGNAL_GREEN = "#32D074"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const metadata = { title: "Found HQ" }

type CompanyRow = {
  id: string
  name: string
  slug: string
  plan: string | null
  subscription_status: string | null
  is_comp: boolean | null
  created_at: string | null
}

function planLabel(plan: string | null) {
  if (plan === "found_pro") return "Pro"
  if (plan === "found_business") return "Business"
  if (plan === "found") return "Starter"
  return "No plan"
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "—"
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const TOOLS = [
  {
    href: "/admin/businesses", label: "Businesses", icon: "businesses",
    desc: "View as any business, comp accounts, keep notes",
  },
  {
    href: "/admin/photos", label: "Photos", icon: "photos",
    desc: "Curate the stock photo pool for every industry",
  },
  {
    href: "/admin/emails", label: "Emails", icon: "emails",
    desc: "Preview exactly what owners and customers receive",
  },
  {
    href: "/admin/copy", label: "Copy", icon: "copy",
    desc: "Review and regenerate site copy across every business",
  },
] as const

function ToolIcon({ name }: { name: string }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: SIGNAL_GREEN, strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (name === "businesses") return <svg {...common}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M7 7V4a1 1 0 011-1h8a1 1 0 011 1v3"/></svg>
  if (name === "photos") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  if (name === "emails") return <svg {...common}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
}

export default async function AdminHomePage() {
  const supabase = getAdminClient()
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, plan, subscription_status, is_comp, created_at")
    .order("created_at", { ascending: false })

  const rows = (companies ?? []) as CompanyRow[]
  const total = rows.length
  const active = rows.filter(r => r.subscription_status === "active" || r.subscription_status === "trialing").length
  const comp = rows.filter(r => r.is_comp).length
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const newThisWeek = rows.filter(r => r.created_at && new Date(r.created_at).getTime() >= weekAgo).length
  const recent = rows.slice(0, 6)

  const stats = [
    { label: "Total businesses", value: total },
    { label: "Active", value: active },
    { label: "Comp accounts", value: comp },
    { label: "New this week", value: newThisWeek },
  ]

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: "#080A09" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: SIGNAL_GREEN, marginBottom: 6 }}>
            Found HQ
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "white", margin: 0 }}>
            Good to see you, Shawn.
          </h1>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 36 }}>
          {stats.map(s => (
            <div key={s.label} style={{
              borderRadius: 16, padding: "18px 18px", backgroundColor: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "white", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tools */}
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Tools
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 36 }}>
          {TOOLS.map(tool => (
            <Link key={tool.href} href={tool.href} style={{
              display: "block", borderRadius: 16, padding: "18px 20px", textDecoration: "none",
              backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <ToolIcon name={tool.icon} />
                <span style={{ fontSize: 15, fontWeight: 800, color: "white" }}>{tool.label}</span>
              </div>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)", margin: 0 }}>{tool.desc}</p>
            </Link>
          ))}
        </div>

        {/* Recent signups */}
        <p style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Recent signups
        </p>
        <div style={{ borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
          {recent.length === 0 && (
            <p style={{ textAlign: "center", padding: "32px 0", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No businesses yet.</p>
          )}
          {recent.map((r, i) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              padding: "14px 20px", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>
                  {r.slug}.foundco.app · {planLabel(r.plan)}
                </div>
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
                {timeAgo(r.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
