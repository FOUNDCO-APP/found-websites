"use server"

import { getAuthUser } from "@/lib/auth/getAuthUser"
import { getCompany, requireOwnerAccess, type CompanyRow } from "@/lib/dashboard/getCompany"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"

export type TeamMember = {
  id: string
  email: string
  role: "worker"
  status: "active" | "revoked"
  created_at: string
}

async function getOwnerContext() {
  const user = await getAuthUser()
  if (!user) return null
  const company = await getCompany(user.id, user.email ?? "")
  if (!company) return null
  if (!(await requireOwnerAccess(user.id, user.email ?? "", company))) return null
  return { user, company, admin: createAdminClient() }
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const ctx = await getOwnerContext()
  if (!ctx) return []

  const { data } = await ctx.admin
    .from("company_members")
    .select("id, email, role, status, created_at")
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false })

  return (data ?? []) as TeamMember[]
}

export async function inviteWorker(rawEmail: string): Promise<{ error: string } | { success: true }> {
  const ctx = await getOwnerContext()
  if (!ctx) return { error: "Not authenticated" }

  const email = rawEmail.trim().toLowerCase()
  if (!email || !email.includes("@")) return { error: "Enter a valid email" }
  if (email === ctx.company.email?.toLowerCase()) return { error: "That's your own login email" }

  const { admin, company, user } = ctx

  const { data: existing } = await admin
    .from("company_members")
    .select("id, status")
    .eq("company_id", company.id)
    .eq("email", email)
    .maybeSingle()

  if (existing && existing.status === "active") {
    return { error: "Already on your team" }
  }

  // Creates the Supabase Auth user if one doesn't exist yet for this email,
  // same generateLink call the existing owner magic-link login uses.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `https://my.${ROOT_DOMAIN}/auth/callback` },
  })
  if (linkError || !linkData?.properties?.action_link || !linkData.user?.id) {
    console.error("[inviteWorker] generateLink error:", linkError)
    return { error: "Could not create login for that email" }
  }

  if (existing) {
    const { error } = await admin
      .from("company_members")
      .update({ status: "active", user_id: linkData.user.id, invited_by: user.id })
      .eq("id", existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin
      .from("company_members")
      .insert({
        company_id: company.id,
        user_id: linkData.user.id,
        email,
        role: "worker",
        status: "active",
        invited_by: user.id,
      })
    if (error) return { error: error.message }
  }

  await sendWorkerInviteEmail(email, linkData.properties.action_link, company)
  return { success: true }
}

export async function revokeWorker(memberId: string): Promise<{ error: string } | { success: true }> {
  const ctx = await getOwnerContext()
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await ctx.admin
    .from("company_members")
    .update({ status: "revoked" })
    .eq("id", memberId)
    .eq("company_id", ctx.company.id)

  if (error) return { error: error.message }
  return { success: true }
}

async function sendWorkerInviteEmail(email: string, link: string, company: Pick<CompanyRow, "name">) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return
  const resend = new Resend(resendKey)
  try {
    await resend.emails.send({
      from: "Found <hello@foundco.app>",
      to: email,
      subject: `${company.name} added you to their Found team`,
      html: buildInviteEmail(link, company.name),
    })
  } catch (err) {
    console.error("[inviteWorker] email send failed:", err)
  }
}

function buildInviteEmail(link: string, companyName: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're on the team</title>
</head>
<body style="margin:0;padding:0;background:#080A09;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#080A09;min-height:100%;">
    <tr>
      <td align="center" style="padding:60px 24px 80px;">
        <table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center" style="padding:0 0 64px;">
              <span style="font-size:16px;font-weight:300;color:#ffffff;letter-spacing:14px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">FOUND</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 16px;">
              <h1 style="margin:0;font-size:44px;font-weight:200;color:#ffffff;letter-spacing:-0.03em;line-height:1.1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                You're on the team.
              </h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 52px;">
              <p style="margin:0;font-size:17px;font-weight:300;color:rgba(255,255,255,0.38);line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                ${companyName} added you to capture job photos.<br>Tap below to open your camera.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 52px;">
              <a href="${link}"
                style="display:inline-block;background:#32D074;color:#080A09;font-size:13px;font-weight:900;padding:20px 48px;border-radius:100px;text-decoration:none;letter-spacing:0.16em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Open Camera &rarr;
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 36px;">
              <div style="height:1px;background:rgba(255,255,255,0.07);"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 16px;">
              <p style="margin:0 0 14px;font-size:11px;color:rgba(255,255,255,0.18);line-height:1.9;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                This link expires in 60&nbsp;minutes and can only be used once.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:48px 0 0;">
              <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.1);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                Found Co.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
