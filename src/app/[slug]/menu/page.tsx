import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Menu | ${company.name}` : "Menu" }
}

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const config = company.website_config
  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const industryDefs = getIndustryDefaults(company.industry_category)
  const ctaHeadline = config?.cta_headline || industryDefs.ctaHeadline
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)
  const heroImage = config?.hero_image_url || img(0)

  // Menu data: prefer structured menu_items, fall back to services displayed as menu items
  const menuCategories = config?.menu_items && config.menu_items.length > 0
    ? config.menu_items
    : config?.services && config.services.length > 0
      ? [{ category: vocab.servicesLabel, items: config.services.map(s => ({ name: s.name, description: s.description, price: null })) }]
      : null

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative min-h-[55vh] flex items-end overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.10) 100%)"
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pb-16 w-full">
          <p className="text-xs font-black tracking-[0.25em] uppercase mb-5" style={{ color: primary }}>
            {vocab.servicesOverline}
          </p>
          <h1 className="text-6xl md:text-8xl font-black text-white leading-none mb-4 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {vocab.servicesLabel}
          </h1>
          {config?.tagline && (
            <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>{config.tagline}</p>
          )}
        </div>
      </section>

      {/* ── MENU CONTENT ── */}
      {menuCategories ? (
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-8">
            {menuCategories.map((cat, catIdx) => (
              <div key={cat.category} className={catIdx > 0 ? "mt-20" : ""}>
                {menuCategories.length > 1 && (
                  <div className="mb-10">
                    <div className="w-10 h-1 mb-4" style={{ backgroundColor: primary }} />
                    <h2 className="text-3xl md:text-4xl font-black"
                      style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {cat.category}
                    </h2>
                  </div>
                )}

                <div className="flex flex-col">
                  {cat.items.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-7"
                      style={{ borderTop: i === 0 ? `2px solid ${primary}` : "1px solid #f0f0f0" }}
                    >
                      <div className="flex-1 pr-8">
                        <h3 className="text-xl font-black mb-1.5"
                          style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-base leading-relaxed" style={{ color: "#666666" }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.price && (
                        <p className="text-lg font-black shrink-0 mt-0.5"
                          style={{ color: primary }}>
                          {item.price}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="py-20 bg-white">
          <div className="max-w-4xl mx-auto px-8 text-center">
            <p className="text-lg" style={{ color: "#999999" }}>Menu coming soon — check back or call us directly.</p>
          </div>
        </section>
      )}

      {/* ── ABOUT STRIP (if they have about text) ── */}
      {config?.about_text && (
        <section className="py-20" style={{ backgroundColor: "#F9F8F6" }}>
          <div className="max-w-4xl mx-auto px-8">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              {img(1) && (
                <div className="w-full md:w-2/5 h-64 md:h-80 shrink-0 relative overflow-hidden"
                  style={{ borderRadius: "var(--card-radius, 10px)" }}>
                  <img src={img(1)!} alt={company.name}
                    className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="w-10 h-1 mb-6" style={{ backgroundColor: primary }} />
                <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
                  {vocab.aboutLabel}
                </p>
                <h2 className="text-3xl font-black mb-5"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {company.name}
                </h2>
                <p className="text-lg leading-relaxed" style={{ color: "#555555" }}>
                  {config.about_text}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="relative py-28 overflow-hidden">
        {img(2) ? (
          <>
            <img src={img(2)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/72" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
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
              {intentLabel[company.primary_intent] || "Contact Us"}
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
