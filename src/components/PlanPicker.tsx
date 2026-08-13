"use client"

import { useEffect, useRef, useState } from "react"
import MarketingPlanCard from "./MarketingPlanCard"
import type { FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

export type PlanPickerOption = {
  key: FoundPlanKey
  name: string
  shortName: string
  headline: string
  price: string
  normalPrice: string
  featured?: boolean
  bullets: string[]
  inherits?: string
}

interface PlanPickerProps {
  plans: PlanPickerOption[]
  selectedPlan: FoundPlanKey
  onSelect: (plan: FoundPlanKey) => void
  onCta: (plan: FoundPlanKey) => void
  intro: boolean
  ctaPrefix?: string
}

export default function PlanPicker({
  plans,
  selectedPlan,
  onSelect,
  onCta,
  intro,
  ctaPrefix = "Start with",
}: PlanPickerProps) {
  const touchStartX = useRef<number | null>(null)
  const [showNudgeHint, setShowNudgeHint] = useState(true)
  const selectedIndex = Math.max(0, plans.findIndex((plan) => plan.key === selectedPlan))
  const previous = plans[Math.max(0, selectedIndex - 1)]
  const next = plans[Math.min(plans.length - 1, selectedIndex + 1)]
  // Card width is 82% (peek width = (100-82)/2 = 9% per side) - visibility of
  // the peek is handled by contrast (peekEmphasis) and an edge fade/nudge
  // hint below, not by narrowing the visible card (that just makes it taller).
  const trackOffset =
    selectedIndex === 0
      ? "9%"
      : selectedIndex === 1
        ? "calc(-73% - 24px)"
        : "calc(-155% - 48px)"

  useEffect(() => {
    const timer = setTimeout(() => setShowNudgeHint(false), 1100)
    return () => clearTimeout(timer)
  }, [])

  const selectPrevious = () => {
    if (selectedIndex > 0) onSelect(previous.key)
  }

  const selectNext = () => {
    if (selectedIndex < plans.length - 1) onSelect(next.key)
  }

  const handleTouchEnd = (clientX: number) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - clientX
    touchStartX.current = null

    if (Math.abs(delta) < 40) return
    if (delta > 0) selectNext()
    else selectPrevious()
  }

  const ctaLabel = (plan: PlanPickerOption) => `${ctaPrefix} ${plan.shortName}`

  return (
    <div>
      {/* Phone: one-card swipe carousel, CTA lives inside the visible card */}
      <div className="md:hidden">
        <div className="relative w-[calc(100%+48px)] max-w-none min-w-0 overflow-hidden -ml-6 -mr-6">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8"
            style={{ background: `linear-gradient(to right, ${FOUND_BLACK}, transparent)` }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8"
            style={{ background: `linear-gradient(to left, ${FOUND_BLACK}, transparent)` }}
          />
          <div
            className="w-full max-w-full min-w-0 overflow-hidden py-2"
            onTouchStart={(event) => {
              touchStartX.current = event.changedTouches[0]?.clientX ?? null
            }}
            onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
            style={showNudgeHint ? { animation: "carousel-nudge 1.1s ease-out 1" } : undefined}
          >
            <div
              className="flex w-full max-w-full min-w-0 gap-6 transition-[margin] duration-500 ease-out"
              style={{ marginLeft: trackOffset }}
            >
              {plans.map((plan) => (
                <div key={plan.key} className="min-h-[430px] flex-[0_0_82%]">
                  <MarketingPlanCard
                    planKey={plan.key}
                    name={plan.name}
                    headline={plan.headline}
                    price={plan.price}
                    normalPrice={plan.normalPrice}
                    featured={plan.featured}
                    selected={selectedPlan === plan.key}
                    peekEmphasis={selectedPlan !== plan.key}
                    intro={intro}
                    bullets={plan.bullets}
                    inherits={plan.inherits}
                    showCta={selectedPlan === plan.key}
                    ctaLabel={ctaLabel(plan)}
                    onSelect={onSelect}
                    onCta={onCta}
                    className="h-full"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto mt-5 flex w-fit items-center justify-center gap-3 rounded-full bg-white/[0.075] px-5 py-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.key
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => onSelect(plan.key)}
                  aria-label={`Choose ${plan.name}`}
                  className="h-2.5 rounded-full transition-all"
                  style={{
                    width: isSelected ? 34 : 9,
                    backgroundColor: isSelected ? SIGNAL_GREEN : "rgba(255,255,255,0.3)",
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Tablet/desktop: full-width 3-card row, one shared CTA below */}
      <div className="hidden md:grid md:grid-cols-3 md:gap-6">
        {plans.map((plan) => (
          <MarketingPlanCard
            key={plan.key}
            planKey={plan.key}
            name={plan.name}
            headline={plan.headline}
            price={plan.price}
            normalPrice={plan.normalPrice}
            featured={plan.featured}
            selected={selectedPlan === plan.key}
            intro={intro}
            bullets={plan.bullets}
            inherits={plan.inherits}
            showCta={false}
            onSelect={onSelect}
          />
        ))}
      </div>

      <div className="hidden md:flex md:justify-center md:mt-8">
        <button
          onClick={() => onCta(selectedPlan)}
          className="inline-flex min-h-14 w-full max-w-sm items-center justify-center rounded-full px-8 text-sm font-black uppercase tracking-widest transition hover:opacity-90"
          style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK }}
        >
          {ctaLabel(plans[selectedIndex] ?? plans[0])}
        </button>
      </div>
    </div>
  )
}
