import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { webcrypto } from 'node:crypto'

// Source execution only: every provider, database and HTTP boundary is local.
const cameraPath = 'src/components/dashboard/CameraSheet.tsx'
const cameraSource = fs.readFileSync(cameraPath, 'utf8')
const routePath = 'src/app/dashboard/api/photos/route.ts'
const read = path => fs.readFileSync(path, 'utf8')
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
function load(source, dependencies, globals = {}) {
  const module = { exports: {} }
  vm.runInNewContext(compile(source), { module, exports: module.exports, Blob, File, FormData,
    Request, Response, URL, AbortController, setTimeout, clearTimeout, crypto: webcrypto, ...globals, require(id) {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected import: ${id}`)
      return dependencies[id]
    } })
  return module.exports
}
function extract(source, name) {
  const ast = ts.createSourceFile(cameraPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(matches.length, 1, `Exactly one real ${name} declaration`)
  return matches[0].getText(ast)
}
const media = load(read('src/lib/mediaKind.ts'), {})

async function scenario(source, mime, extension, kind = 'uploadVideo') {
  const albumId = 'fixture-album'
  const bytes = Uint8Array.from([0, 255, 23, 42, 128, 1])
  const blob = new Blob([bytes], { type: mime })
  const rows = [], requests = [], storageWrites = [], helperCalls = [], emitted = [], errors = []
  const objects = new Map()
  let captures = [], successes = 0, starts = 0
  const bucket = {
    async createSignedUploadUrl(path) { return { data: { token: 'local-token', signedUrl: `https://fixture.invalid/upload/${path}` }, error: null } },
    async list(prefix) { return { data: [...objects.keys()].filter(key => key.startsWith(`${prefix}/`)).map(key => ({ name: key.slice(prefix.length + 1), id: key })), error: null } },
    getPublicUrl(path) { return { data: { publicUrl: `https://fixture.invalid/${path}` } } },
    async uploadToSignedUrl(path, token, file) {
      assert.equal(token, 'local-token')
      storageWrites.push({ path, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) })
      return { error: null }
    },
    async upload(path, buffer, options) {
      storageWrites.push({ path, type: options.contentType, bytes: new Uint8Array(buffer) })
      objects.set(path, true)
      return { error: null }
    },
  }
  function from(table) {
    assert.ok(['company_photos', 'photo_albums'].includes(table))
    let inserted, filters = []
    const q = {
      insert(row) { inserted = { id: `row-${rows.length}`, for_website: false, for_social: false, in_gallery: false, website_section: null, album_id: null, created_at: new Date().toISOString(), ...row }; rows.push(inserted); return q },
      select() { return q },
      eq(key, value) { filters.push(row => row[key] === value); return q },
      order() { return q },
      async single() { return { data: inserted, error: null } },
      async maybeSingle() { return { data: table === 'photo_albums' ? { id: albumId } : rows.find(row => filters.every(f => f(row))) ?? null, error: null } },
      then(resolve, reject) { return Promise.resolve({ data: rows.filter(row => filters.every(f => f(row))), error: null }).then(resolve, reject) },
    }
    return q
  }
  const client = { from, storage: { from(name) { assert.equal(name, 'company-assets'); return bucket } } }
  const route = load(read(routePath), {
    '@/lib/auth/getAuthUser': { resolveDashboardIdentity: async () => ({ userId: 'owner', userEmail: 'fixture@example.invalid' }) },
    '@/lib/dashboard/getCompany': { getCompany: async () => ({ id: 'company' }), requireOwnerAccess: async () => true },
    '@/lib/customerActivity': { recordCustomerActivity: async () => {} },
    '@/lib/mediaKind': media,
    '@/lib/supabase/admin': { createAdminClient: () => client },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@/lib/deletePhotoPlacement': { deletePhotoPlacement() { throw Error('Unexpected delete') }, PhotoInUseError: class extends Error {} },
    '@/lib/stockPhotoPlacement': { StockPhotoPlacementError: class extends Error {} },
    '@/lib/stockPhotoPublication': { assertStockPhotoAlbum: async () => {}, assertStockPhotoPatch: async () => {} },
  })
  const helper = load(read('src/lib/uploadDashboardMedia.ts'), {
    '@/lib/resumableMediaUpload': {
      ResumableMediaUploadError: class extends Error {},
      uploadResumableMedia() { throw Error('Standard camera persistence fixture must retain synthetic PUT transport') },
    },
    '@/lib/mediaKind': media, '@/lib/supabase/client': { createClient: () => client },
  }, { fetch: async (url, options) => {
    if (url.startsWith('https://fixture.invalid/upload/')) {
      const path = url.slice('https://fixture.invalid/upload/'.length)
      const file = options.body.get('')
      storageWrites.push({ path, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) })
      objects.set(path, true)
      return Response.json({ Key: `company-assets/${path}` })
    }
    assert.equal(url, '/api/photos')
    requests.push(options)
    return route.POST(new Request('https://fixture.invalid/api/photos', options))
  } }).createDashboardUploadSession
  const runs = []
  if (kind === 'handleAnnotationSave') captures = [{ id: 'original', photoId: 'original-saved' }]
  const context = {
    Blob, FormData, Date, crypto: webcrypto, URL: { createObjectURL: () => 'blob:local' },
    chunksRef: { current: [blob] }, pendingAlbumId: albumId,
    unsaved: { current: new Map() }, mounted: { current: true }, encoding: { current: 0 },
    notified: { current: new Set() }, createdHere: { current: new Set() },
    captureUrls: { current: new Set() }, capturesRef: { current: captures }, captures, selectedCaptureId: { current: null },
    reviewIndex: kind === 'handleAnnotationSave' ? 0 : null,
    setCaptures(value) { captures = typeof value === 'function' ? value(captures) : value; context.captures = captures; context.capturesRef.current = captures },
    setError(error) { errors.push(error) }, setAnnotating() {}, setReviewIndex() {},
    setCloseNotice(error) { errors.push(error) },
    uploadStatus: { accountId: 'owner', companyId: 'company', queueReady: true, queueError: null },
    onUploadedRef: { current(photo) { emitted.push(photo) } },
    queueRef: { current: { enqueue(file, options) {
      starts++; helperCalls.push({ file, options })
      const result = helper(file, { ...options, uploadId: options.id, companyId: 'company', accountId: 'owner' }).run().then(photo => {
        successes++; return { ...options, id: options.id, accountId: 'owner', companyId: 'company', blob: file, mimeType: file.type, state: 'uploaded', localSaved: false, photo }
      }).catch(error => { errors.push(error.message); throw error })
      runs.push(result); return result
    } } },
    videoRef: { current: { videoWidth: 100, videoHeight: 100 } },
    canvasRef: { current: { getContext: () => ({ drawImage() {} }), toBlob(callback, type) {
      assert.equal(type, 'image/jpeg'); context.photoCompletion = callback(blob)
    } } },
    ready: true, profileAvailable: { current: true }, setFlash() {}, setTimeout() {}, currentR: { w: 1, h: 1 }, zoom: 1,
    getCrop: () => ({ sx: 0, sy: 0, sw: 100, sh: 100 }),
  }
  vm.createContext(context)
  vm.runInContext(compile(['updateCaptures', 'selectReview', 'applyQueueRow', 'saveOnDevice', 'retainCapture', kind].map(name => extract(source, name)).join('\n')) + `\nthis.run = ${kind};`, context)
  if (kind === 'shoot') { await context.run(); await context.photoCompletion }
  else await context.run(kind === 'uploadVideo' ? mime : blob)
  await Promise.all(runs)
  assert.deepEqual(errors, [], 'Real camera handler must not swallow a fixture failure')
  assert.equal(helperCalls.length, 1, 'Exactly one real upload helper invocation')
  const expectedPrefix = kind === 'uploadVideo' ? 'video' : kind === 'shoot' ? 'photo' : 'annotated'
  assert.match(helperCalls[0].options.fileName, new RegExp(`^${expectedPrefix}-[0-9a-f-]+\\.${extension}$`), 'Actual helper filename must preserve capture format')
  assert.equal(helperCalls[0].options.albumId, albumId)
  assert.equal(helperCalls[0].file.type, mime)
  assert.deepEqual(new Uint8Array(await helperCalls[0].file.arrayBuffer()), bytes)
  assert.equal(storageWrites.length, 1, 'Exactly one storage upload')
  assert.match(storageWrites[0].path, new RegExp(`\\.${extension}$`))
  assert.equal(storageWrites[0].type, mime)
  assert.deepEqual(storageWrites[0].bytes, bytes)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].album_id, albumId)
  assert.equal(Object.hasOwn(rows[0], 'mime_type'), false, 'Persisted fixture has no MIME')
  assert.equal(Object.hasOwn(rows[0], 'media_type'), false)
  if (kind === 'uploadVideo') {
    assert.equal(requests.length, 3, 'Reconciliation, signed intent and completion')
    const intent = JSON.parse(requests[1].body), completion = JSON.parse(requests[2].body)
    assert.equal(intent.intent, 'signed-upload')
    assert.equal(intent.file_name, helperCalls[0].options.fileName)
    assert.equal(intent.content_type, mime)
    assert.equal(intent.album_id, albumId)
    assert.equal(completion.mime_type, mime)
    assert.equal(completion.album_id, albumId)
  } else {
    assert.equal(requests.length, 2)
    assert.ok(requests[1].body instanceof FormData)
    assert.equal(requests[1].body.get('file').name, helperCalls[0].options.fileName)
  }
  const fresh = await (await route.GET()).json()
  assert.equal(fresh.photos.length, 1)
  assert.equal(fresh.photos[0].mime_type, null)
  assert.equal(fresh.photos[0].media_type, kind === 'uploadVideo' ? 'video' : 'photo', 'Fresh GET must classify without MIME')
  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].media_type, fresh.photos[0].media_type)
  assert.equal(starts, 1)
  assert.equal(successes, 1)
  assert.equal(captures.length, kind === 'handleAnnotationSave' ? 2 : 1)
  assert.equal(captures[0].uploading, false)
}

const formats = [['video/mp4', 'mp4'], ['video/webm;codecs=h264', 'webm'], ['video/webm', 'webm']]
// Negative control changes only extracted uploadVideo source in memory; no repo mutation.
const actualVideo = extract(cameraSource, 'uploadVideo')
const oldVideo = actualVideo.replace(/retainCapture\(blob, `[^`]+`\)/, 'retainCapture(blob, `annotated-${crypto.randomUUID()}.jpg`)')
assert.notEqual(oldVideo, actualVideo, 'Current source must contain the approved filename repair')
const oldSource = cameraSource.replace(actualVideo, oldVideo)
for (const [mime, extension] of formats) {
  await assert.rejects(() => scenario(oldSource, mime, extension), error => {
    assert.equal(error.code, 'ERR_ASSERTION')
    assert.match(error.message, /Actual helper filename must preserve capture format/)
    return true
  })
  console.log(`Expected old-source failure: ${mime} actual upload filename is JPEG`)
  await scenario(cameraSource, mime, extension)
  console.log(`PASS: ${mime} camera → signed helper → persisted row → fresh GET`)
}
await scenario(cameraSource, 'image/jpeg', 'jpg', 'shoot')
await scenario(cameraSource, 'image/jpeg', 'jpg', 'handleAnnotationSave')
console.log('PASS: real photo and annotation handlers retain JPEG; all boundaries mocked; no live I/O')
