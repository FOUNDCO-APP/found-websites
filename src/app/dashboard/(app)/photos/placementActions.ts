"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { assignPhotoToSection, toggleGalleryPhoto } from "@/app/dashboard/(app)/site/actions"
import { getIndependentHeaderSlots } from "@/lib/siteSectionRegistry"
import { getEffectiveAddons } from "@/lib/featureAccess"

export type DestinationIcon = "home" | "person" | "wrench" | "phone" | "tag" | "grid" | "star"

export type PhotoDestination = {
  slot: string
  label: string
  icon: DestinationIcon
  group?: "home"
  toggle?: boolean
}

async function getContext() {
  const identity = await resolveDashboardIdentity()
  if (!identity) return null
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company) return null
  if (!(await requireOwnerAccess(identity.userId, identity.userEmail, company))) return null
  return { identity, company, admin: createAdminClient() }
}

export async function getPhotoDestinationOptions(): Promise<PhotoDestination[] | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: "Not authenticated" }

  const industryCategory = ctx.company.industry_category ?? ""
  const isFoodCatalog = industryCategory === "food" || industryCategory === "home_based_food"
  const [{ data: addons, error: addonError }, { data: placed, error: photoError }] = await Promise.all([
    ctx.admin.from("addon_subscriptions").select("addon_slug").eq("company_id", ctx.company.id).eq("active", true),
    ctx.admin.from("company_photos").select("website_section").eq("company_id", ctx.company.id).in("website_section", ["gallery_hero", "book", "estimate", "menu"]),
  ])
  if (addonError || photoError) return { error: "Could not read available photo destinations" }
  const activeAddons = getEffectiveAddons(ctx.company.plan, (addons ?? []).map(row => row.addon_slug), ctx.company.included_addon_slug, ctx.company.disabled_addons ?? [])
  const independentSlots = getIndependentHeaderSlots({ industry_category: industryCategory, primary_intent: ctx.company.primary_intent ?? "contact", phone: ctx.company.phone,
    booking_cta_label: ctx.company.booking_cta_label }, activeAddons, (placed ?? []).map(row => row.website_section))

  const destinations: PhotoDestination[] = [
    { slot: "hero", label: "Home top photo", icon: "home", group: "home" },
    { slot: "cta", label: "Home bottom photo", icon: "home", group: "home" },
    { slot: "about", label: "About page photo", icon: "person" },
    { slot: "services", label: "Services page photo", icon: "wrench" },
    { slot: "contact", label: "Contact page photo", icon: "phone" },
    ...independentSlots.map(slot => ({ slot, label: ({ gallery_hero: "Gallery header photo", book: "Booking header photo", estimate: "Estimate header photo", menu: "Menu header photo" })[slot], icon: (slot === "gallery_hero" ? "grid" : "tag") as DestinationIcon })),
  ]

  if (isFoodCatalog) {
    destinations.push({ slot: "order", label: "Online ordering photo", icon: "tag" })
  } else {
    destinations.push({ slot: "shop", label: "Products page photo", icon: "tag" })
  }

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
