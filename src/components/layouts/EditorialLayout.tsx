"use client"

import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import { polishBusinessName } from "@/lib/copyPolish"
import ServiceIcon from "@/components/ServiceIcon"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import type { LayoutProps } from "@/types/layout"

export default function EditorialLayout({ company, supportingCTA, imgs, gradient, heroImage, locations = [] }: LayoutProps) {
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
      {/* ── HERO — magazine cover, slow deliberate reveal ── */}
      <section className="flex flex-col md:flex-row min-h-[90vh] md:min-h-screen">

        {/* Mobile: full-width image on top */}
        <div className="md:hidden w-full h-72 relative"
          style={{ animation: "fade-in 800ms ease-out 100ms both" }}>
          {heroImage ? (
            <img src={heroImage} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: gradient }} />
          )}
        </div>

        {/* Left — white, elegant text composition */}
        <div className="relative z-10 flex flex-col justify-center w-full md:w-[45%] px-10 md:px-16 py-16 md:py-24 bg-white">
          <p className="text-xs font-black tracking-[0.25em] uppercase mb-8 md:mb-10"
            style={{ color: primary, animation: "fade-up 700ms ease-out 200ms both" }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 md:mb-8 text-balance"
            style={{
              color: "#111111",
              fontFamily: "var(--font-heading, inherit)",
              fontStyle: "italic",
              fontWeight: 700,
              animation: "fade-up 900ms cubic-bezier(0.16, 1, 0.3, 1) 380ms both",
            }}
          >
            {config?.hero_title || displayName}
          </h1>
          <div className="w-12 h-0.5 mb-6 md:mb-8"
            style={{
              backgroundColor: primary,
              animation: "scale-x-reveal 600ms ease-out 680ms both",
              transformOrigin: "left",
            }} />
          <p className="text-lg leading-relaxed mb-10 md:mb-12"
            style={{ color: "#666666", animation: "fade-up 700ms ease-out 830ms both" }}>
            {config?.hero_subtitle || `Welcome to ${displayName}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4"
            style={{ animation: "fade-in 600ms ease-out 1020ms both" }}>
            <Link href={primaryHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {supportingCTA && (
              <Link href={supportingCTA.href} className="btn"
                style={{ borderColor: primary, color: primary }}>
                {supportingCTA.label}
              </Link>
            )}
          </div>
        </div>

        {/* Right — full-height image drifts in from right (desktop only) */}
        <div className="hidden md:block md:w-[55%] relative"
          style={{ animation: "fade-left 800ms ease-out 200ms both" }}>
          {heroImage ? (
            <img src={heroImage} alt={company.name}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: gradient }} />
          )}
        </div>
      </section>

      {/* ── ABOUT — brand story ── */}
      {aboutCopy && (
        <section className="py-28 bg-white">
          <InView distance={20}>
            <div className="max-w-2xl mx-auto px-8 text-center">
              <p className="text-xs font-black tracking-[0.2em] uppercase mb-8" style={{ color: primary }}>
                {vocab.aboutLabel}
              </p>
              {config?.tagline ? (
                <h2
                  className="text-3xl md:text-4xl mb-8"
                  style={{
                    color: "#111111",
                    fontFamily: "var(--font-heading, inherit)",
                    fontStyle: "italic",
                    fontWeight: 700,
                  }}
                >
                  {config?.tagline}
                </h2>
              ) : null}
              <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: primary }} />
              {aboutCopy && (
                <p className="text-lg leading-relaxed mb-10" style={{ color: "#666666" }}>
                  {aboutCopy}
                </p>
              )}
              <Link href="/about" className="btn text-white"
                style={{ backgroundColor: primary, borderColor: primary }}>
                {vocab.aboutLabel}
              </Link>
            </div>
          </InView>
        </section>
      )}

      {/* ── SERVICES — luxury menu ── */}
      {services.length > 0 && (
        <section className="py-28" style={{ backgroundColor: "#F9F8F6" }}>
          <div className="max-w-5xl mx-auto px-8">
            <InView distance={20}>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-20">
                <div>
                  <p className="text-xs font-black tracking-[0.2em] uppercase mb-4" style={{ color: primary }}>
                    {vocab.servicesOverline}
                  </p>
                  <h2
                    className="text-4xl md:text-5xl"
                    style={{
                      color: "#111111",
                      fontFamily: "var(--font-heading, inherit)",
                      fontStyle: "italic",
                      fontWeight: 700,
                    }}
                  >
                    {vocab.servicesLabel}
                  </h2>
                </div>
                <Link href="/services"
                  className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: primary }}>
                  View All →
                </Link>
              </div>
            </InView>

            <div>
              {services.slice(0, 6).map((service, i) => (
                <InView key={service.name} delay={i * 60} distance={16}>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-8 items-start"
                    style={{ borderTop: `${i === 0 ? "2px" : "1px"} solid ${i === 0 ? primary : "#E8E6E3"}` }}>
                    <div className="flex items-center gap-4">
                      <ServiceIcon serviceName={service.name} color={primary} size={18} />
                      <h3
                        className="text-xl"
                        style={{
                          color: "#111111",
                          fontFamily: "var(--font-heading, inherit)",
                          fontStyle: "italic",
                          fontWeight: 700,
                        }}
                      >
                        {service.name}
                      </h3>
                    </div>
                    <p className="text-base leading-relaxed" style={{ color: "#777777" }}>
                      {service.description}
                    </p>
                  </div>
                </InView>
              ))}
              {services.length > 6 && (
                <div className="pt-10" style={{ borderTop: "1px solid #E8E6E3" }}>
                  <Link href="/services" className="btn text-white"
                    style={{ backgroundColor: primary, borderColor: primary }}>
                    See All {services.length} Services
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — oversized pull quotes ── */}
      {testimonials.length > 0 && (
        <section className="py-28" style={{ backgroundColor: "#F9F8F6" }}>
          <div className="max-w-3xl mx-auto px-8">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-20" style={{ color: primary }}>
              {vocab.reviewsOverline}
            </p>
            <div className="flex flex-col gap-20">
              {testimonials.slice(0, 2).map((t, i) => (
                <InView key={t.name} delay={i * 120} distance={20}>
                  <div className="flex flex-col gap-6">
                    <span
                      className="text-8xl leading-none"
                      style={{ color: primary, fontFamily: "var(--font-heading, inherit)", opacity: 0.4 }}
                    >
                      &ldquo;
                    </span>
                    <p
                      className="text-2xl md:text-3xl leading-relaxed -mt-8"
                      style={{
                        color: "#222222",
                        fontFamily: "var(--font-heading, inherit)",
                        fontStyle: "italic",
                        fontWeight: 500,
                      }}
                    >
                      {t.quote}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="w-8 h-px" style={{ backgroundColor: primary }} />
                      <div>
                        <p className="text-sm font-black tracking-wide uppercase" style={{ color: "#111111" }}>{t.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: "#999999" }}>{t.role}</p>
                      </div>
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
        {img(1) ? (
          <>
            <img src={img(1)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <InView distance={20}>
          <div className="relative z-10 max-w-2xl mx-auto px-8">
            <div className="w-12 h-0.5 mx-auto mb-12" style={{ backgroundColor: primary }} />
            <h2
              className="text-4xl md:text-5xl text-white mb-6 text-balance"
              style={{ fontFamily: "var(--font-heading, inherit)", fontStyle: "italic", fontWeight: 700 }}
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
