"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireAdmin, getAdminClient } from "../lib"
import { createOnboardingSite } from "@/app/onboarding/actions"
import { sendTrackedEmail } from "@/lib/emailLog"

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim()
}

function ordinalSuffix(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "st"
  if (n % 10 === 2 && n % 100 !== 12) return "nd"
  if (n % 10 === 3 && n % 100 !== 13) return "rd"
  return "th"
}

const DEFERRAL_TERMS = new Set([30, 60, 90])
const PAYMENT_METHODS = new Set(["cash", "check", "other"])
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

// The owner's due date is at least termDays out, landing on their requested
// day of month if they have one (e.g. "the 25th") - same mechanism the
// activation flow uses to both delay the first charge and anchor every
// renewal after it. Capped 1-28 so there's never a short-month edge case.
function dueDateFor(termDays: number, billingDay: number | null): Date {
  const minDate = new Date(Date.now() + termDays * 24 * 60 * 60 * 1000)
  if (!billingDay) return minDate

  let candidate = new Date(minDate.getFullYear(), minDate.getMonth(), billingDay)
  if (candidate < minDate) candidate = new Date(minDate.getFullYear(), minDate.getMonth() + 1, billingDay)
  return candidate
}

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
    contactName: value(formData, "contactName"),
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

  const billingDayRaw = value(formData, "billingDay")
  const billingDay = billingDayRaw ? Number(billingDayRaw) : null
  if (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 28)) {
    throw new Error("Billing day must be between 1 and 28.")
  }

  const paymentAmountRaw = value(formData, "paymentAmount")
  const paymentAmount = paymentAmountRaw ? Number(paymentAmountRaw) : null
  const paymentMethodRaw = value(formData, "paymentMethod")
  const paymentMethod = paymentMethodRaw && PAYMENT_METHODS.has(paymentMethodRaw) ? paymentMethodRaw : null
  const paymentNote = value(formData, "paymentNote")
  if (paymentAmount !== null && (Number.isNaN(paymentAmount) || paymentAmount < 0)) {
    throw new Error("Payment amount must be a real number.")
  }

  if (!companyId) throw new Error("Missing company.")
  if (!DEFERRAL_TERMS.has(termDays)) throw new Error("Pick 30, 60, or 90 days.")
  if (!reason) throw new Error("A reason is required.")

  const admin = getAdminClient()
  const dueAt = dueDateFor(termDays, billingDay)
  const dueDateLabel = dueAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

  const { error } = await admin
    .from("companies")
    .update({
      trial_ends_at: dueAt.toISOString(),
      billing_cycle_day: billingDay,
      deferred_payment_amount: paymentAmount,
      deferred_payment_method: paymentMethod,
      deferred_payment_note: paymentNote || null,
    })
    .eq("id", companyId)
  if (error) throw new Error(error.message)

  const paymentNoteLine = paymentAmount
    ? ` Already collected: $${paymentAmount.toFixed(2)}${paymentMethod ? ` (${paymentMethod})` : ""}${paymentNote ? ` - ${paymentNote}` : ""}.`
    : ""
  const billingDayLine = billingDay ? ` Billing anchored to the ${billingDay}${ordinalSuffix(billingDay)} of the month.` : ""

  await admin.from("client_activities").insert({
    company_id: companyId,
    activity_type: "note",
    summary: `Deferred billing set: card due by ${dueDateLabel} (${termDays} days).${billingDayLine} If no card is added by then, the public site pauses automatically. Reason: ${reason}.${paymentNoteLine}`,
  })

  if (sendEmail) {
    const { data: company } = await admin.from("companies").select("name, slug, email").eq("id", companyId).single()
    if (company?.email) {
      const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
      const activateUrl = `https://${ROOT_DOMAIN}/activate?slug=${company.slug}`
      await sendTrackedEmail({
        to: company.email,
        subject: `${company.name}, your website is live`,
        html: buildAddCardEmail({ businessName: company.name, siteUrl, activateUrl, dueDateLabel }),
        text: `Your website is live: ${siteUrl}\n\nAdd a card to keep it running - nothing is charged today, billing starts ${dueDateLabel}.\n\nAdd your card: ${activateUrl}\n\n- The Found team`,
        companyId,
        recipientType: "client_owner",
        emailType: "deferred_billing_add_card",
        source: "admin/new-client/deferClientBilling",
        admin,
      })
    }
  }

  revalidatePath("/admin/clients")
  revalidatePath(`/admin/clients/${companyId}`)
  const returnTo = value(formData, "returnTo")
  redirect(returnTo || `/admin/new-client?created=${companyId}&deferred=1`)
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
      await sendTrackedEmail({
        to: company.email,
        subject: `${company.name}, your website is live`,
        html: buildPermanentCompEmail({ businessName: company.name, siteUrl }),
        text: `Your website is live: ${siteUrl}\n\nNo card needed - it's on us.\n\n- The Found team`,
        companyId,
        recipientType: "client_owner",
        emailType: "permanent_comp_live",
        source: "admin/new-client/setPermanentComp",
        admin,
      })
    }
  }

  revalidatePath("/admin/clients")
  revalidatePath(`/admin/clients/${companyId}`)
  const returnTo = value(formData, "returnTo")
  redirect(returnTo || `/admin/new-client?created=${companyId}&deferred=1`)
}
