import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('companies')
    .select('*, website_config(*)')
    .eq('slug', 'barriobuilders')
    .eq('active', true)
    .single()
  return NextResponse.json({ data, error })
}
