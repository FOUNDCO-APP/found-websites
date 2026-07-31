// Regression check for the 2026-07-31 custom-domain lookup bug.
// Run this after any future change to domain/slug lookup logic:
//   node scripts/verify-domain-lookup.mjs
//
// Creates two temporary test companies with distinct custom domains,
// confirms each resolves to itself (not the other, not null), confirms a
// non-existent domain resolves to nothing, then confirms the database
// itself now refuses to let two companies share a domain (the 049
// migration's unique index) - cleans up everything it creates either way.
const PROJECT_URL = "https://mmctzloztgkbqvofmkou.supabase.co"
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) {
  console.error("Set SUPABASE_SERVICE_ROLE_KEY in the environment first.")
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
}

async function sb(path, options = {}) {
  const res = await fetch(`${PROJECT_URL}/rest/v1/${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(`${options.method ?? "GET"} ${path} -> ${res.status}: ${text}`)
  return data
}

// Mirrors the real query in src/lib/company.ts's getCompanyByDomain.
async function lookupByDomain(domain) {
  const rows = await sb(
    `companies?select=id,slug,website_config!inner(custom_domain)&active=eq.true&website_config.custom_domain=eq.${encodeURIComponent(domain)}`
  )
  return rows
}

const results = []
function check(label, pass, detail) {
  results.push({ label, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"} - ${label}${detail ? " - " + detail : ""}`)
}

const suffix = Date.now()
const domainA = `verify-a-${suffix}.example`
const domainB = `verify-b-${suffix}.example`
let companyA, companyB

try {
  companyA = await sb("companies", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: `Verify A ${suffix}`, slug: `verify-a-${suffix}`, active: true }),
  })
  companyB = await sb("companies", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: `Verify B ${suffix}`, slug: `verify-b-${suffix}`, active: true }),
  })
  companyA = companyA[0]
  companyB = companyB[0]

  await sb("website_config", {
    method: "POST",
    body: JSON.stringify({ company_id: companyA.id, custom_domain: domainA }),
  })
  await sb("website_config", {
    method: "POST",
    body: JSON.stringify({ company_id: companyB.id, custom_domain: domainB }),
  })

  const foundA = await lookupByDomain(domainA)
  check("domain A resolves to exactly one company", foundA.length === 1, `got ${foundA.length} row(s)`)
  check("domain A resolves to company A, not B", foundA[0]?.id === companyA.id)

  const foundB = await lookupByDomain(domainB)
  check("domain B resolves to exactly one company", foundB.length === 1, `got ${foundB.length} row(s)`)
  check("domain B resolves to company B, not A", foundB[0]?.id === companyB.id)

  const foundNone = await lookupByDomain(`nobody-owns-this-${suffix}.example`)
  check("unknown domain resolves to nothing", foundNone.length === 0)

  // Confirm the database itself now refuses a second company claiming a
  // domain that's already taken - the 049 migration's unique index.
  let collisionRejected = false
  try {
    await sb(`website_config?company_id=eq.${companyB.id}`, {
      method: "PATCH",
      body: JSON.stringify({ custom_domain: domainA }),
    })
  } catch (err) {
    collisionRejected = /duplicate key|unique constraint/i.test(String(err.message))
  }
  check("database rejects two companies sharing one domain", collisionRejected)
} finally {
  // Cleanup regardless of pass/fail.
  if (companyA) await sb(`website_config?company_id=eq.${companyA.id}`, { method: "DELETE" }).catch(() => {})
  if (companyB) await sb(`website_config?company_id=eq.${companyB.id}`, { method: "DELETE" }).catch(() => {})
  if (companyA) await sb(`companies?id=eq.${companyA.id}`, { method: "DELETE" }).catch(() => {})
  if (companyB) await sb(`companies?id=eq.${companyB.id}`, { method: "DELETE" }).catch(() => {})
}

const allPassed = results.every(r => r.pass)
console.log(allPassed ? "\nAll checks passed." : "\nSome checks FAILED - see above.")
process.exit(allPassed ? 0 : 1)
