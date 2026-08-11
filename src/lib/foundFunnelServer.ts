type ServerFunnelProperties = {
  company_id?: string | null
  slug?: string | null
  plan_name?: string | null
  method?: string
  value?: number
  currency?: string
}

export async function captureFoundActivationCompleted(properties: ServerFunnelProperties) {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com").replace(/\/$/, "")
  if (!key) return

  try {
    await fetch(`${host}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: "activation_completed",
        distinct_id: properties.company_id || properties.slug || "unknown",
        properties: {
          ...properties,
          content_group: "found_signup_funnel",
        },
      }),
      cache: "no-store",
    })
  } catch (error) {
    console.error("[PostHog] activation_completed capture failed", error)
  }
}
