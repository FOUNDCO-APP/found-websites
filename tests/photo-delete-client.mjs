import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"

const module = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync("src/lib/photoDeletionClient.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { module, exports: module.exports })
const { deletePhotosConfirmed, photoDeleteErrorText } = module.exports
const plain = value => JSON.parse(JSON.stringify(value))
let requested = []
let success = false
const blockedMessage = "This photo is still used on Home, About. Remove or replace it there before deleting it."
const request = async (_url, options) => {
  const { id } = JSON.parse(options.body)
  requested.push(id)
  if (!success && id === "network") throw Error("offline")
  return { ok: success || !["http", "blocked"].includes(id), json: async () => {
    if (!success && id === "malformed") throw Error("invalid JSON")
    if (!success && id === "blocked") return { error: blockedMessage, code: "PHOTO_IN_USE", uses: ["Home", "About"] }
    return { success: success || id !== "rejected" }
  } }
}
const first = await deletePhotosConfirmed(["ok", "http", "network", "malformed", "rejected"], request)
assert.deepEqual(plain(first.deletedIds), ["ok"])
assert.deepEqual(plain(first.failedIds), ["http", "network", "malformed", "rejected"])
assert.equal(first.errors.length, 4)
assert.ok(first.errors.every(error => error.message && Array.isArray(error.uses)))
const blocked = await deletePhotosConfirmed(["blocked"], request)
assert.deepEqual(plain(blocked), { deletedIds: [], failedIds: ["blocked"], errors: [{ id: "blocked", message: blockedMessage, uses: ["Home", "About"] }] })
assert.equal(photoDeleteErrorText(blocked.errors), blockedMessage)
assert.equal(photoDeleteErrorText([{ id: "generic", message: "This photo is in use.", uses: ["Gallery", "Upcoming Events"] }]), "This photo is in use. Affected uses: Gallery, Upcoming Events.")

// Run the real React handler against fixture state to verify partial errors retain retry selection.
const source = fs.readFileSync("src/app/dashboard/(app)/photos/page.tsx", "utf8")
const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
let declaration, singleDeclaration, noticeDeclaration
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === "deleteSelected") declaration = node
  if (ts.isFunctionDeclaration(node) && node.name?.text === "remove") singleDeclaration = node
  if (ts.isFunctionDeclaration(node) && node.name?.text === "showPhotoNotice") noticeDeclaration = node
  ts.forEachChild(node, visit)
}
visit(ast)
assert.ok(declaration)
assert.ok(singleDeclaration)
let photos = ["ok", "http", "network"].map(id => ({ id }))
let exited = false, notice, loading, modal = true
const context = {
  selectedIds: new Set(photos.map(photo => photo.id)), deletingSelected: false,
  deletePhotosConfirmed: ids => deletePhotosConfirmed(ids, request),
  photoDeleteErrorText,
  setPhotos: update => { photos = update(photos) },
  setSelectedIds: ids => { context.selectedIds = ids },
  setDeletingSelected: value => { loading = value },
  setShowBulkDeleteConfirm: value => { modal = value },
  showPhotoNotice: value => { notice = value },
  exitSelectMode: () => { exited = true; context.selectedIds = new Set() },
}
vm.createContext(context)
vm.runInContext(ts.transpileModule(declaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText + "\nthis.runDelete = deleteSelected;", context)
vm.runInContext(ts.transpileModule(singleDeclaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText + "\nthis.runSingleDelete = remove;", context)
requested = []
await context.runDelete()
assert.deepEqual(photos.map(photo => photo.id), ["http", "network"])
assert.deepEqual(Array.from(context.selectedIds), ["http", "network"])
assert.equal(notice.text, "1 of 3 deleted. 2 still selected. Photo couldn't be deleted. Try again.")
assert.equal(exited, false)
assert.equal(loading, false)
assert.equal(modal, false)
success = true
requested = []
await context.runDelete()
assert.deepEqual(requested, ["http", "network"])
assert.equal(photos.length, 0)
assert.equal(notice.text, "2 photos deleted")
assert.equal(exited, true)
success = false
exited = false
photos = ["ok", "blocked"].map(id => ({ id }))
context.selectedIds = new Set(photos.map(photo => photo.id))
await context.runDelete()
assert.deepEqual(photos.map(photo => photo.id), ["blocked"])
assert.deepEqual(Array.from(context.selectedIds), ["blocked"])
assert.equal(exited, false)
assert.equal(notice.text, `1 of 2 deleted. 1 still selected. ${blockedMessage}`)
assert.equal(notice.persistent, true)
await context.runSingleDelete({ id: "blocked" })
assert.deepEqual(photos.map(photo => photo.id), ["blocked"])
assert.deepEqual(Array.from(context.selectedIds), ["blocked"])
assert.equal(notice.text, blockedMessage)
await context.runDelete()
assert.deepEqual(photos.map(photo => photo.id), ["blocked"])
assert.equal(notice.text, `0 of 1 deleted. 1 still selected. ${blockedMessage}`)
assert.doesNotMatch(source, /gone for good, including anywhere/)
assert.equal(source.split("Photos used on your site must be removed or replaced there first. Other copies are kept.").length - 1, 2)
assert.ok(noticeDeclaration)
let timers = 0, shownNotice
const noticeContext = { photoNoticeTimerRef: { current: 123 }, clearTimeout() {}, setTimeout() { timers++; return 456 }, setPhotoNotice: value => { shownNotice = value } }
vm.createContext(noticeContext)
vm.runInContext(ts.transpileModule(noticeDeclaration.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText + "\nthis.show = showPhotoNotice;", noticeContext)
noticeContext.show({ text: blockedMessage, tone: "delete", persistent: true })
assert.equal(timers, 0)
assert.equal(shownNotice.persistent, true)
noticeContext.show({ text: "Photo deleted", tone: "delete" })
assert.equal(timers, 1)
assert.match(source, /aria-label="Dismiss message"/)
console.log("Photo delete client passed: 409 messages/uses preserved, blocked single/bulk rows and selections retained, accurate partial errors and failed-only retry; confirmation copy corrected.")
