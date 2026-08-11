"use server"

import { revalidatePath } from "next/cache"
import { getAdminClient, requireAdmin } from "../lib"
import { slugify } from "@/lib/slugify"

const STAGES = new Set(["new", "contacted", "demo_scheduled", "proposal_sent", "won", "lost"])
const PLANS = new Set(["found", "found_pro", "found_business"])

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function refresh() {
  revalidatePath("/admin")
  revalidatePath("/admin/sales")
}

export async function createProspect(formData: FormData) {
  await requireAdmin()
  const personName = value(formData, "person_name")
  const businessName = value(formData, "business_name")
  const email = value(formData, "email")
  const phone = value(formData, "phone")
  if (!personName || !businessName || (!email && !phone)) throw new Error("Name, business, and email or phone are required.")

  const plan = value(formData, "estimated_plan")
  const nextFollowUp = value(formData, "next_follow_up_at")
  const admin = getAdminClient()
  const { data, error } = await admin.from("sales_prospects").insert({
    person_name: personName,
    business_name: businessName,
    email: email || null,
    phone: phone || null,
    source: value(formData, "source") || "manual",
    estimated_plan: PLANS.has(plan) ? plan : null,
    next_follow_up_at: nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
    notes: value(formData, "notes") || null,
  }).select("id").single()
  if (error) throw new Error(error.message)
  await admin.from("sales_activities").insert({
    prospect_id: data.id,
    activity_type: "created",
    summary: "Prospect added",
  })
  refresh()
}

export async function updateProspect(formData: FormData) {
  await requireAdmin()
  const id = value(formData, "id")
  const stage = value(formData, "stage")
  if (!id || !STAGES.has(stage)) throw new Error("Invalid prospect update.")

  const admin = getAdminClient()
  const { data: current, error: readError } = await admin.from("sales_prospects")
    .select("stage, next_follow_up_at")
    .eq("id", id)
    .single()
  if (readError) throw new Error(readError.message)

  const nextFollowUp = value(formData, "next_follow_up_at")
  const lossReason = value(formData, "loss_reason")
  if (stage === "lost" && !lossReason) throw new Error("A loss reason is required.")

  const now = new Date().toISOString()
  const patch = {
    stage,
    next_follow_up_at: stage === "won" || stage === "lost" ? null : nextFollowUp ? new Date(nextFollowUp).toISOString() : null,
    loss_reason: stage === "lost" ? lossReason : null,
    won_at: stage === "won" ? now : null,
    lost_at: stage === "lost" ? now : null,
    updated_at: now,
  }
  const { error } = await admin.from("sales_prospects").update(patch).eq("id", id)
  if (error) throw new Error(error.message)

  const activities = []
  if (current.stage !== stage) activities.push({
    prospect_id: id,
    activity_type: "stage_change",
    summary: `Stage changed from ${current.stage} to ${stage}`,
    metadata: { from: current.stage, to: stage },
  })
  if ((current.next_follow_up_at ?? "") !== (patch.next_follow_up_at ?? "")) activities.push({
    prospect_id: id,
    activity_type: "follow_up_change",
    summary: patch.next_follow_up_at ? "Follow-up scheduled" : "Follow-up cleared",
    metadata: { due_at: patch.next_follow_up_at },
  })
  if (activities.length) await admin.from("sales_activities").insert(activities)
  refresh()
}

// "Convert Won to a client/company without retyping identity data" - the one
// required action from the V2 spec that was never built. Marking a prospect
// Won previously did nothing beyond the stage change; the business had to be
// manually re-entered from scratch in Clients. This closes that gap: if a
// matching company already exists (by email), link it - zero retyping. If
// not, create a minimal client stub carrying over the identity data already
// on the prospect, so Shawn finishes setup instead of starting from zero.
export async function convertProspectToClient(prospectId: string) {
  await requireAdmin()
  const admin = getAdminClient()

  const { data: prospect, error: readError } = await admin.from("sales_prospects")
    .select("id, person_name, business_name, email, phone, linked_company_id, stage")
    .eq("id", prospectId)
    .single()
  if (readError) throw new Error(readError.message)
  if (prospect.linked_company_id) return { companyId: prospect.linked_company_id, created: false }

  if (prospect.email) {
    const { data: existing } = await admin.from("companies")
      .select("id")
      .ilike("email", prospect.email)
      .limit(1)
      .maybeSingle()
    if (existing) {
      await admin.from("sales_prospects").update({ linked_company_id: existing.id }).eq("id", prospectId)
      await admin.from("client_activities").insert({ company_id: existing.id, activity_type: "note", summary: `Linked to Won prospect ${prospect.business_name}` })
      refresh()
      return { companyId: existing.id, created: false }
    }
  }

  const base = slugify(prospect.business_name) || "client"
  let slug = base
  const { data: taken } = await admin.from("companies").select("slug").ilike("slug", `${base}%`)
  if ((taken ?? []).some((row) => row.slug === slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`

  const { data: created, error: createError } = await admin.from("companies").insert({
    name: prospect.business_name,
    slug,
    email: prospect.email || null,
    phone: prospect.phone || null,
    account_kind: "client",
    client_state: "onboarding",
  }).select("id").single()
  if (createError) throw new Error(createError.message)

  await admin.from("sales_prospects").update({ linked_company_id: created.id }).eq("id", prospectId)
  await admin.from("client_activities").insert({ company_id: created.id, activity_type: "note", summary: `Created from Won prospect (${prospect.person_name})` })
  refresh()
  return { companyId: created.id, created: true }
}

export async function logProspectActivity(formData: FormData) {
  await requireAdmin()
  const id = value(formData, "id")
  const type = value(formData, "activity_type")
  const summary = value(formData, "summary")
  if (!id || !["call", "text", "email", "note"].includes(type) || !summary) throw new Error("Activity details are required.")
  const admin = getAdminClient()
  const { error } = await admin.from("sales_activities").insert({
    prospect_id: id,
    activity_type: type,
    summary,
  })
  if (error) throw new Error(error.message)
  await admin.from("sales_prospects").update({ updated_at: new Date().toISOString() }).eq("id", id)
  refresh()
}
