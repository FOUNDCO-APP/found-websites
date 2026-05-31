import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `About Us | ${company.name}` : "About Us" }
}

export default async function AboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const config = company.website_config
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const serviceAreas = config?.service_areas || []
  const services = config?.services || []

  return (
    <>
      {/* ── HEADER ── */}
      <section className="py-28 text-white" style={{ background: gradient }}>
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>
            {company.city ? `${company.city}'s Own` : "Local & Independent"}
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-none mb-8 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            About {company.name}
          </h1>
          {company.city && (
            <p className="text-lg" style={{ color: "#888888" }}>
              Locally owned and operated in {company.city}{company.state ? `, ${company.state}` : ""}.
            </p>
          )}
        </div>
      </section>

      {/* ── ABOUT TEXT ── */}
      {config?.about_text && (
        <section className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
              <div>
                <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
                <p className="text-xs font-black tracking-widest uppercase mb-6" style={{ color: primary }}>
                  Our Story
                </p>
                <p className="text-xl md:text-2xl font-black leading-snug mb-0"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  We&apos;re not a national chain.<br />We&apos;re your neighbors.
                </p>
              </div>
              <div className="flex flex-col gap-8">
                <p className="text-lg leading-relaxed" style={{ color: "#444444" }}>
                  {config.about_text}
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href={ctaHref} className="btn text-white"
                    style={{ backgroundColor: primary, borderColor: primary }}>
                    {intentLabel[company.primary_intent] || "Get in Touch"}
                  </Link>
                  <Link href="/services" className="btn"
                    style={{ borderColor: primary, color: primary }}>
                    Our Services
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── VALUES STRIP ── */}
      <section className="py-20" style={{ backgroundColor: "#f7f7f7" }}>
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { label: "Locally Owned", body: `Based right here in ${company.city || "your community"} — not a franchise, not a call center.` },
              { label: "Quality First", body: "We stand behind every job. If something isn't right, we make it right." },
              { label: "Free Estimates", body: "No pressure. No surprises. Get a clear quote before any work begins." },
            ].map((v) => (
              <div key={v.label} className="flex flex-col gap-3">
                <div className="w-8 h-0.5" style={{ backgroundColor: primary }} />
                <h3 className="font-black text-lg" style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {v.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICE AREAS ── */}
      {serviceAreas.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-8">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
              Where We Work
            </p>
            <h2 className="text-3xl md:text-4xl font-black mb-10"
              style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
              Service Areas
            </h2>
            <div className="flex flex-wrap gap-3">
              {serviceAreas.map((area) => (
                <span key={area}
                  className="px-5 py-2 text-sm font-black uppercase tracking-wide"
                  style={{
                    backgroundColor: "#f7f7f7",
                    color: "#111111",
                    borderRadius: "var(--button-radius, 6px)",
                    border: `1.5px solid #e0e0e0`,
                  }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES PREVIEW ── */}
      {services.length > 0 && (
        <section className="py-20" style={{ backgroundColor: "#111111" }}>
          <div className="max-w-6xl mx-auto px-8">
            <div className="w-12 h-1 mb-8" style={{ backgroundColor: primary }} />
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-white"
                style={{ fontFamily: "var(--font-heading, inherit)" }}>
                What We Do
              </h2>
              <Link href="/services"
                className="text-sm font-black uppercase tracking-widest hover:opacity-70 transition-opacity shrink-0"
                style={{ color: primary }}>
                All Services →
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {services.map((s) => (
                <span key={s.name}
                  className="px-5 py-2 text-sm font-black uppercase tracking-wide"
                  style={{
                    border: `1.5px solid rgba(255,255,255,0.15)`,
                    color: "#cccccc",
                    borderRadius: "var(--button-radius, 6px)",
                  }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="py-28 text-center bg-white">
        <div className="max-w-2xl mx-auto px-8">
          <div className="w-12 h-1 mx-auto mb-10" style={{ backgroundColor: primary }} />
          <h2 className="text-4xl md:text-5xl font-black mb-6"
            style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
            Ready to Get Started?
          </h2>
          <p className="mb-10 text-lg" style={{ color: "#888888" }}>
            {company.phone && (
              <>Call us at <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                className="font-bold hover:underline" style={{ color: "#111111" }}>{company.phone}</a> or{" "}</>
            )}
            send us a message and we&apos;ll be in touch.
          </p>
          <Link href={ctaHref} className="btn text-white"
            style={{ backgroundColor: primary, borderColor: primary }}>
            {intentLabel[company.primary_intent] || "Get in Touch"}
          </Link>
        </div>
      </section>
    </>
  )
}
