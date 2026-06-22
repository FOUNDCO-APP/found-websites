// ─────────────────────────────────────────────────────────────
// Found Dashboard Type System
// Preserves Found's existing voice: light-weight headlines (300),
// heavy-weight uppercase labels (800-900) for the eyebrow/caption
// style seen throughout foundco.app. This file fixes SIZE and
// CONTRAST inconsistencies — not Found's visual personality.
//
// Expressed in rem so it respects browser zoom and OS-level
// accessibility text sizing. Root font-size is the browser
// default (16px) and is never overridden, so 1rem = 16px unless
// the user has changed their system/browser text size — in which
// case everything below scales together, matching how Apple's
// Dynamic Type works.
// ─────────────────────────────────────────────────────────────

export const TYPE = {
  // Large Title — page headers: "Leads", "Contacts", "Your Website"
  // Found's signature look: light weight, tight tracking, big.
  largeTitle: {
    fontSize: "2.125rem",   // 34px @ default root
    fontWeight: 300,
    letterSpacing: "-0.03em",
    lineHeight: 0.98,
  },
  // Title — sheet headers, person/lead names, modal titles
  // Slightly heavier so names/identities have presence in a sheet.
  title: {
    fontSize: "1.5rem",     // 24px
    fontWeight: 700,
    letterSpacing: "-0.01em",
    lineHeight: 1.15,
  },
  // Headline — list row primary text (lead/contact names in cards)
  headline: {
    fontSize: "1.0625rem",  // 17px — iOS standard list row size
    fontWeight: 700,
    lineHeight: 1.3,
  },
  // Body — standard readable paragraph text (notes, messages)
  body: {
    fontSize: "1.0625rem",  // 17px
    fontWeight: 400,
    lineHeight: 1.5,
  },
  // Subhead — secondary text, preview lines, descriptions
  subhead: {
    fontSize: "0.9375rem",  // 15px — floor for anything meant to be read
    fontWeight: 500,
    lineHeight: 1.45,
  },
  // Footnote — metadata, timestamps (sparingly, short strings only)
  footnote: {
    fontSize: "0.8125rem",  // 13px — true floor
    fontWeight: 700,
    lineHeight: 1.3,
  },
  // Caption — Found's signature eyebrow/label style: heavy, uppercase, tracked out
  caption: {
    fontSize: "0.8125rem",  // 13px — same floor, never smaller
    fontWeight: 800,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    lineHeight: 1.3,
  },
} as const

// Opacity floor — text meant to be read should never go below this on black backgrounds.
// Calibrated against iOS system dark-mode label colors: primary is true white,
// secondary sits noticeably brighter than typical "muted gray" web conventions.
export const TEXT_OPACITY = {
  primary: 1,         // headlines, names, important values — true white, matches iOS .label
  secondary: 0.78,     // body copy, descriptions — matches iOS .secondaryLabel brightness
  tertiary: 0.55,      // metadata, timestamps, placeholders — matches iOS .tertiaryLabel
  disabled: 0.3,        // truly inactive/disabled state only
}

// Icon sizes — iOS chevrons in list rows render ~17-20px.
export const ICON = {
  chevron: 20,
  action: 18,
  large: 24,
}

export const GREEN = "#32D074"
export const BLACK = "#080A09"

// ─────────────────────────────────────────────────────────────
// Avatar colors — Apple Contacts/Messages style.
// A small rotation of muted, desaturated colors assigned per-person
// by name (deterministic — same person always gets the same color).
// This is identity, not status — temperature/state should never
// be communicated through avatar color, only through its own badge.
// ─────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  "#8E97C5", // muted blue-violet (Apple's default contact blue)
  "#9B8AC4", // soft lavender
  "#7FA8C9", // dusty blue
  "#8FB89A", // sage green
  "#C49B7C", // warm tan
  "#B58A9E", // muted mauve
  "#7C9CAE", // slate blue
  "#A89368", // soft gold
]

// ── Album labels (what "Projects" is called per industry) ────────────────────

export type AlbumLabel = { singular: string; plural: string; create: string }

const ALBUM_LABEL_MAP: Record<string, AlbumLabel> = {
  restaurant:            { singular: "Event",      plural: "Events",       create: "New Event" },
  food_beverage:         { singular: "Event",      plural: "Events",       create: "New Event" },
  home_based_food:       { singular: "Item",       plural: "Items",        create: "New Item" },
  salon:                 { singular: "Look",       plural: "Looks",        create: "New Look" },
  beauty:                { singular: "Look",       plural: "Looks",        create: "New Look" },
  spa:                   { singular: "Treatment",  plural: "Treatments",   create: "New Treatment" },
  retail:                { singular: "Collection", plural: "Collections",  create: "New Collection" },
  makers_crafts:         { singular: "Collection", plural: "Collections",  create: "New Collection" },
  music_performance:     { singular: "Show",       plural: "Shows",        create: "New Show" },
  music:                 { singular: "Show",       plural: "Shows",        create: "New Show" },
  childcare:             { singular: "Memory",     plural: "Memories",     create: "New Memory" },
  education:             { singular: "Moment",     plural: "Moments",      create: "New Moment" },
  real_estate:           { singular: "Listing",    plural: "Listings",     create: "New Listing" },
  home_property:         { singular: "Property",   plural: "Properties",   create: "New Property" },
  photography:           { singular: "Shoot",      plural: "Shoots",       create: "New Shoot" },
  healthcare:            { singular: "Visit",      plural: "Visits",       create: "New Visit" },
  nonprofit:             { singular: "Story",      plural: "Stories",      create: "New Story" },
  professional_services: { singular: "Case",       plural: "Cases",        create: "New Case" },
  contractors:           { singular: "Job",        plural: "Jobs",         create: "New Job" },
  home_services:         { singular: "Job",        plural: "Jobs",         create: "New Job" },
  cleaning:              { singular: "Job",        plural: "Jobs",         create: "New Job" },
  landscaping:           { singular: "Job",        plural: "Jobs",         create: "New Job" },
  plumbing:              { singular: "Job",        plural: "Jobs",         create: "New Job" },
  electrician:           { singular: "Job",        plural: "Jobs",         create: "New Job" },
  construction:          { singular: "Job",        plural: "Jobs",         create: "New Job" },
  events:                { singular: "Event",      plural: "Events",       create: "New Event" },
  event_planning:        { singular: "Event",      plural: "Events",       create: "New Event" },
  balloon_decor:         { singular: "Event",      plural: "Events",       create: "New Event" },
  fitness:               { singular: "Session",    plural: "Sessions",     create: "New Session" },
  pet_services:          { singular: "Session",    plural: "Sessions",     create: "New Session" },
  auto:                  { singular: "Job",        plural: "Jobs",         create: "New Job" },
}

export function albumLabelFor(industry: string | null | undefined): AlbumLabel {
  return ALBUM_LABEL_MAP[industry ?? ""] ?? { singular: "Project", plural: "Projects", create: "New Project" }
}

// ── Lead labels (what "Leads" is called per industry) ────────────────────────

export type LeadLabel = { singular: string; plural: string; new: string }

const LEAD_LABEL_MAP: Record<string, LeadLabel> = {
  restaurant:            { singular: "Reservation", plural: "Reservations", new: "New Reservation" },
  food_beverage:         { singular: "Order",        plural: "Orders",        new: "New Order" },
  home_based_food:       { singular: "Order",        plural: "Orders",        new: "New Order" },
  salon:                 { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  beauty:                { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  spa:                   { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  fitness:               { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  healthcare:            { singular: "Appointment",  plural: "Appointments",  new: "New Appointment" },
  retail:                { singular: "Order",        plural: "Orders",        new: "New Order" },
  makers_crafts:         { singular: "Order",        plural: "Orders",        new: "New Order" },
  contractors:           { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  home_services:         { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  cleaning:              { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  landscaping:           { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  plumbing:              { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  electrician:           { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  construction:          { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  auto:                  { singular: "Estimate",     plural: "Estimates",     new: "New Estimate" },
  real_estate:           { singular: "Lead",         plural: "Leads",         new: "New Lead" },
  photography:           { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  events:                { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  event_planning:        { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  balloon_decor:         { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  childcare:             { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  education:             { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  nonprofit:             { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
  music:                 { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  music_performance:     { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  pet_services:          { singular: "Booking",      plural: "Bookings",      new: "New Booking" },
  professional_services: { singular: "Inquiry",      plural: "Inquiries",     new: "New Inquiry" },
}

export function leadLabelFor(industry: string | null | undefined): LeadLabel {
  return LEAD_LABEL_MAP[industry ?? ""] ?? { singular: "Lead", plural: "Leads", new: "New Lead" }
}

// ── Contact default categories per industry ───────────────────────────────────

const CONTACT_CATEGORIES_MAP: Record<string, string[]> = {
  contractors:           ["Client", "Subcontractor", "Vendor", "Supplier", "Inspector"],
  home_services:         ["Client", "Subcontractor", "Vendor", "Supplier"],
  cleaning:              ["Client", "Staff", "Vendor", "Supplier"],
  landscaping:           ["Client", "Subcontractor", "Vendor", "Supplier"],
  construction:          ["Client", "Subcontractor", "Vendor", "Supplier", "Inspector"],
  restaurant:            ["Staff", "Vendor", "Supplier", "Event Client"],
  food_beverage:         ["Staff", "Vendor", "Supplier"],
  salon:                 ["Client", "Staff", "Vendor", "Supplier"],
  beauty:                ["Client", "Staff", "Vendor", "Supplier"],
  spa:                   ["Client", "Staff", "Vendor", "Supplier"],
  retail:                ["Vendor", "Supplier", "Staff", "Wholesale"],
  makers_crafts:         ["Vendor", "Supplier", "Wholesale", "Collaborator"],
  photography:           ["Client", "Vendor", "Second Shooter", "Model"],
  events:                ["Client", "Vendor", "Staff", "Venue"],
  event_planning:        ["Client", "Vendor", "Staff", "Venue"],
  balloon_decor:         ["Client", "Vendor", "Staff", "Collaborator"],
  real_estate:           ["Client", "Lender", "Inspector", "Other Agent"],
  healthcare:            ["Patient", "Staff", "Vendor", "Referral"],
  fitness:               ["Client", "Staff", "Vendor"],
  music:                 ["Venue", "Promoter", "Collaborator", "Vendor"],
  music_performance:     ["Venue", "Promoter", "Collaborator", "Vendor"],
  professional_services: ["Client", "Vendor", "Referral", "Partner"],
  nonprofit:             ["Donor", "Volunteer", "Partner", "Vendor"],
  childcare:             ["Family", "Staff", "Vendor"],
  education:             ["Student", "Staff", "Vendor", "Partner"],
  pet_services:          ["Client", "Staff", "Vendor", "Vet"],
  auto:                  ["Client", "Parts Vendor", "Subcontractor", "Fleet"],
}

export function contactCategoriesFor(industry: string | null | undefined): string[] {
  return CONTACT_CATEGORIES_MAP[industry ?? ""] ?? ["Vendor", "Subcontractor", "Supplier", "Client"]
}

export function avatarColorFor(name: string | null | undefined): string {
  const str = (name || "?").trim()
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[index]
}
