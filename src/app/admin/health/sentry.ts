export type SentryIssue = {
  id: string
  title: string
  culprit: string | null
  count: number
  lastSeen: string
  permalink: string
}

const ORG_SLUG = "supershawn"
const PROJECT_ID = "4511817089744896"

export async function getSentryIssues(): Promise<SentryIssue[] | null> {
  const token = process.env.SENTRY_READ_TOKEN
  if (!token) return null

  const url = `https://sentry.io/api/0/organizations/${ORG_SLUG}/issues/?project=${PROJECT_ID}&statsPeriod=14d&query=is%3Aunresolved&sort=freq&limit=10`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
  if (!res.ok) return null

  const data = await res.json()
  if (!Array.isArray(data)) return null

  return data.map((issue: Record<string, unknown>) => ({
    id: issue.id as string,
    title: issue.title as string,
    culprit: (issue.culprit as string) || null,
    count: Number(issue.count ?? 0),
    lastSeen: issue.lastSeen as string,
    permalink: issue.permalink as string,
  }))
}
