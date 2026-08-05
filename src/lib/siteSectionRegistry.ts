import type { LayoutType } from "@/lib/layout"
import { getIndustryDefaults } from "@/lib/industryDefaults"
import { getVocab } from "@/lib/subIndustryVocabulary"

type ConfigLike = Record<string, unknown> | null | undefined

export type SitePhotoSlot = "hero" | "about" | "cta" | "gallery" | "announcement" | "contact" | "services" | "shop" | "order"

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
      title: "Menu",
      helper: "The image behind the menu page.",
      page: "Menu",
      position: "Menu page",
      photoRole: "Page image",
    },
  }
}