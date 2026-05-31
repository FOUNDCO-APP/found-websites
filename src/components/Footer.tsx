import Link from "next/link"
import type { Company } from "@/types/company"
import { intentLabel, intentHref } from "@/types/company"

function BrandMark({ name, primary }: { name: string; primary: string }) {
  const words = name.trim().split(" ")
  const first = words[0].toUpperCase()
  const rest = words.slice(1).join(" ").toUpperCase()
  return (
    <div style={{ lineHeight: 1 }}>
      <div className="font-black text-lg leading-none" style={{ color: primary, fontFamily: "var(--font-heading, inherit)" }}>
        {first}
      </div>
      {rest && (
        <div className="font-bold text-xs leading-none mt-0.5" style={{ color: primary, letterSpacing: "0.25em", opacity: 0.85 }}>
          {rest}
        </div>
      )}
    </div>
  )
}

const socialIcons: Record<string, { label: string; path: string }> = {
  instagram: {
    label: "Instagram",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
  },
  facebook: {
    label: "Facebook",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  tiktok: {
    label: "TikTok",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
  linkedin: {
    label: "LinkedIn",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
}

export default function Footer({ company }: { company: Company }) {
  const primary = company.primary_color
  const ctaLabel = intentLabel[company.primary_intent] || "Contact Us"
  const ctaHref = company.primary_intent === "call"
    ? `tel:${company.phone?.replace(/\D/g, "")}`
    : intentHref[company.primary_intent] || "/contact"

  const socialLinks = (company.website_config?.social_links || {}) as Record<string, string>
  const activeSocials = Object.entries(socialLinks).filter(([, url]) => url)

  return (
    <footer className="text-white" style={{ backgroundColor: "#111111", borderTop: `1px solid ${primary}` }}>
      <div className="max-w-6xl mx-auto px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div>
            <div className="mb-5">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="h-10 w-auto" />
              ) : (
                <BrandMark name={company.name} primary={primary} />
              )}
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#888888" }}>
              {company.city}{company.state ? `, ${company.state}` : ""}
              {company.city ? " — " : ""}
              Licensed, insured, and accountable.
            </p>
            {activeSocials.length > 0 && (
              <div className="flex gap-4">
                {activeSocials.map(([platform, url]) => {
                  const icon = socialIcons[platform]
                  if (!icon) return null
                  return (
                    <a key={platform} href={url} target="_blank" rel="noopener noreferrer"
                      aria-label={icon.label}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: "#888888" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d={icon.path} />
                      </svg>
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#555555" }}>Quick Links</h3>
            <ul className="space-y-3 text-sm" style={{ color: "#888888" }}>
              {["Home", "About Us", "Services", "Gallery", "Contact"].map((item) => (
                <li key={item}>
                  <Link href={item === "Home" ? "/" : `/${item.toLowerCase().replace(" ", "")}`}
                    className="hover:text-white transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#555555" }}>Contact</h3>
            <ul className="space-y-3 text-sm" style={{ color: "#888888" }}>
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
              <li className="pt-2">
                <Link href={ctaHref}
                  className="inline-block font-black text-white px-5 py-2 text-xs tracking-widest uppercase"
                  style={{ backgroundColor: primary, borderRadius: "var(--button-radius, 6px)" }}>
                  {ctaLabel}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-2 text-xs" style={{ color: "#555555" }}>
          <p>© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
          <p>Built with <a href="https://foundco.app" target="_blank" rel="noopener noreferrer"
            className="hover:text-white transition-colors" style={{ color: "#666666" }}>Found</a></p>
        </div>
      </div>
    </footer>
  )
}
