export type Palette = {
  name: string
  hex: string
  feel: string
}

export const palettes: Palette[] = [
  { name: "Forest", hex: "#2E7D32", feel: "Strong, natural, trusted" },
  { name: "Ocean", hex: "#1565C0", feel: "Professional, calm, reliable" },
  { name: "Slate", hex: "#455A64", feel: "Modern, serious, premium" },
  { name: "Crimson", hex: "#C62828", feel: "Bold, energetic, confident" },
  { name: "Amber", hex: "#E65100", feel: "Warm, friendly, approachable" },
  { name: "Gold", hex: "#F9A825", feel: "Vibrant, optimistic, creative" },
  { name: "Rose", hex: "#AD1457", feel: "Elegant, feminine, refined" },
  { name: "Plum", hex: "#6A1B9A", feel: "Luxurious, creative, distinctive" },
  { name: "Teal", hex: "#6ECECE", feel: "Fresh, calm, elegant" },
  { name: "Midnight", hex: "#212121", feel: "Sophisticated, minimal, premium" },
  { name: "Clay", hex: "#8D6E63", feel: "Warm, earthy, approachable" },
  { name: "Sky", hex: "#0277BD", feel: "Clean, open, professional" },
]

export function getPalette(hex: string | null | undefined): Palette {
  return palettes.find((palette) => palette.hex.toLowerCase() === hex?.toLowerCase()) ?? palettes[0]
}
