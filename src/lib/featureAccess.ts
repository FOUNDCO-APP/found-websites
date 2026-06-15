type Feature =
  | "custom_domain"
  | "worker_uploads"
  | "contact_database"
  | "lead_sequence"
  | "lead_tracking"
  | "lead_reply"
  | "booking"
  | "quotes"
  | "review_collection"
  | "menu_addon"
  | "shopping_cart"
  | "second_location"

export function getFeatureAccess(plan: string | null | undefined, feature: Feature): boolean {
  const p = plan ?? "found"

  switch (feature) {
    case "custom_domain":
    case "worker_uploads":
    case "contact_database":
    case "lead_sequence":
    case "lead_tracking":
    case "lead_reply":
      return p === "found_pro" || p === "found_business"

    case "booking":
    case "quotes":
    case "review_collection":
      return p === "found_business"

    case "menu_addon":
    case "shopping_cart":
    case "second_location":
      return true

    default:
      return false
  }
}
