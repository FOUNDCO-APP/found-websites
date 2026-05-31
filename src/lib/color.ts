export function darkenHex(hex: string, amount = 0.82): string {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`
}

export function heroGradient(primaryColor: string): string {
  const dark = darkenHex(primaryColor, 0.82)
  return `linear-gradient(160deg, ${dark} 0%, #111111 60%)`
}
