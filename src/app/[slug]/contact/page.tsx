import { notFound } from "next/navigation"
import Link from "next/link"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel } from "@/types/company"

export default async function ContactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color

  return (
    <>
      <section className="py-20 text-white" style={{ backgroundColor: "#111111" }}>
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: primary }}>Get In Touch</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Contact Us</h1>
          <p className="text-gray-400 text-lg">We&apos;d love to hear from you.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div className="space-y-8">
              {company.phone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}22`, color: primary }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Phone</p>
                    <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="text-xl font-bold hover:underline" style={{ color: "#111111" }}>
                      {company.phone}
                    </a>
                  </div>
                </div>
              )}
              {company.email && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}22`, color: primary }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Email</p>
                    <a href={`mailto:${company.email}`} className="text-xl font-bold hover:underline" style={{ color: "#111111" }}>
                      {company.email}
                    </a>
                  </div>
                </div>
              )}
              {company.city && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${primary}22`, color: primary }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Location</p>
                    <p className="text-xl font-bold" style={{ color: "#111111" }}>
                      {company.city}{company.state ? `, ${company.state}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-10 text-white" style={{ backgroundColor: primary }}>
              <h2 className="text-2xl font-black mb-3">{intentLabel[company.primary_intent] || "Get in Touch"}</h2>
              <p className="mb-8 opacity-90 leading-relaxed">
                Fill out our quick form and we&apos;ll be in touch within one business day.
              </p>
              <Link
                href="/estimate"
                className="inline-block font-bold bg-white px-8 py-4 rounded-full"
                style={{ color: primary }}
              >
                {intentLabel[company.primary_intent] || "Send a Message"}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
