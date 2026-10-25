import { cache } from 'react'
import * as Sentry from '@sentry/nextjs'
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
  if (data) Sentry.setTag('company_slug', (data as Company).slug)
  return polishCompanySiteCopy(data as Company | null)
})

export const getCompanyByDomain = cache(async function getCompanyByDomain(domain: string): Promise<Company | null> {
  const supabase = await createClient()
  // `website_config(*)` without `!inner` is a left join - filtering the
  // embedded resource only controls which nested rows get attached, it does
  // NOT restrict which `companies` rows come back. Every active company was
  // being returned (with website_config: null for non-matches), so .single()
  // saw dozens of rows instead of one and silently failed closed to "no
  // company found" for every real custom-domain visitor. `!inner` makes the
  // filter a genuine join condition. .maybeSingle() (not .single()) so zero
  // matches is a normal, quiet "no such domain" - but if MORE than one row
  // still comes back, that's a real data collision (two companies sharing a
  // custom_domain value), not an expected state, so it's captured loudly
  // instead of silently 404ing a company that did everything right.
  const { data, error } = await supabase
    .from('companies')
    .select('*, website_config!inner(*)')
    .eq('active', true)
    .eq('website_config.custom_domain', domain)
    .maybeSingle()
  if (error) {
    Sentry.captureException(error, { tags: { scope: 'getCompanyByDomain-collision' }, extra: { domain } })
  }
  if (data) Sentry.setTag('company_slug', (data as Company).slug)
  return polishCompanySiteCopy(data as Company | null)
})
