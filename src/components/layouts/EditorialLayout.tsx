import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"
import type { LayoutProps } from "@/types/layout"

export default function EditorialLayout({ company, imgs, gradient, heroImage, heroVideo }: LayoutProps) {
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

  // Split about_text into two halves for the two-paragraph about section
  const sentences = config?.about_text?.split(/(?<=[.!?])\s+/) || []
  const mid = Math.ceil(sentences.length / 2)
  const aboutPara1 = sentences.slice(0, mid).join(" ")
  const aboutPara2 = sentences.slice(mid).join(" ")

  return (
    <>
      {/* ── HERO — SPLIT LAYOUT ── */}
      <section className="min-h-[80vh] flex items-center bg-white">
        <div className="max-w-6xl mx-auto px-8 py-24 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

            {/* Left — text */}
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-8" style={{ color: primary }}>
                {company.city ? `${company.city}'s Own` : "Local & Independent"}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-8 text-balance"
                style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                {config?.hero_title || company.name}
              </h1>
              <p className="text-lg leading-relaxed mb-10" style={{ color: "#555555" }}>
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

            {/* Right — image */}
            <div className="relative">
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={company.name}
                  className="w-full object-cover"
                  style={{
                    height: "520px",
                    borderRadius: "var(--card-radius, 24px)",
                    boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
                  }}
                />
              ) : (
                <div
                  className="w-full flex items-center justify-center"
                  style={{
                    height: "520px",
                    background: gradient,
                    borderRadius: "var(--card-radius, 24px)",
                  }}
                >
                  <span className="text-6xl font-black text-white opacity-20"
                    style={{ fontFamily: "var(--font-heading, inherit)" }}>
                    {company.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Accent bar */}
              <div className="absolute -bottom-4 -left-4 w-16 h-16"
                style={{ backgroundColor: primary, borderRadius: "var(--card-radius, 24px)", opacity: 0.15 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICES — LIST ROWS ── */}
      {services.length > 0 && (
        <section className="py-24 bg-white" style={{ borderTop: "1px solid #f0f0f0" }}>
          <div className="max-w-6xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>What We Offer</p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16">
              <h2 className="text-3xl md:text-4xl font-black" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                Our Services
              </h2>
              <Link href="/services"
                className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                style={{ color: primary }}>
                All Services →
              </Link>
            </div>

            {/* Service rows */}
            <div>
              {services.slice(0, 5).map((service, i) => (
                <div key={service.name}
                  className="flex flex-col sm:flex-row sm:items-start gap-6 py-8"
                  style={{ borderTop: i === 0 ? `2px solid ${primary}` : "1px solid #eeeeee" }}>
                  <div className="flex items-center gap-4 sm:w-64 shrink-0">
                    <ServiceIcon serviceName={service.name} color={primary} size={20} />
                    <h3 className="font-black text-base" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h3>
                  </div>
                  <p className="text-base leading-relaxed" style={{ color: "#666666" }}>
                    {service.description}
                  </p>
                </div>
              ))}
              {services.length > 5 && (
                <div className="pt-10" style={{ borderTop: "1px solid #eeeeee" }}>
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

      {/* ── ABOUT — DARK, TWO PARAGRAPHS ── */}
      {config?.about_text && (
        <section className="py-28" style={{ backgroundColor: "#111111" }}>
          <div className="max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              <div>
                <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
                <p className="text-xs font-black tracking-widest uppercase mb-6" style={{ color: primary }}>
                  Our Story
                </p>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}>
                  {company.name}
                </h2>
              </div>
              <div className="flex flex-col gap-6">
                <p className="text-base leading-relaxed" style={{ color: "#bbbbbb" }}>
                  {aboutPara1 || config.about_text}
                </p>
                {aboutPara2 && (
                  <p className="text-base leading-relaxed" style={{ color: "#888888" }}>
                    {aboutPara2}
                  </p>
                )}
                <Link href="/about" className="btn text-white mt-2"
                  style={{ backgroundColor: primary, borderColor: primary, alignSelf: "flex-start" }}>
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS — SINGLE COLUMN, LARGE QUOTES ── */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-3xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
              Client Stories
            </p>
            <h2 className="text-3xl md:text-4xl font-black mb-16"
              style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
              What Clients Say
            </h2>
            <div className="flex flex-col gap-16">
              {testimonials.map((t, i) => (
                <div key={t.name} className="flex flex-col gap-6"
                  style={{ paddingTop: i > 0 ? "64px" : 0, borderTop: i > 0 ? "1px solid #eeeeee" : "none" }}>
                  <div className="w-8 h-0.5" style={{ backgroundColor: primary }} />
                  <p className="text-xl md:text-2xl leading-relaxed italic"
                    style={{ color: "#222222", fontFamily: "var(--font-heading, inherit)" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div>
                    <p className="font-black text-sm tracking-wide uppercase" style={{ color: "#111111" }}>{t.name}</p>
                    <p className="text-xs mt-1" style={{ color: "#999999" }}>{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA — PHOTO (rhythm rule: CTA always gets photo) ── */}
      <section className="relative py-28 text-center overflow-hidden">
        {img(1) ? (
          <>
            <img src={img(1)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/72" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-2xl mx-auto px-8">
          <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            Ready to Get Started?
          </h2>
          <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
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
