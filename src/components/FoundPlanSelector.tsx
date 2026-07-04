"use client"

import { FOUND_PLAN_OPTIONS, foundPlanDetails, type FoundPlanKey } from "@/lib/foundPlans"

const FOUND_BLACK = "#080A09"
const SIGNAL_GREEN = "#32D074"

type FoundPlanSelectorProps = {
  selectedPlan: FoundPlanKey
  onSelect: (plan: FoundPlanKey) => void
  onContinue: () => void
  loading?: boolean
  className?: string
}

function CheckIcon({ color, size = 13 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function FoundPlanSelector({
  selectedPlan,
  onSelect,
  onContinue,
  loading = false,
  className = "",
}: FoundPlanSelectorProps) {
  const active = foundPlanDetails(selectedPlan)

  return (
    <section className={`relative flex min-h-full flex-col justify-center py-5 ${className}`}>
      <div
        className="pointer-events-none absolute bottom-0 -left-7 -right-7 h-2/3 md:-left-12 md:-right-12"
        style={{ background: "radial-gradient(ellipse 100% 70% at 50% 100%, rgba(50,208,116,0.16) 0%, transparent 70%)" }}
      />

      <div className="relative max-w-lg">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.22em]" style={{ color: SIGNAL_GREEN }}>
          Best place to start
        </p>
        <h1 className="whitespace-nowrap text-[1.72rem] font-light leading-[1.04] text-white sm:text-[1.95rem] md:text-[2.8rem]">
          Most owners start with Pro.
        </h1>
        <p className="mt-3 text-sm leading-6 text-white/58">
          Starter gets your site live. Pro keeps leads warm. Business helps you book jobs and collect money.
        </p>
      </div>

      <div className="relative mt-5 grid gap-2.5 pb-24">
        {FOUND_PLAN_OPTIONS.map((card) => {
          const activePlan = selectedPlan === card.key
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onSelect(card.key)}
              className="w-full rounded-[1.2rem] border p-4 text-left transition active:scale-[0.99]"
              style={{
                borderColor: activePlan ? SIGNAL_GREEN : card.featured ? "rgba(50,208,116,0.34)" : "rgba(255,255,255,0.11)",
                background: activePlan
                  ? "linear-gradient(180deg, rgba(50,208,116,0.15) 0%, rgba(50,208,116,0.075) 100%)"
                  : card.featured
                    ? "rgba(50,208,116,0.065)"
                    : "rgba(255,255,255,0.035)",
                boxShadow: activePlan ? "0 20px 60px rgba(50,208,116,0.13)" : "none",
              }}
            >
              <span className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: activePlan ? SIGNAL_GREEN : "rgba(255,255,255,0.2)", backgroundColor: activePlan ? SIGNAL_GREEN : "transparent" }}
                >
                  {activePlan && <CheckIcon color={FOUND_BLACK} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-black text-white">{card.name}</span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]"
                      style={{ backgroundColor: card.featured ? SIGNAL_GREEN : "rgba(255,255,255,0.08)", color: card.featured ? FOUND_BLACK : "rgba(255,255,255,0.55)" }}
                    >
                      {card.eyebrow}
                    </span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[1.35rem] font-black leading-none text-white">${card.price}/mo</span>
                    <span className="text-xs font-medium tracking-[0.01em] text-white/62">
                      regular <span className="line-through decoration-white/45 decoration-2">${card.normalPrice}/mo</span>
                    </span>
                  </span>
                  <span className="mt-2 block text-sm font-black leading-5" style={{ color: SIGNAL_GREEN }}>
                    {card.headline}
                  </span>
                  <span className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {card.bullets.map((bullet) => (
                      <span key={bullet} className="flex items-start gap-2 text-xs font-semibold leading-5 text-white/62">
                        <span className="mt-0.5 shrink-0"><CheckIcon color={SIGNAL_GREEN} size={12} /></span>
                        {bullet}
                      </span>
                    ))}
                    {card.toolGroup && (
                      <span className="flex items-start gap-2 text-xs font-semibold leading-5 text-white/62 sm:col-span-2">
                        <span className="mt-0.5 shrink-0"><CheckIcon color={SIGNAL_GREEN} size={12} /></span>
                        <span className="min-w-0">
                          <span className="block font-black text-white/75">{card.toolGroup.label}</span>
                          <span className="mt-1.5 grid gap-1 sm:grid-cols-2">
                            {card.toolGroup.items.map((item) => (
                              <span key={item} className="flex items-start gap-2 text-[11px] font-semibold leading-4 text-white/52">
                                <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: SIGNAL_GREEN }} />
                                {item}
                              </span>
                            ))}
                          </span>
                        </span>
                      </span>
                    )}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="sticky bottom-0 z-10 mt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={onContinue}
          disabled={loading}
          className="w-full rounded-full py-4 text-sm font-black uppercase tracking-widest whitespace-nowrap disabled:opacity-50 md:py-5"
          style={{ backgroundColor: SIGNAL_GREEN, color: FOUND_BLACK, boxShadow: "0 14px 34px rgba(0,0,0,0.36)" }}
        >
          {loading ? "Preparing secure payment" : active.cta}
        </button>
      </div>
    </section>
  )
}
