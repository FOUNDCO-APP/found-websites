type PostHogQueryResponse = {
  results?: Array<Array<number | string | null>>
}

export type PostHogMarketingSummary = {
  pageviews7d: number
  visitors7d: number
  pageviews30d: number
  visitors30d: number
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
              countIf(timestamp >= now() - INTERVAL 7 DAY) AS pageviews_7d,
              uniqIf(distinct_id, timestamp >= now() - INTERVAL 7 DAY) AS visitors_7d,
              count() AS pageviews_30d,
              uniq(distinct_id) AS visitors_30d
            FROM events
            WHERE event = '$pageview'
              AND timestamp >= now() - INTERVAL 30 DAY
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
    }
  } catch (error) {
    console.error("PostHog marketing summary error", error)
    return null
  }
}
