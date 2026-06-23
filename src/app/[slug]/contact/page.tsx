import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { heroGradient } from "@/lib/color"
import { getStockImages, pickImg } from "@/lib/stockImages"
import ContactForm from "./ContactForm"
import { getSiteCopy } from "@/lib/siteCopy"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { getCompanyBySlug, getCompanyByDomain } = await import("@/lib/company")
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  return { title: company ? `Contact | ${company.name}` : "Contact" }
}

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const gradient = heroGradient(primary)
  const imgs = await getStockImages(company)
  const img = (i: number) => pickImg(imgs, i)
  const copy = getSiteCopy(company.primary_intent, {
    name: company.name,
    city: company.city ?? undefined,
    subIndustry: company.sub_industry,
    industryCategory: company.industry_category,
    services: company.website_config?.services,
  })

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
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: "#ffffff" }}>Get In Touch</p>
          <h1 className="text-5xl md:text-6xl font-black mb-5 text-white" style={{ fontFamily: "var(--font-heading, inherit)" }}>Contact Us</h1>
          <p className="text-lg max-w-xl" style={{ color: "#cccccc" }}>We&apos;d love to hear from you.</p>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">

            {/* Left — contact info */}
            <div className="space-y-8">
              {company.phone && company.phone_visible !== false && (
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primary}18`, borderRadius: "var(--card-radius, 10px)" }}>
                    <svg className="w-5 h-5" fill="none" stroke={primary} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "#888888" }}>Phone</p>
                    <a href={`tel:${company.phone.replace(/\D/g, "")}`}
                      className="text-xl font-black hover:underline" style={{ color: "#111111" }}>
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}
              {company.email && company.email_visible !== false && (
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primary}18`, borderRadius: "var(--card-radius, 10px)" }}>
                    <svg className="w-5 h-5" fill="none" stroke={primary} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "#888888" }}>Email</p>
                    <a href={`mailto:${company.email}`}
                      className="text-xl font-black hover:underline" style={{ color: "#111111" }}>
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              {company.city && (
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primary}18`, borderRadius: "var(--card-radius, 10px)" }}>
                    <svg className="w-5 h-5" fill="none" stroke={primary} viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: "#888888" }}>Location</p>
                    <p className="text-xl font-black" style={{ color: "#111111" }}>
                      {company.city}{company.state ? `, ${company.state}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Nudge toward primary action — only shown when intent has a dedicated page */}
              {copy.nudgeText && copy.nudgeLabel && copy.nudgeHref && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-3">{copy.nudgeText}</p>
                  <a href={copy.nudgeHref}
                    className="inline-flex items-center gap-2 text-sm font-bold hover:underline"
                    style={{ color: primary }}>
                    {copy.nudgeLabel}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </div>

            {/* Right — contact form */}
            <div className="border border-gray-100 p-8 shadow-sm" style={{ borderRadius: "var(--card-radius, 10px)" }}>
              <h2 className="text-xl font-black mb-1" style={{ color: "#111111" }}>Send us a message</h2>
              <p className="text-sm text-gray-400 mb-6">We&apos;ll get back to you as soon as possible.</p>
              <ContactForm companyId={company.id} primaryColor={primary} />
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
