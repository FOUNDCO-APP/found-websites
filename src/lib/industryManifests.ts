import type { Intent } from "@/types/company"
import type { LayoutType } from "./layout"

export type SectionId =
  | "hero"
  | "trust_strip"
  | "services"
  | "services_pricing"
  | "menu_preview"
  | "featured_collection"
  | "gallery"
  | "portfolio"
  | "process"
  | "hours_location"
  | "philosophy"
  | "team_expertise"
  | "comfort_promise"
  | "reviews"
  | "service_areas"
  | "final_cta"

export type IndustryManifest = {
  label: string
  primaryJob: string
  sections: SectionId[]
  requiredFields: string[]
  subIndustries: string[]
  preferredPhotoTags: string[]
  primaryIntent: Intent
  secondaryIntent: Intent | null
  likelyUpgrades: string[]
  jonyNote: string
  layoutHints?: Partial<Record<string, LayoutType>>
}

export const industryManifests: Record<string, IndustryManifest> = {
  home_services: {
    label: "Home Services",
    primaryJob: "Prove trust, quality, local accountability, and make the estimate feel easy.",
    sections: ["hero", "trust_strip", "services", "process", "gallery", "reviews", "service_areas", "final_cta"],
    requiredFields: ["licensed_insured", "years_in_business", "free_estimates", "service_areas"],
    subIndustries: ["roofing", "remodeling", "painting", "drywall", "flooring", "hvac", "plumbing", "electrical", "tv install", "camera install", "general handyman"],
    preferredPhotoTags: ["general", "painting", "tv install", "camera install"],
    primaryIntent: "quote",
    secondaryIntent: "call",
    likelyUpgrades: ["estimates_quotes", "deposits", "invoices", "custom_domain", "shared_gallery_link"],
    jonyNote: "No decorative softness. This site should feel sturdy, direct, and clean. Trust before flourish.",
  },
  food: {
    label: "Food",
    primaryJob: "Make people hungry, show what to order, and make location/hours obvious.",
    sections: ["hero", "menu_preview", "featured_collection", "hours_location", "gallery", "reviews", "final_cta"],
    requiredFields: ["menu_categories", "best_sellers", "hours", "address_or_service_area", "service_style"],
    subIndustries: ["smoothie shop", "restaurant", "bakery", "food truck", "coffee shop", "meal prep", "catering"],
    preferredPhotoTags: ["general", "food truck"],
    primaryIntent: "visit",
    secondaryIntent: "call",
    likelyUpgrades: ["online_menu", "simple_ordering", "shopping_cart", "catering_inquiry", "custom_domain"],
    jonyNote: "Do not bury the menu. For food, the product is the proof.",
  },
  wellness: {
    label: "Wellness",
    primaryJob: "Create calm trust and make booking feel safe.",
    sections: ["hero", "philosophy", "services", "team_expertise", "gallery", "reviews", "final_cta"],
    requiredFields: ["service_types", "practitioner_credentials", "appointment_style", "first_visit_expectations", "provider_model"],
    subIndustries: ["solo provider", "multi-provider spa", "spa", "massage", "yoga studio", "meditation", "therapy", "acupuncture", "wellness coaching"],
    preferredPhotoTags: ["general", "yoga studio"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["online_booking", "provider_profiles", "service_menu_pricing", "memberships_packages", "intake_forms", "gift_cards"],
    jonyNote: "Remove pressure. The page should breathe. No hard-selling language.",
  },
  events: {
    label: "Events",
    primaryJob: "Show taste, creativity, and the ability to handle important moments.",
    sections: ["hero", "portfolio", "services", "process", "reviews", "final_cta"],
    requiredFields: ["event_types", "guest_count_range", "planning_setup_included", "booking_lead_time"],
    subIndustries: ["weddings", "balloon decor", "balloon garland", "party rentals", "event planning", "venue", "dj", "photography"],
    preferredPhotoTags: ["wedding", "balloon decor", "balloon garland"],
    primaryIntent: "quote",
    secondaryIntent: "call",
    likelyUpgrades: ["event_quote_deposit", "shared_gallery_link", "packages", "client_preview_gallery", "custom_domain"],
    jonyNote: "Portfolio comes early. Event clients buy taste before logistics.",
  },
  retail: {
    label: "Retail",
    primaryJob: "Show product quality, curation, and why visiting or shopping here is worth it.",
    sections: ["hero", "featured_collection", "services", "hours_location", "gallery", "reviews", "final_cta"],
    requiredFields: ["product_categories", "best_sellers", "store_hours", "address", "online_ordering", "optional_pricing"],
    subIndustries: ["bike shop", "boutique", "beauty store", "gift shop", "home goods", "apparel", "specialty retail"],
    preferredPhotoTags: ["general", "beauty store"],
    primaryIntent: "visit",
    secondaryIntent: "shop",
    likelyUpgrades: ["shopping_cart", "featured_products", "inventory_lite_collection", "gift_cards", "online_ordering", "custom_domain"],
    jonyNote: "Retail must feel curated, not cluttered. Fewer products shown beautifully beats a wall of inventory.",
  },
  fitness: {
    label: "Fitness",
    primaryJob: "Create energy, prove results, and make the first class/session less intimidating.",
    sections: ["hero", "services", "team_expertise", "gallery", "reviews", "process", "final_cta"],
    requiredFields: ["class_program_types", "first_class_offer", "coach_credentials", "schedule_or_booking", "optional_pricing"],
    subIndustries: ["gym", "personal training", "yoga studio", "pilates", "boxing", "martial arts", "group fitness"],
    preferredPhotoTags: ["general", "yoga studio"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["online_booking", "memberships_packages", "class_schedule", "intake_forms", "saved_payment_methods"],
    jonyNote: "Energy without intimidation. The owner should look capable, not loud.",
  },
  beauty: {
    label: "Beauty",
    primaryJob: "Show transformation, taste, pricing clarity, and easy booking.",
    sections: ["hero", "portfolio", "services_pricing", "team_expertise", "reviews", "final_cta"],
    requiredFields: ["services_starting_prices", "booking_method", "hours_location", "provider_model"],
    subIndustries: ["barber", "hair salon", "nail salon", "manicure", "pedicure", "esthetician", "lashes", "makeup", "beauty store"],
    preferredPhotoTags: ["general", "barber", "manicure", "pedicure", "beauty store"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["online_booking", "provider_profiles", "deposits", "service_menu", "gift_cards", "client_contact_history"],
    jonyNote: "The work sells the service. Put proof before explanation.",
  },
  automotive: {
    label: "Automotive",
    primaryJob: "Prove honesty, competence, and fast turnaround.",
    sections: ["hero", "trust_strip", "services", "process", "reviews", "hours_location", "final_cta"],
    requiredFields: ["certifications", "services_offered", "warranty_or_guarantee", "dropoff_or_appointment_process", "hours_location"],
    subIndustries: ["auto repair", "detailing", "tires", "oil change", "body shop", "mobile mechanic", "car audio"],
    preferredPhotoTags: ["general"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["service_booking", "estimate_approval", "deposits", "invoices_receipts", "customer_vehicle_history"],
    jonyNote: "No gimmicks. Clear beats clever. The customer wants to know they will not get taken advantage of.",
  },
  pet_services: {
    label: "Pet Services",
    primaryJob: "Prove gentle care, safety, and affection.",
    sections: ["hero", "comfort_promise", "services", "gallery", "reviews", "process", "final_cta"],
    requiredFields: ["animal_types", "services_offered", "appointment_dropoff_process", "safety_comfort_practices", "hours_location_if_appointment_based", "optional_pricing"],
    subIndustries: ["pet groomer", "dog walker", "pet sitter", "boarding", "trainer", "mobile grooming"],
    preferredPhotoTags: ["general", "pet groomer"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["online_booking", "pet_profiles", "vaccine_records", "reminders", "client_contact_history"],
    jonyNote: "Warm, not childish. Owners trust people who respect their pets.",
  },
  cleaning: {
    label: "Cleaning",
    primaryJob: "Show reliability, clarity, and relief.",
    sections: ["hero", "services", "process", "trust_strip", "reviews", "service_areas", "final_cta"],
    requiredFields: ["residential_commercial", "cleaning_types", "supplies_included", "recurring_service", "service_areas"],
    subIndustries: ["home cleaner", "commercial cleaner", "move-out cleaning", "deep cleaning", "window cleaning", "carpet cleaning"],
    preferredPhotoTags: ["general", "home cleaner", "commercial cleaner"],
    primaryIntent: "quote",
    secondaryIntent: "call",
    likelyUpgrades: ["recurring_plans", "quote_approval", "deposits", "invoices_receipts", "client_contact_history"],
    jonyNote: "Keep it precise. The feeling is relief: they will handle it.",
  },
  landscaping: {
    label: "Landscaping",
    primaryJob: "Show transformation and local outdoor expertise.",
    sections: ["hero", "portfolio", "services", "process", "service_areas", "reviews", "final_cta"],
    requiredFields: ["services_offered", "design_install_maintenance", "service_areas", "free_estimates"],
    subIndustries: ["landscaping", "lawn care", "hardscaping", "pavers", "tree trimming", "irrigation", "outdoor lighting"],
    preferredPhotoTags: ["general", "hardscaping", "paver", "tree trimmer", "tree grooming"],
    primaryIntent: "quote",
    secondaryIntent: "call",
    likelyUpgrades: ["project_quote_deposit", "shared_project_gallery", "invoices_receipts", "maintenance_plans", "client_contact_history"],
    jonyNote: "Lead with visual transformation. The customer should imagine their own yard improved.",
  },
  real_estate: {
    label: "Real Estate",
    primaryJob: "Build personal trust, capture leads, and help the agent/investor stay in front of contacts.",
    sections: ["hero", "trust_strip", "services", "featured_collection", "process", "reviews", "final_cta"],
    requiredFields: ["role", "brokerage_name_if_applicable", "license_compliance_if_applicable", "markets_served", "business_focus", "preferred_lead_type"],
    subIndustries: ["residential agent", "real estate investor", "property manager", "commercial agent", "land/lots agent", "new agent/personal brand", "team/brokerage office"],
    preferredPhotoTags: ["general", "professional", "home", "neighborhood", "property", "agent"],
    primaryIntent: "call",
    secondaryIntent: "contact",
    likelyUpgrades: ["relationship_automation", "buyer_seller_lead_forms", "investor_deal_intake", "featured_property_showcase", "email_text_followup", "custom_domain", "compliance_fields"],
    jonyNote: "This is personal brand and relationship memory, not Zillow, IDX, MLS, transaction management, or GoHighLevel.",
    layoutHints: { bold: "impact", calm: "editorial", modern: "cinematic", warm: "portrait" },
  },
}

export function getIndustryManifest(industryCategory: string): IndustryManifest | null {
  return industryManifests[industryCategory] ?? null
}

export function getSubIndustryOptions(industryCategory: string): string[] {
  return getIndustryManifest(industryCategory)?.subIndustries ?? []
}

export function getPreferredPhotoTags(industryCategory: string, subIndustry?: string | null): string[] {
  const manifest = getIndustryManifest(industryCategory)
  if (!manifest) return []
  return [subIndustry, ...manifest.preferredPhotoTags].filter(Boolean) as string[]
}
