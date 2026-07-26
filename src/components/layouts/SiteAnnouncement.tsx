import Link from "next/link"
import type { Company } from "@/types/company"

type Props = {
  company: Company
  image?: string | null
}

const TARGETS = new Set(["/", "/contact", "/shop", "/menu", "/services", "/reserve", "/estimate", "/gallery"])

type FeaturedUpdate = { eyebrow: string; title: string; body: string; label: string; href: string }

function featuredUpdateDefault(company: Company): FeaturedUpdate {
  const industry = company.industry_category
  const sub = (company.sub_industry || "").toLowerCase()

  if (industry === "food" || industry === "home_based_food") {
    return { eyebrow: "Today from the kitchen", title: "Fresh today.", body: "See what is ready to order, reserve, or ask about right now.", label: "View menu", href: "/menu" }
  }
  if (sub.includes("bike")) {
    return { eyebrow: "Bike shop update", title: "Back-to-school ready.", body: "New gear, tune-ups, and local help are ready before the season starts.", label: "See what is new", href: "/shop" }
  }
  if (industry === "retail" || industry === "makers_crafts") {
    return { eyebrow: "New in the shop", title: "New in the shop.", body: "A current drop, sale, or product update is ready to explore.", label: "Shop now", href: "/shop" }
  }
  if (industry === "home_services") {
    return { eyebrow: "Now booking", title: "Schedule before the season fills.", body: "Request the work you need and get a clear next step from the team.", label: "Request an estimate", href: "/estimate" }
  }
  if (industry === "nonprofit") {
    return { eyebrow: "This week", title: "Join what is happening.", body: "See the next way to connect, serve, or get involved.", label: "Get involved", href: "/services" }
  }
  if (industry === "events") {
    return { eyebrow: "Dates are filling", title: "Plan the next event.", body: "Ask about availability, details, and the right next step.", label: "Request a quote", href: "/contact" }
  }
  return { eyebrow: "Featured update", title: "Worth knowing now.", body: "A current offer, event, or next step is ready for customers.", label: "Learn more", href: "/contact" }
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

  const hasOwnerContent = Boolean(config.announcement_title?.trim() || config.announcement_body?.trim() || config.announcement_cta_label?.trim() || image)
  if (!hasOwnerContent) return null

  const fallback = featuredUpdateDefault(company)
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
    <section className="relative overflow-hidden py-12 md:py-20" style={{ backgroundColor: isLight ? "#f7f7f4" : "#0b0d0c" }}>
      {imageUrl && (
        <>
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-black/62" />
        </>
      )}
      {!imageUrl && !isLight && (
        <div
          className="absolute inset-0 opacity-80"
          style={{ background: isAccent ? `radial-gradient(circle at 20% 15%, ${primary}4d, transparent 36%), linear-gradient(135deg, #111715 0%, #050706 100%)` : "linear-gradient(135deg, #111514 0%, #050706 100%)" }}
        />
      )}
      <div className="relative z-10 mx-auto max-w-6xl px-8">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-3xl">
            <p
              className="mb-4 text-xs font-black uppercase tracking-[0.24em]"
              style={{ color: isLight ? primary : isAccent ? "rgba(255,255,255,0.78)" : primary }}
            >
              {fallback.eyebrow}
            </p>
            <h2
              className="text-4xl font-black leading-[0.98] text-balance md:text-6xl"
              style={{ color: isLight ? "#111111" : "#ffffff", fontFamily: "var(--font-heading, inherit)" }}
            >
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed md:text-xl" style={{ color: isLight ? "#555555" : "rgba(255,255,255,0.74)" }}>
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
              boxShadow: isLight ? "0 18px 44px rgba(0,0,0,0.12)" : "0 18px 44px rgba(0,0,0,0.32)",
            }}
          >
            {label}
          </Link>
        </div>
      </div>
    </section>
  )
}