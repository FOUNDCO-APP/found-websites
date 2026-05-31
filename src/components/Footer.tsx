import Link from "next/link"
import type { Company } from "@/types/company"
import { intentLabel, intentHref } from "@/types/company"

export default function Footer({ company }: { company: Company }) {
  const primary = company.primary_color
  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  return (
    <footer className="text-white" style={{ backgroundColor: "#111111" }}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="mb-4">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-10 w-auto" />
              ) : (
                <span
                  className="font-black text-xl tracking-tight"
                  style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}
                >
                  {company.name}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {company.city}{company.state ? `, ${company.state}` : ""}
              {company.city ? " — " : ""}
              Licensed, insured, and accountable.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-sm tracking-widest uppercase mb-4 text-gray-300">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/services" className="hover:text-white transition-colors">Services</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-sm tracking-widest uppercase mb-4 text-gray-300">Contact</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              {company.phone && (
                <li>
                  <a href={`tel:${company.phone.replace(/\D/g, "")}`} className="hover:text-white transition-colors">
                    {company.phone}
                  </a>
                </li>
              )}
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`} className="hover:text-white transition-colors">
                    {company.email}
                  </a>
                </li>
              )}
              {company.city && (
                <li>{company.city}{company.state ? `, ${company.state}` : ""}</li>
              )}
              <li>
                <Link
                  href={ctaHref}
                  className="inline-block mt-2 font-black text-white px-5 py-2 text-xs tracking-wide uppercase"
                  style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}
                >
                  {ctaLabel}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          <p>Built with <a href="https://foundco.app" target="_blank" rel="noopener noreferrer" style={{ color: "#666666", textDecoration: "none" }}>Found</a></p>
        </div>
      </div>
    </footer>
  )
}
