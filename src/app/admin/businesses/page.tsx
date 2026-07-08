import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import BusinessesTable, { type BusinessRow } from "./BusinessesTable"

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export const metadata = { title: "Businesses — Found Admin" }

export default async function AdminBusinessesPage() {
  const cookieStore = await cookies()
  const adminKey = cookieStore.get("admin_key")?.value
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) redirect("/admin")

  const supabase = getAdminClient()
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, industry_category, plan, subscription_status, email, is_comp, admin_notes, created_at")
    .order("created_at", { ascending: false })

  const rows = (companies ?? []) as BusinessRow[]

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080A09" }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/admin"
            className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            ← Admin
          </Link>
          <h1 className="text-3xl font-black mt-2" style={{ color: "#ffffff" }}>Businesses</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            View as any business, mark comp accounts, and keep your own notes. {rows.length} total.
          </p>
        </div>

        <BusinessesTable rows={rows} />
      </div>
    </div>
  )
}
