import { getVocab } from "./subIndustryVocabulary"

export type BusinessModel = "transactional" | "relational" | "appointment" | "community"

export interface BusinessModelInfo {
  model: BusinessModel
  tabLabel: string          // plural — "Guests", "Clients", "Patients"
  tabLabelSingular: string  // singular — "Guest", "Client", "Patient"
}

// Maps customerWord → display label (plural + singular)
// Unusual words (pet parent, couple, host, partner, owner, rider, shopper)
// normalize to the closest standard label per team decision (2026-06-24).
const LABEL_MAP: Record<string, { tabLabel: string; tabLabelSingular: string }> = {
  guest:            { tabLabel: "Guests",      tabLabelSingular: "Guest" },
  customer:         { tabLabel: "Customers",   tabLabelSingular: "Customer" },
  client:           { tabLabel: "Clients",     tabLabelSingular: "Client" },
  patient:          { tabLabel: "Patients",    tabLabelSingular: "Patient" },
  student:          { tabLabel: "Students",    tabLabelSingular: "Student" },
  member:           { tabLabel: "Members",     tabLabelSingular: "Member" },
  family:           { tabLabel: "Families",    tabLabelSingular: "Family" },
  parent:           { tabLabel: "Parents",     tabLabelSingular: "Parent" },
  // Community-model words (nonprofit sub-industries)
  "community member": { tabLabel: "Community",   tabLabelSingular: "Community Member" },
  neighbor:           { tabLabel: "Community",   tabLabelSingular: "Neighbor" },
  youth:              { tabLabel: "Youth",        tabLabelSingular: "Youth" },
  adopter:            { tabLabel: "Adopters",     tabLabelSingular: "Adopter" },
  volunteer:          { tabLabel: "Volunteers",   tabLabelSingular: "Volunteer" },
  // Unusual words — default to nearest standard per team decision
  "pet parent": { tabLabel: "Clients",    tabLabelSingular: "Client" },
  couple:       { tabLabel: "Clients",    tabLabelSingular: "Client" },
  host:         { tabLabel: "Clients",    tabLabelSingular: "Client" },
  partner:      { tabLabel: "Clients",    tabLabelSingular: "Client" },
  owner:        { tabLabel: "Clients",    tabLabelSingular: "Client" },
  rider:        { tabLabel: "Customers",  tabLabelSingular: "Customer" },
  shopper:      { tabLabel: "Customers",  tabLabelSingular: "Customer" },
}

function resolveLabel(customerWord: string) {
  return LABEL_MAP[customerWord.toLowerCase().trim()] ?? { tabLabel: "Clients", tabLabelSingular: "Client" }
}

export function getBusinessModel(
  industry: string | null | undefined,
  subIndustry: string | null | undefined,
): BusinessModelInfo {
  const vocab = getVocab(subIndustry, industry ?? "")
  const { websiteJob, customerWord } = vocab
  const { tabLabel, tabLabelSingular } = resolveLabel(customerWord)

  // Nonprofit is always Community regardless of websiteJob
  if (industry === "nonprofit") {
    return { model: "community", tabLabel, tabLabelSingular }
  }

  let model: BusinessModel
  if (websiteJob === "visit_me" || websiteJob === "order_from_me") {
    model = "transactional"
  } else if (websiteJob === "book_me") {
    model = "appointment"
  } else {
    // quote_me | hire_me | find_me | trust_me
    model = "relational"
  }

  return { model, tabLabel, tabLabelSingular }
}
