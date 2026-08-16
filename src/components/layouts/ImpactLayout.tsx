import Link from "next/link"
import type { CSSProperties } from "react"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import { polishBusinessName } from "@/lib/copyPolish"
import { publicServiceDescription } from "@/lib/publicServiceDescription"
import ServiceIcon from "@/components/ServiceIcon"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import CatalogShowcase from "@/components/layouts/CatalogShowcase"
import SiteAnnouncement from "@/components/layouts/SiteAnnouncement"
import HeroVideo from "@/components/layouts/HeroVideo"
import EmailSignupSection from "@/components/layouts/EmailSignupSection"
import type { LayoutProps } from "@/types/layout"

export default function ImpactLayout({ company, activeAddons, primaryCTA, secondaryCTA, imgs, gradient, heroImage, heroVideo, sectionImages, locations = [] }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const aboutCopy = getHomepageAboutCopy(config)
  const displayName = polishBusinessName(company.name)


  const img = (i: number) => imgs[i % imgs.length] || null
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category, company.sub_industry).ctaHeadline
  const aboutImage = sectionImages?.about ?? null
  const ctaImage = sectionImages?.cta ?? null
  // Owner-uploaded gallery photos always come first, but a strip with only
  // 1-2 real photos reads as sparse/broken - top it up with stock photos
  // until there are enough real ones to fill it on their own. Capped to 4
  // regardless of how many real photos exist - the strip below is built for
  // exactly 4 tiles (3 visible on desktop via flex-1, a 4th only in the
  // mobile scroll). An owner with many real gallery photos would otherwise
  // squeeze every one of them into that same fixed desktop row with no
  // scroll, crushing each tile to a sliver.
  const ownerGalleryImages = (sectionImages?.gallery ?? []).slice(0, 4)
  const stockFillImages = [img(1), img(2), img(3), img(4)].filter(Boolean) as string[]
  const galleryImages = ownerGalleryImages.length >= 4
    ? ownerGalleryImages
    : Array.from(new Set([...ownerGalleryImages, ...stockFillImages])).slice(0, 4)

  return (
    <>
      {/* â”€â”€ HERO â€” fast, confident, punches in â”€â”€ */}
      <section className="relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden">
        {heroVideo ? (
          <HeroVideo src={heroVideo} className="absolute inset-0 w-full h-full object-cover" />
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
          <h1 className="public-hero-title text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 max-w-4xl"
            style={{
              fontFamily: "var(--font-heading, inherit)",
              "--public-hero-line-height": "1.06",
              "--public-hero-mobile-line-height": "1.12",
              animation: "fade-up 500ms cubic-bezier(0.16, 1, 0.3, 1) 100ms both",
            } as CSSProperties}>
            {config?.hero_title || displayName}
          </h1>
          <p className="public-hero-subtitle text-lg md:text-xl max-w-xl mb-12"
            style={{ color: "#cccccc", animation: "fade-up 400ms ease-out 280ms both" }}>
            {config?.hero_subtitle || `Welcome to ${displayName}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4"
            style={{ animation: "fade-in 350ms ease-out 430ms both" }}>
            <Link href={primaryCTA.href} className="btn w-full sm:w-auto text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryCTA.label}
            </Link>
            {secondaryCTA && (
              <Link href={secondaryCTA.href} className="btn w-full sm:w-auto text-white"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}>
                {secondaryCTA.label}
              </Link>
            )}
          </div>
        </div>
      </section>

      <SiteAnnouncement company={company} image={sectionImages?.announcement ?? null} activeAddons={activeAddons} />

      {/* ── GALLERY STRIP — slow continuous auto-scroll on every device ── */}
      {galleryImages.length > 0 && (
        <div className="overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
          <div className={galleryImages.length >= 4 ? "flex w-max gap-0.5 gallery-strip-track" : "flex gap-0.5 overflow-x-auto scrollbar-hide"}>
            {(galleryImages.length >= 4 ? [...galleryImages, ...galleryImages] : galleryImages).map((src, i) => (
              <div
                key={i}
                className="relative flex-none overflow-hidden w-[70vw] md:w-[320px]"
                style={{ height: "260px" }}
              >
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <CatalogShowcase company={company} activeAddons={activeAddons} />

      {/* â”€â”€ SERVICES TEASER â”€â”€ */}
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
                  <div className="bg-white p-8 border-l-4 transition-transform duration-300 hover:-translate-y-1"
                    style={{
                      borderColor: primary,
                      borderRadius: `0 var(--card-radius, 10px) var(--card-radius, 10px) 0`,
                      boxShadow: "var(--card-shadow, 0 16px 40px rgba(0,0,0,0.14))",
                    }}>
                    <div className="mb-5"><ServiceIcon serviceName={service.name} color={primary} size={24} /></div>
                    <h3 className="font-black text-lg mb-3" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "#776F6F" }}>{publicServiceDescription(service, { industryCategory: company.industry_category, subIndustry: company.sub_industry }, 50)}</p>
                    <Link href="/services" className="text-xs font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                      style={{ color: primary }}>
                      More →
                    </Link>
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

      {/* â”€â”€ ABOUT STRIP â”€â”€ */}
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

      {/* â”€â”€ TESTIMONIALS â”€â”€ */}
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

      {/* â”€â”€ FINAL CTA â”€â”€ */}
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
              <Link href={primaryCTA.href} className="btn text-white w-full sm:w-auto" style={{ backgroundColor: primary, borderColor: primary }}>
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
      <EmailSignupSection company={company} activeAddons={activeAddons} />
    </>
  )
}
