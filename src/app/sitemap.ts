import { createClient } from "@/lib/supabase/server"
import type { MetadataRoute } from "next"

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "foundco.app"
const pages = ["", "/services", "/about", "/gallery", "/contact", "/estimate"]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()
  const { data: companies } = await supabase
    .from("companies")
    .select("slug, updated_at")
    .eq("active", true)

  if (!companies) return []

  return companies.flatMap(company =>
    pages.map(page => ({
      url: `https://${company.slug}.${ROOT_DOMAIN}${page}`,
      lastModified: company.updated_at ? new Date(company.updated_at) : new Date(),
      changeFrequency: page === "" ? "weekly" as const : "monthly" as const,
      priority: page === "" ? 1.0 : 0.7,
    }))
  )
}
