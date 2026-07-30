export type UptimeMonitor = {
  id: number
  name: string
  url: string
  status: "up" | "down" | "paused" | "unknown"
  uptime7d: number | null
  uptime30d: number | null
  avgResponseMs: number | null
}

const STATUS_MAP: Record<number, UptimeMonitor["status"]> = {
  0: "paused",
  1: "unknown",
  2: "up",
  8: "down",
  9: "down",
}

export async function getUptimeMonitors(): Promise<UptimeMonitor[] | null> {
  const apiKey = process.env.UPTIMEROBOT_API_KEY
  if (!apiKey) return null

  const body = new URLSearchParams({
    api_key: apiKey,
    format: "json",
    custom_uptime_ratios: "7-30",
    response_times: "1",
    response_times_limit: "1",
  })

  const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
  if (!res.ok) return null

  const data = await res.json()
  if (data.stat !== "ok") return null

  return (data.monitors ?? []).map((m: Record<string, unknown>) => {
    const ratios = String(m.custom_uptime_ratio ?? "").split("-")
    return {
      id: m.id as number,
      name: m.friendly_name as string,
      url: m.url as string,
      status: STATUS_MAP[m.status as number] ?? "unknown",
      uptime7d: ratios[0] ? Number(ratios[0]) : null,
      uptime30d: ratios[1] ? Number(ratios[1]) : null,
      avgResponseMs: m.average_response_time ? Number(m.average_response_time) : null,
    }
  })
}
