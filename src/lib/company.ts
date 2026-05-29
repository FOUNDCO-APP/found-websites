import { createClient } from './supabase/server'
import type { Company } from '@/types/company'

export async function getCompanyBySlug(slug: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  return data as Company | null
}

export async function getCompanyByDomain(domain: string): Promise<Company | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('active', true)
    .filter('website_config.custom_domain', 'eq', domain)
    .single()
  return data as Company | null
}
