import { polishBusinessName } from "@/lib/copyPolish"
import type { Company } from "@/types/company"

export type PublicLocation = {
  id: string
  name: string
  address: string | null
  phone: string | null
  hours: string | null
}

function mapsUrl(address: string) {
  return `https://maps.apple.com/?q=${encodeURIComponent(address)}`
}

export default function FindUsSection({
  company,
  locations,
  primary,
}: {
  company: Company
  locations: PublicLocation[]
  primary: string
}) {
  const primaryCity = [company.city, company.state].filter(Boolean).join(", ")
  const displayName = polishBusinessName(company.name)

  return (
    <section style={{ padding: "80px 24px", backgroundColor: "#0a0c0b" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.6875rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: primary }}>
          Find Us
        </p>
        <h2 style={{ margin: "0 0 36px", fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 900, color: "white", lineHeight: 1.05 }}>
          {locations.length > 1 ? "Our Locations" : "Our Locations"}
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(locations.length + 1, 3)}, 1fr)`,
          gap: 16,
        }}>
          {/* Primary location card */}
          <div style={{
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: "rgba(255,255,255,0.04)",
            padding: "24px 22px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${primary}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p style={{ margin: 0, fontSize: "0.625rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: `rgba(255,255,255,0.35)` }}>
                Main Location
              </p>
            </div>
            <p style={{ margin: 0, fontSize: "1.0625rem", fontWeight: 700, color: "white" }}>{displayName}</p>
            {primaryCity && (
              <p style={{ margin: 0, fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>{primaryCity}</p>
            )}
            {company.phone && (
              <a href={`tel:${company.phone.replace(/\D/g, "")}`} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 700, color: primary, textDecoration: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.95 1.2 2 2 0 012.95.02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                Call
              </a>
            )}
          </div>

          {/* Additional location cards */}
          {locations.map(loc => (
            <div key={loc.id} style={{
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
              padding: "24px 22px",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${primary}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: "0.625rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: `rgba(255,255,255,0.35)` }}>
                  {loc.name}
                </p>
              </div>
              {loc.address && (
                <a href={mapsUrl(loc.address)} target="_blank" rel="noopener noreferrer" style={{ margin: 0, fontSize: "0.875rem", color: "rgba(255,255,255,0.55)", textDecoration: "none", lineHeight: 1.4 }}>
                  {loc.address}
                </a>
              )}
              {loc.hours && (
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.45 }}>{loc.hours}</p>
              )}
              {loc.phone && (
                <a href={`tel:${loc.phone.replace(/\D/g, "")}`} style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 700, color: primary, textDecoration: "none" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.95 1.2 2 2 0 012.95.02h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.29 6.29l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  Call
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
