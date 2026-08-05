import { excerptText } from "@/lib/textExcerpt"

export type PublicServiceCopyContext = {
  industryCategory?: string | null
  subIndustry?: string | null
}

function isGenericServiceDescription(value: string) {
  return /^(clear|practical) help (built|shaped) around/i.test(value.trim())
}

function beautyServiceFallback(name: string) {
  const key = name.toLowerCase()
  if (key.includes("facial")) return "Customized facial care focused on comfort, visible glow, and a calm appointment."
  if (key.includes("wax")) return "Clean, careful waxing with a steady hand and attention to comfort."
  if (key.includes("lash")) return "Detailed lash services shaped around your natural features and preferred look."
  if (key.includes("brow")) return "Precise brow care with shape, balance, and polish in mind."
  if (key.includes("hair")) return "Polished hair care shaped around your style, schedule, and everyday confidence."
  return `Thoughtful ${name.toLowerCase()} shaped around comfort, detail, and visible results.`
}

function defaultServiceFallback(name: string) {
  return `${name} handled with clear communication, careful work, and attention to the details customers notice.`
}

export function publicServiceDescription(
  service: { name: string; description?: string | null },
  context: PublicServiceCopyContext = {},
  limit = 55,
) {
  const description = service.description?.trim() ?? ""
  if (description && !isGenericServiceDescription(description)) return excerptText(description, limit)

  const industry = context.industryCategory ?? ""
  const subIndustry = context.subIndustry ?? ""
  const isBeautyContext = ["beauty", "wellness"].includes(industry) || /salon|spa|esthetic|esthetician|beauty|lash|brow|hair/i.test(subIndustry)
  const fallback = isBeautyContext ? beautyServiceFallback(service.name) : defaultServiceFallback(service.name)
  return excerptText(fallback, limit)
}
