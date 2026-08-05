import Link from "next/link"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getHomepageAboutCopy } from "@/lib/aboutContent"
import { polishBusinessName } from "@/lib/copyPolish"
import { excerptText } from "@/lib/textExcerpt"
import InView from "@/components/InView"
import FindUsSection from "@/components/layouts/FindUsSection"
import CatalogShowcase from "@/components/layouts/CatalogShowcase"
import SiteAnnouncement from "@/components/layouts/SiteAnnouncement"
import HeroVideo from "@/components/layouts/HeroVideo"
import type { LayoutProps } from "@/types/layout"

const INK = "#111715"
const PAPER = "#FBFCF8"
const MIST = "#EEF3ED"
const SAGE = "#DCE8DE"

function imageAt(images: string[], index: number) {
  return images[index % images.length] || null
}

function softAccent(primary: string) {
  return /^#[0-9a-fA-F]{6}$/.test(primary) ? `${primary}18` : SAGE
}
function polishedServiceDescription(name: string, description: string) {
  const trimmed = description.trim()
  if (trimmed && !/^(clear|practical) help (built|shaped) around/i.test(trimmed)) return excerptText(trimmed, 55)

  const key = name.toLowerCase()
  if (key.includes("facial")) return "Customized facial care focused on calm skin, visible glow, and a comfortable appointment."
  if (key.includes("wax")) return "Clean, careful waxing services with a steady hand and attention to comfort."
  if (key.includes("lash")) return "Detailed lash services shaped around your natural features and the look you want."
  if (key.includes("brow")) return "Precise brow care with shape, balance, and polish in mind."
  return `Thoughtful ${name.toLowerCase()} shaped around comfort, detail, and visible results.`
}

export default function WellnessLuxeLayout({ company, activeAddons, primaryCTA, secondaryCTA, imgs, gradient, heroImage, heroVideo, sectionImages, locations = [] }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []
  const vocab = getVocab(company.sub_industry, company.industry_category)
  const aboutCopy = getHomepageAboutCopy(config)
  const displayName = polishBusinessName(company.name)
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category, company.sub_industry).ctaHeadline
  const ownerGalleryImages = sectionImages?.gallery ?? []
  const heroFallback = sectionImages?.cta ?? ownerGalleryImages[0] ?? heroImage ?? imageAt(imgs, 0)
  const aboutImage = sectionImages?.about ?? imageAt(imgs, 1)
  const ctaImage = sectionImages?.cta ?? ownerGalleryImages[1] ?? heroFallback ?? imageAt(imgs, 2)
  const galleryImages = Array.from(new Set([...ownerGalleryImages, imageAt(imgs, 2), imageAt(imgs, 3), imageAt(imgs, 4)].filter(Boolean) as string[])).slice(0, 5)
  const serviceCount = Math.min(services.length, 3)
  const serviceGridCols = serviceCount <= 1 ? "md:grid-cols-1" : serviceCount === 2 ? "md:grid-cols-2" : "md:grid-cols-3"

  return (
    <>
      <section className="relative overflow-hidden" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto grid min-h-[calc(100svh-150px)] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-10 pt-12 md:grid-cols-[0.92fr_1.08fr] md:px-10 md:pb-12 md:pt-12">
          <div className="relative z-10 max-w-xl">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: primary }}>
              {company.city ? `${company.city} wellness` : "Care, beautifully presented"}
            </p>
            <h1 className="text-5xl font-normal leading-[0.96] tracking-normal md:text-7xl" style={{ color: INK, fontFamily: "var(--font-heading, inherit)" }}>
              {config?.hero_title || displayName}
            </h1>
            <p className="mt-7 max-w-md text-base font-medium leading-8 md:text-lg" style={{ color: "rgba(17,23,21,0.62)" }}>
              {config?.hero_subtitle || `A calmer way to discover ${displayName}.`}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryCTA.href} className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:opacity-90" style={{ backgroundColor: primary }}>
                {primaryCTA.label}
              </Link>
              {secondaryCTA && (
                <Link href={secondaryCTA.href} className="inline-flex min-h-14 items-center justify-center rounded-full border px-8 text-xs font-black uppercase tracking-[0.16em] transition hover:opacity-75" style={{ borderColor: "rgba(17,23,21,0.18)", color: INK }}>
                  {secondaryCTA.label}
                </Link>
              )}
            </div>
          </div>

          <div className="relative min-h-[360px] md:min-h-[500px]">
            <div className="absolute left-0 top-8 hidden h-48 w-48 rounded-full md:block" style={{ backgroundColor: softAccent(primary) }} />
            <div className="relative ml-auto h-[360px] w-full overflow-hidden rounded-[2rem] shadow-[0_30px_80px_rgba(17,23,21,0.18)] md:h-[500px] md:w-[82%]">
              {heroVideo ? (
                <HeroVideo src={heroVideo} />
              ) : heroFallback ? (
                <img src={heroFallback} alt={company.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0" style={{ background: gradient }} />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,23,21,0)_44%,rgba(17,23,21,0.58)_100%)]" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Open today</p>
                <p className="mt-2 text-xl font-medium leading-tight">{company.phone ? "Call when you are ready." : "Book when you are ready."}</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="border-y border-black/[0.06]" style={{ backgroundColor: PAPER }}>
        <div className="mx-auto grid max-w-6xl gap-px px-6 py-4 md:grid-cols-3 md:px-10">
          {[
            company.city ? `${company.city}, ${company.state || "local"}` : "Local studio",
            company.phone ? "Easy direct booking" : "Simple online booking",
            "Personal care, no clutter",
          ].map((item) => (
            <p key={item} className="py-3 text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(17,23,21,0.54)" }}>
              {item}
            </p>
          ))}
        </div>
      </section>
      <SiteAnnouncement company={company} image={sectionImages?.announcement ?? null} activeAddons={activeAddons} />
      <CatalogShowcase company={company} activeAddons={activeAddons} />

      {services.length > 0 && (
        <section className="py-16 md:py-20" style={{ backgroundColor: INK }}>
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <InView>
              <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: primary }}>{vocab.servicesOverline}</p>
                  <h2 className="max-w-2xl text-4xl font-normal leading-tight text-white md:text-6xl" style={{ fontFamily: "var(--font-heading, inherit)" }}>{vocab.servicesLabel}</h2>
                </div>
                <Link href="/services" className="text-xs font-black uppercase tracking-[0.16em] text-white/50 transition hover:text-white">View all</Link>
              </div>
            </InView>
            <div className={`grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.08] ${serviceGridCols}`}>
              {services.slice(0, 3).map((service, i) => (
                <InView key={service.name} delay={i * 80}>
                  <Link href="/services" className="block h-full bg-[#151B18] p-7 transition hover:bg-[#1A211D] md:p-8">
                    <p className="mb-8 text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: primary }}>{String(i + 1).padStart(2, "0")}</p>
                    <h3 className="text-2xl font-normal leading-tight text-white" style={{ fontFamily: "var(--font-heading, inherit)" }}>{service.name}</h3>
                    <p className="mt-4 text-sm font-medium leading-7 text-white/52">{polishedServiceDescription(service.name, service.description)}</p>
                  </Link>
                </InView>
              ))}
            </div>
          </div>
        </section>
      )}

      {aboutCopy && (
        <section className="py-16 md:py-20" style={{ backgroundColor: PAPER }}>
          <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[0.96fr_1.04fr] md:px-10">
            <div className="relative min-h-[320px] overflow-hidden rounded-[1.5rem] md:min-h-[440px]">
              {aboutImage ? <img src={aboutImage} alt={displayName} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0" style={{ backgroundColor: MIST }} />}
            </div>
            <InView distance={20}>
              <div className="flex h-full flex-col justify-center">
                <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: primary }}>{vocab.aboutLabel}</p>
                {config?.tagline && <h2 className="mb-6 text-4xl font-normal leading-tight md:text-5xl" style={{ color: INK, fontFamily: "var(--font-heading, inherit)" }}>{config.tagline}</h2>}
                <p className="text-lg font-medium leading-9" style={{ color: "rgba(17,23,21,0.64)" }}>{aboutCopy}</p>
                <Link href="/about" className="mt-9 inline-flex min-h-12 w-fit items-center justify-center rounded-full px-7 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:opacity-90" style={{ backgroundColor: primary }}>
                  {vocab.aboutLabel}
                </Link>
              </div>
            </InView>
          </div>
        </section>
      )}

      {galleryImages.length > 0 && (
        <section className="py-10 md:py-12" style={{ backgroundColor: MIST }}>
          <div className="mx-auto max-w-6xl px-6 md:px-10">
            <div className="grid gap-3 md:grid-cols-[1.35fr_0.82fr_0.82fr]">
              {galleryImages.slice(0, 3).map((src, i) => (
                <div key={src} className={`relative overflow-hidden rounded-[1.5rem] ${i === 0 ? "min-h-[420px] md:min-h-[520px]" : "min-h-[260px] md:min-h-[520px]"}`}>
                  <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="py-16 md:py-20" style={{ backgroundColor: PAPER }}>
          <div className="mx-auto max-w-4xl px-6 md:px-10">
            <p className="mb-8 text-center text-[11px] font-black uppercase tracking-[0.22em]" style={{ color: primary }}>Client stories</p>
            <div className="space-y-px overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.06]">
              {testimonials.slice(0, 3).map((t) => (
                <div key={`${t.name}-${t.quote}`} className="bg-white p-7 md:p-9">
                  <p className="text-xl font-medium leading-9" style={{ color: INK }}>&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-6 text-sm font-black uppercase tracking-[0.14em]" style={{ color: primary }}>{t.name}</p>
                  {t.role && <p className="mt-1 text-sm text-black/40">{t.role}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {locations.length > 0 && <FindUsSection company={company} locations={locations} primary={primary} />}

      <section className="relative overflow-hidden py-24 text-center md:py-32">
        {ctaImage ? <img src={ctaImage} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0" style={{ background: gradient }} />}
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(17,23,21,0.72)" }} />
        <InView distance={20}>
          <div className="relative z-10 mx-auto max-w-2xl px-6">
            <p className="mb-5 text-[11px] font-black uppercase tracking-[0.22em] text-white/50">Begin</p>
            <h2 className="text-4xl font-normal leading-tight text-white md:text-6xl" style={{ fontFamily: "var(--font-heading, inherit)" }}>{ctaHeadline}</h2>
            <p className="mx-auto mt-6 max-w-lg text-base font-medium leading-8 text-white/62">{vocab.ctaBodyText}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={primaryCTA.href} className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:opacity-90" style={{ backgroundColor: primary }}>
                {primaryCTA.label}
              </Link>
              {company.phone && (
                <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="inline-flex min-h-14 items-center justify-center rounded-full border border-white/25 px-8 text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-white/50">
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
