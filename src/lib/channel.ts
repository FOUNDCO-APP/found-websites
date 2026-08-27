// Buckets a raw referrer host or a UTM source into one plain-English channel
// label. Shared by the visit tracker (site_visits.entry_channel) and by lead
// attribution (leads.entry_channel) so the "visits by channel" and "leads by
// channel" numbers in the Traffic Report can never quietly disagree - two
// copies of this logic drifting apart is exactly how that happens.

export type Channel =
  | "Google"
  | "Bing"
  | "Instagram"
  | "Facebook"
  | "TikTok"
  | "YouTube"
  | "LinkedIn"
  | "Reddit"
  | "X / Twitter"
  | "Yelp"
  | "Nextdoor"
  | "ChatGPT"
  | "Perplexity"
  | "Gemini"
  | "AI Assistant"
  | "Email"
  | "Paid Ads"
  | "Referral"
  | "Direct"
  | "Other"

function normalizeHost(referrer: string): string | null {
  try {
    return new URL(referrer).hostname.replace(/^(www|m|l|lm|out)\./, "").toLowerCase()
  } catch {
    return null
  }
}

export function channelFromReferrer(referrer: string | null | undefined): Channel {
  if (!referrer) return "Direct"
  const host = normalizeHost(referrer)
  if (!host) return "Other"

  // Search
  if (/(^|\.)google\./.test(host)) return "Google"
  if (host.includes("bing.com")) return "Bing"
  if (host.includes("duckduckgo.com") || host.includes("ecosia.org") || host.includes("search.brave.com")) return "Other"

  // Answer / generative engines
  if (host.includes("chat.openai.com") || host.includes("chatgpt.com")) return "ChatGPT"
  if (host.includes("perplexity.ai")) return "Perplexity"
  if (host.includes("gemini.google.com") || host.includes("bard.google.com")) return "Gemini"
  if (host.includes("copilot.microsoft.com")) return "AI Assistant"

  // Social
  if (host.includes("instagram.com")) return "Instagram"
  if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("fb.me")) return "Facebook"
  if (host.includes("tiktok.com")) return "TikTok"
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube"
  if (host.includes("linkedin.com") || host.includes("lnkd.in")) return "LinkedIn"
  if (host.includes("reddit.com")) return "Reddit"
  if (host === "t.co" || host.includes("twitter.com") || host === "x.com") return "X / Twitter"

  // Local / directories
  if (host.includes("yelp.com")) return "Yelp"
  if (host.includes("nextdoor.com")) return "Nextdoor"

  // Email clients
  if (host.includes("mail.google.com") || host.includes("outlook.") || host.includes("mail.yahoo.")) return "Email"

  if (host.includes("foundco.app")) return "Direct"
  return "Other"
}

export function channelFromUtm(
  utmSource: string | null | undefined,
  utmMedium?: string | null | undefined,
): Channel | null {
  const s = (utmSource ?? "").trim().toLowerCase()
  const m = (utmMedium ?? "").trim().toLowerCase()
  if (!s && !m) return null

  if (m.includes("cpc") || m.includes("ppc") || m.includes("paid") || s.includes("adwords") || s.includes("googleads")) {
    return "Paid Ads"
  }
  if (m === "email" || s.includes("newsletter") || s.includes("email")) return "Email"

  if (s.includes("instagram") || s === "ig") return "Instagram"
  if (s.includes("facebook") || s === "fb" || s.includes("meta")) return "Facebook"
  if (s.includes("tiktok")) return "TikTok"
  if (s.includes("youtube")) return "YouTube"
  if (s.includes("linkedin")) return "LinkedIn"
  if (s.includes("reddit")) return "Reddit"
  if (s === "twitter" || s === "x") return "X / Twitter"
  if (s.includes("google")) return "Google"
  if (s.includes("bing")) return "Bing"
  if (s.includes("yelp")) return "Yelp"
  if (s.includes("nextdoor")) return "Nextdoor"
  if (s.includes("referral") || s.includes("partner") || s.includes("friend")) return "Referral"
  if (s.includes("chatgpt") || s.includes("openai")) return "ChatGPT"
  if (s.includes("perplexity")) return "Perplexity"

  return "Other"
}

// UTM wins over referrer when both are present - an explicitly tagged link is
// a stronger signal than whatever host the browser happened to report.
export function resolveChannel(
  utmSource: string | null | undefined,
  utmMedium: string | null | undefined,
  referrer: string | null | undefined,
): Channel {
  return channelFromUtm(utmSource, utmMedium) ?? channelFromReferrer(referrer)
}

// Owners don't know what "Direct" means. In the founder Traffic Report we keep
// it precise; a future owner-facing version can relabel via this.
export function channelDisplayLabel(channel: string): string {
  if (channel === "Direct") return "Direct / typed in / DMs"
  if (channel === "AI Assistant") return "AI assistant"
  return channel
}
