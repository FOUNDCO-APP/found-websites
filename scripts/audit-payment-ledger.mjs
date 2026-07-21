import fs from "fs"
import { createClient } from "@supabase/supabase-js"

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return {}
  const env = {}
  for (const line of fs.readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

function mergeDefined(...sources) {
  const merged = {}
  for (const source of sources) {
    for (const [key, value] of Object.entries(source)) {
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        merged[key] = value
      }
    }
  }
  return merged
}

const env = mergeDefined(
  process.env,
  loadEnvFile(".env.local"),
  loadEnvFile(".env.vercel-production"),
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or service role key.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
})

function money(cents) {
  const value = Number(cents || 0)
  return `$${(value / 100).toFixed(2)}`
}

function asDate(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

function paymentIntentFromLead(row) {
  const partial = row.partial_answers || {}
  return (
    row.stripe_payment_intent_id ||
    partial.stripe_payment_intent_id ||
    partial.payment_intent_id ||
    partial.paymentIntentId ||
    null
  )
}

async function main() {
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("id,name,slug,email,plan,subscription_status,stripe_customer_id,stripe_connect_account_id,created_at")
    .order("created_at", { ascending: false })

  if (companiesError) throw companiesError

  const connected = companies.filter((company) => company.stripe_connect_account_id)
  const connectedIds = connected.map((company) => company.id)

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .in("company_id", connectedIds.length ? connectedIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })

  if (leadsError) throw leadsError

  const { data: estimates, error: estimatesError } = await supabase
    .from("estimates")
    .select("*")
    .in("company_id", connectedIds.length ? connectedIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false })

  if (estimatesError) throw estimatesError

  const byCompany = new Map()
  for (const company of connected) {
    byCompany.set(company.id, {
      company: {
        name: company.name,
        slug: company.slug,
        email: company.email,
        plan: company.plan,
        subscription_status: company.subscription_status,
        stripe_customer: Boolean(company.stripe_customer_id),
        stripe_connect_account: company.stripe_connect_account_id,
      },
      paid_orders: [],
      estimates: [],
    })
  }

  for (const lead of leads || []) {
    const paymentIntent = paymentIntentFromLead(lead)
    if (lead.payment_status !== "paid" && !paymentIntent) continue
    const bucket = byCompany.get(lead.company_id)
    if (!bucket) continue
    bucket.paid_orders.push({
      type: lead.type,
      customer: lead.name,
      email: lead.email,
      status: lead.status,
      payment_status: lead.payment_status || lead.partial_answers?.payment_status || null,
      total: money(lead.total_cents || lead.subtotal_cents || lead.partial_answers?.total_cents || lead.partial_answers?.subtotal_cents || 0),
      has_payment_intent: Boolean(paymentIntent),
      created_at: asDate(lead.created_at),
      updated_at: asDate(lead.updated_at),
    })
  }

  for (const estimate of estimates || []) {
    const hasPaymentEvidence = Boolean(
      estimate.stripe_payment_intent_id ||
        estimate.deposit_paid_at ||
        estimate.paid_at ||
        estimate.accepted_pay_later_at ||
        estimate.payment_link_sent_at
    )
    if (!hasPaymentEvidence) continue
    const bucket = byCompany.get(estimate.company_id)
    if (!bucket) continue
    bucket.estimates.push({
      estimate_number: estimate.estimate_number,
      customer: estimate.client_name,
      email: estimate.client_email,
      status: estimate.status,
      payment_status: estimate.payment_status,
      accepted_payment_choice: estimate.accepted_payment_choice,
      total: money(estimate.total),
      deposit: money(estimate.deposit_amount),
      has_payment_intent: Boolean(estimate.stripe_payment_intent_id),
      accepted_pay_later_at: asDate(estimate.accepted_pay_later_at),
      payment_link_sent_at: asDate(estimate.payment_link_sent_at),
      deposit_paid_at: asDate(estimate.deposit_paid_at),
      paid_at: asDate(estimate.paid_at),
      created_at: asDate(estimate.created_at),
    })
  }

  const summary = Array.from(byCompany.values())
    .map((entry) => ({
      ...entry.company,
      paid_order_count: entry.paid_orders.length,
      estimate_payment_event_count: entry.estimates.length,
      paid_orders: entry.paid_orders.slice(0, 10),
      estimates: entry.estimates.slice(0, 10),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug))

  console.log(JSON.stringify({
    generated_at: new Date().toISOString(),
    total_companies: companies.length,
    stripe_customer_companies: companies.filter((company) => company.stripe_customer_id).length,
    stripe_connect_companies: connected.length,
    connected_profiles_audited_from_found_db: summary,
  }, null, 2))
}

main().catch((error) => {
  console.error(error?.message || error)
  process.exit(1)
})
