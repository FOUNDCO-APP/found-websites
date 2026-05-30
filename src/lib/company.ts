import { cache } from 'react'
import { createClient } from './supabase/server'
import type { Company } from '@/types/company'

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
  return data as Company | null
})

export const getCompanyByDomain = cache(async function getCompanyByDomain(domain: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('active', true)
    .filter('website_config.custom_domain', 'eq', domain)
    .single()
  return data as Company | null
})
