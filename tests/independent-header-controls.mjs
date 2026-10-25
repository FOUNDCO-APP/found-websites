import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import ts from "typescript"

// All persistence is an in-memory fixture; no client, credentials, storage or network is available.
const cache = new Map()
function load(file) {
  const absolute = path.resolve(file.endsWith(".ts") ? file : `${file}.ts`)
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, fileName: absolute }).outputText
  const require = id => {
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency ${id}`)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require, URL, Error }, { filename: absolute })
  return module.exports
}
const { assignIndependentPhoto, mergePhotoPlacement, isPhotoPlacementResult } = load("src/lib/photoPlacement")
const { getPublicSectionMedia } = load("src/lib/publicSectionMedia")
const { deletePhotoPlacement, PhotoInUseError } = load("src/lib/deletePhotoPlacement")
const { getEffectiveAddons } = load("src/lib/featureAccess")
const registry = load("src/lib/siteSectionRegistry")
const media = load("src/lib/mediaKind")
const plain = value => JSON.parse(JSON.stringify(value))
const id = "owner-company"
const url = "https://fixture.invalid/selected.jpg"
const original = { id: "source", company_id: id, url, storage_path: `${id}/selected.jpg`, website_section: "hero",
  for_website: true, for_social: true, in_gallery: true, album_id: "original-album", note: "Original attribution" }
let tables, writes, failInsert, failClear, failReferences, failPhotoReads, failStorage, failDelete, beforeDelete, afterDelete, removedPaths, authorized = true
let serial = 0
function reset() {
  tables = { company_photos: [plain(original)], website_config: [{ company_id: id, hero_image_url: url, hero_images: [url], hero_video_url: null }], media: [],
    companies: [{ id, logo_url: null, logo_white_url: null }], addon_subscriptions: [], photo_albums: [] }
  writes = []
  removedPaths = []
  failInsert = failClear = failReferences = failPhotoReads = failStorage = failDelete = false
  afterDelete = null
  beforeDelete = null
  authorized = true
}
function query(table) {
  const predicates = []
  let mutation, payload, one = false, maximum = Infinity
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => {
      if (mutation === "delete") beforeDelete?.()
      let rows = tables[table].filter(row => predicates.every(test => test(row)))
      if ((failReferences && table === "media") || (failPhotoReads && table === "company_photos")) {
        resolve({ data: null, error: { message: "fixture read failure" } }); return
      }
      if (mutation) {
        writes.push({ table, mutation, payload: plain(payload ?? {}) })
        if ((failInsert && mutation === "insert") || (failClear && mutation === "update" && payload.website_section === null) || (failDelete && mutation === "delete")) {
          resolve({ data: null, error: { message: "fixture write failure" } }); return
        }
        if (mutation === "insert") {
          rows = (Array.isArray(payload) ? payload : [payload]).map(row => ({ id: `copy-${++serial}`, created_at: "2026-10-24", ...plain(row) }))
          tables[table].push(...rows)
        } else if (mutation === "update") rows.forEach(row => Object.assign(row, plain(payload)))
        else if (mutation === "delete") {
          tables[table] = tables[table].filter(row => !rows.includes(row))
          afterDelete?.()
        }
      }
      rows = rows.slice(0, maximum)
      resolve({ data: plain(one ? rows[0] ?? null : rows), error: null })
    }
    if (key === "eq") return (field, value) => { predicates.push(row => row[field] === value); return q }
    if (key === "is") return (field, value) => { predicates.push(row => row[field] === value); return q }
    if (key === "in") return (field, values) => { predicates.push(row => values.includes(row[field])); return q }
    if (key === "neq") return (field, value) => { predicates.push(row => row[field] !== value); return q }
    if (key === "single" || key === "maybeSingle") return () => { one = true; return q }
    if (key === "limit") return value => { maximum = value; return q }
    if (key === "insert" || key === "update" || key === "delete") return value => { mutation = key; payload = value; return q }
    if (key === "select" || key === "order") return () => q
    throw Error(`Unexpected query ${String(key)}`)
  } })
  return q
}
const admin = { from: query, storage: { from(bucket) {
  assert.equal(bucket, "company-assets")
  return { getPublicUrl() { return { data: { publicUrl: url } } }, async remove(paths) { removedPaths.push(...paths); return { error: failStorage ? { message: "fixture storage failure" } : null } } }
} } }
const context = async () => authorized ? { company: { id, slug: "fixture", industry_category: "food" }, admin } : null
function action(file, name, globals = {}) {
  const source = fs.readFileSync(file, "utf8")
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const declaration = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(declaration, `Missing action ${name}`)
  const output = ts.transpileModule(declaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(output, { module, exports: module.exports, Error, getContext: context, assignIndependentPhoto,
    isSitePhotoSlot: registry.isSitePhotoSlot, ...media, revalidatePath() {}, recordCustomerActivity: async () => {},
    toggleGalleryPhoto: async () => { throw Error("Unexpected gallery mutation") }, ...globals })
  return module.exports[name]
}
const assign = action("src/app/dashboard/(app)/site/actions.ts", "assignPhotoToSection")
const destinations = action("src/app/dashboard/(app)/photos/placementActions.ts", "getPhotoDestinationOptions", {
  getIndependentHeaderSlots: registry.getIndependentHeaderSlots, getEffectiveAddons,
})
let scenarios = 0
async function check(label, run) { reset(); await run(); scenarios++; console.log(`PASS ${label}`) }

await check("all new slots are registered with separate Gallery and online-ordering roles", () => {
  const sections = registry.getSitePhotoSections({ industryCategory: "food", layout: "portrait", config: {}, isFoodCatalog: true })
  for (const slot of ["gallery_hero", "book", "estimate", "menu"]) assert.equal(sections[slot].slot, slot)
  assert.notEqual(sections.gallery_hero.photoRole, sections.gallery.photoRole)
  assert.notEqual(sections.menu.position, sections.order.position)
})
await check("destination picker exposes new controls without changing Gallery membership", async () => {
  const options = await destinations()
  for (const slot of ["gallery_hero", "book", "menu", "order"]) assert.ok(options.some(item => item.slot === slot && !item.toggle))
  assert.ok(!options.some(item => item.slot === "estimate"))
  assert.equal(writes.length, 0)
})
await check("reusing a hero in each new slot keeps original assignment, gallery, album and attribution", async () => {
  for (const slot of ["gallery_hero", "book", "estimate", "menu"]) {
    const result = await assignIndependentPhoto(admin, id, "source", slot)
    assert.deepEqual(tables.company_photos[0], original)
    assert.equal(result.photo.website_section, slot)
    assert.equal(result.photo.url, url)
    assert.equal(result.photo.storage_path, original.storage_path)
    assert.equal(result.photo.note, original.note)
    assert.equal(result.photo.in_gallery, false)
    assert.equal(result.photo.for_social, false)
    assert.equal(result.photo.album_id, null)
    assert.ok(isPhotoPlacementResult(result))
  }
  assert.equal(tables.company_photos.length, 5)
})
await check("repeat placement reuses its existing row instead of adding copies", async () => {
  const first = await assignIndependentPhoto(admin, id, "source", "book")
  const second = await assignIndependentPhoto(admin, id, "source", "book")
  assert.equal(first.photo.id, second.photo.id)
  assert.equal(tables.company_photos.length, 2)
})
await check("unassigned gallery photo can be placed without changing its gallery membership", async () => {
  tables.company_photos[0].website_section = null
  const result = await assignIndependentPhoto(admin, id, "source", "estimate")
  assert.equal(result.photo.id, "source")
  assert.equal(result.photo.in_gallery, true)
})
await check("replacing a header preserves the displaced photo and other pages", async () => {
  tables.company_photos.push({ ...original, id: "old-book", url: "https://fixture.invalid/old.jpg", website_section: "book" })
  const result = await assignIndependentPhoto(admin, id, "source", "book")
  assert.equal(tables.company_photos.find(row => row.id === "old-book").website_section, null)
  assert.equal(tables.company_photos.find(row => row.id === "old-book").in_gallery, true)
  assert.deepEqual(plain(result.clearedPhotoIds), ["old-book"])
  assert.equal(tables.company_photos[0].website_section, "hero")
})
await check("failed insertion leaves the destination and source unchanged", async () => {
  tables.company_photos.push({ ...original, id: "old-book", website_section: "book", url: "https://fixture.invalid/old.jpg" })
  const before = plain(tables)
  failInsert = true
  await assert.rejects(() => assignIndependentPhoto(admin, id, "source", "book"), /fixture write failure/)
  assert.deepEqual(tables, before)
})
await check("failed replacement removes only its new placement, never shared storage", async () => {
  tables.company_photos.push({ ...original, id: "old-book", website_section: "book", url: "https://fixture.invalid/old.jpg" })
  const before = plain(tables)
  failClear = true
  await assert.rejects(() => assignIndependentPhoto(admin, id, "source", "book"), /fixture write failure/)
  assert.deepEqual(tables, before)
})
await check("another company's photo cannot be assigned", async () => {
  tables.company_photos[0].company_id = "other-company"
  await assert.rejects(() => assignIndependentPhoto(admin, id, "source", "book"), /Photo not found/)
  assert.equal(writes.length, 0)
})
await check("server action rejects unknown slots and denied ownership without writes", async () => {
  assert.equal((await assign("source", "made-up-slot")).error, "Unknown photo section")
  authorized = false
  assert.equal((await assign("source", "book")).error, "Not authenticated")
  assert.equal(writes.length, 0)
})
await check("removing a reused header cannot clear legacy Home hero config", async () => {
  const result = await assign("source", "book")
  assert.ok(result.photo && result.photo.id !== "source")
  const config = plain(tables.website_config)
  const removed = await assign(result.photo.id, null)
  assert.equal(removed.success, true)
  assert.deepEqual(tables.website_config, config)
  assert.deepEqual(tables.company_photos[0], original)
})
await check("UI merge keeps both placements and only clears returned destination occupants", async () => {
  const placed = await assignIndependentPhoto(admin, id, "source", "menu")
  const ui = mergePhotoPlacement([original], placed.photo, placed.clearedPhotoIds)
  assert.equal(ui.length, 2)
  assert.equal(ui.find(photo => photo.id === "source").website_section, "hero")
  assert.equal(ui.find(photo => photo.id === placed.photo.id).website_section, "menu")
})
await check("public query returns only a published assignment for its requested company and slot", async () => {
  tables.company_photos.push({ ...original, id: "other", company_id: "other-company", website_section: "book" })
  assert.equal(await getPublicSectionMedia(admin, id, "book"), null)
  tables.company_photos.push({ ...original, id: "hidden", website_section: "book", for_website: false })
  assert.equal(await getPublicSectionMedia(admin, id, "book"), null)
  const placed = await assignIndependentPhoto(admin, id, "source", "book")
  assert.equal(await getPublicSectionMedia(admin, id, "book"), placed.photo.url)
  assert.equal(await getPublicSectionMedia(admin, id, "estimate"), null)
})
await check("available header controls follow existing business actions and retain assigned hidden slots", () => {
  const base = { industry_category: "home_services", primary_intent: "quote", phone: null }
  const slots = registry.getIndependentHeaderSlots(base, [])
  assert.ok(slots.includes("estimate"))
  assert.ok(!slots.includes("book") && !slots.includes("menu"))
  assert.ok(registry.getIndependentHeaderSlots(base, [], ["book"]).includes("book"))
  assert.ok(registry.getIndependentHeaderSlots({ ...base, industry_category: "wellness", primary_intent: "book" }, []).includes("book"))
})
await check("decorative header lookup failure stays plain instead of throwing", async () => {
  failPhotoReads = true
  assert.equal(await getPublicSectionMedia(admin, id, "book"), null)
  assert.equal(writes.length, 0)
})
function unusedPhoto() {
  Object.assign(tables.company_photos[0], { website_section: null, for_website: false, for_social: false, in_gallery: false, album_id: null })
  tables.website_config = [{ company_id: id, hero_title: "Original Home headline", hero_image_url: null, hero_images: [], hero_video_url: null }]
}
async function blockedPhoto(expectedUse, photoId = "source") {
  const before = plain(tables)
  await assert.rejects(() => deletePhotoPlacement(admin, id, photoId), error => {
    assert.ok(error instanceof PhotoInUseError, "Deletion must reject with the exported typed error")
    assert.equal(error.code, "PHOTO_IN_USE")
    assert.ok(Array.isArray(error.uses) && error.uses.length > 0)
    assert.ok(error.uses.every(use => typeof use === "string" && use.trim().length > 0))
    assert.match(error.uses.join(", "), expectedUse)
    return true
  })
  assert.deepEqual(tables, before, "Blocked deletion preserves full photo/config/media/album state")
  assert.equal(writes.length, 0, "No row write is attempted for an in-use photo")
  assert.equal(removedPaths.length, 0, "No storage removal is attempted")
}

await check("actual Home hero is blocked before writes and keeps its headline/config intact", async () => {
  tables.website_config[0].hero_title = "Original Home headline"
  await blockedPhoto(/Home/)
  assert.equal(tables.website_config[0].hero_title, "Original Home headline")
  assert.equal(tables.website_config[0].hero_image_url, url)
  assert.deepEqual(tables.website_config[0].hero_images, [url])
})
await check("legacy Home references alone block deletion, including nested arrays and video", async () => {
  for (const field of ["hero_image_url", "hero_images", "hero_video_url"]) {
    reset(); unusedPhoto()
    tables.website_config[0][field] = field === "hero_images" ? [url] : url
    await blockedPhoto(/Home/)
  }
})
await check("explicit other-page placements block deleting either shared row", async () => {
  for (const slot of ["about", "services", "contact", "cta", "gallery_hero", "book", "estimate", "menu", "shop", "order"]) {
    reset(); unusedPhoto()
    tables.company_photos.push({ ...tables.company_photos[0], id: "placement", website_section: slot, for_website: true })
    await blockedPhoto(/About|Services|Contact|Home bottom|Gallery header|Booking|Estimate|Menu|Products|Online ordering/)
    await blockedPhoto(/About|Services|Contact|Home bottom|Gallery header|Booking|Estimate|Menu|Products|Online ordering/, "placement")
  }
})
await check("gallery membership blocks deletion independently of section and website flags", async () => {
  unusedPhoto()
  tables.company_photos[0].in_gallery = true
  await blockedPhoto(/Gallery/)
})
await check("published album membership blocks deletion without gallery or website flags", async () => {
  unusedPhoto()
  tables.company_photos[0].album_id = "published"
  tables.photo_albums.push({ id: "published", company_id: id, name: "Published album", show_on_website_gallery: true })
  await blockedPhoto(/Gallery album: Published album/)
})
await check("published album cover alone blocks deletion without membership", async () => {
  unusedPhoto()
  tables.photo_albums.push({ id: "published", company_id: id, name: "Published cover", cover_photo_id: "source", show_on_website_gallery: true })
  await blockedPhoto(/Gallery album: Published cover/)
})
await check("branding and site-icon references block before row or file writes", async () => {
  for (const field of ["logo_url", "logo_white_url", "site_icon_url"]) {
    reset(); unusedPhoto()
    if (field === "site_icon_url") tables.website_config[0][field] = url
    else tables.companies[0][field] = url
    await blockedPhoto(/Business logo|Site icon/)
  }
})
await check("active website media blocks both full-image and thumbnail references", async () => {
  for (const field of ["url", "thumbnail_url"]) {
    reset(); unusedPhoto()
    tables.media.push({ company_id: id, url: "https://fixture.invalid/other.mp4", [field]: `${url}?width=400`, website_flag: true })
    await blockedPhoto(/Website photos/)
  }
})
await check("unused photo deletes its row and unreferenced owned file", async () => {
  unusedPhoto()
  const result = await deletePhotoPlacement(admin, id, "source")
  assert.equal(tables.company_photos.length, 0)
  assert.equal(result.storageRetained, false)
  assert.deepEqual(removedPaths, [original.storage_path])
})
await check("inactive media keeps referenced bytes but permits unused row removal", async () => {
  unusedPhoto()
  tables.media.push({ company_id: id, url: "https://fixture.invalid/video.mp4", thumbnail_url: `${url}?width=400`, website_flag: false })
  const beforeMedia = plain(tables.media)
  assert.equal((await deletePhotoPlacement(admin, id, "source")).storageRetained, true)
  assert.equal(tables.company_photos.length, 0)
  assert.deepEqual(tables.media, beforeMedia)
  assert.equal(removedPaths.length, 0)
})
await check("a surviving private album photo retains bytes without blocking unused duplicate removal", async () => {
  unusedPhoto()
  const privatePhoto = { ...tables.company_photos[0], id: "private", album_id: "private-album" }
  tables.company_photos.push(privatePhoto)
  tables.photo_albums.push({ id: "private-album", company_id: id, name: "Private album", cover_photo_id: "private", show_on_website_gallery: false })
  const beforeAlbums = plain(tables.photo_albums)
  assert.equal((await deletePhotoPlacement(admin, id, "source")).storageRetained, true)
  assert.deepEqual(tables.company_photos, [privatePhoto])
  assert.deepEqual(tables.photo_albums, beforeAlbums)
  assert.equal(removedPaths.length, 0)
})
await check("an unpublished section reference retains bytes but permits unused duplicate removal", async () => {
  unusedPhoto()
  const inactive = { ...tables.company_photos[0], id: "inactive", website_section: "book", for_website: false }
  tables.company_photos.push(inactive)
  assert.equal((await deletePhotoPlacement(admin, id, "source")).storageRetained, true)
  assert.deepEqual(tables.company_photos, [inactive])
  assert.equal(removedPaths.length, 0)
})
await check("reference read failure refuses deletion before touching any rows or storage", async () => {
  unusedPhoto()
  const before = plain(tables)
  failReferences = true
  await assert.rejects(() => deletePhotoPlacement(admin, id, "source"), /Could not verify photo references/)
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  assert.equal(removedPaths.length, 0)
})
await check("source read failure refuses deletion before any writes", async () => {
  unusedPhoto()
  const before = plain(tables)
  failPhotoReads = true
  await assert.rejects(() => deletePhotoPlacement(admin, id, "source"), /fixture read failure/)
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  assert.equal(removedPaths.length, 0)
})
await check("another tenant's photo cannot be deleted or disclose its uses", async () => {
  unusedPhoto()
  tables.company_photos[0].company_id = "other-company"
  const before = plain(tables)
  await assert.rejects(() => deletePhotoPlacement(admin, id, "source"), error => {
    assert.ok(!(error instanceof PhotoInUseError))
    assert.match(error.message, /Photo not found/)
    return true
  })
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  assert.equal(removedPaths.length, 0)
})
await check("another tenant's shared reference retains bytes without blocking or modifying their uses", async () => {
  unusedPhoto()
  const foreign = { ...tables.company_photos[0], id: "foreign", company_id: "other-company", website_section: "hero", for_website: true }
  tables.company_photos.push(foreign)
  const result = await deletePhotoPlacement(admin, id, "source")
  assert.equal(result.storageRetained, true)
  assert.deepEqual(tables.company_photos, [foreign])
  assert.equal(removedPaths.length, 0)
})
await check("placement changed before conditional delete prevents row and file removal", async () => {
  unusedPhoto()
  beforeDelete = () => Object.assign(tables.company_photos[0], { website_section: "book", for_website: true })
  await assert.rejects(() => deletePhotoPlacement(admin, id, "source"), /Photo changed before deletion/)
  assert.equal(tables.company_photos.length, 1)
  assert.equal(tables.company_photos[0].website_section, "book")
  assert.equal(tables.company_photos[0].for_website, true)
  assert.equal(removedPaths.length, 0)
})
await check("a reference introduced during deletion retains bytes at the second check", async () => {
  unusedPhoto()
  afterDelete = () => tables.company_photos.push({ ...original, id: "concurrent-placement", website_section: "estimate" })
  assert.equal((await deletePhotoPlacement(admin, id, "source")).storageRetained, true)
  assert.equal(removedPaths.length, 0)
})
await check("foreign/shared-library storage paths are never removed", async () => {
  unusedPhoto()
  tables.company_photos[0].storage_path = "shared-library/original.jpg"
  assert.equal((await deletePhotoPlacement(admin, id, "source")).storageRetained, true)
  assert.equal(tables.company_photos.length, 0)
  assert.equal(removedPaths.length, 0)
})
await check("row or storage failures do not turn a delete into a blind retry", async () => {
  unusedPhoto()
  failDelete = true
  await assert.rejects(() => deletePhotoPlacement(admin, id, "source"), /fixture write failure/)
  assert.equal(tables.company_photos.length, 1)
  assert.equal(removedPaths.length, 0)
  failDelete = false
  failStorage = true
  const result = await deletePhotoPlacement(admin, id, "source")
  assert.equal(result.storageCleanupPending, true)
})
await check("DELETE API returns typed 409 uses and does not falsely report success", async () => {
  let successActivity = 0
  const remove = action("src/app/dashboard/api/photos/route.ts", "DELETE", {
    resolveDashboardIdentity: async () => ({ userId: "owner", userEmail: "fixture@example.invalid" }),
    getCompany: async () => ({ id }), requireOwnerAccess: async () => true, createAdminClient: () => admin,
    deletePhotoPlacement, PhotoInUseError,
    recordCustomerActivity: async () => { successActivity++ },
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) },
  })
  const before = plain(tables)
  const response = await remove({ json: async () => ({ id: "source" }) })
  assert.equal(response.status, 409)
  assert.equal(response.body.code, "PHOTO_IN_USE")
  assert.ok(response.body.uses.includes("Home"))
  assert.ok(response.body.error.includes("Remove or replace"))
  assert.ok(!response.body.success)
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  assert.equal(removedPaths.length, 0)
  assert.equal(successActivity, 0, "Blocked deletion must not record a successful activity")
})
await check("DELETE API never discloses another tenant's uses or records success", async () => {
  tables.company_photos[0].company_id = "other-company"
  let successActivity = 0
  const remove = action("src/app/dashboard/api/photos/route.ts", "DELETE", {
    resolveDashboardIdentity: async () => ({ userId: "owner", userEmail: "fixture@example.invalid" }),
    getCompany: async () => ({ id }), requireOwnerAccess: async () => true, createAdminClient: () => admin,
    deletePhotoPlacement, PhotoInUseError, recordCustomerActivity: async () => { successActivity++ },
    NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) },
  })
  const before = plain(tables)
  const response = await remove({ json: async () => ({ id: "source" }) })
  assert.equal(response.status, 500)
  assert.equal(response.body.error, "Photo not found")
  assert.ok(!Object.hasOwn(response.body, "uses") && !response.body.success)
  assert.equal(successActivity, 0)
  assert.deepEqual(tables, before)
  assert.equal(writes.length, 0)
  assert.equal(removedPaths.length, 0)
})
console.log(`${scenarios} independent header-control scenarios passed; all persistence mocked.`)
