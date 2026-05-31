import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel, intentHref } from "@/types/company"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import ServiceIcon from "@/components/ServiceIcon"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Services | ${company.name}` : "Services" }
}

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const config = company.website_config
  const services = config?.services || []
  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)
  const heroImage = config?.hero_image_url || img(0)

  return (
    <>
      {/* ── HEADER ── */}
      <section className="relative min-h-[50vh] flex items-center overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/70" />}
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-20 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: primary }}>
            What We Do
          </p>
          <h1 className="text-5xl md:text-7xl font-black text-white leading-none mb-6 text-balance"
            style={{ fontFamily: "var(--font-heading, inherit)" }}>
            Our Services
          </h1>
          <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>
            Every job handled by our own team — no subcontractors, no surprises.
          </p>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      {services.length > 0 && (
        <section className="py-24" style={{ backgroundColor: "#f7f7f7" }}>
          <div className="max-w-6xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <div key={service.name}
                  className="bg-white p-10 border-l-4 flex gap-7 items-start"
                  style={{
                    borderColor: primary,
                    borderRadius: `0 var(--card-radius, 10px) var(--card-radius, 10px) 0`,
                    boxShadow: "var(--card-shadow, 0 2px 8px rgba(0,0,0,0.08))",
                  }}>
                  <div className="shrink-0 mt-1">
                    <ServiceIcon serviceName={service.name} color={primary} size={28} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl mb-3"
                      style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                      {service.name}
                    </h2>
                    <p className="text-base leading-relaxed" style={{ color: "#555555" }}>
                      {service.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: primary }}>
            The Process
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-16"
            style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", title: "Free Estimate", body: "Tell us what you need. We come out, take a look, and give you a clear, honest quote — no pressure." },
              { step: "02", title: "We Get to Work", body: "Our own crew shows up on time, keeps the job site clean, and communicates with you every step of the way." },
              { step: "03", title: "You Love the Result", body: "We don't consider the job done until you're satisfied. Quality you can see, craftsmanship that lasts." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-5">
                <span className="text-5xl font-black leading-none"
                  style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}>
                  {item.step}
                </span>
                <div className="w-8 h-0.5" style={{ backgroundColor: primary }} />
                <h3 className="font-black text-xl"
                  style={{ color: "#111111", fontFamily: "var(--font-heading, inherit)" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#776F6F" }}>
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-28 overflow-hidden">
        {heroImage ? (
          <img src={heroImage} alt={company.name}
            className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        {heroImage && <div className="absolute inset-0 bg-black/72" />}
        <div className="relative z-10 max-w-2xl mx-auto px-8 text-center">
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
          <Link href={ctaHref} className="btn text-white"
            style={{ backgroundColor: primary, borderColor: primary }}>
            {intentLabel[company.primary_intent] || "Get a Free Estimate"}
          </Link>
        </div>
      </section>
    </>
  )
}
