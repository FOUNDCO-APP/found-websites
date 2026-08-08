type SpamInput = {
  name?: string | null
  email?: string | null
  phone?: string | null
  message?: string | null
  service?: string | null
  companyName?: string | null
  honeypot?: string | null
}

export type SpamCheck = {
  isSpam: boolean
  score: number
  reasons: string[]
}

const SALES_PHRASES = [
  "qualified clients",
  "more leads",
  "generate leads",
  "google and meta ads",
  "free 7-day trial",
  "no contracts",
  "cancel whenever",
  "traffic gets",
  "high-intent traffic",
  "marketing tool",
  "growth plan",
  "sales call",
  "keywords and locations",
  "visitors instead of random",
  "reputation ltd",
]

const SALES_DOMAINS = [
  "hassanmarketingagency.com",
  "alfareviews.com",
  "vettedvas.com",
  "vas4hire.com",
  "cutt.ly",
  "blankslatelife.com",
  "one-million-people.com",
]

const URL_RE = /\bhttps?:\/\/|www\./i

function normalize(value?: string | null) {
  return (value ?? "").toLowerCase().trim()
}

function emailDomain(email?: string | null) {
  const value = normalize(email)
  const at = value.lastIndexOf("@")
  return at >= 0 ? value.slice(at + 1) : ""
}

function wordCount(value: string) {
  return value.split(/\s+/).filter(Boolean).length
}

export function checkLeadSpam(input: SpamInput): SpamCheck {
  const name = normalize(input.name)
  const email = normalize(input.email)
  const phone = normalize(input.phone)
  const message = normalize(input.message)
  const service = normalize(input.service)
  const companyName = normalize(input.companyName)
  const allText = [name, email, phone, service, message].filter(Boolean).join(" ")
  const reasons: string[] = []
  let score = 0

  if (normalize(input.honeypot)) {
    score += 10
    reasons.push("hidden field filled")
  }

  const domain = emailDomain(email)
  if (domain && SALES_DOMAINS.some(d => domain === d || domain.endsWith(`.${d}`) || allText.includes(d))) {
    score += 5
    reasons.push("known sales domain")
  }

  const matchedPhrases = SALES_PHRASES.filter(phrase => allText.includes(phrase))
  if (matchedPhrases.length) {
    score += Math.min(6, matchedPhrases.length * 2)
    reasons.push("sales pitch language")
  }

  if (URL_RE.test(allText)) {
    score += 2
    reasons.push("external link")
  }

  if (/\bseo\b|\bads?\b|\bmarketing\b|\btraffic\b|\btrial\b|\bcampaign\b|\bclients?\b/.test(allText)) {
    score += 2
    reasons.push("marketing solicitation")
  }

  if (phone && /[a-z]/i.test(phone)) {
    score += 2
    reasons.push("phone field contains words")
  }

  const messageDigits = message.replace(/\D/g, "")
  if (message && messageDigits.length >= 9 && messageDigits.length >= message.length * 0.75) {
    score += 2
    reasons.push("message is mostly a phone number")
  }

  if (message && wordCount(message) > 45 && URL_RE.test(message)) {
    score += 2
    reasons.push("long linked pitch")
  }

  if (companyName && message.includes(companyName) && URL_RE.test(message) && matchedPhrases.length > 0) {
    score += 1
    reasons.push("business-targeted sales pitch")
  }

  return { isSpam: score >= 5, score, reasons }
}

