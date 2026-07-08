import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const intentLabels: Record<string, string> = {
  leads: "Contact Form",
  estimates: "Estimates",
  bookings: "Bookings",
  appointments: "Appointments",
  reservations: "Reservations",
  orders: "Orders",
  inquiries: "Inquiries",
  call: "Call Only",
}

export const metadata = { title: "Email Preview — Found Admin" }

export default async function AdminEmailsPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin")

  const supabase = getAdminClient()
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, industry_category, primary_intent, email")
    .order("name", { ascending: true })

  const rows = companies ?? []

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">

        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin"
                className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                ← Admin
              </Link>
            </div>
            <h1 className="text-3xl font-black" style={{ color: "#ffffff" }}>Email Preview</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              See exactly what owners and customers receive for each company
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-sm font-black" style={{ color: "rgba(255,255,255,0.5)" }}>
              {rows.length} {rows.length === 1 ? "company" : "companies"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {rows.map((c) => (
            <Link key={c.id} href={`/admin/emails/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                borderRadius: 14,
                padding: "16px 20px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                transition: "background 0.15s",
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#ffffff" }}>{c.name}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                    {c.industry_category ?? "—"}
                    {c.primary_intent ? ` · ${intentLabels[c.primary_intent] ?? c.primary_intent}` : ""}
                    {c.email ? ` · ${c.email}` : " · no email"}
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  )
}
