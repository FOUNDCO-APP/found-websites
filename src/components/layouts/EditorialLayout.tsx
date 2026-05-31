"use client"

import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"
import type { LayoutProps } from "@/types/layout"

export default function EditorialLayout({ company, imgs, gradient, heroImage }: LayoutProps) {
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

  return (
    <>
      {/* ── HERO — MAGAZINE COVER SPLIT ── */}
      <section className="flex min-h-screen">

        {/* Left — white, elegant text composition */}
        <div className="relative z-10 flex flex-col justify-center w-full md:w-[45%] px-10 md:px-16 py-24 bg-white">
          <p className="text-xs font-black tracking-[0.25em] uppercase mb-10" style={{ color: primary }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl leading-tight mb-8 text-balance"
            style={{
              color: "#111111",
              fontFamily: "var(--font-heading, inherit)",
              fontStyle: "italic",
              fontWeight: 700,
            }}
          >
            {config?.hero_title || company.name}
          </h1>
          <div className="w-12 h-0.5 mb-8" style={{ backgroundColor: primary }} />
          <p className="text-lg leading-relaxed mb-12" style={{ color: "#666666" }}>
            {config?.hero_subtitle || `Welcome to ${company.name}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={primaryHref} className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref && (
              <Link href={secondaryHref} className="btn"
                style={{ borderColor: primary, color: primary }}>
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Right — full-height image bleeds to edge, no overlay */}
        <div className="hidden md:block md:w-[55%] relative">
          {heroImage ? (
            <img src={heroImage} alt={company.name}
              className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: gradient }} />
          )}
        </div>
      </section>

      {/* ── SERVICES — LUXURY MENU ── */}
      {services.length > 0 && (
        <section className="py-28" style={{ backgroundColor: "#F9F8F6" }}>
          <div className="max-w-5xl mx-auto px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-20">
              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase mb-4" style={{ color: primary }}>
                  What We Offer
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
                  Our Services
                </h2>
              </div>
              <Link href="/services"
                className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                style={{ color: primary }}>
                View All →
              </Link>
            </div>

            {/* Service rows — luxury menu style */}
            <div>
              {services.slice(0, 6).map((service, i) => (
                <div key={service.name}
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

      {/* ── ABOUT — WHITE, CENTERED STATEMENT ── */}
      {config?.about_text && (
        <section className="py-28 bg-white">
          <div className="max-w-3xl mx-auto px-8 text-center">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-8" style={{ color: primary }}>
              Our Story
            </p>
            <h2
              className="text-3xl md:text-4xl leading-relaxed mb-10"
              style={{
                color: "#111111",
                fontFamily: "var(--font-heading, inherit)",
                fontStyle: "italic",
                fontWeight: 700,
              }}
            >
              &ldquo;{config.about_text}&rdquo;
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-10" style={{ backgroundColor: primary }} />
            <Link href="/about" className="btn text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              Meet the Team
            </Link>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — OVERSIZED PULL QUOTES ── */}
      {testimonials.length > 0 && (
        <section className="py-28" style={{ backgroundColor: "#F9F8F6" }}>
          <div className="max-w-3xl mx-auto px-8">
            <p className="text-xs font-black tracking-[0.2em] uppercase mb-20" style={{ color: primary }}>
              Client Stories
            </p>
            <div className="flex flex-col gap-20">
              {testimonials.slice(0, 2).map((t, i) => (
                <div key={t.name} className="flex flex-col gap-6">
                  {/* Oversized quotation mark */}
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA — PHOTO (rhythm rule) ── */}
      <section className="relative py-32 text-center overflow-hidden">
        {img(1) ? (
          <>
            <img src={img(1)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-2xl mx-auto px-8">
          <div className="w-12 h-0.5 mx-auto mb-12" style={{ backgroundColor: primary }} />
          <h2
            className="text-4xl md:text-5xl text-white mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)", fontStyle: "italic", fontWeight: 700 }}
          >
            Let&apos;s Make Something Unforgettable
          </h2>
          <p className="mb-12 text-lg" style={{ color: "#cccccc" }}>
            {company.phone && (
              <>Call us at <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="font-bold text-white hover:underline">{company.phone}</a> or{" "}</>
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
