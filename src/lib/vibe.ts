export type Vibe = "bold" | "calm" | "modern" | "warm"

export type VibeConfig = {
  fontHeading: string
  fontBody: string
  cardRadius: string
  cardShadow: string
  buttonRadius: string
}

export const vibeMap: Record<string, VibeConfig> = {
  bold: {
    fontHeading: "var(--font-oswald)",
    fontBody: "var(--font-inter)",
    cardRadius: "10px",
    cardShadow: "0 4px 14px rgba(0,0,0,0.12)",
    buttonRadius: "6px",
  },
  calm: {
    fontHeading: "var(--font-playfair)",
    fontBody: "var(--font-lato)",
    cardRadius: "24px",
    cardShadow: "0 2px 8px rgba(0,0,0,0.06)",
    buttonRadius: "50px",
  },
  modern: {
    fontHeading: "var(--font-space-grotesk)",
    fontBody: "var(--font-dm-sans)",
    cardRadius: "6px",
    cardShadow: "0 1px 4px rgba(0,0,0,0.08)",
    buttonRadius: "4px",
  },
  warm: {
    fontHeading: "var(--font-merriweather)",
    fontBody: "var(--font-source-sans)",
    cardRadius: "20px",
    cardShadow: "0 2px 10px rgba(0,0,0,0.08)",
    buttonRadius: "50px",
  },
}

export function getVibe(vibe: string | null | undefined): VibeConfig {
  return vibeMap[vibe ?? "bold"] ?? vibeMap.bold
}
