"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany } from "@/lib/dashboard/getCompany"
import { assignPhotoToSection, toggleGalleryPhoto } from "@/app/dashboard/(app)/site/actions"

export type DestinationIcon = "home" | "person" | "wrench" | "phone" | "tag" | "grid" | "star"

export type PhotoDestination = {
  slot: string
  label: string
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

  const industryCategory = ctx.company.industry_category ?? ""
  const isFoodCatalog = industryCategory === "food" || industryCategory === "home_based_food"

  const destinations: PhotoDestination[] = [
    { slot: "hero", label: "Home top photo", icon: "home", group: "home" },
    { slot: "cta", label: "Home bottom photo", icon: "home", group: "home" },
    { slot: "about", label: "About page photo", icon: "person" },
    { slot: "services", label: "Services page photo", icon: "wrench" },
    { slot: "contact", label: "Contact page photo", icon: "phone" },
  ]

  if (isFoodCatalog) {
    destinations.push({ slot: "order", label: "Menu page photo", icon: "tag" })
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
