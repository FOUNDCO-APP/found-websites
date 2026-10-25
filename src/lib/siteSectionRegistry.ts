import type { LayoutType } from "@/lib/layout"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { getAvailablePrimaryActions, getSiteCTAs } from "@/lib/industryCTAs"

type ConfigLike = Record<string, unknown> | null | undefined

export const SITE_PHOTO_SLOTS = ["hero", "about", "cta", "gallery", "gallery_hero", "announcement", "contact", "services", "shop", "order", "book", "estimate", "menu"] as const
export type SitePhotoSlot = typeof SITE_PHOTO_SLOTS[number]
export type IndependentHeaderSlot = "gallery_hero" | "book" | "estimate" | "menu"

export function isSitePhotoSlot(value: string): value is SitePhotoSlot {
  return (SITE_PHOTO_SLOTS as readonly string[]).includes(value)
}

export function getIndependentHeaderSlots(company: Parameters<typeof getSiteCTAs>[0], activeAddons: string[], assignedSlots: string[] = []): IndependentHeaderSlot[] {
  const availableUrls = getAvailablePrimaryActions(company.industry_category, activeAddons, company.phone, company.booking_cta_label)
    .map(action => getSiteCTAs({ ...company, primary_action_override: action.key }, activeAddons).primary.href)
  const isFood = company.industry_category === "food" || company.industry_category === "home_based_food"
  return (["gallery_hero", "book", "estimate", "menu"] as const).filter(slot => slot === "gallery_hero"
    || assignedSlots.includes(slot) || (slot === "menu" ? isFood : availableUrls.includes(`/${slot}`)))
}

export type SitePhotoSection = {
  slot: SitePhotoSlot
  title: string
  helper: string
  page: string
  position: string
  photoRole: string
}

type SitePhotoSectionArgs = {
  config: ConfigLike
  industryCategory: string
  subIndustry?: string | null
  businessName?: string | null
  layout: LayoutType
  isFoodCatalog?: boolean
}

function clean(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function ctaPosition(layout: LayoutType) {
  switch (layout) {
    case "impact":
    case "editorial":
    case "portrait":
    case "cinematic":
    case "wellness_luxe":
    case "wellness_cinematic":
    default:
      return "Home page, near the bottom, above the footer"
  }
}

export function getSitePhotoSections({ config, industryCategory, subIndustry, businessName, layout, isFoodCatalog = false }: SitePhotoSectionArgs): Record<SitePhotoSlot, SitePhotoSection> {
  const defaults = getIndustryDefaults(industryCategory, subIndustry ?? null)
  const vocab = getVocab(subIndustry ?? null, industryCategory)
  const heroTitle = clean(config?.hero_title) ?? "Homepage"
  const displayName = clean(businessName) ?? "this business"
  const aboutTitle = `About ${displayName}`
  const contactTitle = clean(config?.contact_title) ?? "Contact Us"
  const servicesTitle = vocab.servicesLabel
  const ctaTitle = clean(config?.cta_headline) ?? defaults.ctaHeadline
  const catalogTitle = isFoodCatalog ? "Menu" : "Products"

  return {
    hero: {
      slot: "hero",
      title: heroTitle,
      helper: "Home page, first screen customers see. Main photo.",
      page: "Home",
      position: "Top of page",
      photoRole: "Main photo",
    },
    about: {
      slot: "about",
      title: aboutTitle,
      helper: `About page, top of page. Background photo behind "${aboutTitle}".`,
      page: "About",
      position: "Top of About page",
      photoRole: "Background photo",
    },
    cta: {
      slot: "cta",
      title: ctaTitle,
      helper: `${ctaPosition(layout)}. Background photo behind "${ctaTitle}".`,
      page: "Home",
      position: ctaPosition(layout),
      photoRole: "Background photo",
    },
    gallery: {
      slot: "gallery",
      title: "Gallery",
      helper: "Gallery page and homepage photo strip. Add several strong photos.",
      page: "Gallery",
      position: "Gallery page and photo strips",
      photoRole: "Gallery photos",
    },
    gallery_hero: {
      slot: "gallery_hero", title: "Gallery header photo", helper: "Gallery page, top of page.",
      page: "Gallery", position: "Top of Gallery page", photoRole: "Background photo",
    },
    book: {
      slot: "book", title: "Booking header photo", helper: "Booking page, top of page.",
      page: "Booking", position: "Top of Booking page", photoRole: "Background photo",
    },
    estimate: {
      slot: "estimate", title: "Estimate header photo", helper: "Estimate page, top of page.",
      page: "Estimate", position: "Top of Estimate page", photoRole: "Background photo",
    },
    menu: {
      slot: "menu", title: "Menu header photo", helper: "Menu page, top of page.",
      page: "Menu", position: "Top of Menu page", photoRole: "Background photo",
    },
    announcement: {
      slot: "announcement",
      title: clean(config?.announcement_title) ?? "Featured Update",
      helper: "Home page Featured Update section when it is turned on.",
      page: "Home",
      position: "Featured Update section",
      photoRole: "Feature image",
    },
    contact: {
      slot: "contact",
      title: contactTitle,
      helper: `Contact page, top of page. Background photo behind "${contactTitle}".`,
      page: "Contact",
      position: "Top of Contact page",
      photoRole: "Background photo",
    },
    services: {
      slot: "services",
      title: servicesTitle,
      helper: `Services page, top of page. Background photo behind "${servicesTitle}".`,
      page: "Services",
      position: "Top of Services page",
      photoRole: "Background photo",
    },
    shop: {
      slot: "shop",
      title: catalogTitle,
      helper: `The image behind the ${catalogTitle.toLowerCase()} page.`,
      page: catalogTitle,
      position: `${catalogTitle} page`,
      photoRole: "Page image",
    },
    order: {
      slot: "order",
      title: "Online ordering",
      helper: "The image behind the online ordering page.",
      page: "Online ordering",
      position: "Online ordering page",
      photoRole: "Page image",
    },
  }
}
