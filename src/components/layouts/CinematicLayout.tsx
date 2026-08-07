import Link from "next/link"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import { polishBusinessName } from "@/lib/copyPolish"
import ServiceIcon from "@/components/ServiceIcon"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import CatalogShowcase from "@/components/layouts/CatalogShowcase"
import SiteAnnouncement from "@/components/layouts/SiteAnnouncement"
import HeroVideo from "@/components/layouts/HeroVideo"
import type { LayoutProps } from "@/types/layout"

export default function CinematicLayout({ company, activeAddons, primaryCTA, secondaryCTA, imgs, gradient, heroImage, heroVideo, sectionImages, locations = [] }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const aboutCopy = getHomepageAboutCopy(config)
  const displayName = polishBusinessName(company.name)


  const img = (i: number) => imgs[i % imgs.length] || null
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category, company.sub_industry).ctaHeadline
  const ctaImage = sectionImages?.cta ?? null
  // Cinematic is deliberately restrained - hero and final CTA are the only
  // "photo moments" by design. Rather than break that with a generic strip,
  // the owner's own gallery-tagged photos (if any) show as a small collage
  // inside About - real photos only, no stock fallback, so the restraint
  // rule still holds for anyone who hasn't tagged a gallery yet.
  const ownerGalleryImages = (sectionImages?.gallery ?? []).slice(0, 4)

  return (
    <>
      {/* â”€â”€ HERO â€” true 100vh, centered, the whole screen is the canvas â”€â”€ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        {heroVideo ? (
          <HeroVideo src={heroVideo} className="absolute inset-0 w-full h-full object-cover" />
        ) : heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover ken-burns" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {(heroVideo || heroImage) && <div className="absolute inset-0 bg-black/45" />}

        <div className="relative z-10 px-8 py-24 max-w-5xl w-full">
          {/* Tagline â€” arrives first */}
          <p
            className="text-xs font-black tracking-[0.3em] uppercase mb-6"
            style={{
              color: "#ffffff",
              animation: "fade-up 600ms ease-out 150ms both",
            }}
          >
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>

          {/* Headline â€” the main event */}
          <h1
            className="text-6xl md:text-8xl lg:text-9xl font-black text-white leading-none mb-8 text-balance"
            style={{
              fontFamily: "var(--font-heading, inherit)",
              animation: "fade-up 900ms cubic-bezier(0.16, 1, 0.3, 1) 300ms both",
            }}
          >
            {config?.hero_title || displayName}
          </h1>

          {/* Color line â€” draws across */}
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
            {config?.hero_subtitle || `Welcome to ${displayName}.`}
          </p>

          {/* Buttons */}
          <div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            style={{ animation: "fade-in 600ms ease-out 950ms both" }}
          >
            <Link href={primaryCTA.href} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryCTA.label}
            </Link>
            {secondaryCTA && (
              <Link href={secondaryCTA.href} className="btn text-white"
                style={{ borderColor: "rgba(255,255,255,0.4)" }}>
                {secondaryCTA.label}
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

      <SiteAnnouncement company={company} image={sectionImages?.announcement ?? null} activeAddons={activeAddons} />

      <CatalogShowcase company={company} activeAddons={activeAddons} />

      {/* â”€â”€ SERVICES â€” swipe on mobile, grid on desktop â”€â”€ */}
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

              {/* Mobile: horizontal swipe â€” icon + name only */}
              <div className="flex md:hidden gap-3 overflow-x-auto scrollbar-hide pb-2">
                {services.slice(0, 3).map((service) => (
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
                {services.slice(0, 3).map((service, i) => (
                  <InView key={service.name} delay={i * 60}>
                    <div
                      className="flex flex-col items-center gap-3 p-6 text-center transition-transform duration-300 hover:-translate-y-1"
                      style={{
                        backgroundColor: "#ffffff",
                        borderRadius: "var(--card-radius, 6px)",
                        boxShadow: "var(--card-shadow, 0 16px 40px rgba(0,0,0,0.14))",
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

      {/* â”€â”€ ABOUT â€” solid dark, no competing photo (CTA owns the final image) â”€â”€ */}
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
                    {displayName}
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
              {ownerGalleryImages.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-16">
                  {ownerGalleryImages.map((src, i) => (
                    <div
                      key={i}
                      className="relative overflow-hidden"
                      style={{ aspectRatio: "3 / 4", borderRadius: "var(--card-radius, 6px)" }}
                    >
                      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </InView>
          </div>
        </section>
      )}

      {/* â”€â”€ TESTIMONIALS â€” one. large. centered. â”€â”€ */}
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
                {testimonials[0].role ? ` â€” ${testimonials[0].role}` : ""}
              </p>
            </div>
          </InView>
        </section>
      )}

      {locations.length > 0 && <FindUsSection company={company} locations={locations} primary={primary} />}

      {/* â”€â”€ FINAL CTA â€” full-bleed photo (rhythm rule honored) â”€â”€ */}
      <section className="relative py-32 text-center overflow-hidden">
        {(ctaImage ?? img(2)) ? (
          <>
            <img src={(ctaImage ?? img(2))!} alt="" className="absolute inset-0 w-full h-full object-cover" />
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
              <Link href={primaryCTA.href} className="btn text-white w-full sm:w-auto"
                style={{ backgroundColor: primary, borderColor: primary }}>
                {primaryCTA.label}
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
