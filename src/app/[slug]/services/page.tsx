import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const services = company.website_config?.services || []
  const primary = company.primary_color
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <>
      <section className="py-20 text-white" style={{ backgroundColor: "#111111" }}>
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: primary }}>What We Do</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Our Services</h1>
          <p className="text-gray-400 text-lg max-w-2xl">Everything we offer, done by our own team.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service) => (
                <div key={service.name} className="border border-gray-100 rounded-2xl p-8 shadow-sm">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${primary}22` }}>
                    <ServiceIcon industry={company.industry_category} color={primary} size={22} />
                  </div>
                  <h2 className="text-xl font-black mb-3" style={{ color: "#111111" }}>{service.name}</h2>
                  <p className="text-gray-600 leading-relaxed mb-6">{service.description}</p>
                  <Link href={ctaHref} className="inline-block font-bold text-white px-6 py-3 rounded-full text-sm" style={{ backgroundColor: primary }}>
                    {intentLabel[company.primary_intent] || "Get in Touch"}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400">Services coming soon.</p>
          )}
        </div>
      </section>
    </>
  )
}
