import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import ServiceIcon from "@/components/ServiceIcon"
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

  const config = company.website_config
  const services = config?.services || []
  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)
  const heroImage = config?.hero_image_url || img(0)
  const industryDefs = getIndustryDefaults(company.industry_category)
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const ctaHeadline = config?.cta_headline || industryDefs.ctaHeadline

  return (
    <>
      {/* ── HEADER ── */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/70" />}
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#ffffff" }}>
            {vocab.servicesOverline}
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {vocab.servicesLabel}
          </h1>
          <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>
            {config?.hero_subtitle || industryDefs.servicesIntro}
          </p>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      {services.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <div key={service.name}
                  className="bg-white p-10 border-l-4 flex gap-7 items-start"
                  style={{
                    borderColor: primary,
                    borderRadius: `0 var(--card-radius, 10px) var(--card-radius, 10px) 0`,
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))",
                  }}>
                  <div className="shrink-0 mt-1">
                    <ServiceIcon serviceName={service.name} color={primary} size={28} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl mb-3"
                      style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h2>
                    <p className="text-base leading-relaxed" style={{ color: "#555555" }}>
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
            The Process
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-16"
            style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {industryDefs.process.map((item) => (
              <div key={item.step} className="flex flex-col gap-5">
                <span className="text-5xl font-black leading-none"
                  style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}>
                  {item.step}
                </span>
                <div className="w-8 h-0.5" style={{ backgroundColor: primary }} />
                <h3 className="font-black text-xl"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-28 overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/72" />}
        <div className="relative z-10 max-w-2xl mx-auto px-8 text-center">
          <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {ctaHeadline}
          </h2>
          <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
            {vocab.ctaBodyText}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={ctaHref} className="btn text-white w-full sm:w-auto"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {intentLabel[company.primary_intent] || "Get a Free Estimate"}
            </Link>
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="btn inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                style={{ borderColor: "rgba(255,255,255,0.3)", color: "#ffffff" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Us
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  )
}
