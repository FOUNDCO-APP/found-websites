import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

type BillingLinkKind = "pay" | "setup"

const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
}

function failure(status: 404 | 503) {
  return new Response(status === 404 ? "Not found" : "Service unavailable", { status, headers })
}

function validDestination(value: unknown, kind: BillingLinkKind): value is string {
  if (typeof value !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(value)) return false
  const host = kind === "pay" ? "invoice.stripe.com" : "checkout.stripe.com"
  // Check the raw authority too: URL parsing normalizes explicit default ports.
  if (!value.startsWith(`https://${host}/`)) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname === host && !url.username && !url.password && !url.port
  } catch {
    return false
  }
}

export async function billingLinkRedirect(code: string, kind: BillingLinkKind): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{22}$/.test(code)) return failure(404)
  try {
    const { data, error } = await createAdminClient().from("billing_objects").select("facts")
      .eq("account_scope", "platform").eq("livemode", true)
      .eq("object_type", "billing_link_redirect").eq("object_id", code).maybeSingle()
    if (error) return failure(503)
    const facts = data?.facts
    if (!facts || facts.kind !== kind || facts.revoked !== false || typeof facts.expires_at !== "string") {
      return failure(404)
    }
    const expiresAt = Date.parse(facts.expires_at)
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !validDestination(facts.destination_url, kind)) {
      return failure(404)
    }
    // Preserve Stripe's complete API-returned URL, including its required fragment.
    return new Response(null, { status: 302, headers: { ...headers, Location: facts.destination_url } })
  } catch {
    return failure(503)
  }
}
