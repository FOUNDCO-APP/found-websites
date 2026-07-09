import Link from "next/link"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getAdminClient() { return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
export const metadata = { title: "Quality - Found HQ" }

export default async function AdminQualityPage() {
  const admin = getAdminClient()
  const [{ data: configs }, { count: companyCount }] = await Promise.all([
    admin.from("website_config").select("copy_generated"),
    admin.from("companies").select("id", { count: "exact", head: true }),
  ])
  const fallbackCount = (configs ?? []).filter((row) => row.copy_generated !== true).length
  const tools = [
    { href: "/admin/copy", title: "Website copy", detail: "Review fallback copy and safely regenerate live content", count: fallbackCount, tone: fallbackCount > 0 ? "warning" : "success", action: fallbackCount > 0 ? "Needs review" : "Clear" },
    { href: "/admin/photos", title: "Photo library", detail: "Curate the shared industry photo pools", count: 22, tone: "info", action: "Industry pools" },
    { href: "/admin/emails", title: "Email previews", detail: "Inspect owner and customer transactional templates", count: companyCount ?? 0, tone: "info", action: "Businesses" },
  ]
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Review</p><h1 className="hq-title">Quality</h1><p className="hq-subtitle">The content customers see and business owners receive.</p></div></header>
      <div className="hq-panel">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="hq-row hq-link-row" style={{ minHeight: 82 }}>
            <div><p className="hq-row-title">{tool.title}</p><p className="hq-row-meta">{tool.detail}</p></div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span className={`hq-badge hq-badge-${tool.tone}`}>{tool.count}</span>
              <span className="hq-chevron" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
