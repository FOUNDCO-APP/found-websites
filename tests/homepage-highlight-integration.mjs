import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const pageFile = "src/app/dashboard/(app)/site/page.tsx"
const actionFile = "src/app/dashboard/(app)/site/actions.ts"
const editorFile = "src/app/dashboard/(app)/site/SiteEditor.tsx"
const company = { id: "owner-company", slug: "owner-site", name: "Owner company" }
let authenticated, owner, tables, queries, writes, invalidations, failure, importedCalls
function reset() {
  authenticated = owner = true
  failure = null
  queries = []; writes = []; invalidations = []; importedCalls = []
  tables = {
    website_config: [{ id: "config", company_id: company.id, announcement_enabled: true, announcement_style: "artwork",
      announcement_title: "Saved promotion", announcement_body: "Saved copy", announcement_cta_label: "Contact",
      announcement_cta_href: "/contact", services: [{ name: "Original service" }], updated_at: "2026-10-25T00:00:00Z" },
    { id: "other-config", company_id: "other-company", announcement_enabled: true, announcement_style: "artwork" }],
    company_photos: [
      { id: "private-upload", company_id: company.id, url: "https://fixture.test/draft.jpg", for_website: false, in_gallery: false, website_section: null },
      { id: "public", company_id: company.id, url: "https://fixture.test/current.jpg", for_website: true, in_gallery: true, website_section: "announcement" },
      { id: "other-private", company_id: "other-company", url: "https://fixture.test/other.jpg", for_website: false, in_gallery: false, website_section: null },
    ],
    media: [], addon_subscriptions: [],
  }
}
function query(table) {
  assert.ok(table in tables, `Unexpected table: ${table}`)
  const filters = []
  let single = false, payload
  const entry = { table, filters: [] }
  queries.push(entry)
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => {
      let rows = tables[table].filter(row => filters.every(filter => filter(row)))
      if (payload) {
        writes.push({ table, payload: structuredClone(payload), filters: entry.filters })
        if (failure === "error") return resolve({ data: null, error: { message: "fixture failure" } })
        if (failure === "zero") rows = []
        for (const row of rows) Object.assign(row, payload)
      }
      resolve({ data: single ? rows[0] ?? null : rows, error: null })
    }
    if (key === "eq") return (field, value) => { filters.push(row => row[field] === value); entry.filters.push([field, value]); return q }
    if (key === "select" || key === "order") return () => q
    if (key === "single") return () => { single = true; return q }
    if (key === "update") return value => { payload = value; return q }
    throw Error(`Forbidden query method: ${String(key)}`)
  } })
  return q
}
const admin = { from: query,
  get storage() { throw Error("Storage must not be touched") },
  rpc() { throw Error("No publication RPC is allowed during a mode switch") },
}
const dependencies = {
  "@/lib/auth/getAuthUser": {
    requireDashboardAccess: async () => authenticated ? { id: "owner", email: "owner@example.test" } : null,
    resolveDashboardIdentity: async () => authenticated ? { userId: "owner", userEmail: "owner@example.test" } : null,
  },
  "@/lib/dashboard/getCompany": {
    getCompany: async () => authenticated ? company : null,
    requireOwnerAccess: async () => owner,
    isAdminOverrideActive: async () => false,
  },
  "@/lib/supabase/admin": { createAdminClient: () => admin },
  "@/lib/ownerStockLibrary": { getImportedStockPhotos: async (_admin, id) => {
    importedCalls.push(id)
    return [tables.company_photos.find(photo => photo.id === "private-upload")]
  } },
  "next/navigation": { redirect: location => { throw Error(`REDIRECT:${location}`) } },
  "./SiteEditor": { __esModule: true, default: () => null },
}
function compile(source, file, globals = {}) {
  const module = { exports: {} }
  const output = ts.transpileModule(source, { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(output, { module, exports: module.exports,
    require: id => dependencies[id] ?? require(id), ...globals,
  }, { filename: file })
  return module.exports
}
const page = compile(fs.readFileSync(pageFile, "utf8"), pageFile).default
const actionAst = ts.createSourceFile(actionFile, fs.readFileSync(actionFile, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const actionSource = ["getContext", "switchHomepageHighlightToText"].map(name => {
  const declaration = actionAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(declaration, `${name} is defined`)
  return declaration.getText(actionAst)
}).join("\n")
const action = compile(actionSource, actionFile, {
  ...dependencies["@/lib/auth/getAuthUser"], ...dependencies["@/lib/dashboard/getCompany"],
  ...dependencies["@/lib/supabase/admin"], revalidatePath: path => invalidations.push(path),
}).switchHomepageHighlightToText
let groups = 0
async function test(label, run) { reset(); await run(); groups++; console.log(`PASS ${label}`) }

await test("actual SitePage offers owned private uploads without publishing them or leaking another company", async () => {
  const before = structuredClone(tables)
  const result = await page()
  assert.deepEqual(Array.from(result.props.photos, photo => photo.id).sort(), ["private-upload", "public"])
  assert.equal(result.props.photos.find(photo => photo.id === "private-upload").in_gallery, false)
  const photoQuery = queries.find(query => query.table === "company_photos")
  assert.deepEqual(photoQuery.filters, [["company_id", company.id]])
  assert.deepEqual(importedCalls, [company.id])
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  const refreshed = await page()
  assert.ok(refreshed.props.photos.some(photo => photo.id === "private-upload"), "Unpublished upload survives reload into the chooser")
})
await test("actual SitePage rejects worker access before reading private photos", async () => {
  owner = false
  await assert.rejects(page, /REDIRECT:\/photos/)
  assert.equal(queries.length, 0)
  assert.equal(importedCalls.length, 0)
})
await test("actual mode switch denies unauthenticated and non-owner callers without changes", async () => {
  const before = structuredClone(tables)
  authenticated = false
  assert.ok((await action()).error)
  authenticated = true; owner = false
  assert.ok((await action()).error)
  assert.deepEqual(tables, before)
  assert.equal(queries.length, 0)
  assert.equal(invalidations.length, 0)
})
await test("owner mode switch changes only mode, enabled flag and timestamp, retaining all copy and photos", async () => {
  const before = structuredClone(tables)
  assert.equal((await action()).success, true)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].table, "website_config")
  assert.deepEqual(Object.keys(writes[0].payload).sort(), ["announcement_enabled", "announcement_style", "updated_at"])
  assert.deepEqual(writes[0].filters, [["company_id", company.id]])
  const current = tables.website_config[0]
  assert.equal(current.announcement_enabled, false, "Switching must not publish saved text automatically")
  assert.equal(current.announcement_style, "dark")
  assert.ok(Number.isFinite(Date.parse(current.updated_at)))
  assert.deepEqual(current, { ...before.website_config[0], announcement_enabled: false, announcement_style: "dark", updated_at: current.updated_at })
  assert.deepEqual(tables.company_photos, before.company_photos)
  assert.deepEqual(tables.website_config[1], before.website_config[1])
  assert.deepEqual(invalidations.sort(), ["/dashboard/site", `/${company.slug}`].sort())
})
await test("failed and zero-row config updates report failure without optimistic success", async () => {
  const before = structuredClone(tables)
  for (failure of ["error", "zero"]) assert.ok((await action()).error)
  assert.deepEqual(tables, before)
  assert.equal(invalidations.length, 0)
})

const editorAst = ts.createSourceFile(editorFile, fs.readFileSync(editorFile, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let switchButton
function visit(node) {
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(editorAst) === "button"
    && node.children.some(child => ts.isJsxText(child) && child.text.includes("Switch to text highlight"))) switchButton = node
  ts.forEachChild(node, visit)
}
visit(editorAst)
await test("artwork mode exposes a real text-mode switch wired to its owner-authorized action", async () => {
  assert.ok(switchButton)
  for (let node = switchButton.parent; node; node = node.parent) {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      assert.doesNotMatch(node.left.getText(editorAst), /announcementStyle\s*!==?\s*["']artwork/)
    }
  }
  assert.ok(editorAst.statements.some(node => ts.isImportDeclaration(node)
    && node.moduleSpecifier.text === "./actions"
    && node.importClause?.namedBindings?.elements?.some(element => element.name.text === "switchHomepageHighlightToText")))
  const handler = switchButton.openingElement.attributes.properties.find(attribute => attribute.name?.text === "onClick").initializer.expression
  for (const failed of [false, true]) {
    const transitions = [], errors = []
    let config = { announcement_enabled: true, announcement_style: "artwork", announcement_title: "Keep title" }, artworkSetup = true
    const before = { ...config }
    const onClick = compile(`module.exports.run = ${handler.getText(editorAst)}`, editorFile, {
      announcementStyle: "artwork", switchHomepageHighlightToText: action,
      startTransition: fn => transitions.push(fn()),
      runSiteEditorAction: async (name, fn) => { assert.equal(name, "switch_highlight_to_text"); return failed ? { error: "Fixture failure" } : fn() },
      setConfig: update => { config = update(config) }, setArtworkSetup: value => { artworkSetup = value },
      flashSaveError: message => errors.push(message),
    }).run
    onClick()
    await Promise.all(transitions)
    if (failed) { assert.deepEqual(config, before); assert.equal(artworkSetup, true); assert.deepEqual(errors, ["Fixture failure"]) }
    else { assert.equal(config.announcement_enabled, false); assert.equal(config.announcement_style, "dark"); assert.equal(config.announcement_title, "Keep title"); assert.equal(artworkSetup, false) }
  }
})
console.log(`${groups} homepage-highlight integration groups passed; real page/action/handler code, in-memory fixtures only, no network or remote writes.`)
