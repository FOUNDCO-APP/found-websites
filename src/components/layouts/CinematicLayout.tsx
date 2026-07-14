import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import ServiceIcon from "@/components/ServiceIcon"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import type { LayoutProps } from "@/types/layout"

export default function CinematicLayout({ company, supportingCTA, imgs, gradient, heroImage, heroVideo, locations = [] }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const aboutCopy = getHomepageAboutCopy(config)

  const primaryLabel = intentLabel[company.primary_intent] || "Contact Us"
  const primaryHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"


  const img = (i: number) => imgs[i % imgs.length] || null
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category).ctaHeadline

  return (
    <>
      {/* ── HERO — true 100vh, centered, the whole screen is the canvas ── */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        {heroVideo ? (
          <video src={heroVideo} autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover" />
        ) : heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover ken-burns" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {(heroVideo || heroImage) && <div className="absolute inset-0 bg-black/45" />}

        <div className="relative z-10 px-8 max-w-5xl w-full">
          {/* Tagline — arrives first */}
          <p
            className="text-xs font-black tracking-[0.3em] uppercase mb-6"
            style={{
              color: "#ffffff",
              animation: "fade-up 600ms ease-out 150ms both",
            }}
          >
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>

          {/* Headline — the main event */}
          <h1
            className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-none mb-8 text-balance"
            style={{
              fontFamily: "var(--font-heading, inherit)",
              animation: "fade-up 900ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both",
            }}
          >
            {config?.hero_title || company.name}
          </h1>

          {/* Color line — draws across */}
          <div
            className="w-16 h-1 mx-auto mb-8"
            style={{
              backgroundColor: primary,
              animation: "scale-x-reveal 600ms cubic-bezier(0.16, 1, 0.3, 1) 600ms both",
              transformOrigin: "center",
            }}
          />

          {/* Subtitle */}
          <p
            className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{
              color: "#dddddd",
              animation: "fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) 750ms both",
            }}
          >
            {config?.hero_subtitle || `Welcome to ${company.name}.`}
          </p>

          {/* Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            style={{ animation: "fade-in 600ms ease-out 950ms both" }}
          >
            <Link href={primaryHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {supportingCTA && (
              <Link href={supportingCTA.href} className="btn text-white"
                style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                {supportingCTA.label}
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50"
          style={{ animation: "fade-in 600ms ease-out 1200ms both" }}>
          <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24" strokeWidth={2}
            className="animate-bounce">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── SERVICES — swipe on mobile, grid on desktop ── */}
      {services.length > 0 && (
        <section className="py-16 bg-white">
          <InView>
            <div className="max-w-6xl mx-auto px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                <div>
                  <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>
                    {vocab.servicesOverline}
                  </p>
                  <h2 className="text-4xl md:text-5xl font-black"
                    style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                    {vocab.servicesLabel}
                  </h2>
                </div>
                <Link href="/services"
                  className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                  style={{ color: primary }}>
                  View All →
                </Link>
              </div>

              {/* Mobile: horizontal swipe — icon + name only */}
              <div className="flex md:hidden gap-3 overflow-x-auto pb-2">
                {services.map((service) => (
                  <div key={service.name}
                    className="flex-none flex flex-col items-center gap-3 p-4 w-24"
                    style={{
                      backgroundColor: "#f7f7f7",
                      borderRadius: "var(--card-radius, 6px)",
                      border: "1px solid #eeeeee",
                    }}>
                    <ServiceIcon serviceName={service.name} color={primary} size={22} />
                    <span className="text-[10px] font-black uppercase tracking-wide text-center leading-tight"
                      style={{ color: "#111111" }}>
                      {service.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop: 4-col grid */}
              <div className="hidden md:grid grid-cols-4 gap-4">
                {services.slice(0, 8).map((service, i) => (
                  <InView key={service.name} delay={i * 60}>
                    <div
                      className="flex flex-col items-center gap-3 p-6 text-center"
                      style={{
                        backgroundColor: "#f7f7f7",
                        borderRadius: "var(--card-radius, 6px)",
                        border: "1px solid #eeeeee",
                      }}>
                      <ServiceIcon serviceName={service.name} color={primary} size={22} />
                      <span className="text-xs font-black uppercase tracking-wide leading-tight"
                        style={{ color: "#111111" }}>
                        {service.name}
                      </span>
                    </div>
                  </InView>
                ))}
              </div>
            </div>
          </InView>
        </section>
      )}

      {/* ── ABOUT — solid dark, no competing photo (CTA owns the final image) ── */}
      {aboutCopy && (
        <section className="relative py-28 overflow-hidden">
          <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
          <div className="relative z-10 max-w-6xl mx-auto px-8">
            <InView>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div>
                  <div className="w-16 h-1 mb-8" style={{ backgroundColor: primary }} />
                  <h2
                    className="text-5xl md:text-7xl font-black text-white leading-none"
                    style={{ fontFamily: "var(--font-heading, inherit)" }}
                  >
                    {company.name}
                  </h2>
                  {config?.tagline && (
                    <p className="text-xl font-black mt-6" style={{ color: primary }}>
                      {config?.tagline}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-lg leading-relaxed mb-10" style={{ color: "#cccccc" }}>
                    {aboutCopy}
                  </p>
                  <Link href="/about" className="btn text-white"
                    style={{ backgroundColor: primary, borderColor: primary }}>
                    {vocab.aboutLabel}
                  </Link>
                </div>
              </div>
            </InView>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — one. large. centered. ── */}
      {testimonials.length > 0 && (
        <section className="py-28 bg-white">
          <InView>
            <div className="max-w-4xl mx-auto px-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase mb-16" style={{ color: primary }}>
                {vocab.reviewsOverline}
              </p>
              <span
                className="text-9xl leading-none font-black block -mb-6"
                style={{ color: primary, fontFamily: "var(--font-heading, inherit)", opacity: 0.12 }}
              >
                &ldquo;
              </span>
              <p
                className="text-3xl md:text-4xl font-black leading-tight"
                style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
              >
                {testimonials[0].quote}
              </p>
              <div className="w-10 h-1 mx-auto mt-10 mb-6" style={{ backgroundColor: primary }} />
              <p className="text-sm font-black uppercase tracking-widest" style={{ color: "#999999" }}>
                {testimonials[0].name}
                {testimonials[0].role ? ` — ${testimonials[0].role}` : ""}
              </p>
            </div>
          </InView>
        </section>
      )}

      {locations.length > 0 && <FindUsSection company={company} locations={locations} primary={primary} />}

      {/* ── FINAL CTA — full-bleed photo (rhythm rule honored) ── */}
      <section className="relative py-32 text-center overflow-hidden">
        {img(2) ? (
          <>
            <img src={img(2)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <InView>
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
