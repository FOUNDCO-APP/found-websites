import type { WebsiteConfig } from "@/types/company"

export type AboutHighlight = {
  title: string
  body: string
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function firstClean(...values: unknown[]) {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }
  return ""
}

export function getHomepageAboutCopy(config: WebsiteConfig | null | undefined) {
  return firstClean(config?.about_preview, config?.about_text)
}

export function getFullAboutCopy(config: WebsiteConfig | null | undefined) {
  return firstClean(config?.about_story, config?.about_text)
}

export function getAboutHighlights(config: WebsiteConfig | null | undefined): AboutHighlight[] {
  const raw = config?.about_highlights
  if (!Array.isArray(raw)) return []

  return raw
    .map((item) => {
      if (typeof item === "string") {
        const body = cleanText(item)
        return body ? { title: "What to Expect", body } : null
      }
      if (!item || typeof item !== "object") return null
      const row = item as { title?: unknown; label?: unknown; body?: unknown; text?: unknown; description?: unknown }
      const title = firstClean(row.title, row.label)
      const body = firstClean(row.body, row.text, row.description)
      return title && body ? { title, body } : null
    })
    .filter((item): item is AboutHighlight => item !== null)
    .slice(0, 3)
}