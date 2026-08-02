// Shortens text to a word boundary near maxLength, for homepage teaser
// cards that link to a full page with the complete text - an excerpt
// reads as a preview, the exact same full sentence twice reads as a
// mistake.
export function excerptText(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed
  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return `${base.trim().replace(/[,;:.]+$/, "")}…`
}
