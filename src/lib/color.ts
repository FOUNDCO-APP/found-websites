function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace("#", "")
  const value = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const channel = (value: number) => {
    const srgb = value / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  if (!fg || !bg) return 21
  const l1 = relativeLuminance(fg)
  const l2 = relativeLuminance(bg)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Brand colors are allowed only when readable in context. Identity text falls back to white/black.
export function logoColor(background: "dark" | "light", primary: string): string {
  const bg = background === "dark" ? "#111111" : "#ffffff"
  const fallback = background === "dark" ? "#ffffff" : "#111111"
  return contrastRatio(primary, bg) >= 4.5 ? primary : fallback
}

export function darkenHex(hex: string, amount = 0.82): string {
  const parsed = parseHex(hex)
  if (!parsed) return "rgb(15, 15, 15)"
  const { r, g, b } = parsed
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`
}

export function heroGradient(primaryColor: string): string {
  const deepDark = darkenHex(primaryColor, 0.88)
  const midDark  = darkenHex(primaryColor, 0.70)
  return `linear-gradient(155deg, ${deepDark} 0%, ${midDark} 35%, #0f0f0f 70%)`
}
