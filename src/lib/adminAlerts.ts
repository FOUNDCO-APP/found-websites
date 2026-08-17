import { sendTrackedEmail } from "@/lib/emailLog"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const GREEN = "#32D074"
const BLACK = "#080A09"

// Internal ops alert to Shawn, not a customer-facing lifecycle email - kept
// separate from src/lib/activationEmails.ts on purpose. Best-effort: a
// failed alert should never block someone's actual onboarding flow.
export async function sendNewSignupAlert(company: { id: string; name: string; slug: string; plan: string | null; city: string | null; state: string | null }) {
  if (!process.env.RESEND_API_KEY) return
  const to = process.env.ADMIN_ALERT_EMAIL || "shawnlopez@me.com"
  const location = [company.city, company.state].filter(Boolean).join(", ")
  const planLabel = company.plan === "found_business" ? "Business" : company.plan === "found_pro" ? "Pro" : "Starter"
  try {
    await sendTrackedEmail({
      from: "Found HQ <hello@foundco.app>",
      to,
      subject: `New signup: ${company.name}`,
      companyId: company.id,
      recipientType: "admin",
      emailType: "new_signup_alert",
      source: "adminAlerts/sendNewSignupAlert",
      emailScope: "found",
      text: `New signup: ${company.name}\n\n${planLabel} plan${location ? ` - ${location}` : ""}\n${company.slug}.${ROOT_DOMAIN}`,
      html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:${BLACK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#F6F6F0;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:420px;">
        <tr><td style="padding-bottom:6px;color:${GREEN};font-size:11px;font-weight:800;letter-spacing:0.06em;text-transform:uppercase;">New signup</td></tr>
        <tr><td style="padding-bottom:14px;font-size:24px;font-weight:800;">${company.name}</td></tr>
        <tr><td style="padding-bottom:4px;color:#B8BCB7;font-size:14px;">${planLabel} plan${location ? ` &middot; ${location}` : ""}</td></tr>
        <tr><td style="padding-bottom:24px;color:#B8BCB7;font-size:14px;">${company.slug}.${ROOT_DOMAIN}</td></tr>
        <tr><td>
          <a href="https://admin.${ROOT_DOMAIN}/clients?q=${encodeURIComponent(company.name)}" style="display:inline-block;border-radius:4px;padding:12px 20px;background:${GREEN};color:${BLACK};text-decoration:none;font-size:13px;font-weight:800;">View in Found HQ</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
    })
  } catch (error) {
    console.error("[adminAlerts] new signup email failed:", error)
  }
}
