"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin, getAdminClient } from "../lib"

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function setLeadFlag(formData: FormData) {
  await requireAdmin()
  const leadId = value(formData, "leadId")
  const emailId = value(formData, "emailId")
  const flagged = value(formData, "flagged") === "1"
  const note = value(formData, "note")

  if (!leadId) throw new Error("Missing lead.")

  const admin = getAdminClient()
  const { error } = await admin
    .from("leads")
    .update({ flagged, flag_note: flagged ? note || null : null })
    .eq("id", leadId)
  if (error) throw new Error(error.message)

  revalidatePath("/admin/emails")
  if (emailId) revalidatePath(`/admin/emails/${emailId}`)
}
