import { Resend } from "resend"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `https://${ROOT_DOMAIN}`
const GREEN = "#32D074"
const BLACK = "#080A09"

type CompanyEmailRow = {
  id: string
  name: string
  slug: string
  email: string | null
  site_live_email_sent_at?: string | null
  activation_reminder_sent_at?: string | null
  subscription_status?: string | null
}

type AdminClient = any

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function textButton(label: string, href: string, filled = true) {
  return `<a href="${href}" style="display:block;text-align:center;border-radius:999px;padding:17px 22px;text-decoration:none;font-size:15px;font-weight:800;letter-spacing:0.01em;${filled ? `background:${GREEN};color:${BLACK};` : `background:#ffffff;color:${BLACK};border:1px solid #dfdfdf;`}">${label}</a>`
}

function shell({ eyebrow, title, body, primary, secondary, footer }: {
  eyebrow: string
  title: string
  body: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  footer: string
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BLACK};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f1;padding:36px 14px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:22px;overflow:hidden;border:1px solid #e8e8e3;">
        <tr>
          <td style="background:${BLACK};padding:30px 28px;text-align:center;">
            <span style="font-size:21px;font-weight:300;letter-spacing:10px;color:#ffffff;text-transform:uppercase;">FOUND</span>
          </td>
        </tr>
        <tr>
          <td style="padding:42px 32px 34px;text-align:left;">
            <p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:2.4px;text-transform:uppercase;color:${GREEN};">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0 0 16px;font-size:34px;line-height:1.06;font-weight:800;letter-spacing:-0.02em;color:${BLACK};">${escapeHtml(title)}</h1>
            <p style="margin:0 0 30px;font-size:17px;line-height:1.55;color:#575754;">${body}</p>
            ${textButton(primary.label, primary.href, true)}
            ${secondary ? `<div style="height:10px;"></div>${textButton(secondary.label, secondary.href, false)}` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:22px 32px 28px;border-top:1px solid #eeeeea;text-align:center;">
            <p style="margin:0;font-size:13px;line-height:1.5;color:#8b8b86;">${footer}</p>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#aaa9a3;">Reply anytime. A person will read it.</p>
    </td></tr>
  </table>
</body>
</html>`
}

export function buildSiteLiveEmail(company: { id: string; name: string; slug: string }) {
  const safeName = escapeHtml(company.name)
  const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
  const dashboardUrl = `https://my.${ROOT_DOMAIN}/api/select-company?id=${encodeURIComponent(company.id)}&activated=true`
  return {
    subject: `${company.name} is live.`,
    html: shell({
      eyebrow: "Site live",
      title: `${company.name} is live.`,
      body: `${safeName} is now turned on for customers. Open the dashboard to tune the details, or view the site exactly as customers will see it.`,
      primary: { label: "Open your dashboard", href: dashboardUrl },
      secondary: { label: "View your site", href: siteUrl },
      footer: `${company.slug}.${ROOT_DOMAIN}`,
    }),
    text: `${company.name} is live.\n\nYour site is now turned on for customers.\n\nOpen your dashboard:\n${dashboardUrl}\n\nView your site:\n${siteUrl}\n\n- The Found Team`,
  }
}

export function buildActivationReminderEmail(company: { name: string; slug: string }) {
  const siteUrl = `https://${company.slug}.${ROOT_DOMAIN}`
  const activationUrl = `${APP_URL}/activate?slug=${company.slug}`
  return {
    subject: `${company.name} is ready when you are.`,
    html: shell({
      eyebrow: "Preview saved",
      title: `${company.name} is waiting.`,
      body: `Your preview is saved. Add payment when you are ready, and Found will turn the site on for customers.`,
      primary: { label: "Activate your site", href: activationUrl },
      secondary: { label: "Preview your site", href: siteUrl },
      footer: `${company.slug}.${ROOT_DOMAIN}`,
    }),
    text: `${company.name} is ready when you are.\n\nYour preview is saved. Add payment to turn it on for customers.\n\nActivate your site:\n${activationUrl}\n\nPreview your site:\n${siteUrl}\n\n- The Found Team`,
  }
}

async function reserveEmailSend(admin: AdminClient, companyId: string, column: "site_live_email_sent_at" | "activation_reminder_sent_at", sentAt: string) {
  return admin
    .from("companies")
    .update({ [column]: sentAt })
    .eq("id", companyId)
    .is(column, null)
    .select("id")
    .maybeSingle()
}

export async function sendSiteLiveEmailOnce(admin: AdminClient, companyId: string) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "missing_resend" }

  const { data: company, error } = await admin
    .from("companies")
    .select("id, name, slug, email, site_live_email_sent_at")
    .eq("id", companyId)
    .maybeSingle()

  if (error || !company?.email) return { sent: false, reason: error?.message ?? "missing_company_email" }
  if (company.site_live_email_sent_at) return { sent: false, reason: "already_sent" }

  const sentAt = new Date().toISOString()
  const { data: reserved, error: markError } = await reserveEmailSend(admin, company.id, "site_live_email_sent_at", sentAt)
  if (markError) return { sent: false, reason: markError.message }
  if (!reserved) return { sent: false, reason: "already_reserved" }

  const email = buildSiteLiveEmail(company)
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "Found <hello@foundco.app>",
    replyTo: "hello@foundco.app",
    to: company.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  return { sent: true }
}

export async function sendActivationReminderEmailOnce(admin: AdminClient, company: CompanyEmailRow) {
  if (!process.env.RESEND_API_KEY) return { sent: false, reason: "missing_resend" }
  if (!company.email) return { sent: false, reason: "missing_company_email" }
  if (company.activation_reminder_sent_at || company.site_live_email_sent_at) return { sent: false, reason: "already_sent" }
  if (company.subscription_status === "active" || company.subscription_status === "trialing") return { sent: false, reason: "already_active" }

  const sentAt = new Date().toISOString()
  const { data: reserved, error: markError } = await reserveEmailSend(admin, company.id, "activation_reminder_sent_at", sentAt)
  if (markError) return { sent: false, reason: markError.message }
  if (!reserved) return { sent: false, reason: "already_reserved" }

  const email = buildActivationReminderEmail(company)
  await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "Found <hello@foundco.app>",
    replyTo: "hello@foundco.app",
    to: company.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  return { sent: true }
}