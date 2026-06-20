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
}

export function albumLabelFor(industry: string | null | undefined): AlbumLabel {
  return ALBUM_LABEL_MAP[industry ?? ""] ?? { singular: "Project", plural: "Projects", create: "New Project" }
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
