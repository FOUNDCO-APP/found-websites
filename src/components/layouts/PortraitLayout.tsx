import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import ServiceIcon from "@/components/ServiceIcon"
import type { LayoutProps } from "@/types/layout"

export default function PortraitLayout({ company, imgs, gradient, heroImage }: LayoutProps) {
  const config = company.website_config
  const primary = company.primary_color
  const services = config?.services || []
  const testimonials = config?.testimonials || []

  const primaryLabel = intentLabel[company.primary_intent] || "Contact Us"
  const primaryHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const secondaryLabel = company.secondary_intent ? intentLabel[company.secondary_intent] : null
  const secondaryHref = company.secondary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : company.secondary_intent ? intentHref[company.secondary_intent] : null

  const img = (i: number) => imgs[i % imgs.length] || null
  const ctaHeadline = config?.cta_headline || getIndustryDefaults(company.industry_category).ctaHeadline

  return (
    <>
      {/* ── HERO — photo leads, text anchors bottom-left ── */}
      <section className="relative min-h-[90vh] flex items-end overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {/* Lighter overlay than Impact — photo stays visible */}
        {heroImage && <div className="absolute inset-0 bg-black/40" />}
        {/* Bottom gradient for text legibility without smothering the photo */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0) 65%)"
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-8 pb-16 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: "#ffffff" }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-none mb-6 max-w-3xl text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}
          >
            {config?.hero_title || company.name}
          </h1>
          <div className="w-10 h-1 mb-6" style={{ backgroundColor: primary }} />
          <p className="text-lg max-w-lg mb-10 leading-relaxed" style={{ color: "#dddddd" }}>
            {config?.hero_subtitle || `Welcome to ${company.name}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={primaryHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref && (
              <Link href={secondaryHref} className="btn text-white"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}>
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── GALLERY STRIP — 75vw mobile (clear swipe), 3-col desktop ── */}
      {imgs.length >= 2 && (
        <div className="flex gap-0.5 overflow-x-auto md:overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
          {[img(1), img(2), img(3), img(4)].filter(Boolean).map((src, i) => (
            <div
              key={i}
              className={`relative flex-none overflow-hidden ${i === 3 ? "md:hidden" : "md:flex-1"}`}
              style={{ height: "260px", width: "75vw" }}
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

      {/* ── SERVICES — centered icon cards, inviting not industrial ── */}
      {services.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
              <div>
                <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>
                  What We Do
                </p>
                <h2
                  className="text-4xl md:text-5xl font-black"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
                >
                  Our Services
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {services.slice(0, 6).map((service) => (
                <div
                  key={service.name}
                  className="flex flex-col items-center text-center p-8"
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--card-radius, 10px)",
                    boxShadow: "var(--card-shadow, 0 2px 12px rgba(0,0,0,0.08))",
                    border: "1px solid #f0f0f0",
                  }}
                >
                  <div
                    className="mb-5 p-4 rounded-full"
                    style={{ backgroundColor: `${primary}18` }}
                  >
                    <ServiceIcon serviceName={service.name} color={primary} size={22} />
                  </div>
                  <h3
                    className="font-black text-base mb-3 leading-tight"
                    style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
                  >
                    {service.name}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>
                    {service.description}
                  </p>
                </div>
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

      {/* ── ABOUT — full split, photo left bleeds to edge / story right ── */}
      {config?.about_text && (
        <section className="flex flex-col md:flex-row" style={{ minHeight: "520px" }}>
          {/* Left — full-height photo, no frame, bleeds to edge */}
          <div className="relative w-full md:w-1/2 h-72 md:h-auto">
            {img(4) ? (
              <img
                src={img(4)!}
                alt={company.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0" style={{ backgroundColor: primary }} />
            )}
          </div>

          {/* Right — story */}
          <div className="w-full md:w-1/2 flex flex-col justify-center px-10 md:px-16 py-16 bg-white">
            <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>
              Our Story
            </p>
            <h2
              className="text-3xl md:text-4xl font-black mb-5 leading-tight"
              style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}
            >
              {company.name}
            </h2>
            {config.tagline && (
              <p className="text-lg font-black mb-5" style={{ color: primary }}>
                {config.tagline}
              </p>
            )}
            <div className="w-10 h-1 mb-6" style={{ backgroundColor: primary }} />
            <p className="text-lg leading-relaxed mb-10" style={{ color: "#555555" }}>
              {config.about_text}
            </p>
            <Link
              href="/about"
              className="btn text-white self-start"
              style={{ backgroundColor: primary, borderColor: primary }}
            >
              Meet the Team
            </Link>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — clean, divider-separated ── */}
      {testimonials.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-4xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-16" style={{ color: primary }}>
              Client Stories
            </p>
            <div className="flex flex-col">
              {testimonials.slice(0, 3).map((t, i) => (
                <div key={t.name}>
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA — photo (rhythm rule honored) ── */}
      <section className="relative py-32 text-center overflow-hidden">
        {img(0) ? (
          <>
            <img src={img(0)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/65" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-2xl mx-auto px-8">
          <div className="w-10 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2
            className="text-4xl md:text-5xl font-black text-white mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}
          >
            {ctaHeadline}
          </h2>
          <p className="mb-12 text-lg" style={{ color: "#cccccc" }}>
            {company.phone && (
              <>
                Call us at{" "}
                <a
                  href={`tel:${company.phone.replace(/\D/g, "")}`}
                  className="font-bold text-white hover:underline"
                >
                  {company.phone}
                </a>{" "}
                or{" "}
              </>
            )}
            send us a message and we&apos;ll be in touch.
          </p>
          <Link href={primaryHref} className="btn text-white"
            style={{ backgroundColor: primary, borderColor: primary }}>
            {primaryLabel}
          </Link>
        </div>
      </section>
    </>
  )
}
