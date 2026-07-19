import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import { polishBusinessName } from "@/lib/copyPolish"
import ServiceIcon from "@/components/ServiceIcon"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import CatalogShowcase from "@/components/layouts/CatalogShowcase"
import type { LayoutProps } from "@/types/layout"

export default function ImpactLayout({ company, supportingCTA, imgs, gradient, heroImage, heroVideo, sectionImages, locations = [] }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const aboutCopy = getHomepageAboutCopy(config)
  const displayName = polishBusinessName(company.name)

  const primaryLabel = intentLabel[company.primary_intent] || "Contact Us"
  const primaryHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"


  const img = (i: number) => imgs[i % imgs.length] || null
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category).ctaHeadline
  const aboutImage = sectionImages?.about ?? null
  const ctaImage = sectionImages?.cta ?? null

  return (
    <>
      {/* ── HERO — fast, confident, punches in ── */}
      <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden">
        {heroVideo ? (
          <video src={heroVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
        ) : heroImage ? (
          <img src={heroImage} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {(heroVideo || heroImage) && <div className="absolute inset-0 bg-black/62" />}

        <div className="relative z-10 max-w-6xl mx-auto px-8 py-32 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-6"
            style={{ color: "#ffffff", animation: "fade-up 400ms ease-out 0ms both" }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-8 max-w-4xl text-balance"
            style={{
              fontFamily: "var(--font-heading, inherit)",
              animation: "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both",
            }}>
            {config?.hero_title || displayName}
          </h1>
          <p className="text-lg md:text-xl max-w-xl mb-12 leading-relaxed"
            style={{ color: "#cccccc", animation: "fade-up 400ms ease-out 280ms both" }}>
            {config?.hero_subtitle || `Welcome to ${displayName}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4"
            style={{ animation: "fade-in 350ms ease-out 430ms both" }}>
            <Link href={primaryHref} className="btn w-full sm:w-auto text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {supportingCTA && (
              <Link href={supportingCTA.href} className="btn w-full sm:w-auto text-white"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}>
                {supportingCTA.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <CatalogShowcase company={company} />

      {/* ── SERVICES TEASER ── */}
      {services.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-6xl mx-auto px-8">
            <InView>
              <div>
                <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>{vocab.servicesOverline}</p>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
                  <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                    {vocab.servicesLabel}
                  </h2>
                  <Link href="/services" className="text-sm font-black uppercase tracking-widest shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: primary }}>
                    View All →
                  </Link>
                </div>
              </div>
            </InView>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 3).map((service, i) => (
                <InView key={service.name} delay={i * 80}>
                  <div className="bg-white p-8 border-l-4"
                    style={{
                      borderColor: primary,
                      borderRadius: `0 var(--card-radius, 10px) var(--card-radius, 10px) 0`,
                      boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))",
                    }}>
                    <div className="mb-5"><ServiceIcon serviceName={service.name} color={primary} size={24} /></div>
                    <h3 className="font-black text-lg mb-3" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>{service.description}</p>
                  </div>
                </InView>
              ))}
            </div>
            {services.length > 3 && (
              <div className="mt-12">
                <Link href="/services" className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>
                  See All {services.length} Services
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ABOUT STRIP ── */}
      {aboutCopy && (
        <section className="relative py-28 overflow-hidden">
          {(aboutImage ?? img(1)) ? (
            <>
              <img src={(aboutImage ?? img(1))!} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/75" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
          )}
          <div className="relative z-10 max-w-6xl mx-auto px-8">
            <InView>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
                  <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>{vocab.aboutLabel}</p>
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-tight"
                    style={{ fontFamily: "var(--font-heading, inherit)" }}>
                    {displayName}
                  </h2>
                  {config?.tagline && (
                    <p className="text-lg font-black mt-5 leading-snug" style={{ color: primary }}>
                      {config?.tagline}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-lg leading-relaxed mb-8" style={{ color: "#cccccc" }}>{aboutCopy}</p>
                  <Link href="/about" className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>
                    {vocab.aboutLabel}
                  </Link>
                </div>
              </div>
            </InView>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <InView>
              <div>
                <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>{vocab.reviewsOverline}</p>
                <h2 className="text-4xl md:text-5xl font-black mb-16" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {vocab.reviewsLabel}
                </h2>
              </div>
            </InView>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((t, i) => (
                <InView key={t.name} delay={i * 100}>
                  <div className="p-10 border-t-4" style={{
                    borderColor: primary,
                    backgroundColor: "#f7f7f7",
                    borderRadius: `0 0 var(--card-radius, 10px) var(--card-radius, 10px)`,
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.06))",
                  }}>
                    <p className="text-lg leading-relaxed mb-8 italic" style={{ color: "#333333" }}>&ldquo;{t.quote}&rdquo;</p>
                    <div>
                      <p className="font-black text-sm tracking-wide uppercase" style={{ color: "#111111" }}>{t.name}</p>
                      <p className="text-xs mt-1" style={{ color: "#776F6F" }}>{t.role}</p>
                    </div>
                  </div>
                </InView>
              ))}
            </div>
          </div>
        </section>
      )}

      {locations.length > 0 && <FindUsSection company={company} locations={locations} primary={primary} />}

      {/* ── FINAL CTA ── */}
      <section className="relative py-28 text-center overflow-hidden">
        {(ctaImage ?? heroImage) ? (
          <img src={(ctaImage ?? heroImage)!} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {(ctaImage ?? heroImage) && <div className="absolute inset-0 bg-black/72" />}
        <InView>
          <div className="relative z-10 max-w-2xl mx-auto px-8">
            <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ fontFamily: "var(--font-heading, inherit)" }}>
              {ctaHeadline}
            </h2>
            <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
              {vocab.ctaBodyText}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={primaryHref} className="btn text-white w-full sm:w-auto" style={{ backgroundColor: primary, borderColor: primary }}>
                {primaryLabel}
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
        </InView>
      </section>
    </>
  )
}
