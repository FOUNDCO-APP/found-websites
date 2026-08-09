"use server"

import { createClient } from "@/lib/supabase/server"
import { getAllCompanies, getCompanyRole } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import FoundWordmark from "@/components/FoundWordmark"
import CompanyPicker from "@/components/dashboard/CompanyPicker"

const FOUND_BLACK = "#080A09"

export default async function SelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const companies = await getAllCompanies(user.id, user.email ?? "")

  if (companies.length === 0) {
    redirect("/login?error=no_company")
  }

  // Same email can own one business and be a worker on another (a real
  // scenario found live-testing worker roles) - the picker must make that
  // distinction obvious, not render every row identically.
  const roleEntries = await Promise.all(
    companies.map(async (company) => [company.id, await getCompanyRole(user.id, user.email ?? "", company)] as const)
  )
  const roles = Object.fromEntries(roleEntries) as Record<string, "owner" | "worker" | null>

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
          {Object.values(roles).some(role => role === "worker")
            ? `You have access to ${companies.length} businesses on Found.`
            : `You manage ${companies.length} sites on Found.`}
        </p>

        <CompanyPicker companies={companies} roles={roles} />
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
