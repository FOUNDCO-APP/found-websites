"use server"

import { createClient } from "@/lib/supabase/server"
import { getAllCompanies } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import FoundWordmark from "@/components/FoundWordmark"
import CompanyPicker from "@/components/dashboard/CompanyPicker"

const FOUND_BLACK = "#080A09"

async function selectCompany(formData: FormData) {
  "use server"
  const id = formData.get("company_id") as string
  if (!id) return
  const cookieStore = await cookies()
  cookieStore.set("found_company_id", id, {
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
  })
  revalidatePath("/", "layout")
  redirect("/")
}

export default async function SelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companies = await getAllCompanies(user.id, user.email ?? "")

  if (companies.length === 0) {
    redirect("/login?error=no_company")
  }

  return (
    <div style={{ minHeight: "100dvh", backgroundColor: FOUND_BLACK, display: "flex", flexDirection: "column" }}>
      {/* Sticky header */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backgroundColor: FOUND_BLACK,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "18px 24px",
      }}>
        <FoundWordmark height={20} color="white" />
      </header>

      {/* Scrollable body */}
      <main style={{ flex: 1, overflowY: "auto", padding: "32px 20px 48px" }}>
      <div style={{ width: "100%", maxWidth: 440, margin: "0 auto", animation: "fade-up 0.45s ease-out both" }}>
        <h1 style={{
          margin: "0 0 6px",
          fontSize: 26,
          fontWeight: 300,
          color: "white",
          letterSpacing: "-0.02em",
        }}>
          Choose a business.
        </h1>
        <p style={{ margin: "0 0 24px", fontSize: 15, color: "rgba(255,255,255,0.35)" }}>
          You manage {companies.length} sites on Found.
        </p>

        <CompanyPicker companies={companies} selectCompany={selectCompany} />
      </div>
      </main>

      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
