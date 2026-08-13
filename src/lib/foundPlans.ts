export type FoundPlanKey = "found" | "found_pro" | "found_business"

export type FoundPlanToolGroup = {
  label: string
  items: string[]
}

export type FoundPlanOption = {
  key: FoundPlanKey
  name: string
  eyebrow: string
  headline: string
  line: string
  shortLine: string
  price: number
  normalPrice: number
  featured?: boolean
  cta: string
  bullets: string[]
  homepageBullets: string[]
  industryBullets: string[]
  toolGroup?: FoundPlanToolGroup
}

export const FOUND_PLAN_OPTIONS: FoundPlanOption[] = [
  {
    key: "found",
    name: "Found Starter",
    eyebrow: "Done for you",
    headline: "Get online today.",
    line: "A polished website you can update from your phone.",
    shortLine: "Your site, photos, gallery, and leads - easy to update from your phone.",
    price: 29,
    normalPrice: 39,
    cta: "Continue with Found Starter",
    bullets: [
      "Website built for you",
      "Leads sent to you",
      "New leads get an automatic reply from your business",
      "Update your site, photos, and social posts",
    ],
    homepageBullets: [
      "Complete website, five pages",
      "Your own web address",
      "Professional copy, written for you",
      "Beautiful industry photos, built in",
      "Leads come straight to you",
      "New leads get an automatic reply from your business",
      "Take a photo. It's on your site.",
    ],
    industryBullets: [
      "Complete website",
      "Camera system and gallery",
      "Lead form plus automatic reply",
    ],
  },
  {
    key: "found_pro",
    name: "Found Pro",
    eyebrow: "Recommended",
    headline: "Follow up with every lead. Automatically.",
    line: "Everything in Starter, plus automatic lead follow-up that keeps inquiries from going cold.",
    shortLine: "Everything in Starter, plus automatic lead follow-up and one included growth tool.",
    price: 39,
    normalPrice: 69,
    cta: "Continue with Found Pro",
    featured: true,
    bullets: [
      "Everything in Starter",
      "Plus automatic lead follow-up",
      "Customer list organized",
      "Choose one growth tool: online ordering, booking calendar, estimates and deposits, or email marketing",
    ],
    homepageBullets: [
      "Everything in Starter",
      "Plus automatic lead follow-up",
      "Drip-style messages keep new leads from going cold",
      "See who's interested and ready to hire",
      "All your leads in one place",
      "Your entire contact list, organized",
      "Your crew contributes from the field",
      "Choose one growth tool: online ordering, booking calendar, estimates and deposits, or email marketing",
    ],
    industryBullets: [
      "Everything in Starter",
      "Plus automatic lead follow-up",
      "Plus one included growth tool",
    ],
  },
  {
    key: "found_business",
    name: "Found Business",
    eyebrow: "All in",
    headline: "Run the whole business.",
    line: "Everything in Pro, plus the full operating system for bookings, estimates, payments, email marketing, and team work.",
    shortLine: "Everything in Pro, plus the full Found system for customers, tools, team, and growth.",
    price: 69,
    normalPrice: 99,
    cta: "Continue with Found Business",
    bullets: [
      "Everything in Pro",
      "Plus bookings, estimates, payments, and email marketing",
      "Plus team access for owners and workers",
    ],
    homepageBullets: [
      "Everything in Pro",
      "Plus bookings, estimates, payments, and email marketing",
      "Payment setup where it matters",
      "More five-star reviews, without asking",
      "Reach your full client list",
      "Your whole team, no extra charge",
      "Show clients their finished job",
    ],
    industryBullets: [
      "Everything in Pro",
      "Plus bookings, estimates, payments, and email marketing",
      "Plus team/workers",
    ],
    toolGroup: {
      label: "All business tools included:",
      items: ["Online ordering", "Booking calendar", "Send estimates and collect deposits", "Email marketing"],
    },
  },
]

export function normalizeFoundPlan(plan?: string | null): FoundPlanKey {
  if (plan === "found_pro" || plan === "found_business") return plan
  return "found"
}

export function defaultActivationPlan(plan?: string | null): FoundPlanKey {
  if (plan === "found_business") return "found_business"
  return "found_pro"
}

export function foundPlanDetails(plan?: string | null) {
  const key = normalizeFoundPlan(plan)
  return FOUND_PLAN_OPTIONS.find((option) => option.key === key) ?? FOUND_PLAN_OPTIONS[0]
}
