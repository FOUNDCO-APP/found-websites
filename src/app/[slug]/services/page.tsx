import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"
import { heroGradient } from "@/lib/color"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Services | ${company.name}` : "Services" }
}

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const services = company.website_config?.services || []
  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <>
      <section className="py-24 text-white" style={{ background: gradient }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>What We Do</p>
          <h1 className="text-5xl md:text-6xl font-black mb-5" style={{ fontFamily: "var(--font-heading, inherit)" }}>Our Services</h1>
          <p className="max-w-2xl text-lg" style={{ color: "#888888" }}>Everything we offer, done by our own team.</p>
        </div>
      </section>

      <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
        <div className="max-w-6xl mx-auto px-8">
          {services.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <div key={service.name}
                  className="bg-white p-8 border-l-4"
                  style={{
                    borderColor: primary,
                    borderRadius: `0 var(--card-radius, 10px) var(--card-radius, 10px) 0`,
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))",
                  }}>
                  <div className="mb-5">
                    <ServiceIcon serviceName={service.name} color={primary} size={24} />
                  </div>
                  <h2 className="text-xl font-black mb-3" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                    {service.name}
                  </h2>
                  <p className="leading-relaxed text-sm" style={{ color: "#776F6F" }}>{service.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center" style={{ color: "#776F6F" }}>Services coming soon.</p>
          )}
          {services.length > 0 && (
            <div className="mt-16 pt-12 border-t border-gray-200 text-center">
              <p className="mb-6 text-lg font-black" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                Ready to get started?
              </p>
              <Link href={ctaHref} className="btn text-white"
                style={{ backgroundColor: primary, borderColor: primary }}>
                {intentLabel[company.primary_intent] || "Get in Touch"}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
