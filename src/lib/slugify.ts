export function slugify(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")            // DoubleBlur → Double Blur
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")      // HTMLParser → HTML Parser
    .replace(/&/g, " and ").replace(/@/g, " at ").replace(/\+/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    || `found-${Math.random().toString(16).slice(2, 10)}`
}
