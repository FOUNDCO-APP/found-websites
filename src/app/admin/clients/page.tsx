import { getAdminClient } from "../lib"
import ClientsWorkspace, { type ClientRow } from "./ClientsWorkspace"

export const metadata = { title: "Clients - Found HQ" }

export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const initialSearch = typeof params.q === "string" ? params.q : ""
  const admin = getAdminClient()
  const [{ data: companies }, { data: configs }, { data: activities }] = await Promise.all([
    admin.from("companies").select("id, name, slug, email, phone, plan, subscription_status, client_state, account_kind, comp_reason, created_at, logo_url, logo_white_url").order("created_at", { ascending: false }),
    admin.from("website_config").select("company_id, copy_generated"),
    admin.from("client_activities").select("company_id, summary, created_at").order("created_at", { ascending: false }),
  ])
  const copyByCompany = new Map((configs ?? []).map((row) => [row.company_id, row.copy_generated]))
  const lastActivity = new Map<string, string>()
  for (const activity of activities ?? []) if (!lastActivity.has(activity.company_id)) lastActivity.set(activity.company_id, activity.summary)
  const rows: ClientRow[] = (companies ?? []).map((company) => {
    const issues: string[] = []
    if (company.client_state === "past_due") issues.push("Payment")
    if (company.client_state === "onboarding" && !company.logo_url && !company.logo_white_url) issues.push("No logo")
    if (company.client_state === "onboarding" && copyByCompany.get(company.id) !== true) issues.push("Fallback copy")
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      email: company.email,
      phone: company.phone,
      plan: company.plan,
      subscription_status: company.subscription_status,
      client_state: company.client_state ?? "onboarding",
      account_kind: company.account_kind ?? "client",
      comp_reason: company.comp_reason,
      created_at: company.created_at,
      last_activity: lastActivity.get(company.id) ?? null,
      issues,
    }
  })
  const realClients = rows.filter((row) => row.account_kind === "client").length
  return (
    <div className="hq-page">
      <header className="hq-header"><div><p className="hq-eyebrow">Retain</p><h1 className="hq-title">Clients</h1><p className="hq-subtitle">Protect each relationship, launch, and payment.</p></div><span className="hq-count">{realClients}</span></header>
      <ClientsWorkspace rows={rows} initialSearch={initialSearch} />
    </div>
  )
}
