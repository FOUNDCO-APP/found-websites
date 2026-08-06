export function parseCatalogPriceCents(price: string | null | undefined) {
  if (!price) return null
  const clean = price.trim().replace(/,/g, "")
  const match = clean.match(/^\$?\s*(\d+(?:\.\d{1,2})?)$/)
  if (!match) return null
  const cents = Math.round(Number(match[1]) * 100)
  return Number.isFinite(cents) && cents > 0 ? cents : null
}

export function formatCatalogMoney(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

export function normalizeCatalogPriceInput(price: string | null | undefined) {
  const cents = parseCatalogPriceCents(price)
  return cents ? formatCatalogMoney(cents) : null
}

export function formatCatalogPrice(price: string | null | undefined) {
  const cents = parseCatalogPriceCents(price)
  if (cents) return formatCatalogMoney(cents)
  return price?.trim() ?? ""
}
