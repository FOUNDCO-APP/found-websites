import "server-only"

const DOMAIN = "foundco.app"
const ENDPOINT = "https://foundco.app/api/resend/webhook"
const EVENTS = ["email.received", "email.sent", "email.delivered", "email.delivery_delayed", "email.bounced", "email.complained"] as const
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const choice = (value: unknown, allowed: string[]) => typeof value === "string" && allowed.includes(value) ? value : "unknown"
type Reason = "not_configured" | "forbidden" | "unavailable" | "truncated" | "invalid_response" | "not_found" | "ambiguous" | null
type Read = { value: Record<string, unknown>; reason: Reason }
const status = (value: unknown) => choice(value, ["not_started", "pending", "verified", "failed", "temporary_failure"])

/** Admin caller required. Fixed GETs only; no response bodies/errors are ever forwarded. */
export async function getAdminMailConfig() {
  const key = process.env.RESEND_API_KEY
  async function read(path: string): Promise<Read> {
    if (!key) return { value: {}, reason: "not_configured" }
    if (path !== "/domains?limit=100" && path !== "/webhooks?limit=100" && !/^\/domains\/[0-9a-f-]{36}$/i.test(path)) return { value: {}, reason: "invalid_response" }
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined
    try {
      const response = await fetch(`https://api.resend.com${path}`, { method: "GET", headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store" })
      if (!response.ok || !response.body || Number(response.headers.get("content-length") ?? 0) > 262144) {
        await response.body?.cancel()
        return { value: {}, reason: response.status === 403 || response.status === 401 ? "forbidden" : "unavailable" }
      }
      reader = response.body.getReader()
      const chunks: Uint8Array[] = []; let bytes = 0
      for (;;) {
        const part = await reader.read(); if (part.done) break
        bytes += part.value.byteLength; if (bytes > 262144) throw new Error("Size limit")
        chunks.push(part.value)
      }
      const value = object(JSON.parse(Buffer.concat(chunks).toString("utf8")))
      return { value, reason: null }
    } catch { return { value: {}, reason: "unavailable" } }
    finally { await reader?.cancel().catch(() => undefined) }
  }
  function list(result: Read): Read {
    if (result.reason) return result
    if (result.value.has_more === true) return { value: {}, reason: "truncated" }
    if (result.value.has_more !== false || !Array.isArray(result.value.data) || result.value.data.length > 100) return { value: {}, reason: "invalid_response" }
    return result
  }
  const [domainList, webhookList] = (await Promise.all([read("/domains?limit=100"), read("/webhooks?limit=100")])).map(list)
  const matches = (domainList.value.data as unknown[] | undefined)?.map(object).filter(row => row.name === DOMAIN) ?? []
  let domainReason: Reason = domainList.reason
  let domain: null | { name: string; status: string; verified: boolean; capabilities: { sending: string; receiving: string }; records: Array<{ name: string; type: string; record: string; value: string | null; status: string; ttl: string | number | null; priority: number | null }> } = null
  if (!domainReason) {
    if (matches.length !== 1) domainReason = matches.length ? "ambiguous" : "not_found"
    else if (typeof matches[0].id !== "string" || !UUID.test(matches[0].id)) domainReason = "invalid_response"
    else {
      const detail = await read(`/domains/${matches[0].id}`), row = detail.value
      domainReason = detail.reason
      if (!domainReason && (row.id !== matches[0].id || row.name !== DOMAIN || !Array.isArray(row.records) || row.records.length > 50)) domainReason = "invalid_response"
      if (!domainReason) {
        // Only public DNS records for this exact domain. No arbitrary strings,
        // email addresses, private fields or provider error text reach the result.
        const records = (row.records as unknown[]).map(object).flatMap(record => {
          const name = record.name, type = record.type, value = record.value
          if (typeof name !== "string" || !/^(?:@|send|resend\._domainkey|_dmarc|links)(?:\.foundco\.app)?$|^foundco\.app$/.test(name) || !["TXT", "MX", "CNAME"].includes(String(type))) return []
          const safe = typeof value === "string" && value.length <= 4096 && !value.includes(key!) && !/@|whsec_|re_|secret|bearer|[\r\n\u0000]/i.test(value) &&
            (type === "TXT" ? /^"?(?:v=spf1 [a-z0-9:._+~? /=-]+|(?:v=DKIM1; ?k=rsa; ?)?p=[a-z0-9+/=; ]+|v=DMARC1; ?p=(?:none|quarantine|reject);?)"?$/i.test(value) : /^[a-z0-9.-]+\.(?:amazonses\.com|amazonaws\.com|resend-dns\.com|resend\.com|forge\.rmta\.net)\.?$/i.test(value))
          return [{ name, type: String(type), record: choice(record.record, ["SPF", "DKIM", "DMARC", "MX", "Receiving", "Tracking"]), value: safe ? value as string : null,
            status: status(record.status), ttl: record.ttl === "Auto" ? "Auto" : typeof record.ttl === "number" && Number.isSafeInteger(record.ttl) && record.ttl >= 0 ? record.ttl : null,
            priority: typeof record.priority === "number" && Number.isSafeInteger(record.priority) && record.priority >= 0 && record.priority <= 65535 ? record.priority : null }]
        })
        const capabilities = object(row.capabilities)
        domain = { name: DOMAIN, status: status(row.status), verified: row.status === "verified",
          capabilities: { sending: choice(capabilities.sending, ["enabled", "disabled"]), receiving: choice(capabilities.receiving, ["enabled", "disabled"]) }, records }
      }
    }
  }
  const hooks = (webhookList.value.data as unknown[] | undefined)?.map(object).filter(row => row.endpoint === ENDPOINT) ?? []
  let webhookReason = webhookList.reason
  if (!webhookReason && hooks.length !== 1) webhookReason = hooks.length ? "ambiguous" : "not_found"
  if (!webhookReason && (!Array.isArray(hooks[0].events) || !hooks[0].events.every(event => typeof event === "string"))) webhookReason = "invalid_response"
  const events = Object.fromEntries(EVENTS.map(event => [event, webhookReason ? null : (hooks[0].events as string[]).includes(event)]))
  return { keyConfigured: !!key,
    domain: { access: domainReason ? "cannot_verify" : "readable", reason: domainReason, data: domain },
    webhook: { access: webhookReason ? "cannot_verify" : "readable", reason: webhookReason, endpointMatched: webhookReason ? null : true,
      status: webhookReason ? "unknown" : choice(hooks[0].status, ["enabled", "disabled"]), events,
      requiredEventsComplete: webhookReason ? null : EVENTS.every(event => events[event] === true) },
    evidence: "Provider metadata only; no DNS changes, test sends, or end-to-end receiving verification." }
}
