"use server"

import { revalidatePath } from "next/cache"
import { getAdminClient, requireAdmin } from "../lib"

const METHODS = new Set(["call", "text", "email", "skip"])

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function methodLabel(method: string) {
  if (method === "call") return "Call logged"
  if (method === "text") return "Text sent"
  if (method === "email") return "Email sent"
  return "Skipped for now"
}

export async function markClientOutreach(formData: FormData) {
  await requireAdmin()
  const companyId = value(formData, "companyId")
  const method = value(formData, "method")
  const reason = value(formData, "reason")
  if (!companyId || !METHODS.has(method)) throw new Error("Invalid outreach update.")

  const summary = reason ? `${methodLabel(method)}: ${reason}` : methodLabel(method)
  const { error } = await getAdminClient().from("client_activities").insert({
    company_id: companyId,
    activity_type: `outreach_${method}`,
    summary,
    metadata: { method, reason },
  })
  if (error) throw new Error(error.message)

  revalidatePath("/admin")
  revalidatePath("/admin/activity")
  revalidatePath(`/admin/clients/${companyId}`)
}
