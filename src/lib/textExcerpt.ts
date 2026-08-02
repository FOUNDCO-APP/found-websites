// Shortens text to a word boundary near maxLength, for homepage teaser
// cards that link to a full page with the complete text - an excerpt
// reads as a preview, the exact same full sentence twice reads as a
// mistake.
const TRAILING_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "with", "for", "of", "to",
  "in", "on", "at", "by", "from", "before", "after", "that", "so",
])

export function excerptText(text: string, maxLength: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= maxLength) return trimmed

  const cut = trimmed.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(" ")
  let base = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim().replace(/[,;:.]+$/, "")

  // A cut that lands right after a conjunction/preposition ("...and…",
  // "...before…") reads as an accidental cutoff, not a real ellipsis -
  // keep dropping trailing filler words until it lands on something
  // substantive.
  const words = base.split(" ")
  while (words.length > 1 && TRAILING_STOP_WORDS.has(words[words.length - 1].toLowerCase())) {
    words.pop()
  }
  base = words.join(" ").replace(/[,;:.]+$/, "")

  return `${base}…`
}
