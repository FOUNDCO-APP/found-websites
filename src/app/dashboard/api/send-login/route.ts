import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"
import { checkPublicRateLimit, rateLimitResponse } from "@/lib/security/rateLimit"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || !String(email).includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }

    const normalizedEmail = String(email).toLowerCase().trim()
    const limit = checkPublicRateLimit(req, { key: `magic-login:${normalizedEmail}`, limit: 5, windowMs: 15 * 60 * 1000 })
    if (!limit.allowed) return rateLimitResponse(limit)

    const resend = new Resend(process.env.RESEND_API_KEY)
    const admin = createAdminClient()

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: { redirectTo: `https://my.${ROOT_DOMAIN}/auth/callback` },
    })

    if (error || !data?.properties?.action_link) {
      console.error("[send-login] generateLink error:", error)
      return NextResponse.json({ error: "Failed to generate link" }, { status: 500 })
    }

    const link = data.properties.action_link

    await resend.emails.send({
      from: "Found <hello@foundco.app>",
      to: normalizedEmail,
      subject: "Your Found link ->",
      html: buildMagicLinkEmail(link),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[send-login] error:", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

function buildMagicLinkEmail(link: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your Found link</title>
</head>
<body style="margin:0;padding:0;background:#080A09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!--[if mso]><table width="100%"><tr><td><![endif]-->

  <!-- Hidden preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#080A09;">
    One tap. Your site, your leads - open and waiting.&nbsp;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;&zwnj;
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080A09;min-height:100%;">
    <tr>
      <td align="center" style="padding:60px 24px 80px;">
        <table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0" border="0">

          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding:0 0 64px;">
              <span style="font-size:16px;font-weight:300;color:#ffffff;letter-spacing:14px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">FOUND</span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:0 0 16px;">
              <h1 style="margin:0;font-size:52px;font-weight:200;color:#ffffff;letter-spacing:-0.03em;line-height:1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                You're in.
              </h1>
            </td>
          </tr>

          <!-- Subtext -->
          <tr>
            <td align="center" style="padding:0 0 52px;">
              <p style="margin:0;font-size:17px;font-weight:300;color:rgba(255,255,255,0.38);line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Your site. Your leads. Your dashboard.<br>Everything waiting - one tap away.
              </p>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding:0 0 52px;">
              <a href="${link}"
                style="display:inline-block;background:#32D074;color:#080A09;font-size:13px;font-weight:900;padding:20px 48px;border-radius:100px;text-decoration:none;letter-spacing:0.16em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Open Dashboard ->
              </a>
            </td>
          </tr>

          <!-- Rule -->
          <tr>
            <td style="padding:0 0 36px;">
              <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
            </td>
          </tr>

          <!-- Expiry -->
          <tr>
            <td align="center" style="padding:0 0 16px;">
              <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.9;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                This link expires in 60&nbsp;minutes and can only be used once.<br>
                If you didn't request this, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:48px 0 0;">
              <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Found Co. &nbsp;-&nbsp; Tucson, AZ
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`
}
