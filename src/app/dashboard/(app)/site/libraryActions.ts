"use server"

import { resolveDashboardIdentity } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAvailableStockPhotos } from "@/lib/stockPhotoLibrary"
import { isSecurityGuardIndustry } from "@/lib/industryDetection"
import { importOwnerStockPhoto } from "@/lib/ownerStockLibrary"
import { revalidatePath } from "next/cache"

async function getContext() {
  const identity = await resolveDashboardIdentity()
  if (!identity) return null
  const company = await getCompany(identity.userId, identity.userEmail)
  if (!company || !(await requireOwnerAccess(identity.userId, identity.userEmail, company))) return null
  return { company, admin: createAdminClient() }
}

export async function getOwnerStockLibrary() {
  const ctx = await getContext()
  if (!ctx) return { error: "Owner access is required.", photos: [], eligible: false }
  return {
    photos: [...getAvailableStockPhotos(ctx.company.industry_category, ctx.company.sub_industry)],
    eligible: ctx.company.industry_category === "professional_services" && isSecurityGuardIndustry(ctx.company.sub_industry),
  }
}

export async function importStockLibraryPhoto(stockId: string) {
  const ctx = await getContext()
  if (!ctx) return { error: "Owner access is required." }
  if (typeof stockId !== "string") return { error: "Choose a library photo." }
  try {
    const photo = await importOwnerStockPhoto(ctx.admin, ctx.company, stockId)
    revalidatePath("/dashboard/site")
    revalidatePath("/dashboard/photos")
    return { photo }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add this photo. Please try again." }
  }
}
