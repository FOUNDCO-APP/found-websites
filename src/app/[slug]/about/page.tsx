import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <>
      <section className="py-20 text-white" style={{ backgroundColor: "#111111" }}>
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: primary }}>About Us</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{company.name}</h1>
          <p className="text-gray-400 text-lg max-w-xl">
            {company.city ? `Locally owned and operated in ${company.city}${company.state ? `, ${company.state}` : ""}.` : "Local and independent."}
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          {company.website_config?.about_text ? (
            <p className="text-gray-600 text-lg leading-relaxed mb-10">{company.website_config.about_text}</p>
          ) : (
            <p className="text-gray-400 text-center">About content coming soon.</p>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={ctaHref} className="inline-block font-bold text-white px-8 py-4 rounded-full" style={{ backgroundColor: primary }}>
              {intentLabel[company.primary_intent] || "Get in Touch"}
            </Link>
            <Link href="/services" className="inline-block font-bold border-2 px-8 py-4 rounded-full" style={{ borderColor: primary, color: primary }}>
              Our Services
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
