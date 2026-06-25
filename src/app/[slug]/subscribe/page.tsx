import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { heroGradient } from "@/lib/color"
import type { Metadata } from "next"
import SubscribeForm from "./SubscribeForm"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Join ${company.name}'s List` : "Join Our List" }
}

export default async function SubscribePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const industry = company.industry_category ?? null

  const isPet = industry === "pet_services"
  const hasBirthday = ["food", "wellness", "beauty", "fitness", "pet_services"].includes(industry ?? "")
  const hasAnniversary = industry === "food"

  const perks = [
    "Be first to hear about specials and promotions",
    hasBirthday && (isPet ? "Birthday treats for you and your pet" : "Birthday perks just for you"),
    hasAnniversary && "Anniversary celebration offers",
    "Exclusive deals for subscribers only",
  ].filter(Boolean) as string[]

  return (
    <section className="min-h-screen" style={{ background: "#f9f9f9" }}>
      {/* Hero */}
      <div className="relative" style={{ background: gradient, padding: "56px 24px 48px" }}>
        <div className="max-w-lg mx-auto text-center">
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            {company.name}
          </p>
          <h1 style={{ margin: "0 0 12px", fontSize: "clamp(2rem, 7vw, 3rem)", fontWeight: 800, color: "white", lineHeight: 1.1 }}>
            Stay in the loop.
          </h1>
          <p style={{ margin: 0, fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
            Join our list for specials, updates, and a little something extra on your birthday.
          </p>
        </div>
      </div>

      {/* Perks + Form */}
      <div className="max-w-lg mx-auto" style={{ padding: "0 20px 60px" }}>
        {/* Perks */}
        <div style={{ margin: "-24px 0 28px", backgroundColor: "white", borderRadius: 16, padding: "20px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: primary }}>
            What you get
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {perks.map(p => (
              <li key={p} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#333" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Form card */}
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: "24px 22px", boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}>
          <SubscribeForm
            companyId={company.id}
            primaryColor={primary}
            industry={industry}
            companyName={company.name}
          />
        </div>
      </div>
    </section>
  )
}
