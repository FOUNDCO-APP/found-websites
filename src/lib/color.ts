// Returns white for dark backgrounds, brand color for light backgrounds
export function logoColor(background: "dark" | "light", primary: string): string {
  return background === "dark" ? "#ffffff" : primary
}

export function darkenHex(hex: string, amount = 0.82): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`
}

export function heroGradient(primaryColor: string): string {
  const deepDark = darkenHex(primaryColor, 0.88)
  const midDark  = darkenHex(primaryColor, 0.70)
  return `linear-gradient(155deg, ${deepDark} 0%, ${midDark} 35%, #0f0f0f 70%)`
}
