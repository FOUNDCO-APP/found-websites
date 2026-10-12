import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

// Execute the production routes without credentials, network, or database writes.
function load(path, imports) {
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  vm.runInNewContext(source, {
    module, exports: module.exports, URL, Response, Date,
    require: name => { assert.ok(name in imports, `Unexpected import ${name}`); return imports[name] },
  }, { filename: path })
  return module.exports
}

const code = "abcdefghijklmnopqrstuw"
let row, dbError, throws = false, reads = 0
const filters = []
const helper = load("src/lib/stripe/billingLinkRedirect.ts", {
  "server-only": {},
  "@/lib/supabase/admin": { createAdminClient: () => {
    if (throws) throw Error("Private database error")
    return { from: table => {
      reads++
      assert.equal(table, "billing_objects")
      const query = {
        select: columns => { assert.equal(columns, "facts"); return query },
        eq: (key, value) => { filters.push([key, value]); return query },
        maybeSingle: async () => ({ data: row, error: dbError }),
      }
      return query
    } }
  } },
})
const routes = Object.fromEntries(["pay", "setup"].map(kind => [kind,
  load(`src/app/${kind}/[code]/route.ts`, { "@/lib/stripe/billingLinkRedirect": helper }),
]))
const destination = kind => `https://${kind === "pay" ? "invoice.stripe.com/i" : "checkout.stripe.com/c/pay"}/fixture?prefilled_email=a%2Bb%40example.invalid&x=%2f#required%2Bfragment/unchanged`
const fixture = kind => ({ facts: {
  kind, revoked: false, expires_at: new Date(Date.now() + 60_000).toISOString(), destination_url: destination(kind),
} })
async function request(kind, token = code) {
  filters.length = 0
  const response = await routes[kind].GET(new Request(`https://foundco.app/${kind}/${token}?destination=https://evil.invalid&url=https://evil.invalid`),
    { params: Promise.resolve({ code: token }) })
  assert.equal(response.headers.get("cache-control"), "private, no-store")
  assert.equal(response.headers.get("referrer-policy"), "no-referrer")
  assert.match(response.headers.get("x-robots-tag"), /noindex/)
  if (response.status !== 302) assert.equal(response.headers.get("location"), null)
  return response
}
let passed = 0
async function test(name, work) { await work(); passed++; console.log(`PASS ${name}`) }

for (const kind of ["pay", "setup"]) {
  assert.equal(routes[kind].runtime, "nodejs")
  assert.equal(routes[kind].dynamic, "force-dynamic")
  await test(`${kind}: preserves full query and fragment; ignores incoming destination`, async () => {
    row = fixture(kind)
    const response = await request(kind)
    assert.equal(response.status, 302)
    assert.equal(response.headers.get("location"), destination(kind))
    assert.deepEqual(filters, [["account_scope", "platform"], ["livemode", true], ["object_type", "billing_link_redirect"], ["object_id", code]])
  })
  for (const [name, change] of [
    ["wrong kind", facts => { facts.kind = kind === "pay" ? "setup" : "pay" }],
    ["expired", facts => { facts.expires_at = new Date(0).toISOString() }],
    ["invalid expiry", facts => { facts.expires_at = "invalid" }],
    ["missing expiry", facts => { delete facts.expires_at }],
    ["revoked", facts => { facts.revoked = true }],
    ["missing revocation", facts => { delete facts.revoked }],
  ]) await test(`${kind}: ${name} is generic 404`, async () => {
    row = fixture(kind); change(row.facts)
    const response = await request(kind)
    assert.equal(response.status, 404); assert.equal(await response.text(), "Not found")
  })
  const host = kind === "pay" ? "invoice.stripe.com" : "checkout.stripe.com"
  for (const url of [
    `https://${host}.evil.invalid/${kind}/fixture`, `https://${host}@evil.invalid/${kind}/fixture`,
    `https://user:password@${host}/${kind}/fixture`, `http://${host}/${kind}/fixture`,
    `https://${host}:443/${kind}/fixture`, `https://${host}:8443/${kind}/fixture`,
    destination(kind === "pay" ? "setup" : "pay"), `//${host}/${kind}/fixture`,
    `https://${host}/${kind}/fixture\r\nLocation: https://evil.invalid`,
    `https://${host}\\@evil.invalid/${kind}/fixture`, "https://evil.invalid/", "javascript:alert(1)",
  ]) await test(`${kind}: rejects hostile destination ${JSON.stringify(url)}`, async () => {
    row = fixture(kind); row.facts.destination_url = url
    assert.equal((await request(kind)).status, 404)
  })
}
await test("invalid codes never reach database", async () => {
  const before = reads
  for (const token of ["short", `${code}a`, `${code.slice(1)}!`]) assert.equal((await request("pay", token)).status, 404)
  assert.equal(reads, before)
})
await test("missing record is generic 404", async () => {
  row = null; assert.equal((await request("pay")).status, 404)
})
await test("database error is generic 503", async () => {
  dbError = { message: "Private database error" }
  const response = await request("pay")
  assert.equal(response.status, 503); assert.equal(await response.text(), "Service unavailable")
  dbError = null
})
await test("thrown database/client error is generic 503", async () => {
  throws = true; assert.equal((await request("setup")).status, 503); throws = false
})
console.log(`${passed} billing link redirect regression checks passed.`)
