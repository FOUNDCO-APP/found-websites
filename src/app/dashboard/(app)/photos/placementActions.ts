"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { getLayout } from "@/lib/layout"
import { getSitePhotoSections } from "@/lib/siteSectionRegistry"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { assignPhotoToSection, toggleGalleryPhoto } from "@/app/dashboard/(app)/site/actions"

export type DestinationIcon = "home" | "person" | "wrench" | "phone" | "tag" | "grid" | "star"

export type PhotoDestination = {
  slot: string
  label: string
  subLabel?: string
  icon: DestinationIcon
  group?: "home"
  toggle?: boolean
}

async function getContext() {
  const user = await getAuthUser()
  if (!user) return null
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return null
  return { user, company, admin: createAdminClient() }
}

export async function getPhotoDestinationOptions(): Promise<PhotoDestination[] | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const { data: config } = await ctx.admin
    .from("website_config")
    .select("*")
    .eq("company_id", ctx.company.id)
    .single()

  const industryCategory = ctx.company.industry_category ?? ""
  const isFoodCatalog = industryCategory === "food" || industryCategory === "home_based_food"
  const layout = getLayout(industryCategory, ctx.company.vibe ?? "", ctx.company.layout_override)

  const sections = getSitePhotoSections({
    config,
    industryCategory,
    subIndustry: ctx.company.sub_industry,
    businessName: ctx.company.name,
    layout,
    isFoodCatalog,
  })
  const vocab = getVocab(ctx.company.sub_industry ?? null, industryCategory)
  const hasHomepagePhotoStrip = ["impact", "portrait", "wellness_luxe", "wellness_cinematic"].includes(layout)

  const destinations: PhotoDestination[] = [
    { slot: "hero", label: "Home top", icon: "home", group: "home" },
    { slot: "cta", label: "Home bottom", icon: "home", group: "home" },
    { slot: "about", label: sections.about.page, icon: "person" },
    { slot: "services", label: sections.services.page, icon: "wrench" },
    { slot: "contact", label: sections.contact.page, icon: "phone" },
  ]

  if (isFoodCatalog) {
    destinations.push({ slot: "order", label: sections.order.page, icon: "tag" })
  } else {
    destinations.push({ slot: "shop", label: sections.shop.page, icon: "tag" })
  }

  if (config?.announcement_enabled) {
    destinations.push({ slot: "announcement", label: sections.announcement.page + " — Featured Update", icon: "star" })
  }

  destinations.push({
    slot: "gallery",
    label: hasHomepagePhotoStrip ? "Homepage photos" : "Website gallery",
    subLabel: hasHomepagePhotoStrip
      ? `Also appears on the ${vocab.galleryLabel} page`
      : `Appears on the ${vocab.galleryLabel} page`,
    icon: "grid",
    toggle: true,
  })

  return destinations
}

export async function placePhoto(photoId: string, destinationSlot: string) {
  if (destinationSlot === "gallery") {
    return toggleGalleryPhoto(photoId, true)
  }
  return assignPhotoToSection(photoId, destinationSlot)
}

export async function removeFromGallery(photoId: string) {
  return toggleGalleryPhoto(photoId, false)
}
