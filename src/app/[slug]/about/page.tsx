import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getAboutHeroSubtitle, polishBusinessName } from "@/lib/copyPolish"
import { getAboutHighlights, getFullAboutCopy } from "@/lib/aboutContent"
import { getLocationSection } from "@/lib/locationSection"
import { createAdminClient } from "@/lib/supabase/admin"
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
  const config = company.website_config
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const serviceAreas = config?.service_areas || []
  const services = config?.services || []
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)
  const uploadedImgs = config?.hero_images?.length ? config.hero_images : config?.hero_image_url ? [config.hero_image_url] : []
  const admin = createAdminClient()
  const { data: sectionPhotoRows } = await admin
    .from("company_photos")
    .select("url, website_section")
    .eq("company_id", company.id)
    .eq("for_website", true)
    .in("website_section", ["about", "cta"])
  const sectionRows = (sectionPhotoRows ?? []) as { url: string; website_section: string | null }[]
  const firstSectionImage = (section: string) => sectionRows.find(row => row.website_section === section)?.url ?? null
  const uploaded = (i: number) => uploadedImgs[i] ?? uploadedImgs[0] ?? null
  const aboutImage = firstSectionImage("about") ?? uploaded(1) ?? img(0)
  const ctaImage = firstSectionImage("cta") ?? img(2)
  const industryDefs = getIndustryDefaults(company.industry_category)
  const vocab = getVocab(company.sub_industry ?? null, company.industry_category)
  const ctaHeadline = config?.cta_headline || industryDefs.ctaHeadline
  const displayName = polishBusinessName(company.name)
  const aboutCopy = getFullAboutCopy(config)
  const aboutHighlights = getAboutHighlights(config)
  const aboutHeroSubtitle = getAboutHeroSubtitle({
    businessName: company.name,
    industry: company.industry_category,
    subIndustry: company.sub_industry,
    city: company.city,
    state: company.state,
  })
  const locationSection = getLocationSection({
    businessName: displayName,
    industry: company.industry_category,
    subIndustry: company.sub_industry,
    primaryIntent: company.primary_intent,
    city: company.city,
    state: company.state,
    serviceAreas,
  })

  return (
    <>
      {/* HEADER */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {aboutImage ? (
          <>
            <img src={aboutImage} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/68" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#ffffff" }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-8 text-balance text-white"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            About {displayName}
          </h1>
          {aboutHeroSubtitle && (
            <p className="text-lg" style={{ color: "#cccccc" }}>
              {aboutHeroSubtitle}
            </p>
          )}
        </div>
      </section>

      {/* ABOUT TEXT */}
      {aboutCopy && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              <div>
                <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
                <p className="text-xs font-black tracking-widest uppercase mb-6" style={{ color: primary }}>
                  {vocab.aboutLabel}
                </p>
                {config?.tagline && (
                  <p className="text-xl md:text-2xl font-black leading-snug mb-0"
                    style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                    {config.tagline}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-lg leading-relaxed" style={{ color: "#444444" }}>
                  {aboutCopy}
                </p>
                {aboutHighlights.length > 0 && (
                  <div className="grid grid-cols-1 gap-5">
                    {aboutHighlights.map((item) => (
                      <div key={item.title} className="border-l-4 pl-5" style={{ borderColor: primary }}>
                        <h3 className="text-sm font-black uppercase tracking-wide mb-2" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                          {item.title}
                        </h3>
                        <p className="text-sm leading-relaxed" style={{ color: "#666666" }}>
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={ctaHref} className="btn text-white"
                    style={{ backgroundColor: primary, borderColor: primary }}>
                    {intentLabel[company.primary_intent] || "Get in Touch"}
                  </Link>
                  <Link href="/services" className="btn"
                    style={{ borderColor: primary, color: primary }}>
                    {vocab.servicesLabel}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VALUES STRIP */}
      <section className="py-20" style={{ backgroundColor: "#f7f7f7" }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {industryDefs.values.map((v) => (
              <div key={v.label} className="flex flex-col gap-3">
                <div className="w-8 h-0.5" style={{ backgroundColor: primary }} />
                <h3 className="font-black text-lg" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {v.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>{v.body(company.city || "")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location / reach section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
              {locationSection.overline}
            </p>
            <h2 className="text-3xl md:text-4xl font-black mb-6"
              style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
              {locationSection.heading}
            </h2>
            <p className="text-lg leading-relaxed mb-10" style={{ color: "#555555" }}>
              {locationSection.body}
            </p>
          </div>
          {locationSection.areas.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {locationSection.areas.map((area) => (
                <span key={area}
                  className="px-5 py-2 text-sm font-black uppercase tracking-wide"
                  style={{
                    backgroundColor: "#f7f7f7",
                    color: "#111111",
                    borderRadius: "var(--button-radius, 6px)",
                    border: `1.5px solid #e0e0e0`,
                  }}>
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* SERVICES PREVIEW */}
      {services.length > 0 && (
        <section className="relative py-20" style={{ backgroundColor: "#111111" }}>
          <div className="relative z-10 max-w-6xl mx-auto px-8">
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white"
                style={{ fontFamily: "var(--font-heading, inherit)" }}>
                {vocab.servicesLabel}
              </h2>
              <Link href="/services"
                className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                style={{ color: primary }}>
                All Services
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {services.map((s) => (
                <span key={s.name}
                  className="px-5 py-2 text-sm font-black uppercase tracking-wide"
                  style={{
                    border: `1.5px solid rgba(255,255,255,0.15)`,
                    color: "#cccccc",
                    borderRadius: "var(--button-radius, 6px)",
                  }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="relative py-28 text-center overflow-hidden">
        {ctaImage ? (
          <>
            <img src={ctaImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/72" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
        )}
        <div className="relative z-10 max-w-2xl mx-auto px-8">
          <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {ctaHeadline}
          </h2>
          <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
            {vocab.ctaBodyText}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={ctaHref} className="btn text-white w-full sm:w-auto"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {intentLabel[company.primary_intent] || "Get in Touch"}
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
