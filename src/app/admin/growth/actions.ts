"use server"

import { revalidatePath } from "next/cache"
import { getAdminClient, requireAdmin } from "../lib"
import { slugify } from "@/lib/slugify"

const OUTREACH_METHODS = new Set(["call", "text", "email", "skip", "reviewed"])

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function refresh() {
  revalidatePath("/admin")
  revalidatePath("/admin/growth")
}

function methodLabel(method: string) {
  if (method === "call") return "Call logged"
  if (method === "text") return "Text sent"
  if (method === "email") return "Email sent"
  if (method === "reviewed") return "Reviewed"
  return "Skipped for now"
}

function followUpDays(method: string) {
  if (method === "reviewed") return 1
  return method === "skip" ? 7 : 3
}

// Deliberately minimal - a name, a business, a way to reach them, and an
// optional note. No stage, no estimated plan, no follow-up date. Team
// decision 2026-08-11: this isn't a CRM pipeline, it's a quick way to jot
// down a real person worth following up with (a referral, someone Shawn
// met) - not a system that needs feeding and maintaining.
export async function addLead(formData: FormData) {
  await requireAdmin()
  const personName = value(formData, "person_name")
  const businessName = value(formData, "business_name")
  const email = value(formData, "email")
  const phone = value(formData, "phone")
  if (!personName || !businessName || (!email && !phone)) throw new Error("Name, business, and email or phone are required.")

  const admin = getAdminClient()
  const { data, error } = await admin.from("sales_prospects").insert({
    person_name: personName,
    business_name: businessName,
    email: email || null,
    phone: phone || null,
    source: "manual",
    notes: value(formData, "notes") || null,
  }).select("id").single()
  if (error) throw new Error(error.message)
  await admin.from("sales_activities").insert({
    prospect_id: data.id,
    activity_type: "created",
    summary: "Lead added",
  })
  refresh()
}

// A lead that isn't going anywhere - no reason required (this is a quick
// note-tracker, not a CRM asking Shawn to justify a loss).
export async function dismissLead(prospectId: string) {
  await requireAdmin()
  const admin = getAdminClient()
  const { error } = await admin.from("sales_prospects").update({
    stage: "lost",
    lost_at: new Date().toISOString(),
    loss_reason: "Not moving forward",
  }).eq("id", prospectId)
  if (error) throw new Error(error.message)
  refresh()
}

export async function markLeadOutreach(formData: FormData) {
  await requireAdmin()
  const prospectId = value(formData, "prospectId")
  const method = value(formData, "method")
  const reason = value(formData, "reason")
  if (!prospectId || !OUTREACH_METHODS.has(method)) throw new Error("Invalid lead outreach update.")

  const days = followUpDays(method)
  const nextFollowUpAt = new Date(Date.now() + days * 86400000).toISOString()
  const summary = reason ? `${methodLabel(method)}: ${reason}` : methodLabel(method)
  const { error } = await getAdminClient().from("sales_activities").insert({
    prospect_id: prospectId,
    activity_type: `outreach_${method}`,
    summary,
    metadata: { method, reason, follow_up_days: days, next_follow_up_at: nextFollowUpAt },
  })
  if (error) throw new Error(error.message)
  refresh()
}

// "Convert Won to a client/company without retyping identity data" - the one
// required action from the V2 spec that was never built. Marking a lead
// converted now does both things at once: sets stage to won AND creates or
// links the real client record, instead of two separate manual steps. If a
// matching company already exists (by email), link it - zero retyping. If
// not, create a minimal client stub carrying over the identity data already
// on the lead, so Shawn finishes setup instead of starting from zero.
export async function convertLeadToClient(prospectId: string) {
  await requireAdmin()
  const admin = getAdminClient()

  const { data: prospect, error: readError } = await admin.from("sales_prospects")
    .select("id, person_name, business_name, email, phone, linked_company_id")
    .eq("id", prospectId)
    .single()
  if (readError) throw new Error(readError.message)

  const now = new Date().toISOString()
  if (prospect.linked_company_id) {
    await admin.from("sales_prospects").update({ stage: "won", won_at: now }).eq("id", prospectId)
    refresh()
    return { companyId: prospect.linked_company_id, created: false }
  }

  if (prospect.email) {
    const { data: existing } = await admin.from("companies")
      .select("id")
      .ilike("email", prospect.email)
      .limit(1)
      .maybeSingle()
    if (existing) {
      await admin.from("sales_prospects").update({ linked_company_id: existing.id, stage: "won", won_at: now }).eq("id", prospectId)
      await admin.from("client_activities").insert({ company_id: existing.id, activity_type: "note", summary: `Linked to converted lead ${prospect.business_name}` })
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

  await admin.from("sales_prospects").update({ linked_company_id: created.id, stage: "won", won_at: now }).eq("id", prospectId)
  await admin.from("client_activities").insert({ company_id: created.id, activity_type: "note", summary: `Created from converted lead (${prospect.person_name})` })
  refresh()
  return { companyId: created.id, created: true }
}
