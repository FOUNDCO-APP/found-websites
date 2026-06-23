import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel } from "@/types/company"
import EstimateForm from "./EstimateForm"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import type { Metadata } from "next"

const formHeadlineMap: Record<string, string> = {
  estimates: "Tell us about your project",
  bookings: "Tell us about your booking",
  appointments: "Tell us about your appointment",
  orders: "Tell us about your order",
  inquiries: "Tell us about your needs",
  leads: "Tell us about your needs",
}

const heroSubMap: Record<string, string> = {
  estimates: "Tell us about your project and we'll be in touch within one business day.",
  bookings: "Fill out the form and we'll confirm your booking within one business day.",
  appointments: "Fill out the form and we'll confirm your appointment within one business day.",
  orders: "Fill out the form and we'll follow up within one business day.",
  inquiries: "Tell us about your needs and we'll be in touch within one business day.",
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Get a Free Estimate | ${company.name}` : "Get an Estimate" }
}

export default async function EstimatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const services = company.website_config?.services || []
  const testimonials = (company.website_config?.testimonials ?? []).slice(0, 2)
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)

  return (
    <>
      <section className="relative min-h-[45vh] flex items-center overflow-hidden">
        {img(0) ? (
          <>
            <img src={img(0)!} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/70" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: gradient }} />
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-8 py-16 w-full">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: "#ffffff" }}>No Obligation</p>
          <h1 className="text-5xl md:text-6xl font-black mb-5 text-white" style={{ fontFamily: "var(--font-heading, inherit)" }}>
            {intentLabel[company.primary_intent] || "Get in Touch"}
          </h1>
          <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>
            {heroSubMap[company.primary_intent] ?? "Tell us about your needs and we'll be in touch within one business day."}
          </p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">

            {/* Form */}
            <div className="lg:col-span-2 border border-gray-100 p-8 shadow-sm" style={{ borderRadius: "var(--card-radius, 10px)" }}>
              <h2 className="text-xl font-black mb-6" style={{ color: "#111111" }}>{formHeadlineMap[company.primary_intent] ?? "Tell us about your needs"}</h2>
              <EstimateForm
                companyId={company.id}
                services={services}
                primaryColor={primary}
                industryCategory={company.industry_category ?? ""}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Phone */}
              {company.phone && company.phone_visible !== false && (
                <div>
                  <h3 className="text-base font-bold mb-3" style={{ color: "#111111" }}>Prefer to call?</h3>
                  <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                    className="btn inline-flex items-center gap-2"
                    style={{ borderColor: primary, color: primary }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call for a Quote
                  </a>
                </div>
              )}

              {/* What to expect */}
              <div className="p-6" style={{ backgroundColor: "#f9f9f9", borderRadius: "var(--card-radius, 10px)" }}>
                <p className="text-sm font-semibold mb-3" style={{ color: primary }}>What to expect</p>
                <ul className="space-y-2">
                  {[
                    "Response within 1 business day — usually same day",
                    "Free estimate, no obligation",
                    "No pressure, no sales tactics",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke={primary} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Testimonials — only if they exist */}
              {testimonials.length > 0 && (
                <div className="space-y-4">
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: primary }}>
                    What customers say
                  </p>
                  {testimonials.map((t, i) => (
                    <div key={i} className="p-5" style={{ backgroundColor: "#fafafa", borderRadius: "var(--card-radius, 10px)", borderLeft: `3px solid ${primary}` }}>
                      <p className="text-sm text-gray-700 leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                      <p className="text-xs font-bold" style={{ color: "#111111" }}>{t.name}</p>
                      {t.role && <p className="text-xs text-gray-400">{t.role}</p>}
                    </div>
                  ))}
                </div>
              )}

              {/* Trust badge — shown when no testimonials */}
              {testimonials.length === 0 && (
                <div className="flex items-center gap-3 p-4" style={{ backgroundColor: "#f9f9f9", borderRadius: "var(--card-radius, 10px)" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}18` }}>
                    <svg className="w-5 h-5" fill="none" stroke={primary} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#111111" }}>{company.name}</p>
                    <p className="text-xs text-gray-500">Locally owned &amp; operated</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
