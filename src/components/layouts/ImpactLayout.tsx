import Link from "next/link"
import { intentLabel, intentHref } from "@/types/company"
import ServiceIcon from "@/components/ServiceIcon"
import type { LayoutProps } from "@/types/layout"

export default function ImpactLayout({ company, imgs, gradient, heroImage, heroVideo }: LayoutProps) {
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
      {/* ── HERO ── */}
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
          <p className="text-xs font-black tracking-widest uppercase mb-6" style={{ color: primary }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-none mb-8 max-w-4xl text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {config?.hero_title || company.name}
          </h1>
          <p className="text-lg md:text-xl max-w-xl mb-12 leading-relaxed" style={{ color: "#cccccc" }}>
            {config?.hero_subtitle || `Welcome to ${company.name}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href={primaryHref} className="btn w-full sm:w-auto text-white"
              style={{ backgroundColor: primary, borderColor: primary }}>
              {primaryLabel}
            </Link>
            {secondaryLabel && secondaryHref && (
              <Link href={secondaryHref} className="btn w-full sm:w-auto text-white"
                style={{ borderColor: "rgba(255,255,255,0.35)" }}>
                {secondaryLabel}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── SERVICES TEASER ── */}
      {services.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-6xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>What We Do</p>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16">
              <h2 className="text-4xl md:text-5xl font-black" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                Our Services
              </h2>
              <Link href="/services" className="text-sm font-black uppercase tracking-widest shrink-0 hover:opacity-70 transition-opacity"
                style={{ color: primary }}>
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {services.slice(0, 3).map((service) => (
                <div key={service.name} className="bg-white p-8 border-l-4"
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
      {config?.about_text && (
        <section className="relative py-28 overflow-hidden">
          {img(1) ? (
            <>
              <img src={img(1)!} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/75" />
            </>
          ) : (
            <div className="absolute inset-0" style={{ backgroundColor: "#111111" }} />
          )}
          <div className="relative z-10 max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
                <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>Who We Are</p>
                <h2 className="text-3xl md:text-4xl font-black text-white leading-tight"
                  style={{ fontFamily: "var(--font-heading, inherit)" }}>
                  {company.name}
                </h2>
                {config?.tagline && (
                  <p className="text-lg font-black mt-5 leading-snug" style={{ color: primary }}>
                    {config.tagline}
                  </p>
                )}
              </div>
              <div>
                <p className="text-lg leading-relaxed mb-8" style={{ color: "#cccccc" }}>{config.about_text}</p>
                <Link href="/about" className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>
                  Our Story
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── TESTIMONIALS ── */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: primary }}>Client Stories</p>
            <h2 className="text-4xl md:text-5xl font-black mb-16" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
              What Clients Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {testimonials.map((t) => (
                <div key={t.name} className="p-10 border-t-4" style={{
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
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="relative py-28 text-center overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/72" />}
        <div className="relative z-10 max-w-2xl mx-auto px-8">
          <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6" style={{ fontFamily: "var(--font-heading, inherit)" }}>
            Ready to Get Started?
          </h2>
          <p className="mb-10 text-lg" style={{ color: "#cccccc" }}>
            {company.phone && (
              <>Call us at <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="font-bold text-white hover:underline">{company.phone}</a> or{" "}</>
            )}
            send us a message and we&apos;ll be in touch.
          </p>
          <Link href={primaryHref} className="btn text-white" style={{ backgroundColor: primary, borderColor: primary }}>
            {primaryLabel}
          </Link>
        </div>
      </section>
    </>
  )
}
