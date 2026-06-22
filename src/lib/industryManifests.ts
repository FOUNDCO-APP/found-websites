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
    primaryIntent: "reserve",
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
  creative_services: {
    label: "Creative Services",
    primaryJob: "Show the work, establish a clear style, and make hiring feel like a natural next step.",
    sections: ["hero", "portfolio", "services", "reviews", "final_cta"],
    requiredFields: ["work_types", "style_or_medium", "project_types", "booking_process", "optional_pricing"],
    subIndustries: ["graphic designer", "photographer", "videographer", "social media manager", "branding designer", "web designer", "illustrator", "copywriter", "tattoo artist", "muralist"],
    preferredPhotoTags: ["general", "creative", "studio", "design", "portfolio", "art"],
    primaryIntent: "contact",
    secondaryIntent: "call",
    likelyUpgrades: ["project_quote", "deposits", "client_gallery", "portfolio_upgrade", "custom_domain"],
    jonyNote: "The portfolio IS the product. Get to the work fast. No walls of text before the proof.",
    layoutHints: { bold: "cinematic", calm: "editorial", modern: "cinematic", warm: "portrait" },
  },
  home_based_food: {
    label: "Home-Based Food",
    primaryJob: "Make the food look irresistible and make ordering feel simple, personal, and trustworthy.",
    sections: ["hero", "featured_collection", "services", "gallery", "reviews", "final_cta"],
    requiredFields: ["what_you_make", "order_process", "pickup_or_delivery", "service_area_or_neighborhood"],
    subIndustries: ["cottage baker", "tortilla maker", "tamale maker", "custom cakes", "meal prep at home", "personal chef", "salsa/hot sauce", "jam/preserves", "food subscription"],
    preferredPhotoTags: ["food", "baking", "homemade", "kitchen", "dessert", "general"],
    primaryIntent: "contact",
    secondaryIntent: "call",
    likelyUpgrades: ["order_form", "pickup_scheduling", "event_catering_inquiry", "custom_domain"],
    jonyNote: "This is personal and handmade — that IS the brand. The person behind the food is the story. Lead with warmth and the food.",
  },
  education: {
    label: "Education & Instruction",
    primaryJob: "Build confidence in the parent or student, show qualifications, and make booking a first session feel easy.",
    sections: ["hero", "services_pricing", "team_expertise", "gallery", "reviews", "final_cta"],
    requiredFields: ["subjects_or_skills", "student_age_range", "session_format", "location_or_online", "optional_pricing"],
    subIndustries: ["private tutor", "music lessons", "art lessons", "dance instructor", "driving school", "swim lessons", "language tutor", "test prep", "coding for kids", "reading specialist"],
    preferredPhotoTags: ["general", "education", "teaching", "learning", "classroom", "students"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["online_booking", "session_packages", "intake_forms", "progress_notes", "custom_domain"],
    jonyNote: "Parents are protective. Credentials and warmth in equal measure. Show results, not just credentials.",
  },
  music_performance: {
    label: "Music & Performance",
    primaryJob: "Establish the act, show the energy, and make booking feel professional and easy.",
    sections: ["hero", "portfolio", "services", "reviews", "final_cta"],
    requiredFields: ["performance_type", "genres_or_style", "event_types_you_play", "booking_availability"],
    subIndustries: ["solo musician", "band", "singer-songwriter", "cover band", "string quartet", "comedian", "magician", "children's entertainer", "face painter", "spoken word"],
    preferredPhotoTags: ["music", "performance", "concert", "stage", "live", "general"],
    primaryIntent: "contact",
    secondaryIntent: "call",
    likelyUpgrades: ["event_booking", "deposits", "availability_calendar", "demo_reel", "custom_domain"],
    jonyNote: "Energy is the product. Every image should make you feel the room. Short copy, big visuals.",
    layoutHints: { bold: "cinematic", calm: "editorial", modern: "cinematic", warm: "portrait" },
  },
  professional_services: {
    label: "Professional Services",
    primaryJob: "Establish authority, signal trust, and make the first consultation feel low-risk.",
    sections: ["hero", "trust_strip", "services", "team_expertise", "reviews", "final_cta"],
    requiredFields: ["credentials_or_license", "specialties", "client_type", "consultation_format"],
    subIndustries: ["accountant", "bookkeeper", "tax preparer", "attorney", "notary", "insurance agent", "financial advisor", "mortgage broker", "HR consultant", "business coach"],
    preferredPhotoTags: ["office", "professional", "business", "team", "general"],
    primaryIntent: "contact",
    secondaryIntent: "call",
    likelyUpgrades: ["intake_forms", "consultation_booking", "document_uploads", "client_portal", "custom_domain"],
    jonyNote: "Credibility is the product. No flashy design — clean, confident, and authoritative. The client needs to feel safe handing you their finances or legal matter.",
    layoutHints: { bold: "impact", calm: "editorial", modern: "editorial", warm: "portrait" },
  },
  healthcare: {
    label: "Healthcare",
    primaryJob: "Build trust through credentials, show care through warmth, and make booking the first appointment feel easy.",
    sections: ["hero", "trust_strip", "services", "team_expertise", "comfort_promise", "reviews", "final_cta"],
    requiredFields: ["license_or_certification", "specialties", "new_patient_info", "insurance_accepted", "location_or_telehealth"],
    subIndustries: ["dentist", "chiropractor", "physical therapist", "speech therapist", "optometrist", "dermatologist", "audiologist", "acupuncturist", "naturopath", "therapist/counselor"],
    preferredPhotoTags: ["clinic", "healthcare", "medical", "professional", "team", "general"],
    primaryIntent: "book",
    secondaryIntent: "call",
    likelyUpgrades: ["new_patient_forms", "appointment_booking", "insurance_info", "telehealth_link", "custom_domain"],
    jonyNote: "Clinical but human. The stakes are high for the patient — they need to feel that you see them as a person, not a chart. Credentials earn trust; warmth keeps them.",
    layoutHints: { bold: "impact", calm: "editorial", modern: "editorial", warm: "portrait" },
  },
  childcare: {
    label: "Childcare & Family",
    primaryJob: "Earn the parent's trust completely — show safety, warmth, and qualifications before anything else.",
    sections: ["hero", "trust_strip", "services_pricing", "team_expertise", "comfort_promise", "reviews", "final_cta"],
    requiredFields: ["license_or_certification", "age_groups_served", "capacity", "hours", "location_or_in_home"],
    subIndustries: ["licensed daycare", "in-home daycare", "after-school care", "nanny/babysitter", "preschool", "doula", "postpartum doula", "newborn care specialist", "family photographer", "parenting coach"],
    preferredPhotoTags: ["kids", "children", "family", "childcare", "general"],
    primaryIntent: "contact",
    secondaryIntent: "call",
    likelyUpgrades: ["waitlist_form", "enrollment_inquiry", "daily_updates_app", "parent_portal", "custom_domain"],
    jonyNote: "Parents are handing you the most important thing in their world. Safety and warmth must be felt on the first scroll. No design trend is worth a parent's doubt.",
    layoutHints: { bold: "impact", calm: "portrait", modern: "editorial", warm: "portrait" },
  },
  makers_crafts: {
    label: "Makers & Crafts",
    primaryJob: "Make the craft feel like art and the maker feel like the reason to buy here instead of anywhere else.",
    sections: ["hero", "featured_collection", "portfolio", "services", "reviews", "final_cta"],
    requiredFields: ["materials_or_medium", "custom_order_policy", "where_you_sell", "turnaround_time"],
    subIndustries: ["jewelry maker", "ceramicist", "woodworker", "candle maker", "soap maker", "tailor/seamstress", "screen printer", "leatherworker", "weaver/textile artist", "glass artist"],
    preferredPhotoTags: ["handmade", "craft", "maker", "workshop", "product", "general"],
    primaryIntent: "contact",
    secondaryIntent: "shop",
    likelyUpgrades: ["product_catalog", "custom_order_form", "etsy_link", "wholesale_inquiry", "custom_domain"],
    jonyNote: "The handmade nature is the entire value proposition. Show the process, not just the product. The maker's hands in the clay matter more than any headline.",
    layoutHints: { bold: "cinematic", calm: "editorial", modern: "portrait", warm: "portrait" },
  },
  home_property: {
    label: "Home & Property",
    primaryJob: "Show range of expertise, establish local trust, and make the inquiry completely friction-free.",
    sections: ["hero", "trust_strip", "services", "process", "gallery", "reviews", "service_areas", "final_cta"],
    requiredFields: ["service_types", "licensed_insured", "service_areas", "free_estimate_or_consult"],
    subIndustries: ["interior designer", "home organizer", "junk removal", "moving company", "home inspector", "pest control", "locksmith", "pool service", "window cleaner", "pressure washing"],
    preferredPhotoTags: ["home", "interior", "property", "before_after", "general"],
    primaryIntent: "quote",
    secondaryIntent: "call",
    likelyUpgrades: ["estimates_quotes", "booking_calendar", "service_agreements", "before_after_gallery", "custom_domain"],
    jonyNote: "People are letting you into their home — the trust bar is high. Show real work, real results, and make it feel like a local recommendation rather than a company.",
    layoutHints: { bold: "impact", calm: "editorial", modern: "editorial", warm: "portrait" },
  },
  nonprofit: {
    label: "Nonprofit & Community",
    primaryJob: "Tell the mission story, show real impact, and make donating or volunteering feel easy and meaningful.",
    sections: ["hero", "philosophy", "services", "gallery", "reviews", "final_cta"],
    requiredFields: ["mission_statement", "impact_numbers", "how_to_help", "events_or_programs"],
    subIndustries: ["church", "mosque/temple", "nonprofit org", "community center", "mutual aid group", "animal rescue", "food bank", "youth program", "environmental org", "neighborhood association"],
    preferredPhotoTags: ["community", "volunteer", "people", "event", "general"],
    primaryIntent: "contact",
    secondaryIntent: "visit",
    likelyUpgrades: ["donation_link", "volunteer_signup", "event_calendar", "newsletter_signup", "custom_domain"],
    jonyNote: "The mission is the product. Lead with impact numbers and human faces — not organizational charts. Every visitor already cares; your job is to channel that.",
    layoutHints: { bold: "impact", calm: "editorial", modern: "editorial", warm: "portrait" },
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
