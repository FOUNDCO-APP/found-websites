import Link from "next/link"
import type { Company } from "@/types/company"

type Props = {
  company: Company
  image?: string | null
}

const TARGETS = new Set(["/", "/contact", "/shop", "/menu", "/services", "/reserve", "/estimate", "/gallery"])

function defaultAnnouncement(company: Company) {
  const industry = company.industry_category
  const sub = (company.sub_industry || "").toLowerCase()
  if (industry === "food" || industry === "home_based_food") {
    return { title: "Fresh today.", body: "See what is ready to order, reserve, or ask about right now.", label: "View menu", href: "/menu" }
  }
  if (industry === "retail" || sub.includes("bike")) {
    return { title: "Back-to-school ready.", body: "New gear, tune-ups, and local help are ready before the season starts.", label: "See what is new", href: "/shop" }
  }
  if (industry === "home_services") {
    return { title: "Now booking.", body: "Request the work you need and get a clear next step from the team.", label: "Request an estimate", href: "/estimate" }
  }
  if (industry === "nonprofit") {
    return { title: "Join what is happening.", body: "See the next way to connect, serve, or get involved.", label: "Get involved", href: "/services" }
  }
  return { title: "Something new is ready.", body: "See the latest update and take the next step.", label: "Learn more", href: "/contact" }
}

function safeHref(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback
  const href = value.trim()
  if (TARGETS.has(href)) return href
  if (/^\/[a-z0-9/_#?-]+$/i.test(href)) return href
  return fallback
}

export default function SiteAnnouncement({ company, image }: Props) {
  const config = company.website_config
  if (!config?.announcement_enabled) return null

  const fallback = defaultAnnouncement(company)
  const title = config.announcement_title?.trim() || fallback.title
  const body = config.announcement_body?.trim() || fallback.body
  const label = config.announcement_cta_label?.trim() || fallback.label
  const href = safeHref(config.announcement_cta_href, fallback.href)
  const style = config.announcement_style || "default"
  const imageUrl = style === "image" && image ? image : null
  const isLight = style === "light"
  const isAccent = style === "accent"
  const primary = company.primary_color

  return (
    <section className="py-8 md:py-12" style={{ backgroundColor: isLight ? "#ffffff" : "#0b0d0c" }}>
      <div className="max-w-6xl mx-auto px-8">
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: 28,
            background: imageUrl
              ? "#111111"
              : isAccent
                ? `linear-gradient(135deg, ${primary} 0%, #101412 82%)`
                : isLight
                  ? "#f7f7f5"
                  : "linear-gradient(135deg, #151918 0%, #080a09 100%)",
            border: isLight ? "1px solid #e6e6e1" : "1px solid rgba(255,255,255,0.12)",
            boxShadow: isLight ? "0 18px 50px rgba(0,0,0,0.08)" : "0 24px 70px rgba(0,0,0,0.28)",
          }}
        >
          {imageUrl && (
            <>
              <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/58" />
            </>
          )}
          <div className="relative z-10 grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-end md:p-12">
            <div>
              <p
                className="mb-4 text-xs font-black uppercase tracking-[0.24em]"
                style={{ color: isLight ? primary : isAccent ? "rgba(255,255,255,0.76)" : primary }}
              >
                Announcement
              </p>
              <h2
                className="text-3xl md:text-5xl font-black leading-tight text-balance"
                style={{ color: isLight ? "#111111" : "#ffffff", fontFamily: "var(--font-heading, inherit)" }}
              >
                {title}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: isLight ? "#575757" : "rgba(255,255,255,0.74)" }}>
                {body}
              </p>
            </div>
            <Link
              href={href}
              className="btn inline-flex w-full justify-center md:w-auto"
              style={{
                backgroundColor: isLight ? primary : "#ffffff",
                borderColor: isLight ? primary : "#ffffff",
                color: isLight ? "#ffffff" : "#111111",
              }}
            >
              {label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}