import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"

export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)

  if (!company) notFound()

  const config = company.website_config
  const primary = company.primary_color
  const primaryLabel = intentLabel[company.primary_intent] || "Contact Us"
  const primaryHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const secondaryLabel = company.secondary_intent ? intentLabel[company.secondary_intent] : null
  const secondaryHref = company.secondary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : company.secondary_intent ? intentHref[company.secondary_intent] : null

  const services = config?.services || []
  const testimonials = config?.testimonials || []

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[90vh] flex items-center" style={{ backgroundColor: "#111111" }}>
        {config?.hero_video_url ? (
          <video
            src={config.hero_video_url}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-24 w-full">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: primary }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-2xl mb-6">
            {config?.hero_title || company.name}
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mb-8 leading-relaxed">
            {config?.hero_subtitle || `Welcome to ${company.name}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href={primaryHref}
              className="inline-block text-center font-bold text-white px-8 py-4 rounded-full text-lg"
              style={{ backgroundColor: primary }}
            >
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref && (
              <Link
                href={secondaryHref}
                className="inline-block text-center font-bold border-2 border-white text-white px-8 py-4 rounded-full text-lg hover:bg-white hover:text-black transition-colors"
              >
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="py-20" style={{ backgroundColor: "#f9f9f9" }}>
          <div className="max-w-6xl mx-auto px-4">
            <p className="text-xs font-bold tracking-widest uppercase text-center mb-2" style={{ color: primary }}>What We Do</p>
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12" style={{ color: "#111111" }}>Our Services</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.name} className="bg-white p-8 shadow-sm" style={{ borderRadius: "var(--card-radius, 16px)", boxShadow: "var(--card-shadow)" }}>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${primary}22` }}
                  >
                    <ServiceIcon industry={company.industry_category} color={primary} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#111111" }}>{service.name}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{service.description}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/services" className="inline-block font-bold text-white px-8 py-4 rounded-full" style={{ backgroundColor: primary }}>
                View All Services
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ABOUT STRIP */}
      {config?.about_text && (
        <section className="py-20 text-white" style={{ backgroundColor: "#1a1a1a" }}>
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-black mb-6">About {company.name}</h2>
            <p className="text-gray-300 text-lg leading-relaxed">{config.about_text}</p>
            <Link href="/about" className="inline-block mt-8 font-bold px-8 py-4 rounded-full text-white" style={{ backgroundColor: primary }}>
              Our Story
            </Link>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-black text-center mb-12" style={{ color: "#111111" }}>What Clients Say</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((t) => (
                <div key={t.name} className="p-8 rounded-2xl" style={{ backgroundColor: "#f9f9f9" }}>
                  <svg className="w-8 h-8 mb-4" fill={primary} viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                  <p className="text-gray-600 leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                  <p className="font-bold" style={{ color: "#111111" }}>{t.name}</p>
                  <p className="text-sm text-gray-400">{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="py-20 text-center" style={{ backgroundColor: "#111111" }}>
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-black text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8">
            {company.phone && (
              <>Call us at <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="font-bold text-white hover:underline">{company.phone}</a> or</>
            )}{" "}
            send us a message and we&apos;ll be in touch.
          </p>
          <Link href={primaryHref} className="inline-block font-bold text-white px-10 py-4 rounded-full text-lg" style={{ backgroundColor: primary }}>
            {primaryLabel}
          </Link>
        </div>
      </section>
    </>
  )
}
