import { cache } from 'react'
import { createClient } from './supabase/server'
import type { Company } from '@/types/company'
import { polishBusinessName, polishWebsiteUpdates } from '@/lib/copyPolish'
function polishCompanySiteCopy(company: Company | null): Company | null {
  if (!company) return company
  const displayName = polishBusinessName(company.name, company.name ?? '')
  return {
    ...company,
    name: displayName,
    website_config: company.website_config
      ? polishWebsiteUpdates(company.website_config as Record<string, unknown>, {
          businessName: displayName,
          industry: company.industry_category,
          subIndustry: company.sub_industry,
          city: company.city,
          state: company.state,
        }) as Company["website_config"]
      : company.website_config,
  }
}

export const getCompanyBySlug = cache(async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  if (error) console.error('[getCompanyBySlug] error:', JSON.stringify(error))
  if (!data) console.error('[getCompanyBySlug] no data for slug:', slug)
  return polishCompanySiteCopy(data as Company | null)
})

export const getCompanyByDomain = cache(async function getCompanyByDomain(domain: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('active', true)
    .filter('website_config.custom_domain', 'eq', domain)
    .single()
  return polishCompanySiteCopy(data as Company | null)
})
