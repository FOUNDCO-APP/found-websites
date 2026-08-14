"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { Resend } from "resend"
import { requireAdmin, getAdminClient } from "../lib"
import { createOnboardingSite } from "@/app/onboarding/actions"

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

const DEFERRAL_TERMS = new Set([30, 60, 90])
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

function emailShell({ eyebrow, businessName, bodyHtml }: { eyebrow: string; businessName: string; bodyHtml: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:#080A09;padding:32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#32D074;">${eyebrow}</p>
            <h1 style="margin:0;font-size:28px;font-weight:300;color:#ffffff;letter-spacing:6px;">FOUND</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 36px;">
            <p style="margin:0 0 20px;font-size:17px;font-weight:800;color:#111111;">Hey ${businessName},</p>
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="margin:0;font-size:11px;color:#bbbbbb;">Powered by <a href="https://${ROOT_DOMAIN}" style="color:#bbbbbb;text-decoration:underline;">Found</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function buildAddCardEmail({ businessName, siteUrl, activateUrl, dueDateLabel }: { businessName: string; siteUrl: string; activateUrl: string; dueDateLabel: string }) {
  return emailShell({
    eyebrow: "Your website is live",
    businessName,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.75;">Your website is live and ready to share:</p>
      <p style="margin:0 0 28px;"><a href="${siteUrl}" style="display:inline-block;background:#080A09;color:#ffffff;font-size:14px;font-weight:900;padding:14px 32px;border-radius:50px;text-decoration:none;">View my site</a></p>
      <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.75;">One thing left: add a card to keep it running. Nothing is charged today - billing starts ${dueDateLabel}.</p>
      <p style="margin:0;"><a href="${activateUrl}" style="display:inline-block;background:#32D074;color:#080A09;font-size:14px;font-weight:900;padding:16px 36px;border-radius:50px;text-decoration:none;">Add my card</a></p>
    `,
  })
}

function buildPermanentCompEmail({ businessName, siteUrl }: { businessName: string; siteUrl: string }) {
  return emailShell({
    eyebrow: "Your website is live",
    businessName,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;color:#444444;line-height:1.75;">Your website is live and ready to share:</p>
      <p style="margin:0;"><a href="${siteUrl}" style="display:inline-block;background:#32D074;color:#080A09;font-size:14px;font-weight:900;padding:16px 36px;border-radius:50px;text-decoration:none;">View my site</a></p>
      <p style="margin:16px 0 0;font-size:15px;color:#444444;line-height:1.75;">No card needed - it's on us.</p>
    `,
  })
}

async function sendClientEmail({
  admin,
  companyId,
  to,
  subject,
  html,
  text,
  label,
}: {
  admin: ReturnType<typeof getAdminClient>
  companyId: string
  to: string
  subject: string
  html: string
  text: string
  label: string
}) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({ from: "Found <hello@foundco.app>", to, subject, html, text })
    await admin.from("client_activities").insert({
      company_id: companyId,
      activity_type: "email",
      summary: `Sent: ${label} to ${to}`,
    })
    return true
  } catch (err) {
    console.error("[admin/new-client] email failed:", label, err)
    await admin.from("client_activities").insert({
      company_id: companyId,
      activity_type: "email",
      summary: `FAILED to send: ${label} to ${to} - send manually`,
    })
    return false
  }
}

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
  const sendEmail = value(formData, "sendEmail") === "1"

  if (!companyId) throw new Error("Missing company.")
  if (!DEFERRAL_TERMS.has(termDays)) throw new Error("Pick 30, 60, or 90 days.")
  if (!reason) throw new Error("A reason is required.")

  const admin = getAdminClient()
  const dueAt = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000)
  const dueDateLabel = dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const { error } = await admin
    .from("companies")
    .update({ trial_ends_at: dueAt.toISOString() })
    .eq("id", companyId)
  if (error) throw new Error(error.message)

  await admin.from("client_activities").insert({
    company_id: companyId,
    activity_type: "note",
    summary: `Deferred billing set: card due by ${dueDateLabel} (${termDays} days). If no card is added by then, the public site pauses automatically. Reason: ${reason}`,
  })

  if (sendEmail) {
    const { data: company } = await admin.from("companies").select("name, slug, email").eq("id", companyId).single()
    if (company?.email) {
      const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
      const activateUrl = `https://${ROOT_DOMAIN}/activate?slug=${company.slug}`
      await sendClientEmail({
        admin,
        companyId,
        to: company.email,
        subject: `${company.name}, your website is live`,
        html: buildAddCardEmail({ businessName: company.name, siteUrl, activateUrl, dueDateLabel }),
        text: `Your website is live: ${siteUrl}\n\nAdd a card to keep it running - nothing is charged today, billing starts ${dueDateLabel}.\n\nAdd your card: ${activateUrl}\n\n- The Found team`,
        label: "Add your card (deferred billing)",
      })
    }
  }

  revalidatePath("/admin/clients")
  redirect(`/admin/new-client?created=${companyId}&deferred=1`)
}

export async function setPermanentComp(formData: FormData) {
  await requireAdmin()
  const companyId = value(formData, "companyId")
  const reason = value(formData, "reason")
  const sendEmail = value(formData, "sendEmail") === "1"

  if (!companyId) throw new Error("Missing company.")
  if (!reason) throw new Error("A reason is required.")

  const admin = getAdminClient()

  const { error } = await admin
    .from("companies")
    .update({ is_comp: true, subscription_status: "active", comp_reason: reason, client_state: "comp" })
    .eq("id", companyId)
  if (error) throw new Error(error.message)

  await admin.from("client_activities").insert({
    company_id: companyId,
    activity_type: "state_change",
    summary: `Set to permanent comp (free forever, no billing). Reason: ${reason}`,
  })

  if (sendEmail) {
    const { data: company } = await admin.from("companies").select("name, slug, email").eq("id", companyId).single()
    if (company?.email) {
      const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
      await sendClientEmail({
        admin,
        companyId,
        to: company.email,
        subject: `${company.name}, your website is live`,
        html: buildPermanentCompEmail({ businessName: company.name, siteUrl }),
        text: `Your website is live: ${siteUrl}\n\nNo card needed - it's on us.\n\n- The Found team`,
        label: "Site is live (permanent, no charge)",
      })
    }
  }

  revalidatePath("/admin/clients")
  redirect(`/admin/new-client?created=${companyId}&deferred=1`)
}
