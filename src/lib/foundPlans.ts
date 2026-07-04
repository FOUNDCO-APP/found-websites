export type FoundPlanKey = "found" | "found_pro" | "found_business"

export type FoundPlanOption = {
  key: FoundPlanKey
  name: string
  badge: string
  headline: string
  line: string
  price: number
  normalPrice: number
  featured?: boolean
  cta: string
  features: string[]
}

export const FOUND_PLAN_OPTIONS: FoundPlanOption[] = [
  {
    key: "found",
    name: "Found Starter",
    badge: "Done for you",
    headline: "Get online without building it yourself.",
    line: "A polished website that gets your business live.",
    price: 29,
    normalPrice: 39,
    cta: "Continue with Found Starter",
    features: [
      "Website built for you",
      "Leads sent to you",
      "Automatic instant reply to new leads",
      "Update your site, photos, and social posts",
    ],
  },
  {
    key: "found_pro",
    name: "Found Pro",
    badge: "Recommended",
    headline: "Stop losing leads when you're busy.",
    line: "Starter gets your site live. Pro keeps every inquiry warm.",
    price: 39,
    normalPrice: 69,
    cta: "Continue with Found Pro",
    featured: true,
    features: [
      "Everything in Starter",
      "Automatic follow-up messages sent for you",
      "Customer list organized",
      "Choose one: online ordering, booking calendar, send estimates and collect deposits, or email marketing",
    ],
  },
  {
    key: "found_business",
    name: "Found Business",
    badge: "All in",
    headline: "Manage jobs from first call to final payment.",
    line: "Business includes every operating tool in one plan.",
    price: 69,
    normalPrice: 99,
    cta: "Continue with Found Business",
    features: [
      "Everything in Pro",
      "Team access for owners and workers",
      "Manage work from first call to final payment",
      "All business tools included: online ordering, booking calendar, estimates and deposits, email marketing",
    ],
  },
]

export function normalizeFoundPlan(plan?: string | null): FoundPlanKey {
  if (plan === "found_pro" || plan === "found_business") return plan
  return "found"
}

export function foundPlanDetails(plan?: string | null) {
  const key = normalizeFoundPlan(plan)
  return FOUND_PLAN_OPTIONS.find(option => option.key === key) ?? FOUND_PLAN_OPTIONS[0]
}
