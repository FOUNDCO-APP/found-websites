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

export default function PortraitLayout({ company, supportingCTA, imgs, gradient, heroImage, locations = [] }: LayoutProps) {
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

  return (
    <>
      {/* ── HERO — photo leads, text rises like warm light from the bottom ── */}
      <section className="relative min-h-[90vh] flex items-end overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/40" />}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0) 65%)"
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pb-16 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-4"
            style={{ color: "#ffffff", animation: "fade-up 500ms ease-out 100ms both" }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none mb-6 max-w-3xl text-balance"
            style={{
              fontFamily: "var(--font-heading, inherit)",
              animation: "fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) 250ms both",
            }}
          >
            {config?.hero_title || displayName}
          </h1>
          <div className="w-10 h-1 mb-6"
            style={{
              backgroundColor: primary,
              animation: "scale-x-reveal 500ms ease-out 450ms both",
              transformOrigin: "left",
            }} />
          <p className="text-lg max-w-lg mb-10 leading-relaxed"
            style={{ color: "#dddddd", animation: "fade-up 600ms ease-out 550ms both" }}>
            {config?.hero_subtitle || `Welcome to ${displayName}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4"
            style={{ animation: "fade-in 500ms ease-out 700ms both" }}>
            <Link href={primaryHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {supportingCTA && (
              <Link href={supportingCTA.href} className="btn text-white"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}>
                {supportingCTA.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── GALLERY STRIP — photos arrive with a warm fade ── */}
      {imgs.length >= 2 && (
        <div className="flex gap-0.5 overflow-x-auto md:overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
          {[img(1), img(2), img(3), img(4)].filter(Boolean).map((src, i) => (
            <div
              key={i}
              className={`relative flex-none overflow-hidden ${i === 3 ? "md:hidden" : "md:flex-1"}`}
              style={{
                height: "260px",
                width: "75vw",
                animation: `fade-in 700ms ease-out ${200 + i * 100}ms both`,
              }}
            >
              <img
                src={src!}
                alt=""
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
              />
            </div>
          ))}
        </div>
      )}

      <CatalogShowcase company={company} />

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <InView>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
                <div>
                  <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>
                    {vocab.servicesOverline}
                  </p>
                  <h2
                    className="text-4xl md:text-5xl font-black"
                    style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
                  >
                    {vocab.servicesLabel}
                  </h2>
                </div>
                <Link
                  href="/services"
                  className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: primary }}
                >
                  View All →
                </Link>
              </div>
            </InView>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service, i) => (
                <InView key={service.name} delay={i * 70}>
                  <div
                    className="flex flex-col items-center text-center p-8"
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "var(--card-radius, 10px)",
                      boxShadow: "var(--card-shadow, 0 2px 12px rgba(0,0,0,0.08))",
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div className="mb-5 p-4 rounded-full" style={{ backgroundColor: `${primary}18` }}>
                      <ServiceIcon serviceName={service.name} color={primary} size={22} />
                    </div>
                    <h3 className="font-black text-base mb-3 leading-tight"
                      style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>
                      {service.description}
                    </p>
                  </div>
                </InView>
              ))}
            </div>

            {services.length > 6 && (
              <div className="mt-12">
                <Link href="/services" className="btn text-white"
                  style={{ backgroundColor: primary, borderColor: primary }}>
                  See All {services.length} Services
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── ABOUT — split, photo bleeds to edge ── */}
      {aboutCopy && (
        <section className="flex flex-col md:flex-row" style={{ minHeight: "520px" }}>
          <div className="relative w-full md:w-1/2 h-72 md:h-auto">
            {img(4) ? (
              <img src={img(4)!} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: primary }} />
            )}
          </div>
          <div className="w-full md:w-1/2 flex flex-col justify-center px-10 md:px-16 py-16 bg-white">
            <InView distance={20}>
              <div>
                <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>
                  {vocab.aboutLabel}
                </p>
                <h2
                  className="text-3xl md:text-4xl font-black mb-5 leading-tight"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
                >
                  {displayName}
                </h2>
                {config?.tagline && (
                  <p className="text-lg font-black mb-5" style={{ color: primary }}>
                    {config?.tagline}
                  </p>
                )}
                <div className="w-10 h-1 mb-6" style={{ backgroundColor: primary }} />
                <p className="text-lg leading-relaxed mb-10" style={{ color: "#555555" }}>
                  {aboutCopy}
                </p>
                <Link href="/about" className="btn text-white self-start"
                  style={{ backgroundColor: primary, borderColor: primary }}>
                  {vocab.aboutLabel}
                </Link>
              </div>
            </InView>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-4xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-16" style={{ color: primary }}>
              {vocab.reviewsOverline}
            </p>
            <div className="flex flex-col">
              {testimonials.slice(0, 3).map((t, i) => (
                <InView key={t.name} delay={i * 80} distance={20}>
                  <div>
                    {i > 0 && <div className="h-px my-12" style={{ backgroundColor: "#e0e0e0" }} />}
                    <div className="flex flex-col sm:flex-row gap-8 items-start">
                      <div className="shrink-0 sm:w-40">
                        <p className="text-sm font-black tracking-wide uppercase" style={{ color: "#111111" }}>
                          {t.name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "#999999" }}>{t.role}</p>
                      </div>
                      <p className="text-lg leading-relaxed italic flex-1" style={{ color: "#333333" }}>
                        &ldquo;{t.quote}&rdquo;
                      </p>
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
      <section className="relative py-32 text-center overflow-hidden">
        {img(0) ? (
          <>
            <img src={img(0)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <InView distance={20}>
          <div className="relative z-10 max-w-2xl mx-auto px-8">
            <div className="w-10 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
            <h2
              className="text-4xl md:text-5xl font-black text-white mb-6 text-balance"
              style={{ fontFamily: "var(--font-heading, inherit)" }}
            >
              {ctaHeadline}
            </h2>
            <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
              {vocab.ctaBodyText}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={primaryHref} className="btn text-white w-full sm:w-auto"
                style={{ backgroundColor: primary, borderColor: primary }}>
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
