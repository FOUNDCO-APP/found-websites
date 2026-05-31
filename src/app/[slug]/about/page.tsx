import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `About Us | ${company.name}` : "About Us" }
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <>
      <section className="py-24 text-white" style={{ background: gradient }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>About Us</p>
          <h1 className="text-5xl md:text-6xl font-black mb-5" style={{ fontFamily: "var(--font-heading, inherit)" }}>{company.name}</h1>
          <p className="text-lg max-w-xl" style={{ color: "#888888" }}>
            {company.city ? `Locally owned and operated in ${company.city}${company.state ? `, ${company.state}` : ""}.` : "Local and independent."}
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-8">
          {company.website_config?.about_text ? (
            <p className="text-gray-600 text-lg leading-relaxed mb-10">{company.website_config.about_text}</p>
          ) : (
            <p className="text-gray-400 text-center">About content coming soon.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={ctaHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {intentLabel[company.primary_intent] || "Get in Touch"}
            </Link>
            <Link href="/services" className="btn"
              style={{ borderColor: primary, color: primary }}>
              Our Services
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
