"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin, getAdminClient } from "../lib"
import { createOnboardingSite } from "@/app/onboarding/actions"

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

const DEFERRAL_TERMS = new Set([30, 60, 90])

export async function createManualClientSite(formData: FormData) {
  await requireAdmin()

  const location = [value(formData, "city"), value(formData, "state")].filter(Boolean).join(", ")

  const result = await createOnboardingSite({
    name: value(formData, "name"),
    description: value(formData, "description"),
    industry: value(formData, "industry") || null,
    subIndustry: value(formData, "subIndustry"),
    location,
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    different: value(formData, "different"),
    services: value(formData, "services"),
    testimonials: value(formData, "testimonials"),
    photoChoice: "curated",
    logoChoice: "initials",
    primaryColor: value(formData, "primaryColor") || "#2E7D32",
    vibe: value(formData, "vibe") || "bold",
    plan: value(formData, "plan") || "found",
  })

  if (!result.success || !result.companyId) {
    throw new Error(result.error || "Could not create the site.")
  }

  revalidatePath("/admin/clients")
  redirect(`/admin/new-client?created=${result.companyId}`)
}

export async function deferClientBilling(formData: FormData) {
  await requireAdmin()
  const companyId = value(formData, "companyId")
  const termDays = Number(value(formData, "termDays"))
  const reason = value(formData, "reason")

  if (!companyId) throw new Error("Missing company.")
  if (!DEFERRAL_TERMS.has(termDays)) throw new Error("Pick 30, 60, or 90 days.")
  if (!reason) throw new Error("A reason is required.")

  const admin = getAdminClient()
  const dueAt = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000)

  const { error } = await admin
    .from("companies")
    .update({ trial_ends_at: dueAt.toISOString() })
    .eq("id", companyId)
  if (error) throw new Error(error.message)

  await admin.from("client_activities").insert({
    company_id: companyId,
    activity_type: "note",
    summary: `Deferred billing set: card due by ${dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} (${termDays} days). If no card is added by then, the public site pauses automatically. Reason: ${reason}`,
  })

  revalidatePath("/admin/clients")
  redirect(`/admin/new-client?created=${companyId}&deferred=1`)
}
