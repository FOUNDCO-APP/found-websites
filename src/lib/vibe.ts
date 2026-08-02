export type Vibe = "bold" | "calm" | "modern" | "warm"

export type VibeConfig = {
  fontHeading: string
  fontBody: string
  cardRadius: string
  cardShadow: string
  buttonRadius: string
}

// Card radius/shadow per vibe - the single, highest-leverage place to raise
// the "depth and modernness" bar site-wide, since every layout template and
// standalone page (services, contact, estimate, reserve, menu) already
// reads these through --card-radius/--card-shadow. Team direction (Jony):
// every vibe keeps its own personality (bold stays crisp-cornered, calm/warm
// stay soft and round, modern stays clean), but all four move from a tight,
// barely-there shadow to a real, soft, "floating" one - matching the depth
// already proven elsewhere in this codebase (CatalogShowcase's shop-item
// cards: 28px radius, 0 18px 50px rgba(0,0,0,0.08)).
export const vibeMap: Record<string, VibeConfig> = {
  bold: {
    fontHeading: "var(--font-oswald)",
    fontBody: "var(--font-inter)",
    cardRadius: "14px",
    cardShadow: "0 16px 40px rgba(0,0,0,0.14)",
    buttonRadius: "6px",
  },
  calm: {
    fontHeading: "var(--font-playfair)",
    fontBody: "var(--font-lato)",
    cardRadius: "26px",
    cardShadow: "0 20px 50px rgba(0,0,0,0.07)",
    buttonRadius: "50px",
  },
  modern: {
    fontHeading: "var(--font-space-grotesk)",
    fontBody: "var(--font-dm-sans)",
    cardRadius: "8px",
    cardShadow: "0 20px 45px rgba(0,0,0,0.10)",
    buttonRadius: "4px",
  },
  warm: {
    fontHeading: "var(--font-merriweather)",
    fontBody: "var(--font-source-sans)",
    cardRadius: "20px",
    cardShadow: "0 18px 42px rgba(0,0,0,0.10)",
    buttonRadius: "50px",
  },
}

export function getVibe(vibe: string | null | undefined): VibeConfig {
  return vibeMap[vibe ?? "bold"] ?? vibeMap.bold
}
