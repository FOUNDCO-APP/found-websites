import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import sharp from "sharp"

const require = createRequire(import.meta.url)
let authenticated, owner, tables, writes, configFailure, failClear, failRead, uploadError, insertError, rpcCalls
let storageWrites, invalidations, lastUpload
const company = { id: "11111111-1111-4111-a111-111111111111", slug: "fixture-owner", industry_category: "professional_services", phone: "5551234567" }
const sourceId = "22222222-2222-4222-a222-222222222222"
const legacyId = "33333333-3333-4333-a333-333333333333"
const clone = value => JSON.parse(JSON.stringify(value))
function reset() {
  authenticated = true; owner = true; configFailure = null; failClear = false; failRead = false; uploadError = false; insertError = false
  writes = []; storageWrites = []; invalidations = []; lastUpload = null
  rpcCalls = []
  tables = {
    company_photos: [{ id: sourceId, company_id: company.id, url: "https://assets.test/flyer.jpg", storage_path: `${company.id}/flyer.jpg`,
      for_website: true, in_gallery: true, for_social: true, website_section: "about", album_id: "existing-album", note: "Original" },
    { id: legacyId, company_id: company.id, url: "https://assets.test/legacy.png", storage_path: `${company.id}/legacy.png`,
      for_website: true, in_gallery: true, for_social: false, website_section: "announcement", album_id: null },
    { id: "other-photo", company_id: "other-company", url: "https://assets.test/other.jpg", website_section: "announcement" }],
    website_config: [{ id: "config", company_id: company.id, updated_at: "2026-10-25T01:00:00Z", announcement_enabled: true,
      announcement_style: "image", announcement_title: "Keep title", announcement_body: "Keep body", announcement_cta_href: "tel:5551234567", announcement_cta_label: "Call", unrelated: "Keep" }],
  }
}
function from(table) {
  assert.ok(Object.hasOwn(tables, table), `Forbidden table: ${table}`)
  const filters = []
  let mutation, payload, single = false
  const q = {
    select() { return q },
    eq(key, value) { filters.push(row => row[key] === value); return q },
    is(key, value) { filters.push(row => row[key] === value); return q },
    single() { single = true; return q },
    insert(value) { mutation = "insert"; payload = value; return q },
    update(value) { mutation = "update"; payload = value; return q },
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        if (failRead && !mutation) return { data: null, error: { message: "Read failed" } }
        let rows = tables[table].filter(row => filters.every(filter => filter(row)))
        if (mutation) {
          writes.push({ table, mutation, payload: clone(payload), ids: rows.map(row => row.id) })
          if (mutation === "insert") {
            if (insertError) return { data: null, error: { message: "Unknown insert outcome" } }
            rows = [{ id: "44444444-4444-4444-a444-444444444444", ...clone(payload) }]
            tables[table].push(...rows)
          } else {
            if (table === "website_config" && configFailure) {
              if (configFailure === "reject") return { data: null, error: { message: "Rejected config" } }
              if (configFailure === "cas") return { data: [], error: null }
              if (configFailure === "throw-before") throw new Error("Network failed")
            }
            if (failClear && payload.website_section === null && !Object.hasOwn(payload, "for_website")) return { data: null, error: { message: "Clear failed" } }
            rows.forEach(row => Object.assign(row, clone(payload)))
            if (table === "website_config" && configFailure === "throw-after") throw new Error("Lost config response")
          }
        }
        return { data: clone(single ? rows[0] ?? null : rows), error: null }
      }).then(resolve, reject)
    },
  }
  return q
}
const bucket = {
  async upload(storagePath, bytes, options) {
    storageWrites.push({ storagePath, options }); lastUpload = Buffer.from(bytes)
    if (uploadError === "throw") throw new Error("Lost upload response")
    return { error: uploadError ? { message: "Failed" } : null }
  },
  getPublicUrl(storagePath) { return { data: { publicUrl: `https://assets.test/${storagePath}` } } },
}
async function rpc(name, input) {
  assert.equal(name, "publish_homepage_highlight")
  rpcCalls.push({ name, input: clone(input) })
  // Models transaction rollback and serialization, not a live PostgreSQL execution.
  const next = clone(tables)
  const config = next.website_config.find(row => row.company_id === input.p_company_id)
  const source = next.company_photos.find(row => row.company_id === input.p_company_id && row.id === input.p_photo_id)
  if (!config || !source || config.updated_at !== input.p_expected_updated_at || source.url !== input.p_expected_url
    || configFailure === "reject" || configFailure === "cas" || failClear || insertError) return { data: null, error: { message: "Transaction rejected" } }
  if (configFailure === "throw-before") throw new Error("Network failed before commit")
  const cleared = next.company_photos.filter(row => row.company_id === input.p_company_id && row.website_section === "announcement")
  cleared.forEach(row => { row.website_section = null })
  const photo = { id: `44444444-4444-4444-a444-${String(rpcCalls.length).padStart(12, "0")}`, company_id: input.p_company_id,
    url: source.url, storage_path: source.storage_path, note: source.note ?? null,
    website_section: "announcement", for_website: true, in_gallery: false, for_social: false, album_id: null }
  next.company_photos.push(photo)
  Object.assign(config, { announcement_enabled: true, announcement_style: "artwork", updated_at: "2026-10-25T02:00:00Z" })
  tables = next
  writes.push({ rpc: name })
  if (configFailure === "throw-after") throw new Error("Lost transaction response")
  return { data: { photo, clearedPhotoIds: cleared.map(row => row.id) }, error: null }
}
const admin = { from, rpc, storage: { from(name) { assert.equal(name, "company-assets"); return bucket } } }
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file.endsWith(".ts") ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }; cache.set(absolute, module)
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  vm.runInNewContext(output, { module, exports: module.exports, URL, Buffer, File, FormData, console, Date, require(id) {
    if (id === "@/lib/auth/getAuthUser") return { resolveDashboardIdentity: async () => authenticated ? { userId: "owner", userEmail: "owner@example.test" } : null }
    if (id === "@/lib/dashboard/getCompany") return { getCompany: async () => company, requireOwnerAccess: async () => owner }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => admin }
    if (id === "next/cache") return { revalidatePath: value => invalidations.push(value) }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    return require(id)
  } }, { filename: absolute })
  return module.exports
}
const actions = load("src/app/dashboard/(app)/site/highlightActions")
const links = load("src/lib/highlightLinks")
const featured = load("src/lib/featuredUpdate")
const library = load("src/lib/stockPhotoLibrary")
let groups = 0
async function test(name, fn) { reset(); await fn(); groups++; console.log(`PASS ${name}`) }
await test("shared validator preserves ordinary pages and valid telephone/external destinations", () => {
  for (const href of ["/", "/about", "/gallery", "/services", "/contact?from=flyer#form", "tel:+15551234567", "https://example.test/news?a=1", "http://example.test/"]) {
    assert.equal(links.validateHighlightHref(href, company), href)
  }
})
await test("unsafe, encoded-control, credentials and unsupported routes fail closed", () => {
  for (const href of ["javascript:alert(1)", "data:text/html,hello", "//evil.test", "/\\evil.test", "https://user:pass@example.test", "https://example.test/%0a", "/%2fexample.test", "/contact%250a", "https://example.test/%252525250d", "/dashboard", "/api/anything", "/unknown", "https://example.test/\n"]) {
    assert.equal(links.validateHighlightHref(href, company), null, href)
  }
  assert.equal(links.resolveHighlightHref("javascript:alert(1)", company), "/contact")
})
await test("existing ordering/cart gates remain respected", () => {
  const restaurant = { ...company, industry_category: "food" }
  assert.equal(links.validateHighlightHref("/order", restaurant, []), null)
  assert.equal(links.validateHighlightHref("/order", restaurant, ["online_ordering"]), "/order")
  assert.equal(links.validateHighlightHref("/shop", { ...company, industry_category: "retail" }, []), null)
  assert.equal(links.validateHighlightHref("/shop", { ...company, industry_category: "retail" }, ["shopping_cart"]), "/shop")
})
await test("actual featured resolver preserves Gallery, About, Home and telephone choices", () => {
  for (const href of ["/gallery", "/about", "/", "tel:5551234567", "https://example.test/"]) {
    const copy = featured.getFeaturedUpdatePublicCopy({ ...company, name: "Fixture", sub_industry: "security_guard", website_config: {
      announcement_title: "Owner's precise headline", announcement_body: "Owner's precise update", announcement_cta_label: "Read update", announcement_cta_href: href,
    } }, [], [])
    assert.equal(copy.href, href)
  }
})
await test("unauthenticated and non-owner actions perform no storage or database writes", async () => {
  for (const field of ["authenticated", "owner"]) {
    if (field === "authenticated") authenticated = false; else { authenticated = true; owner = false }
    assert.ok("error" in await actions.uploadHighlightImage(new FormData()))
    assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
    assert.ok("error" in await actions.disableHomepageHighlight())
  }
  assert.equal(writes.length, 0); assert.equal(storageWrites.length, 0)
})
const jpeg = await sharp({ create: { width: 48, height: 64, channels: 3, background: "white" } }).jpeg().toBuffer()
function form(bytes = jpeg, type = "image/jpeg") { const data = new FormData(); data.set("file", new File([bytes], "untrusted-name.svg", { type })); return data }
await test("upload preserves original bytes and creates an unpublished tenant-owned draft", async () => {
  const previous = clone(tables)
  const result = await actions.uploadHighlightImage(form())
  assert.ok(result.photo, JSON.stringify(result))
  const uploaded = tables.company_photos.at(-1)
  assert.deepEqual(lastUpload, jpeg)
  assert.ok(uploaded.storage_path.startsWith(`${company.id}/highlights/`))
  assert.equal(storageWrites[0].options.upsert, false)
  for (const field of ["for_website", "in_gallery", "for_social"]) assert.equal(uploaded[field], false)
  assert.equal(uploaded.website_section, null); assert.equal(uploaded.album_id, null)
  assert.deepEqual(tables.website_config, previous.website_config)
  assert.deepEqual(tables.company_photos.slice(0, -1), previous.company_photos)
})
await test("mismatched MIME, SVG and oversized uploads reject before writes", async () => {
  for (const data of [form(jpeg, "image/png"), form(Buffer.from("<svg/>"), "image/svg+xml"), form(Buffer.alloc(10 * 1024 * 1024 + 1))]) {
    assert.ok("error" in await actions.uploadHighlightImage(data))
  }
  assert.equal(writes.length, 0); assert.equal(storageWrites.length, 0)
})
await test("PNG and WebP uploads keep their original bytes and formats", async () => {
  for (const format of ["png", "webp"]) {
    const bytes = await sharp(jpeg).toFormat(format).toBuffer()
    const result = await actions.uploadHighlightImage(form(bytes, `image/${format}`))
    assert.ok(result.photo, JSON.stringify(result))
    assert.deepEqual(lastUpload, bytes)
    assert.equal(storageWrites.at(-1).options.contentType, `image/${format}`)
    assert.ok(tables.company_photos.at(-1).storage_path.endsWith(`.${format}`))
  }
})
await test("uncertain upload or draft insert never changes the highlight or deletes a possibly referenced file", async () => {
  for (const mode of ["upload-error", "upload-throw", "insert-error"]) {
    reset()
    const before = clone(tables)
    if (mode === "insert-error") insertError = true
    else uploadError = mode === "upload-throw" ? "throw" : true
    const result = await actions.uploadHighlightImage(form())
    assert.match(result.error, /could not be confirmed/)
    assert.deepEqual(tables, before)
  }
})
await test("dimension and corrupt-file validation uses Sharp before upload", async () => {
  const wide = await sharp({ create: { width: 16385, height: 1, channels: 3, background: "white" } }).png().toBuffer()
  assert.ok("error" in await actions.uploadHighlightImage(form(wide, "image/png")))
  assert.ok("error" in await actions.uploadHighlightImage(form(jpeg.subarray(0, 24))))
  assert.equal(storageWrites.length, 0)
})
await test("publish clones instead of moving gallery/album/other-section source", async () => {
  const original = clone(tables.company_photos[0]); const legacy = clone(tables.company_photos[1]); const config = clone(tables.website_config[0])
  const result = await actions.publishHomepageHighlight({ photoId: sourceId })
  assert.ok(result.photo, JSON.stringify(result))
  assert.notEqual(result.photo.id, sourceId)
  assert.deepEqual(tables.company_photos[0], original)
  assert.deepEqual(tables.company_photos[1], { ...legacy, website_section: null })
  const placed = tables.company_photos.at(-1)
  assert.equal(placed.website_section, "announcement"); assert.equal(placed.for_website, true)
  assert.equal(placed.in_gallery, false); assert.equal(placed.album_id, null)
  assert.deepEqual(Array.from(result.clearedPhotoIds), [legacyId])
  assert.deepEqual(tables.website_config[0], { ...config, announcement_enabled: true, announcement_style: "artwork", updated_at: tables.website_config[0].updated_at })
  assert.equal(storageWrites.length, 0)
})
await test("wrong tenant, video, malformed input and restricted stock cannot publish", async () => {
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: "other-photo" }))
  tables.company_photos[0].company_id = "other-company"
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  tables.company_photos[0].company_id = company.id
  tables.company_photos[0].url = "https://assets.test/video.mp4"
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  const stock = library.STOCK_PHOTO_LIBRARY.find(photo => photo.enforcePlacementApproval && !photo.approvedSections.includes("announcement"))
  assert.ok(stock)
  tables.company_photos[0].url = stock.fullViewUrl
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  assert.equal(writes.length, 0)
})
await test("RPC rejection, CAS miss and precommit transport failure leave all rows unchanged", async () => {
  for (const mode of ["reject", "cas", "throw-before"]) {
    reset(); configFailure = mode
    const before = clone(tables)
    const result = await actions.publishHomepageHighlight({ photoId: sourceId })
    assert.match(result.error, /could not be confirmed/)
    assert.deepEqual(tables, before)
    assert.equal(writes.length, 0)
  }
})
await test("uncertain committed config is never falsely reported rolled back", async () => {
  configFailure = "throw-after"
  const result = await actions.publishHomepageHighlight({ photoId: sourceId })
  assert.match(result.error, /could not be confirmed/)
  assert.equal(tables.website_config[0].announcement_style, "artwork")
  assert.equal(tables.company_photos.at(-1).website_section, "announcement")
  assert.equal(tables.company_photos[1].website_section, null)
  assert.equal(rpcCalls.length, 1, "Never retry an uncertain committed transaction")
})
await test("read failure and uncertain insert cannot clear old placements", async () => {
  failRead = true
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  assert.equal(writes.length, 0)
  failRead = false; insertError = true
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  assert.equal(tables.company_photos[1].website_section, "announcement")
  assert.equal(tables.website_config[0].announcement_style, "image")
})
await test("stale competing publication and changed source URL cannot create a public clone", async () => {
  const args = { p_company_id: company.id, p_photo_id: sourceId, p_expected_url: tables.company_photos[0].url,
    p_expected_updated_at: tables.website_config[0].updated_at }
  assert.ok((await admin.rpc("publish_homepage_highlight", args)).data)
  const afterFirst = clone(tables)
  assert.ok((await admin.rpc("publish_homepage_highlight", args)).error)
  assert.deepEqual(tables, afterFirst)
  args.p_expected_updated_at = tables.website_config[0].updated_at
  args.p_expected_url = "https://assets.test/stale.jpg"
  assert.ok((await admin.rpc("publish_homepage_highlight", args)).error)
  assert.deepEqual(tables, afterFirst)
})
await test("failed placement cleanup rolls back the entire modeled transaction", async () => {
  const before = clone(tables); failClear = true
  assert.ok("error" in await actions.publishHomepageHighlight({ photoId: sourceId }))
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
})
await test("disable/remove toggle off only, retaining image placements, copy and files", async () => {
  const before = clone(tables)
  assert.equal((await actions.disableHomepageHighlight()).success, true)
  assert.deepEqual(tables.company_photos, before.company_photos)
  assert.deepEqual(tables.website_config[0], { ...before.website_config[0], announcement_enabled: false })
  assert.equal((await actions.removeHomepageHighlight()).success, true)
  assert.equal(storageWrites.length, 0)
})
await test("SQL contract is invoker-only, locked, tenant-scoped and has no file or billing mutations", () => {
  const sql = fs.readFileSync("supabase/migrations/20261025233743_homepage_highlight_publish.sql", "utf8")
  assert.match(sql, /security invoker/i)
  assert.match(sql, /set search_path = ''/i)
  assert.match(sql, /from public, anon, authenticated/i)
  assert.match(sql, /grant execute.*to service_role/i)
  assert.match(sql, /current_config[\s\S]*for update/i)
  assert.match(sql, /source_photo[\s\S]*for update/i)
  assert.match(sql, /updated_at is distinct from p_expected_updated_at/)
  assert.match(sql, /source_photo.url is distinct from p_expected_url/)
  assert.doesNotMatch(sql, /security definer|delete from|storage\.|update public\.companies|stripe|auth\./i)
  assert.match(sql, /website_section = null/)
  assert.match(sql, /true, false, false, null/)
})
console.log(`${groups} highlight action/link fixture groups passed; no remote requests, writes or sends.`)
