import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
import ts from 'typescript'
import { PGlite } from '@electric-sql/pglite'

// Real helper/API source, ephemeral PostgreSQL PK, mocked storage/HTTP. No env/live calls.
const A = '11111111-1111-4111-a111-111111111111'
const B = '22222222-2222-4222-a222-222222222222'
const album = '33333333-3333-4333-a333-333333333333'
const db = await PGlite.create()
await db.exec(`create table public.companies(id uuid primary key);
  insert into public.companies values ('${A}'), ('${B}');`)
const schema = fs.readFileSync('scripts/migration-034-company-photos.sql', 'utf8')
await db.exec(schema.match(/create table if not exists public\.company_photos \([\s\S]*?\n\);/)[0])
await db.exec(`alter table company_photos add column album_id uuid, add column in_gallery boolean default false;
  create table photo_albums(id uuid primary key, company_id uuid);
  insert into photo_albums values ('${album}', '${A}');`)
let company = A, authenticated = true, activityThrows = false, mode, lost = false
let transfers = 0, posts = 0, signs = 0, failureLists = false
const objects = new Map(), calls = [], timers = new Map()
let timerId = 0, testCount = 0
let releaseReconcile
const uuid = () => webcrypto.randomUUID()
const plain = value => JSON.parse(JSON.stringify(value))
function load(path, dependencies, extra = {}) {
  const module = { exports: {} }
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, Blob, File, FormData, Request, Response,
    URL, crypto: webcrypto, AbortController,
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id },
    clearTimeout(id) { timers.delete(id) },
    require(id) { assert.ok(id in dependencies, `Unexpected dependency ${id}`); return dependencies[id] }, ...extra })
  return module.exports
}
function from(table) {
  assert.ok(['company_photos', 'photo_albums'].includes(table))
  const filters = []; let inserted, single = false
  const q = {
    select() { return q }, eq(key, value) { filters.push([key, value]); return q }, order() { return q },
    insert(value) { inserted = value; return q },
    maybeSingle() { single = true; return execute() }, single() { single = true; return execute() },
    then(resolve, reject) { return execute().then(resolve, reject) },
  }
  async function execute() {
    try {
      let result
      if (inserted) {
        const keys = Object.keys(inserted)
        assert.ok(keys.every(key => /^[a-z_]+$/.test(key)))
        result = await db.query(`insert into ${table} (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning *`, keys.map(key => inserted[key]))
      } else {
        result = await db.query(`select * from ${table}` + (filters.length ? ' where ' + filters.map(([key], i) => {
          assert.ok(/^[a-z_]+$/.test(key)); return `${key}=$${i + 1}`
        }).join(' and ') : ''), filters.map(([, value]) => value))
      }
      return { data: single ? result.rows[0] ?? null : result.rows, error: null }
    } catch (error) { return { data: null, error: { code: error.code, message: 'PRIVATE PROVIDER ERROR' } } }
  }
  return q
}
const bucket = {
  getPublicUrl(path) { return { data: { publicUrl: `https://storage.invalid/public/company-assets/${path}` } } },
  async list(prefix, { search }) {
    if (failureLists) return { data: null, error: { message: 'PRIVATE' } }
    return { data: [...objects.keys()].filter(path => path.startsWith(prefix + '/') && path.slice(prefix.length + 1).includes(search))
      .map(path => ({ id: path, name: path.slice(prefix.length + 1) })), error: null }
  },
  async createSignedUploadUrl(path) {
    signs++
    return { data: { path, token: 'local', signedUrl: `https://storage.invalid/upload/${path}?token=local` }, error: null }
  },
  async upload(path, buffer, options) {
    transfers++
    assert.equal(options.upsert, false)
    if (objects.has(path)) return { error: { message: 'exists' } }
    objects.set(path, { bytes: new Uint8Array(buffer), type: options.contentType })
    if (mode === 'photo-object-only') throw Error('PRIVATE after storage')
    return { error: null }
  },
}
const media = load('src/lib/mediaKind.ts', {})
const route = load('src/app/dashboard/api/photos/route.ts', {
  '@/lib/auth/getAuthUser': { resolveDashboardIdentity: async () => authenticated ? { userId: 'user' } : null },
  '@/lib/dashboard/getCompany': { getCompany: async () => ({ id: company }), requireOwnerAccess: async () => true },
  '@/lib/customerActivity': { recordCustomerActivity: async () => { if (activityThrows) throw Error('PRIVATE') } },
  '@/lib/mediaKind': media, '@/lib/supabase/admin': { createAdminClient: () => ({ from, storage: { from(name) { assert.equal(name, 'company-assets'); return bucket } } }) },
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/deletePhotoPlacement': { deletePhotoPlacement() { throw Error('Unexpected') }, PhotoInUseError: class extends Error {} },
  '@/lib/stockPhotoPlacement': { StockPhotoPlacementError: class extends Error {} },
  '@/lib/stockPhotoPublication': { assertStockPhotoAlbum: async () => {}, assertStockPhotoPatch: async () => {} },
})
async function network(url, options) {
  calls.push({ url, options })
  assert.ok(options.signal, 'Every helper request must be abortable')
  const metadata = typeof options.body === 'string' ? JSON.parse(options.body) : null
  if (metadata?.intent === 'reconcile-upload' && mode === 'fail-first-reconcile') throw Error('PRIVATE network')
  if (metadata?.intent === 'reconcile-upload' && mode === 'delay-first-reconcile') await new Promise(resolve => { releaseReconcile = resolve })
  const hang = mode === 'hang-control' || (mode === 'hang-transfer' && options.method === 'PUT')
  if (hang) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Error('abort')), { once: true }))
  if (mode === 'hang-body') return { ok: true, text: () => new Promise((_, reject) => {
    if (options.signal.aborted) reject(Error('abort'))
    else options.signal.addEventListener('abort', () => reject(Error('abort')), { once: true })
  }) }
  if (url.startsWith('https://storage.invalid/upload/')) {
    transfers++
    assert.equal(options.method, 'PUT')
    assert.equal(options.headers['x-upsert'], 'false')
    const path = new URL(url).pathname.slice('/upload/'.length)
    if (objects.has(path)) return Response.json({ error: 'PRIVATE exists' }, { status: 409 })
    const file = options.body.get('')
    objects.set(path, { bytes: new Uint8Array(await file.arrayBuffer()), type: file.type })
    if (mode === 'lost-put' && !lost) { lost = true; throw Error('Load failed PRIVATE') }
    return Response.json({ Key: path })
  }
  assert.equal(url, '/api/photos')
  posts++
  const response = await route.POST(new Request('https://app.invalid/api/photos', options))
  const saving = options.body instanceof FormData || (metadata?.storage_path && metadata?.url)
  if (mode === 'lost-save' && saving && response.ok && !lost) { lost = true; throw Error('Load failed PRIVATE') }
  return response
}
const { createDashboardUploadSession, uploadDashboardMedia } = load('src/lib/uploadDashboardMedia.ts', {
  '@/lib/mediaKind': media, '@/lib/supabase/client': { createClient() { throw Error('Unexpected browser auth/client') } },
}, { fetch: network })
const bytes = Uint8Array.from([0, 255, 12, 128, 42])
const capture = type => new Blob([bytes], { type })
const session = (type = 'video/mp4', options = {}) => createDashboardUploadSession(capture(type), {
  fileName: type.startsWith('video') ? 'video.mp4' : 'photo.jpg', albumId: album, ...options,
})
const rows = () => db.query('select * from company_photos order by id').then(r => r.rows)
async function reset() {
  await db.exec('truncate company_photos')
  company = A; authenticated = true; activityThrows = false; failureLists = false
  mode = undefined; lost = false; transfers = 0; signs = 0; posts = 0
  objects.clear(); calls.length = 0; timers.clear()
  releaseReconcile = undefined
}
async function test(name, fn) { await reset(); await fn(); assert.equal(timers.size, 0); testCount++; console.log('PASS ' + name) }
async function rejectsSafe(action) { await assert.rejects(action, error => {
  assert.doesNotMatch(error.message, /PRIVATE|Load failed|exists/)
  assert.match(error.message, /confirm|timed out/); return true
}) }
try {
  for (const [mime, ext] of [['video/mp4', 'mp4'], ['video/webm;codecs=h264', 'webm'], ['video/webm', 'webm'], ['image/jpeg', 'jpg']]) {
    await test(`real pipeline ${mime}`, async () => {
      const options = { fileName: 'capture.' + ext, albumId: album }
      const s = createDashboardUploadSession(capture(mime), options)
      options.albumId = null; options.fileName = 'changed.jpg'
      assert.ok(Object.isFrozen(s)); assert.ok(Object.isFrozen(s.options))
      const a = s.run(), b = s.run(); assert.equal(a, b)
      const photo = await a
      assert.equal(photo.id, s.uploadId); assert.equal(photo.album_id, album)
      assert.equal(transfers, 1); assert.equal((await rows()).length, 1)
      const object = [...objects.values()][0]
      assert.deepEqual(object.bytes, bytes); assert.equal(object.type, mime)
      const fresh = await (await route.GET()).json()
      assert.equal(fresh.photos[0].mime_type, null)
      assert.equal(fresh.photos[0].media_type, mime.startsWith('video') ? 'video' : 'photo')
      await s.run(); assert.equal(transfers, 1)
    })
  }
  for (const type of ['image/jpeg', 'video/mp4']) await test(`lost save response ${type}`, async () => {
    const s = session(type); mode = 'lost-save'
    await rejectsSafe(() => s.run()); assert.equal((await rows()).length, 1)
    const count = transfers
    await s.run(); assert.equal(transfers, count); assert.equal((await rows()).length, 1)
  })
  for (const failure of ['lost-put', 'photo-object-only']) await test(`storage-only recovery ${failure}`, async () => {
    const s = session(failure === 'lost-put' ? 'video/mp4' : 'image/jpeg'); mode = failure
    await rejectsSafe(() => s.run())
    assert.equal(objects.size, 1); assert.equal((await rows()).length, 0)
    mode = undefined
    await s.run(); assert.equal(transfers, 1); assert.equal((await rows()).length, 1)
  })
  await test('independent sessions same identity race on real PostgreSQL PK', async () => {
    const uploadId = uuid(), a = session('video/mp4', { uploadId }), b = session('video/mp4', { uploadId })
    await Promise.allSettled([a.run(), b.run()])
    await Promise.all([a.run(), b.run()])
    assert.equal((await rows()).length, 1); assert.equal(objects.size, 1)
  })
  for (const failure of ['lost-save', 'photo-object-only']) await test(`company switch after ${failure}`, async () => {
    const s = session('image/jpeg'); mode = failure
    await rejectsSafe(() => s.run()); const previous = plain(await rows()); const count = transfers
    company = B; mode = undefined
    await rejectsSafe(() => s.run())
    assert.equal(transfers, count); assert.deepEqual(plain(await rows()), previous)
    company = A; await s.run(); assert.equal((await rows()).length, 1)
  })
  await test('successful session still checks company on next run', async () => {
    const s = session(); await s.run(); company = B
    await rejectsSafe(() => s.run()); assert.equal((await rows())[0].company_id, A)
  })
  await test('foreign UUID collision never returns or updates row', async () => {
    const s = session(); await s.run(); const before = plain(await rows())
    company = B
    const other = session('image/jpeg', { uploadId: s.uploadId, albumId: null })
    await rejectsSafe(() => other.run()); assert.deepEqual(plain(await rows()), before)
  })
  await test('auth and foreign album fail closed', async () => {
    authenticated = false; await rejectsSafe(() => session().run())
    authenticated = true; company = B; await rejectsSafe(() => session().run())
    assert.equal(transfers, 0); assert.equal((await rows()).length, 0)
  })
  await test('forged completion URL/path and absent object rejected', async () => {
    const id = uuid(), path = `${A}/${id}.mp4`
    for (const [storage_path, url] of [[`${B}/${id}.mp4`, bucket.getPublicUrl(path).data.publicUrl], [path, 'https://evil.invalid/video.mp4'], [path, bucket.getPublicUrl(path).data.publicUrl]]) {
      const result = await route.POST(new Request('https://app.invalid/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upload_id: id, expected_company_id: A, file_name: 'video.mp4', content_type: 'video/mp4', storage_path, url }) }))
      assert.equal(result.ok, false)
    }
    assert.equal((await rows()).length, 0)
  })
  await test('storage inspection error never triggers transfer', async () => {
    failureLists = true; await rejectsSafe(() => session().run()); assert.equal(transfers, 0)
  })
  await test('saved row survives activity tracking failure', async () => {
    activityThrows = true; await session().run(); assert.equal((await rows()).length, 1)
  })
  for (const failure of ['hang-control', 'hang-body', 'hang-transfer']) await test(`abort deadline covers ${failure}`, async () => {
    mode = failure; const s = session(); const promise = s.run()
    const rejected = rejectsSafe(() => promise)
    for (let i = 0; i < 200 && ![...timers.values()].some(t => t.ms === (failure === 'hang-transfer' ? 600000 : 60000)); i++) await new Promise(resolve => setImmediate(resolve))
    const timer = [...timers.values()].find(t => t.ms === (failure === 'hang-transfer' ? 600000 : 60000))
    assert.ok(timer, 'Expected stage deadline'); timer.fn()
    await rejected; assert.equal((await rows()).length, 0)
    assert.equal(calls.at(-1).options.signal.aborted, true)
    mode = undefined; await s.run(); assert.equal((await rows()).length, 1)
  })
  await test('legacy wrapper remains one-shot compatible', async () => {
    await uploadDashboardMedia(capture('image/jpeg'), { fileName: 'photo.jpg' })
    assert.equal((await rows()).length, 1)
  })
  await test('legacy multipart and signed callers without upload identity', async () => {
    const form = new FormData(); form.append('file', capture('image/jpeg'), 'legacy.jpg')
    const photoResponse = await route.POST(new Request('https://app.invalid/api/photos', { method: 'POST', body: form }))
    assert.equal(photoResponse.ok, true)
    const post = body => route.POST(new Request('https://app.invalid/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }))
    const intent = await (await post({ intent: 'signed-upload', file_name: 'legacy.mp4', content_type: 'video/mp4' })).json()
    objects.set(intent.path, { bytes, type: 'video/mp4' })
    assert.equal((await post({ storage_path: intent.path, url: intent.publicUrl, mime_type: 'video/mp4' })).ok, true)
    assert.equal((await rows()).length, 2)
    assert.equal((await post({ storage_path: `${B}/foreign.mp4`, url: bucket.getPublicUrl(`${B}/foreign.mp4`).data.publicUrl })).ok, false)
  })
  await test('stable mutations require company binding before storage access', async () => {
    const response = await route.POST(new Request('https://app.invalid/api/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upload_id: uuid(), intent: 'signed-upload', file_name: 'video.mp4', content_type: 'video/mp4' }) }))
    assert.equal(response.status, 409); assert.equal(signs, 0); assert.equal(objects.size, 0)
  })
  await test('supplied company binds failed first reconcile before retry switch', async () => {
    const s = session('image/jpeg', { companyId: A }); mode = 'fail-first-reconcile'
    await rejectsSafe(() => s.run())
    assert.equal(JSON.parse(calls[0].options.body).expected_company_id, A)
    company = B; mode = undefined
    await rejectsSafe(() => s.run())
    assert.equal(transfers, 0); assert.equal(objects.size, 0); assert.equal((await rows()).length, 0)
    company = A; await s.run(); assert.equal((await rows())[0].company_id, A)
  })
  await test('supplied company rejects switch while first reconcile delayed', async () => {
    const s = session('video/mp4', { companyId: A }); mode = 'delay-first-reconcile'
    const result = rejectsSafe(() => s.run())
    assert.equal(typeof releaseReconcile, 'function')
    company = B; mode = undefined; releaseReconcile()
    await result
    assert.equal(transfers, 0); assert.equal(objects.size, 0); assert.equal((await rows()).length, 0)
  })
  console.log(`Passed ${testCount} upload recovery groups; real local PostgreSQL PK, no live I/O.`)
} finally { await db.close() }
