import Link from "next/link"
import type { Company } from "@/types/company"
import { getFeaturedUpdatePublicCopy } from "@/lib/featuredUpdate"

type Props = {
  company: Company
  image?: string | null
}

const TARGETS = new Set(["/", "/contact", "/shop", "/menu", "/services", "/reserve", "/estimate", "/gallery"])

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

  const nearbyCopy = [
    config.hero_title,
    config.hero_subtitle,
    config.about_preview,
    config.about_text,
    "From the shop",
    "A closer look at what they carry",
    "From the menu",
    "A taste of what is ready",
  ]
  const copy = getFeaturedUpdatePublicCopy(company, nearbyCopy)
  if (!copy && !image) return null

  const title = copy?.title
  const body = copy?.body
  const label = copy?.label
  const href = safeHref(copy?.href, "/contact")
  if (!title || !body || !label) return null
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
              {copy?.eyebrow}
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