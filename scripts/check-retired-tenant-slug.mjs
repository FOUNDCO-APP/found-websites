import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const old = 'intelligence-protection-security-llc-arizona'
function load(file, imports = {}, suffix = '') {
  const module = { exports: {} }
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8') + suffix
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
    { module, exports: module.exports, process: { env: {} }, console, URL, Date, Math,
      require: name => imports[name] ?? {} })
  return module.exports
}
const retired = load('src/lib/retiredTenantSlugs.ts')
assert.equal(retired.isRetiredTenantSlug(old), true)
for (const slug of ['intellsecurity', 'intelligence-protection-security-llc', `${old}-tucson`, 'other-business']) {
  assert.equal(retired.isRetiredTenantSlug(slug), false)
}
const slugify = text => text.toLowerCase().replaceAll(' ', '-')
let reads = []
const freeDb = { from() { return { select() { return this }, eq(key, value) {
  reads.push(value); return this
}, async maybeSingle() { return { data: null, error: null } } } } }
const imports = { '@supabase/supabase-js': { createClient: () => freeDb },
  '@/lib/slugify': { slugify }, '@/lib/retiredTenantSlugs': retired }
const availability = load('src/app/onboarding/slugActions.ts', imports)
const blocked = await availability.checkSlugAvailable(old)
assert.equal(blocked.available, false)
assert.ok(blocked.suggestions.length > 0)
assert.ok(blocked.suggestions.every(slug => slug !== old))
assert.ok(!reads.includes(old), 'Reserved availability must not depend on database absence')
assert.equal((await availability.checkSlugAvailable('intellsecurity')).available, true)
const allocator = load('src/app/onboarding/actions.ts', imports, '\nexports.testUniqueSlug = uniqueSlug;')
reads = []
assert.equal(await allocator.testUniqueSlug(old, 'Tucson'), `${old}-tucson`)
assert.ok(!reads.includes(old), 'Final allocation must skip the retired address')
assert.equal(await allocator.testUniqueSlug('other-business', 'Tucson'), 'other-business')

async function convert(name) {
  let inserted
  const db = { from(table) {
    const query = { select() { return this }, eq() { return this }, ilike() { return this },
      insert(value) { if (table === 'companies') inserted = value; return this },
      update() { return this },
      async single() { return { data: table === 'sales_prospects'
        ? { id: 'prospect', business_name: name, person_name: 'Test', email: null, linked_company_id: null }
        : { id: 'new-company' }, error: null } },
      then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve) } }
    return query
  } }
  const growth = load('src/app/admin/growth/actions.ts', {
    '@/lib/slugify': { slugify }, '@/lib/retiredTenantSlugs': retired,
    '../lib': { requireAdmin: async () => {}, getAdminClient: () => db },
    'next/cache': { revalidatePath() {} },
  })
  assert.equal((await growth.convertLeadToClient('prospect')).created, true)
  return inserted.slug
}
assert.notEqual(await convert(old), old)
assert.equal(await convert('other-business'), 'other-business')
console.log('Retired-address checks passed: exact reservation, availability, suggestions, signup allocation and admin conversion; unrelated names unchanged. No remote requests or writes.')
