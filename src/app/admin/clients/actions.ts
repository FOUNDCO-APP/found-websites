"use server"

import { revalidatePath } from "next/cache"
import { getAdminClient, requireAdmin } from "../lib"

const STATES = new Set(["onboarding", "active", "comp", "past_due", "cancelled"])

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

export async function updateClientRecord(formData: FormData) {
  await requireAdmin()
  const id = value(formData, "id")
  const state = value(formData, "client_state")
  const accountKind = value(formData, "account_kind")
  const note = value(formData, "activity_note")
  if (!id || !STATES.has(state) || !["client", "test"].includes(accountKind)) throw new Error("Invalid client update.")
  const compReason = value(formData, "comp_reason")
  if (state === "comp" && !compReason) throw new Error("A comp reason is required.")

  const admin = getAdminClient()
  const { data: current, error: readError } = await admin.from("companies")
    .select("client_state, account_kind")
    .eq("id", id)
    .single()
  if (readError) throw new Error(readError.message)

  const patch: Record<string, unknown> = {
    client_state: state,
    account_kind: accountKind,
    is_comp: state === "comp",
    comp_reason: state === "comp" ? compReason : null,
  }
  if (state === "comp") patch.subscription_status = "active"
  const { error } = await admin.from("companies").update(patch).eq("id", id)
  if (error) throw new Error(error.message)

  const activities = []
  if (current.client_state !== state) activities.push({ company_id: id, activity_type: "state_change", summary: `Client state changed from ${current.client_state ?? "unset"} to ${state}` })
  if (current.account_kind !== accountKind) activities.push({ company_id: id, activity_type: "state_change", summary: `Account classified as ${accountKind}` })
  if (note) activities.push({ company_id: id, activity_type: "note", summary: note })
  if (activities.length) await admin.from("client_activities").insert(activities)
  revalidatePath("/admin")
  revalidatePath("/admin/clients")
}

export async function addClientNote(formData: FormData) {
  await requireAdmin()
  const id = value(formData, "id")
  const note = value(formData, "note")
  if (!id || !note) throw new Error("A note is required.")
  const { error } = await getAdminClient().from("client_activities").insert({ company_id: id, activity_type: "note", summary: note })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/clients")
}
