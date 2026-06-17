"use server"

import { createClient } from "@/lib/supabase/server"
import { getAllCompanies, type CompanyRow } from "@/lib/dashboard/getCompany"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

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
  redirect("/leads")
}

function planLabel(plan: string | null) {
  if (plan === "found_pro") return "Pro"
  if (plan === "found_business") return "Business"
  return "Found"
}

function initial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? "?"
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
        <svg viewBox="0 0 420 72" style={{ height: 20, width: 108, color: "white" }} aria-label="Found">
          <text x="0" y="56" fill="currentColor" fontFamily="Arial,sans-serif" fontSize="58" fontWeight="300" letterSpacing="25">FOUND</text>
        </svg>
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

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {companies.map((company: CompanyRow) => (
            <form key={company.id} action={selectCompany}>
              <input type="hidden" name="company_id" value={company.id} />
              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "none",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "16px 18px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "rgba(255,255,255,0.04)",
                  fontFamily: "inherit",
                  transition: "background-color 150ms",
                  textAlign: "left",
                }}>
                {/* Avatar */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: company.primary_color || SIGNAL_GREEN,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                  flexShrink: 0,
                  opacity: 0.9,
                }}>
                  {initial(company.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: "0 0 3px",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "white",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {company.name}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.35)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {company.slug}.{ROOT_DOMAIN} · {planLabel(company.plan)}
                  </p>
                </div>

                {/* Chevron */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </form>
          ))}
        </div>
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
