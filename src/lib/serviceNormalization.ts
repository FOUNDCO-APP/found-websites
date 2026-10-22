// Preserve numeric slashes (24/7, 1/2) while separating slash-delimited service names.
// Keep every entry: grouping or removing services requires owner review.
export function normalizeServiceNames(input: string | readonly string[]): string[] {
  const entries = typeof input === "string" ? [input] : input
  return entries.flatMap(entry => entry
    .replace(/(\d)\s*\/\s*(?=\d)/g, "$1/")
    .split(/[,;\r\n]+|(?<!\d)\/|\/(?!\d)/)
    .map(name => name.trim())
    .filter(Boolean))
}
