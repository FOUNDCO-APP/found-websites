import { createClient } from "@/lib/supabase/server"
import type { MetadataRoute } from "next"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const pages = ["", "/services", "/about", "/gallery", "/contact", "/estimate"]

const ROOT_PAGES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/plans", changeFrequency: "monthly", priority: 0.9 },
  { path: "/plans/found", changeFrequency: "monthly", priority: 0.8 },
  { path: "/plans/found-pro", changeFrequency: "monthly", priority: 0.8 },
  { path: "/plans/found-business", changeFrequency: "monthly", priority: 0.8 },
  { path: "/industries", changeFrequency: "monthly", priority: 0.7 },
  { path: "/industries/cleaning", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/contractors", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/photographers", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/real-estate", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/restaurants", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/retail", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/salons", changeFrequency: "monthly", priority: 0.6 },
  { path: "/industries/spas", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  // is_test excludes Shawn's own practice/demo companies from the public
  // sitemap - only real, live customer sites should be indexable.
  const { data: companies } = await supabase
    .from("companies")
    .select("slug, updated_at")
    .eq("active", true)
    .eq("is_test", false)

  const rootEntries: MetadataRoute.Sitemap = ROOT_PAGES.map(page => ({
    url: `https://${ROOT_DOMAIN}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))

  if (!companies) return rootEntries

  const tenantEntries: MetadataRoute.Sitemap = companies.flatMap(company =>
    pages.map(page => ({
      url: `https://${company.slug}.${ROOT_DOMAIN}${page}`,
      lastModified: company.updated_at ? new Date(company.updated_at) : new Date(),
      changeFrequency: page === "" ? "weekly" as const : "monthly" as const,
      priority: page === "" ? 1.0 : 0.7,
    }))
  )

  return [...rootEntries, ...tenantEntries]
}
