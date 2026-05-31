import { notFound } from "next/navigation"
import { getCompanyBySlug, getCompanyByDomain } from "@/lib/company"
import { intentLabel } from "@/types/company"
import EstimateForm from "./EstimateForm"

export default async function EstimatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = slug.startsWith("__domain__")
    ? await getCompanyByDomain(slug.replace("__domain__", ""))
    : await getCompanyBySlug(slug)
  if (!company) notFound()

  const primary = company.primary_color
  const services = company.website_config?.services || []

  return (
    <>
      <section className="py-20 text-white" style={{ backgroundColor: "#111111" }}>
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: primary }}>No Obligation</p>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{intentLabel[company.primary_intent] || "Get in Touch"}</h1>
          <p className="text-gray-400 text-lg max-w-xl">Tell us about your project and we&apos;ll be in touch within one business day.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 items-start">
            <div className="lg:col-span-2 border border-gray-100 p-8 shadow-sm" style={{ borderRadius: "var(--card-radius, 10px)" }}>
              <h2 className="text-xl font-black mb-6" style={{ color: "#111111" }}>Tell us about your project</h2>
              <EstimateForm companyId={company.id} services={services} primaryColor={primary} />
            </div>

            <div className="space-y-8">
              {company.phone && (
                <div>
                  <h3 className="text-base font-bold mb-2" style={{ color: "#111111" }}>Prefer to call?</h3>
                  <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="text-2xl font-black hover:underline block mb-1" style={{ color: primary }}>
                    {company.phone}
                  </a>
                </div>
              )}
              <div className="p-6" style={{ backgroundColor: "#f9f9f9", borderRadius: "var(--card-radius, 10px)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: primary }}>What to expect</p>
                <ul className="mt-3 space-y-2">
                  {["We respond within 1 business day", "No obligation, no pressure", "Free consultation"].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke={primary} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
