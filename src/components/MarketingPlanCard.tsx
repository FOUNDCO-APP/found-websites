"use client"

import Link from "next/link"
import type { FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type MarketingPlanCardProps = {
  planKey: FoundPlanKey
  name: string
  headline: string
  price: string
  normalPrice: string
  featured?: boolean
  selected?: boolean
  intro?: boolean
  bullets?: string[]
  ctaLabel?: string
  href?: string
  showCta?: boolean
  onSelect?: (plan: FoundPlanKey) => void
  onCta?: (plan: FoundPlanKey) => void
  className?: string
}

function CheckIcon() {
  return (
    <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SIGNAL_GREEN} strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function MarketingPlanCard({
  planKey,
  name,
  headline,
  price,
  normalPrice,
  featured = false,
  selected = false,
  intro = false,
  bullets = [],
  ctaLabel = "Get my site",
  href,
  showCta = true,
  onSelect,
  onCta,
  className = "",
}: MarketingPlanCardProps) {
  const cardStyle = {
    backgroundColor: featured ? "rgba(50,208,116,0.06)" : "rgba(255,255,255,0.03)",
    border: selected
      ? `2px solid ${SIGNAL_GREEN}`
      : featured
        ? "2px solid rgba(50,208,116,0.3)"
        : "2px solid rgba(255,255,255,0.07)",
    transform: featured ? "scale(1.02)" : "scale(1)",
    boxShadow: featured ? "inset 0 0 80px rgba(50,208,116,0.05)" : "none",
  }

  const ctaClassName = "block w-full rounded-full py-4 text-center text-xs font-black uppercase tracking-widest transition hover:opacity-90"
  const ctaStyle = { backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(planKey)}
      onKeyDown={(event) => {
        if (!onSelect) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(planKey)
        }
      }}
      className={`relative rounded-2xl p-10 transition-all ${onSelect ? "cursor-pointer" : ""} ${className}`}
      style={cardStyle}
    >
      {featured && (
        <span
          className="mb-4 inline-block rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest"
          style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
        >
          Recommended
        </span>
      )}

      <p className="mb-1 text-base font-black text-white">{headline}</p>
      <p className="mb-3 text-xs font-black uppercase tracking-widest" style={{ color: featured ? SIGNAL_GREEN : "rgba(255,255,255,0.4)" }}>
        {name}
      </p>

      <div className="mb-8">
        {intro && (
          <p className="text-sm font-medium line-through" style={{ color: "rgba(255,255,255,0.25)" }}>
            {normalPrice}/month
          </p>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-light text-white">{price}</span>
          <span className="text-sm font-medium text-white/40">/month</span>
        </div>
        {intro && (
          <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: SIGNAL_GREEN }}>
            Intro rate
          </p>
        )}
      </div>

      {bullets.length > 0 && (
        <ul className="mb-10 space-y-3">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2.5 text-sm text-white/70">
              <CheckIcon />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {showCta && (href ? (
        <Link href={href} className={ctaClassName} style={ctaStyle}>
          {ctaLabel}
        </Link>
      ) : (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onCta?.(planKey)
          }}
          className={ctaClassName}
          style={ctaStyle}
        >
          {ctaLabel}
        </button>
      ))}
    </div>
  )
}
