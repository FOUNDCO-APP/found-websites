import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }
const intentLabels: Record<string, string> = { leads: "Contact form", estimates: "Estimates", bookings: "Bookings", appointments: "Appointments", reservations: "Reservations", orders: "Orders", inquiries: "Inquiries", call: "Call only" }
export const metadata = { title: "Email previews - Found HQ" }

export default async function AdminEmailsPage() {
  const cookieStore = await cookies()
  if (cookieStore.get("admin_key")?.value !== process.env.ADMIN_KEY) redirect("/admin")
  const { data: companies } = await getAdminClient().from("companies").select("id, name, slug, industry_category, primary_intent, email").order("name")
  const rows = companies ?? []
  return (
    <div className="hq-page hq-page-narrow">
      <header className="hq-header"><div><p className="hq-eyebrow">Quality</p><h1 className="hq-title">Email previews</h1><p className="hq-subtitle">Inspect the transactional messages owners and customers receive.</p></div><span className="hq-count">{rows.length}</span></header>
      <div className="hq-panel">
        {rows.map((company) => (
          <Link key={company.id} href={`/admin/emails/${company.id}`} className="hq-row hq-link-row">
            <div style={{ minWidth: 0 }}><p className="hq-row-title">{company.name}</p><p className="hq-row-meta">{company.industry_category ?? "Uncategorized"} / {intentLabels[company.primary_intent ?? ""] ?? company.primary_intent ?? "No intent"}{company.email ? ` / ${company.email}` : " / No owner email"}</p></div>
            <span className="hq-chevron" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  )
}
