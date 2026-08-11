type PostHogQueryResponse = {
  results?: Array<Array<number | string | null>>
}

export type PostHogMarketingSummary = {
  pageviews7d: number
  visitors7d: number
  pageviews30d: number
  visitors30d: number
  onboardingStarted30d: number
  planSelected30d: number
  businessPlanSelected30d: number
  onboardingCompleted30d: number
  checkoutStarted30d: number
  activationCompleted30d: number
}

function toInt(value: number | string | null | undefined): number {
  if (typeof value === "number") return Math.max(0, Math.round(value))
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export async function getPostHogMarketingSummary(): Promise<PostHogMarketingSummary | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  const host = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "")

  if (!apiKey || !projectId) return null

  try {
    const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: `
            SELECT
              countIf(event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY) AS pageviews_7d,
              uniqIf(distinct_id, event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY) AS visitors_7d,
              countIf(event = '$pageview') AS pageviews_30d,
              uniqIf(distinct_id, event = '$pageview') AS visitors_30d,
              countIf(event = 'onboarding_started') AS onboarding_started_30d,
              countIf(event = 'plan_selected') AS plan_selected_30d,
              countIf(event = 'plan_selected' AND properties.plan_name = 'found_business') AS business_plan_selected_30d,
              countIf(event = 'onboarding_completed') AS onboarding_completed_30d,
              countIf(event = 'checkout_started') AS checkout_started_30d,
              countIf(event = 'activation_completed') AS activation_completed_30d
            FROM events
            WHERE timestamp >= now() - INTERVAL 30 DAY
              AND event IN ('$pageview', 'onboarding_started', 'plan_selected', 'onboarding_completed', 'checkout_started', 'activation_completed')
          `,
        },
      }),
      next: { revalidate: 300 },
    })

    if (!response.ok) {
      console.error("PostHog marketing summary failed", response.status, await response.text())
      return null
    }

    const payload = (await response.json()) as PostHogQueryResponse
    const row = payload.results?.[0]
    if (!row) return null

    return {
      pageviews7d: toInt(row[0]),
      visitors7d: toInt(row[1]),
      pageviews30d: toInt(row[2]),
      visitors30d: toInt(row[3]),
      onboardingStarted30d: toInt(row[4]),
      planSelected30d: toInt(row[5]),
      businessPlanSelected30d: toInt(row[6]),
      onboardingCompleted30d: toInt(row[7]),
      checkoutStarted30d: toInt(row[8]),
      activationCompleted30d: toInt(row[9]),
    }
  } catch (error) {
    console.error("PostHog marketing summary error", error)
    return null
  }
}
