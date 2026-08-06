"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { getLayout } from "@/lib/layout"
import { getSitePhotoSections } from "@/lib/siteSectionRegistry"
import { getVocab } from "@/lib/subIndustryVocabulary"
import { assignPhotoToSection, toggleGalleryPhoto } from "@/app/dashboard/(app)/site/actions"

export type PhotoDestination = {
  slot: string
  label: string
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

  const destinations: PhotoDestination[] = [
    { slot: "hero", label: `Top of ${sections.hero.page} page` },
    { slot: "cta", label: `Bottom of ${sections.cta.page} page` },
    { slot: "about", label: sections.about.page },
    { slot: "services", label: sections.services.page },
    { slot: "contact", label: sections.contact.page },
  ]

  if (isFoodCatalog) {
    destinations.push({ slot: "order", label: sections.order.page })
  } else {
    destinations.push({ slot: "shop", label: sections.shop.page })
  }

  if (config?.announcement_enabled) {
    destinations.push({ slot: "announcement", label: sections.announcement.page + " — Featured Update" })
  }

  destinations.push({ slot: "gallery", label: vocab.galleryLabel, toggle: true })

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
