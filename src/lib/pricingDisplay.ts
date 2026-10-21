import { useEffect, useState } from "react"
import { FOUND_PLAN_OPTIONS } from "./foundPlans"
import { INTRO_RATE_CUTOFF, isIntroRatePeriod } from "./introRate"

export function useIntroRatePeriod() {
  const [intro, setIntro] = useState(() => isIntroRatePeriod())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function update() {
      clearTimeout(timer)
      const remaining = INTRO_RATE_CUTOFF.getTime() - Date.now()
      setIntro(remaining > 0)
      // Long timeouts overflow in browsers. Recheck daily until the final day.
      if (remaining > 0) timer = setTimeout(update, Math.min(remaining, 86_400_000))
    }
    update()
    window.addEventListener("focus", update)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("focus", update)
    }
  }, [])
  return intro
}

export function planPriceDisplay(plan: string, intro: boolean) {
  const details = FOUND_PLAN_OPTIONS.find((option) => option.key === plan)
  if (!details) return null
  return {
    amount: intro ? details.price : details.normalPrice,
    normalAmount: details.normalPrice,
    intro,
  }
}

export type ActivationDisplaySummary = {
  originalAmount: number
  discountedAmount: number
  currency: string
  promo: { discountLabel: string; duration: string } | null
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  }).format(amount / 100)
}

export function activationPriceDisplay(plan: string | null | undefined, summary: ActivationDisplaySummary | null) {
  const unknown = { label: "Price unavailable", headline: null, detail: "Your price could not be confirmed. Please try again." }
  if (!summary || !Number.isSafeInteger(summary.originalAmount) || summary.originalAmount < 0 ||
      !Number.isSafeInteger(summary.discountedAmount) || summary.discountedAmount < 0 ||
      !/^[a-z]{3}$/i.test(summary.currency)) return unknown

  const monthly = `${formatCurrency(summary.discountedAmount, summary.currency)}/month`
  const details = FOUND_PLAN_OPTIONS.find((option) => option.key === plan)
  // Use the returned base amount, not today's date: founding members retain eligibility.
  const intro = summary.currency.toLowerCase() === "usd" && !!details && summary.originalAmount === details.price * 100
  const regular = summary.currency.toLowerCase() === "usd" && !!details && summary.originalAmount === details.normalPrice * 100
  const baseLabel = intro ? "Intro rate" : regular ? "Regular rate" : "Monthly rate"
  const terms = intro
    ? `Locked in for 12 months, then ${formatCurrency(details!.normalPrice * 100, "usd")}/month. Cancel anytime.`
    : "Cancel anytime."
  if (summary.promo) {
    const duration = summary.promo.duration === "once" ? "first invoice"
      : summary.promo.duration === "repeating" ? "promo period"
      : summary.promo.duration === "forever" ? "every invoice" : "this subscription"
    return {
      label: "Promo applied",
      headline: summary.promo.duration === "once"
        ? `${formatCurrency(summary.discountedAmount, summary.currency)} for your first invoice`
        : summary.promo.duration === "repeating" ? `${monthly} during the promo period` : monthly,
      detail: `${summary.promo.discountLabel} for ${duration}. ${baseLabel} ${summary.promo.duration === "once" ? "after first invoice" : "before promo"}: ${formatCurrency(summary.originalAmount, summary.currency)}/month. Cancel anytime.`,
    }
  }
  return { label: baseLabel, headline: monthly, detail: terms }
}
