export type ConfirmMode = "instant" | "soft"

export type BookingNoun = {
  noun: string           // "reservation", "appointment", "consultation"
  pastTense: string      // "confirmed", "scheduled"
  confirmMode: ConfirmMode
}

export type ServiceField = {
  label: string
  options: string[]     // always ends with "Other"
  isOccasion?: boolean  // food-style: field is about occasion, not service type
}

// What to call the booking in emails and UI per industry
const BOOKING_NOUN_MAP: Partial<Record<string, BookingNoun>> = {
  food:                  { noun: "reservation",        pastTense: "confirmed",  confirmMode: "instant" },
  home_based_food:       { noun: "reservation",        pastTense: "confirmed",  confirmMode: "instant" },
  wellness:              { noun: "appointment",         pastTense: "confirmed",  confirmMode: "instant" },
  beauty:                { noun: "appointment",         pastTense: "confirmed",  confirmMode: "instant" },
  fitness:               { noun: "appointment",         pastTense: "confirmed",  confirmMode: "instant" },
  healthcare:            { noun: "appointment",         pastTense: "confirmed",  confirmMode: "instant" },
  pet_services:          { noun: "appointment",         pastTense: "confirmed",  confirmMode: "instant" },
  education:             { noun: "session",             pastTense: "confirmed",  confirmMode: "instant" },
  automotive:            { noun: "service appointment", pastTense: "confirmed",  confirmMode: "instant" },
  home_services:         { noun: "consultation",        pastTense: "scheduled",  confirmMode: "soft" },
  cleaning:              { noun: "booking",             pastTense: "scheduled",  confirmMode: "soft" },
  landscaping:           { noun: "consultation",        pastTense: "scheduled",  confirmMode: "soft" },
  events:                { noun: "consultation",        pastTense: "scheduled",  confirmMode: "soft" },
  creative_services:     { noun: "consultation",        pastTense: "scheduled",  confirmMode: "soft" },
  professional_services: { noun: "consultation",        pastTense: "scheduled",  confirmMode: "soft" },
  real_estate:           { noun: "showing",             pastTense: "scheduled",  confirmMode: "soft" },
  childcare:             { noun: "tour",                pastTense: "scheduled",  confirmMode: "soft" },
  home_property:         { noun: "viewing",             pastTense: "scheduled",  confirmMode: "soft" },
  music_performance:     { noun: "booking",             pastTense: "confirmed",  confirmMode: "soft" },
  nonprofit:             { noun: "appointment",         pastTense: "scheduled",  confirmMode: "soft" },
  retail:                { noun: "visit",               pastTense: "scheduled",  confirmMode: "soft" },
  makers_crafts:         { noun: "visit",               pastTense: "scheduled",  confirmMode: "soft" },
}

const DEFAULT_NOUN: BookingNoun = { noun: "booking", pastTense: "confirmed", confirmMode: "instant" }

export function getBookingNoun(industry: string | null | undefined): BookingNoun {
  return BOOKING_NOUN_MAP[industry ?? ""] ?? DEFAULT_NOUN
}

// Fallback service field options when company has no services configured
const SERVICE_FIELD_MAP: Partial<Record<string, ServiceField>> = {
  food:                  { label: "Special occasion?", isOccasion: true,
                           options: ["Birthday", "Anniversary", "Date Night", "Business Dinner", "Other"] },
  home_based_food:       { label: "Special occasion?", isOccasion: true,
                           options: ["Birthday", "Anniversary", "Celebration", "Other"] },
  wellness:              { label: "Which treatment?",
                           options: ["Massage", "Facial", "Body Treatment", "Wellness Session", "Other"] },
  beauty:                { label: "Which service?",
                           options: ["Haircut", "Color", "Styling", "Nails", "Waxing", "Other"] },
  fitness:               { label: "Which class?",
                           options: ["Group Class", "Personal Training", "Yoga", "Pilates", "Other"] },
  healthcare:            { label: "Reason for visit",
                           options: ["New Patient", "Follow-up", "Consultation", "Physical", "Other"] },
  home_services:         { label: "What do you need?",
                           options: ["Estimate", "Repair", "New Installation", "Inspection", "Other"] },
  cleaning:              { label: "Type of cleaning",
                           options: ["Regular Clean", "Deep Clean", "Move-in/out", "Post-construction", "Other"] },
  landscaping:           { label: "Service needed",
                           options: ["Lawn Mowing", "Tree Trimming", "Landscape Design", "Irrigation", "Other"] },
  events:                { label: "Event type",
                           options: ["Wedding", "Birthday", "Corporate", "Private Party", "Other"] },
  creative_services:     { label: "Project type",
                           options: ["Website", "Branding", "Photography", "Video", "Design", "Other"] },
  professional_services: { label: "Type of matter",
                           options: ["General Consultation", "Contract Review", "Dispute Resolution", "Other"] },
  real_estate:           { label: "What are you looking for?",
                           options: ["Buying", "Selling", "Renting", "Investment Property", "Other"] },
  childcare:             { label: "Child's age",
                           options: ["Infant (0–1 yr)", "Toddler (1–3 yr)", "Preschool (3–5 yr)", "School-age (5+)", "Other"] },
  automotive:            { label: "Service type",
                           options: ["Oil Change", "Inspection", "Tire Service", "Repair", "Detailing", "Other"] },
  music_performance:     { label: "Event type",
                           options: ["Wedding", "Corporate", "Private Party", "Festival", "Other"] },
  home_property:         { label: "Property type",
                           options: ["Studio", "1 Bedroom", "2 Bedroom", "3+ Bedrooms", "Commercial", "Other"] },
  pet_services:          { label: "Pet type",
                           options: ["Dog", "Cat", "Small Animal", "Bird", "Other"] },
  nonprofit:             { label: "Reason for visit",
                           options: ["Volunteer", "Donation Drop-off", "Program Info", "Other"] },
  education:             { label: "Subject",
                           options: ["Math", "Reading", "Science", "Language", "Music", "Other"] },
}

export function getServiceField(
  industry: string | null | undefined,
  companyServices: string[]
): ServiceField | null {
  const vocab = SERVICE_FIELD_MAP[industry ?? ""]

  // Food/occasion type — always use the hardcoded occasion list, never pull from services
  if (vocab?.isOccasion) return vocab

  // Non-food with company services configured — build from their list
  if (companyServices.length > 0) {
    return {
      label: vocab?.label ?? "Service",
      options: [...companyServices, "Other"],
    }
  }

  // Non-food without services — use industry defaults
  return vocab ?? null
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
