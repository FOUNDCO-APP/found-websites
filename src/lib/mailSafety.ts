/** Pure inbound parsing. Provider API fields are evidence; message headers are not. */
export const FOUND_MAIL_ADDRESSES = ["hello@foundco.app", "support@foundco.app", "shawn@foundco.app"] as const
export type MailAttachment = { id: string; filename: string; content_type: string; size: number | null; quarantined: true }
export type ParsedInboundMail = {
  from_address: string | null; from_name: string | null; reply_to_address: string | null
  to_addresses: string[]; subject: string; body_text: string; message_id: string | null
  in_reply_to: string | null; reference_ids: string[]; attachments: MailAttachment[]
  folder: "inbox" | "spam"; spam_reasons: string[]; hard_blocked: boolean
  authentication: { spf: string; dkim: string; dmarc: string }; reply_warnings: string[]
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const clean = (value: unknown, limit: number) => typeof value === "string" ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, limit) : ""

export function parseSingleMailbox(value: unknown): { address: string; name: string | null } | null {
  if (typeof value !== "string" || value.length > 512 || /[\r\n\u0000]/.test(value)) return null
  const text = value.trim()
  const match = text.match(/^([^<>]*)<([^<>]+)>$/)
  const address = (match ? match[2] : text).trim()
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/i.test(address) || address.length > 254) return null
  return { address: address.toLowerCase(), name: match ? clean(match[1].trim().replace(/^"|"$/g, ""), 120) || null : null }
}

export function safeMessageId(value: unknown): string | null {
  return typeof value === "string" && value.length <= 250 && /^<[^<>\s\u0000-\u001f\u007f]+@[^<>\s\u0000-\u001f\u007f]+>$/.test(value) ? value : null
}

function plainTextFromHtml(value: string): string {
  return value.replace(/<(script|style|iframe|object|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(?:br|\/p|\/div|\/li|\/tr)\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);/g, entity => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " " })[entity] ?? entity)
    .replace(/\n{4,}/g, "\n\n").trim()
}

/** raw must be obtained from the authenticated receiving API, not webhook headers. */
export function parseInboundEmail(raw: unknown, options: { blocked?: boolean; allowed?: boolean; recentCount?: number } = {}): ParsedInboundMail {
  const input = record(raw), headers = record(input.headers)
  const sender = parseSingleMailbox(input.from)
  const recipients = Array.isArray(input.to) ? input.to.slice(0, 50).map(parseSingleMailbox).filter((item): item is NonNullable<typeof item> => !!item).map(item => item.address) : []
  const replyValues = Array.isArray(input.reply_to) ? input.reply_to : []
  const reply = replyValues.length === 1 ? parseSingleMailbox(replyValues[0]) : null
  const reasons: string[] = [], warnings: string[] = []
  let score = 0, hard = false
  const flag = (reason: string, weight: number, severe = false) => { reasons.push(reason); score += weight; hard ||= severe }
  if (!sender) flag("Sender address could not be safely parsed", 10, true)
  if (!recipients.some(address => FOUND_MAIL_ADDRESSES.some(supported => supported === address))) flag("Sent to an unsupported Found address; review before choosing an approved From", 5)
  if (options.blocked) flag("Sender is blocked", 10, true)
  if (replyValues.length > 1 || (replyValues.length === 1 && !reply)) { warnings.push("Reply address is ambiguous or invalid"); flag("Reply address requires review", 5, true) }
  if (reply && sender && reply.address !== sender.address) warnings.push("Reply-To differs from the sender. Check the recipient before sending.")
  const auth = record(input.authentication)
  const result = (value: unknown) => ["pass", "fail", "gray", "processing_failed", "unknown"].includes(String(value)) ? String(value) : "unknown"
  const authentication = { spf: result(auth.spf), dkim: result(auth.dkim), dmarc: result(auth.dmarc) }
  if (authentication.dmarc === "fail") flag("Provider reports failed sender authentication", 10, true)
  else if (authentication.spf === "fail" && authentication.dkim === "fail") flag("Provider reports failed SPF and DKIM checks", 6, true)
  // Unknown evidence is not a pass, but does not alone condemn legitimate mail.
  if (Object.values(authentication).every(value => value === "unknown")) reasons.push("Sender authentication evidence unavailable")
  const textSource = typeof input.text === "string" && input.text.trim() ? input.text : plainTextFromHtml(clean(input.html, 500000))
  const body = clean(textSource, 200000)
  if (textSource.length > 200000) flag("Message is too long; only an excerpt is retained", 8, true)
  const subject = clean(input.subject, 500).replace(/[\r\n]/g, " ")
  const content = `${subject}\n${body}`
  if (/(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i.test(content) || /\b(?:seed phrase|recovery phrase|send your password|verify your password)\b/i.test(content)) flag("Potentially dangerous content", 8, true)
  if (/https?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?:[/:]|\b)/i.test(content)) flag("Link uses a numeric host", 3)
  if ((content.match(/https?:\/\//gi)?.length ?? 0) > 12) flag("Unusually many external links", 3)
  const pitches = [/we (?:can|will) (?:boost|improve) your (?:rankings|seo)/i, /buy (?:our|my) (?:leads|backlinks)/i, /guaranteed (?:google|search) rankings/i, /outsourc(?:e|ing) your (?:work|business)/i]
  const pitchCount = pitches.filter(pattern => pattern.test(content)).length
  if (pitchCount >= 2 && !options.allowed) flag("Multiple unsolicited sales-pitch signals", 5)
  if ((options.recentCount ?? 0) >= 20) flag("Sender volume requires review", 6)
  const attachments: MailAttachment[] = []
  if (Array.isArray(input.attachments)) {
    if (input.attachments.length > 50) flag("Attachment count exceeds the review limit", 10, true)
    for (const value of input.attachments.slice(0, 50)) {
      const attachment = record(value)
      const filename = clean(attachment.filename, 240) || "Unnamed attachment"
      attachments.push({ id: clean(attachment.id, 200), filename, content_type: clean(attachment.content_type, 120) || "application/octet-stream", size: typeof attachment.size === "number" && Number.isFinite(attachment.size) && attachment.size >= 0 ? attachment.size : null, quarantined: true })
      if (/\.(?:exe|com|bat|cmd|ps1|js|vbs|scr|msi|html?|svg|docm|xlsm|zip|rar|7z)$/i.test(filename)) flag("Potentially unsafe attachment remains quarantined", 8, true)
    }
  }
  const header = (name: string): unknown => Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1]
  const references = typeof header("references") === "string" ? String(header("references")).match(/<[^<>\s]+>/g) ?? [] : []
  return { from_address: sender?.address ?? null, from_name: sender?.name ?? null,
    reply_to_address: reply?.address ?? null, to_addresses: [...new Set(recipients)], subject, body_text: body,
    message_id: safeMessageId(input.message_id), in_reply_to: safeMessageId(header("in-reply-to")),
    reference_ids: [...new Set(references.map(safeMessageId).filter((id): id is string => !!id))].slice(-20),
    attachments, folder: score >= 5 ? "spam" : "inbox", spam_reasons: reasons,
    hard_blocked: hard, authentication, reply_warnings: warnings }
}

export function getManualReplyTarget(message: { from_address: string | null; reply_to_address: string | null; to_addresses: string[]; hard_blocked?: boolean; folder?: string }, selectedFrom?: string): { to: string | null; from: string | null; warnings: string[]; fromOptions: string[]; requiresFromChoice: boolean } {
  const to = parseSingleMailbox(message.reply_to_address ?? message.from_address)?.address ?? null
  const known = FOUND_MAIL_ADDRESSES.filter(address => message.to_addresses.map(value => value.toLowerCase()).includes(address))
  const fromOptions: string[] = known.length ? [...known] : [...FOUND_MAIL_ADDRESSES]
  const requiresFromChoice = known.length !== 1
  const selected = selectedFrom?.trim().toLowerCase()
  const from = selected ? fromOptions.includes(selected) ? selected : null : known.length === 1 ? known[0] : null
  const warnings = message.reply_to_address && message.reply_to_address !== message.from_address ? ["Reply-To differs from the sender. Confirm the exact recipient."] : []
  if (!known.length) warnings.push(message.folder === "inbox"
    ? "This message used an unknown address. Explicitly choose an approved From before replying."
    : "This message used an unknown address. Move it to Inbox, then explicitly choose an approved From.")
  else if (requiresFromChoice && !from) warnings.push("Choose which received Found address to reply from.")
  if (!to || message.hard_blocked || FOUND_MAIL_ADDRESSES.some(address => address === to)) return { to: null, from, fromOptions, requiresFromChoice, warnings: [...warnings, "This message requires review before replying."] }
  if (!known.length && message.folder !== "inbox") return { to, from: null, fromOptions, requiresFromChoice, warnings }
  return { to, from, fromOptions, requiresFromChoice, warnings }
}
