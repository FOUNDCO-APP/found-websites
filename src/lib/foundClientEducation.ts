/** Draft planning only. This module never enrolls, schedules, stores or sends. */
export const disabledByDefault = true

export type EducationLesson = "orientation" | "camera" | "gallery" | "update" | "pro" | "share"
function planned(lesson: EducationLesson, dayOffset: number) {
  return Object.freeze({ lesson, dayOffset, status: "Planned" as const, disabledByDefault: true as const })
}

/** Offsets from verified activation plus separately approved enrollment. */
export const NEW_CLIENT_PATH = Object.freeze([
  planned("orientation", 3), planned("camera", 7), planned("gallery", 14),
  planned("update", 21), planned("pro", 28), planned("share", 35),
])
/** Offsets from explicitly approved existing-client enrollment; never catch up. */
export const EXISTING_CLIENT_PATH = Object.freeze([
  planned("orientation", 0), planned("camera", 7), planned("gallery", 14),
  planned("update", 21), planned("pro", 28), planned("share", 35),
])
export const MONTHLY = Object.freeze({
  status: "Planned" as const, disabledByDefault: true as const,
  daysAfterLastLesson: 30, intervalDays: 30, requiresSeparateOptIn: true,
})

export type EducationEligibilityInput = {
  eligibilityVerified?: boolean | null
  active?: boolean | null
  retired?: boolean | null
  optedOut?: boolean | null
  bounced?: boolean | null
  complained?: boolean | null
  onHold?: boolean | null
  enrollmentApproved?: boolean | null
  exactDraftApproved?: boolean | null
}

/** Eligibility is a review aid, never permission to send or evidence of nonuse. */
export function getEducationEligibility(input: EducationEligibilityInput): { eligible: boolean; reasons: string[]; status: "Planned" } {
  const reasons: string[] = []
  if (input.eligibilityVerified !== true) reasons.push("Eligibility not verified")
  if (input.active !== true) reasons.push("Active status not verified")
  for (const [field, reason] of [
    ["retired", "Retirement"], ["optedOut", "Opt-out"], ["bounced", "Bounce"],
    ["complained", "Complaint"], ["onHold", "Hold"],
  ] as const) {
    if (input[field] !== false) reasons.push(`${reason} present or unknown`)
  }
  if (input.enrollmentApproved !== true) reasons.push("Enrollment approval required")
  if (input.exactDraftApproved !== true) reasons.push("Exact draft approval required")
  return { eligible: reasons.length === 0, reasons, status: "Planned" }
}

export type OrientationEmailInput = {
  companyId: string
  businessName: string
  firstName: string
  websiteUrl: string
  websiteVerified: boolean
  usesIncludedAddress: boolean
  /** Caller must supply an explicitly verified and draft-approved help contact. */
  helpEmail: string
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function websiteAddress(input: OrientationEmailInput): string {
  if (input.websiteVerified !== true) throw new Error("Verify the current website address before drafting.")
  if (typeof input.usesIncludedAddress !== "boolean") throw new Error("Confirm the address type before drafting.")
  let url: URL
  try { url = new URL(input.websiteUrl) } catch { throw new Error("Invalid website URL.") }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || url.pathname !== "/" ||
      !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(url.hostname) ||
      /\.(?:localhost|local|invalid|test|internal)$/i.test(url.hostname)) throw new Error("Use a public HTTPS website root address.")
  if (input.usesIncludedAddress && (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.foundco\.app$/i.test(url.hostname) ||
      /^(?:my|www|admin)\.foundco\.app$/i.test(url.hostname))) throw new Error("Included address must be the verified company Found address.")
  return url.origin
}

/** Builds an exact draft only; verification/approvals must come from the caller. */
export function buildOrientationEmail(input: OrientationEmailInput): { subject: string; text: string; html: string } {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.companyId)) throw new Error("Invalid company UUID.")
  if (!input.businessName.trim() || !input.firstName.trim()) throw new Error("Business name and first name are required.")
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(input.helpEmail) || /[\r\n]/.test(input.helpEmail)) throw new Error("A verified help email address is required.")
  const website = websiteAddress(input)
  const dashboard = `https://my.foundco.app/api/select-company?id=${encodeURIComponent(input.companyId)}`
  const subject = "A quick check-in from Shawn at Found"
  const paragraphs = [
    `Hi ${input.firstName.trim()},`,
    `I wanted to make sure you know where everything lives for ${input.businessName.trim()}. Your website is ${website}.`,
    ...(input.usesIncludedAddress ? [
      "Your Found address is included at no extra charge and works now. You can share that link by text, add it to your existing Google Business Profile or Facebook page, and put it on business cards. There’s no need to buy another address.",
      "If you’d prefer a custom address like YourBusiness.com (subject to availability), you can buy one through GoDaddy or your existing registrar. Use your own account so you own it. The domain purchase and yearly renewal cost extra, separate from Found. We’ll walk you through connecting it.",
    ] : []),
    "Open your dashboard to manage your website, check inquiries and explore the tools included with your plan. Already been using it? Great—if you need a hand, I’m here to help.",
  ]
  const footer = `Questions, need a hand, or want to stop these tips? Email ${input.helpEmail}.`
  const text = [...paragraphs, `Open my dashboard: ${dashboard}`, "Shawn at Found", footer].join("\n\n")
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#080a09;color:#f4f6f4;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="overflow-wrap:anywhere;word-break:break-word;">
<p style="margin:0 0 28px;font-size:18px;letter-spacing:4px;color:#f4f6f4;">FOUND</p>
<h1 style="margin:0 0 24px;font-size:24px;line-height:1.3;font-weight:600;">A quick check-in</h1>
${paragraphs.map(paragraph => `<p style="margin:0 0 20px;font-size:17px;line-height:1.6;color:#d4d9d5;">${escapeHtml(paragraph)}</p>`).join("\n")}
<p style="margin:28px 0;"><a href="${escapeHtml(dashboard)}" style="display:block;box-sizing:border-box;min-height:48px;padding:16px;text-align:center;background:#32d074;color:#080a09;border-radius:12px;font-size:17px;font-weight:600;line-height:1.4;text-decoration:none;">Open my dashboard</a></p>
<p style="font-size:17px;line-height:1.6;color:#d4d9d5;">Shawn at Found</p>
<p style="margin:24px 0 0;border-top:1px solid #343a36;padding-top:20px;font-size:14px;line-height:1.6;color:#b7bcb9;">${escapeHtml(footer)}</p>
</td></tr></table></td></tr></table></body></html>`
  return { subject, text, html }
}
