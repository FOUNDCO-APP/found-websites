import type { ExistingCopyReference } from "@/lib/copySimilarity"

type SupabaseLike = {
  from: (table: string) => any
}

type RawCopyReferenceRow = {
  company_id?: string | null
  hero_title?: string | null
  hero_subtitle?: string | null
  about_text?: string | null
  about_preview?: string | null
  about_story?: string | null
  services?: { name?: string | null; description?: string | null }[] | null
  companies?: RawCompany | RawCompany[] | null
  company?: RawCompany | RawCompany[] | null
}

type RawCompany = {
  id?: string | null
  name?: string | null
  slug?: string | null
  industry_category?: string | null
  sub_industry?: string | null
  city?: string | null
  state?: string | null
  account_kind?: string | null
}

function firstCompany(value: RawCompany | RawCompany[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function toCopyReference(row: RawCopyReferenceRow): ExistingCopyReference | null {
  const company = firstCompany(row.company ?? row.companies)
  if (!company) return null

  return {
    companyId: row.company_id ?? company.id ?? null,
    slug: company.slug ?? null,
    name: company.name ?? null,
    industry: company.industry_category ?? null,
    subIndustry: company.sub_industry ?? null,
    city: company.city ?? null,
    state: company.state ?? null,
    heroTitle: row.hero_title ?? null,
    heroSubtitle: row.hero_subtitle ?? null,
    aboutText: row.about_text ?? null,
    aboutPreview: row.about_preview ?? null,
    aboutStory: row.about_story ?? null,
    services: Array.isArray(row.services) ? row.services : null,
  }
}

export async function loadCopySimilarityReferences(
  supabase: SupabaseLike,
  options: { excludeCompanyId?: string; limit?: number } = {},
): Promise<ExistingCopyReference[]> {
  const limit = options.limit ?? 250
  let query = supabase
    .from("website_config")
    .select(`
      company_id,
      hero_title,
      hero_subtitle,
      about_text,
      about_preview,
      about_story,
      services,
      company:companies!inner (
        id,
        name,
        slug,
        industry_category,
        sub_industry,
        city,
        state,
        account_kind
      )
    `)

  if (options.excludeCompanyId) {
    query = query.neq("company_id", options.excludeCompanyId)
  }

  const { data, error } = await query.order("updated_at", { ascending: false }).limit(limit) as {
    data: unknown[] | null
    error: { message?: string } | null
  }

  if (error) {
    console.error("[copySimilarity] reference load failed:", error.message)
    return []
  }

  return (data ?? [])
    .map((row) => toCopyReference(row as RawCopyReferenceRow))
    .filter((row): row is ExistingCopyReference => Boolean(row))
}
