import assert from 'node:assert/strict'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const current = compile(fs.readFileSync('src/lib/deviceUploadQueue.ts', 'utf8') + '\nexport const integrityTest={persist,list,openDatabase,activate,metadataKey,payloadKey,claimLease,releaseLease};')
// Frozen actual pre-repair queue, not a behavioral imitation.
const old = compile(execFileSync('git', ['show', '6dfac52:src/lib/deviceUploadQueue.ts'], { encoding: 'utf8', maxBuffer: 2e6 }) + '\nexport const integrityOld={claimLease};')
const prelude = `window.connected=false;window.uploads=[];window.payloadPuts=0;window.legacyPuts=0;window.hold=false;
Object.defineProperty(navigator,'onLine',{get:()=>connected});
if(location.search.includes('fallback'))Object.defineProperty(navigator,'locks',{value:undefined});
const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v){if(this.name==='captures')legacyPuts++;if(this.name==='runtime'&&String(v.key).startsWith('found:media:v1:payload:'))payloadPuts++;return put.apply(this,arguments)};
window.scope={accountId:'fixture-account',companyId:'fixture-company'};
const helper={readDashboardUploadContext:async()=>scope,createDashboardUploadSession:(blob,options)=>({run:async()=>{uploads.push(options.uploadId);if(hold)await new Promise(r=>window.releaseUpload=r);await blob.arrayBuffer();return {id:options.uploadId,url:'fixture',storage_path:'fixture',media_type:'photo'}}})};
const module={exports:{}},exports=module.exports;function require(){return helper};`
const postlude = `window.api=module.exports;window.q=api.getDeviceUploadQueue(scope);window.rows=[];q.subscribe(r=>rows=r);window.stop=q.start();window.online=()=>{connected=true;dispatchEvent(new Event('online'))};
window.disk=async()=>{const db=await new Promise((r,j)=>{const x=indexedDB.open('found-device-captures-v1');x.onsuccess=()=>r(x.result);x.onerror=()=>j(x.error)});return new Promise((r,j)=>{const t=db.transaction(['captures','runtime']);const a=t.objectStore('captures').getAll(),b=t.objectStore('runtime').getAll();t.oncomplete=()=>{db.close();r({legacy:a.result,runtime:b.result})};t.onabort=()=>{db.close();j(t.error)}})};
window.edit=async(store,key,change)=>{const db=await api.integrityTest.openDatabase();return new Promise((r,j)=>{const t=db.transaction(store,'readwrite'),s=t.objectStore(store),g=s.get(key);g.onsuccess=()=>{const v=change(g.result);if(v===null)s.delete(key);else s.put(v)};t.oncomplete=r;t.onabort=()=>j(t.error)})};
window.decode=async blob=>{const url=URL.createObjectURL(blob);let e;try{if(blob.type.startsWith('image/')){e=new Image();e.src=url;await e.decode();if(!e.naturalWidth)throw Error('image decode')}else{e=document.createElement('video');e.muted=true;e.preload='auto';await new Promise((r,j)=>{const timer=setTimeout(()=>j(Error('video timeout')),5000);e.onloadeddata=()=>{clearTimeout(timer);r()};e.onerror=()=>{clearTimeout(timer);j(Error('video decode'))};e.src=url;e.load()});if(!e.videoWidth)throw Error('video dimensions')}return true}finally{if(e instanceof HTMLVideoElement){e.removeAttribute('src');e.load()}URL.revokeObjectURL(url)}};`
const browser = await chromium.launch({ headless: true, ...(process.env.FOUND_BROWSER_EXECUTABLE ? { executablePath: process.env.FOUND_BROWSER_EXECUTABLE } : {}), args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-background-networking'] })
let groups = 0
const blockingFindings = []
async function fixture(fallback = false) {
  const context = await browser.newContext({ serviceWorkers: 'block' }), errors = []
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)))
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== 'https://integrity.invalid') return route.abort()
    const code = prelude + (u.searchParams.has('old') ? old : current) + postlude
    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic integrity</title><script>' + code.replace(/<\/script/gi, '<\\/script') + '</script>' })
  })
  const page = await context.newPage(), url = 'https://integrity.invalid/' + (fallback ? '?fallback=1' : '')
  page.setDefaultTimeout(10000)
  await page.goto(url); await page.waitForFunction(() => q.ready)
  return { context, page, url, async done() { assert.deepEqual(errors, []); await context.close(); groups++ } }
}
async function preparedLegacy(f) {
  const oldPage = await f.context.newPage()
  await oldPage.goto(f.url + (f.url.includes('?') ? '&' : '?') + 'old=1')
  await oldPage.waitForFunction(() => q.ready)
  const id = await oldPage.evaluate(async () => (await q.enqueue(new Blob(['legacy prepared bytes'], { type: 'image/jpeg' }), { fileName: 'legacy.jpg' })).id)
  await oldPage.close()
  await f.page.evaluate(async () => {
    const [row] = await api.integrityTest.list(scope)
    const original = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function(value) {
      if (this.name === 'runtime' && String(value.key).startsWith('found:media:v1:metadata:') && value.active) throw new DOMException('synthetic activation stop', 'AbortError')
      return original.apply(this, arguments)
    }
    try { await api.integrityTest.persist(row); throw Error('activation unexpectedly completed') }
    catch (error) { if (error.message === 'activation unexpectedly completed') throw error }
    finally { IDBObjectStore.prototype.put = original }
    const d = await disk()
    if (!d.legacy.length || !d.runtime.some(x => x.active === false)) throw Error('missing prepared migration')
  })
  return id
}
try {
  {
    const f = await fixture()
    const expected = await f.page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 320; c.height = 240
      const g = c.getContext('2d'); g.fillStyle = '#d94328'; g.fillRect(0, 0, 320, 240)
      const photo = await new Promise(r => c.toBlob(r, 'image/jpeg', .92))
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      let video
      try {
        const chunks = [], recorder = new MediaRecorder(stream)
        recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
        const ended = new Promise(r => recorder.onstop = r)
        recorder.start(250); await new Promise(r => setTimeout(r, 1700)); recorder.stop(); await ended
        video = new Blob(chunks, { type: recorder.mimeType || chunks[0].type })
      } finally { stream.getTracks().forEach(t => t.stop()) }
      const expected = []
      for (const [blob, fileName] of [[photo, 'photo.jpg'], [video, 'video.webm']]) {
        await decode(blob)
        const row = await q.enqueue(blob, { fileName, albumId: null })
        const bytes = await blob.arrayBuffer()
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',')
        expected.push({ id: row.id, digest, size: blob.size })
      }
      return expected
    })
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 2)
    const result = await f.page.evaluate(async expected => {
      const puts = payloadPuts, legacyWrites = legacyPuts
      const list = await api.integrityTest.list(scope)
      for (const row of list) {
        const original = expected.find(x => x.id === row.id)
        const bytes = await row.blob.arrayBuffer()
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].join(',')
        if (digest !== original.digest || bytes.byteLength !== original.size) throw Error('readback bytes differ')
        await decode(row.blob)
        for (let n = 0; n < 3; n++) await api.integrityTest.persist({ ...row, state: 'waiting', attempts: n, nextAttemptAt: 0 })
      }
      const after = await api.integrityTest.list(scope)
      for (const row of after) await decode(row.blob)
      return { payloadWrites: payloadPuts - puts, legacyWrites: legacyPuts - legacyWrites, count: after.length, version: (await api.integrityTest.openDatabase()).version }
    }, expected)
    assert.deepEqual(result, { payloadWrites: 0, legacyWrites: 0, count: 2, version: 2 })
    await f.done(); console.log('PASS genuine JPEG/MediaRecorder video: byte checksum, decode, reload and repeated metadata updates without payload rewrites')
  }
  {
    const f = await fixture()
    const id = await f.page.evaluate(async () => (await q.enqueue(new Blob(['same-size original'], { type: 'image/jpeg' }), { fileName: 'photo.jpg' })).id)
    await f.page.evaluate(async id => {
      const key = api.integrityTest.payloadKey({ ...scope, id })
      await edit('runtime', key, value => { new Uint8Array(value.bytes)[0] ^= 1; return value })
    }, id)
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 1)
    assert.equal(await f.page.evaluate(() => rows[0].errorCategory), 'integrity')
    await f.page.evaluate(async id => { await q.retry(id); online() }, id)
    await f.page.waitForTimeout(250)
    const state = await f.page.evaluate(async () => ({ uploads: uploads.length, saved: rows[0].localSaved, count: (await disk()).runtime.filter(x => String(x.key).startsWith('found:media:')).length }))
    assert.deepEqual(state, { uploads: 0, saved: false, count: 2 })
    await f.done(); console.log('PASS same-size checksum corruption retained without upload or destructive retry')
  }
  for (const fallback of [false, true]) {
    const f = await fixture(fallback)
    const legacy = await f.context.newPage(); await legacy.goto(f.url + (fallback ? '&' : '?') + 'old=1'); await legacy.waitForFunction(() => q.ready)
    const id = await legacy.evaluate(async () => (await q.enqueue(new Blob(['legacy bytes'], { type: 'image/jpeg' }), { fileName: 'legacy.jpg' })).id)
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 1)
    await f.page.evaluate(() => online())
    await f.page.waitForFunction(() => rows[0]?.state === 'uploaded')
    assert.equal(await f.page.evaluate(() => legacyPuts), 0, 'new queue must migrate before legacy lease Blob rewrite')
    assert.equal(await f.page.evaluate(() => uploads.length), 1)
    assert.equal(await f.page.evaluate(async () => (await disk()).legacy.length + (await disk()).runtime.filter(x => String(x.key).startsWith('found:media:')).length), 0)
    // Old code ignores new captures instead of uploading placeholders.
    await f.page.evaluate(() => { connected = false })
    await f.page.evaluate(() => q.enqueue(new Blob(['new bytes'], { type: 'image/jpeg' }), { fileName: 'new.jpg' }))
    await legacy.reload(); await legacy.waitForFunction(() => q.ready)
    assert.equal(await legacy.evaluate(() => rows.length), 0)
    await f.done(); console.log(`PASS actual 6dfac52 legacy coexistence/migration with ${fallback ? 'fallback lease' : 'Web Lock'} and old-client invisibility of new payloads`)
  }
  {
    const f = await fixture()
    const legacy = await f.context.newPage(); await legacy.goto(f.url + '?old=1&fallback=1'); await legacy.waitForFunction(() => q.ready)
    await legacy.evaluate(async () => { hold = true; await q.enqueue(new Blob(['old leased bytes'], { type: 'image/jpeg' }), { fileName: 'old.jpg' }); online() })
    await legacy.waitForFunction(() => uploads.length === 1 && typeof releaseUpload === 'function')
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 1)
    await f.page.evaluate(() => online()); await f.page.waitForTimeout(250)
    assert.equal(await f.page.evaluate(() => uploads.length), 0, 'current Web Locks client respects old fallback lease')
    await legacy.evaluate(() => releaseUpload()); await legacy.waitForFunction(() => rows[0]?.state === 'uploaded')
    await f.page.waitForFunction(() => rows.length === 0)
    await f.done(); console.log('PASS actual 6dfac52 fallback owner excludes current Web Locks client until old completion')
  }
  {
    const f = await fixture()
    // Interrupt activation after the prepared transaction commits.
    const outcome = await f.page.evaluate(async () => {
      const original = IDBObjectStore.prototype.put
      IDBObjectStore.prototype.put = function(value) {
        if (this.name === 'runtime' && String(value.key).startsWith('found:media:v1:metadata:') && value.active) throw new DOMException('synthetic activation stop', 'AbortError')
        return original.apply(this, arguments)
      }
      try { await q.enqueue(new Blob(['prepared bytes'], { type: 'image/jpeg' }), { fileName: 'prepared.jpg' }); return false }
      catch { return (await disk()).runtime.some(x => x.active === false) }
      finally { IDBObjectStore.prototype.put = original }
    })
    assert.equal(outcome, true)
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 1)
    assert.equal(await f.page.evaluate(() => rows[0].localSaved), true)
    assert.equal(await f.page.evaluate(async () => await rows[0].blob.text()), 'prepared bytes')
    await f.done(); console.log('PASS interrupted prepared commit recovers only after fresh payload verification')
  }
  {
    const f = await fixture()
    const id = await preparedLegacy(f)
    await f.page.evaluate(async id => { await edit('captures', id, () => null) }, id)
    await f.page.reload(); await f.page.waitForFunction(() => q.ready)
    assert.equal(await f.page.evaluate(() => rows.length), 0, 'old deletion must not resurrect prepared legacy')
    assert.equal(await f.page.evaluate(async () => (await disk()).runtime.filter(x => String(x.key).startsWith('found:media:')).length), 2, 'orphan prepared bytes are retained, not deleted')
    await f.done(); console.log('PASS prepared legacy provenance prevents resurrection after old deletion without discarding sidecar bytes')
  }
  {
    const f = await fixture(true)
    const legacyId = await preparedLegacy(f)
    await f.page.evaluate(async id => {
      await edit('captures', id, row => ({ ...row, attempts: 3, state: 'waiting', firstAttemptAt: 1234, nextAttemptAt: 9876543210,
        resumeInfo: { version: 1, url: 'synthetic-resume' } }))
    }, legacyId)
    const result = await f.page.evaluate(async () => {
      const read = Blob.prototype.arrayBuffer
      Blob.prototype.arrayBuffer = function() { return Promise.reject(new DOMException('synthetic unreadable legacy', 'NotReadableError')) }
      try {
        const rows = await api.integrityTest.list(scope)
        await api.integrityTest.persist(rows[0]) // Hydration must not write stale prepared budgets back.
        const d = await disk()
        const meta = d.runtime.find(x => x.active === true)
        return { saved: rows[0]?.localSaved, integrity: rows[0]?.errorCategory === 'integrity', legacy: d.legacy.length, active: !!meta,
          returnedAttempts: rows[0]?.attempts, storedAttempts: meta?.attempts, first: meta?.firstAttemptAt, next: meta?.nextAttemptAt, resumed: !!meta?.resumeInfo }
      } finally { Blob.prototype.arrayBuffer = read }
    })
    assert.deepEqual(result, { saved: true, integrity: false, legacy: 0, active: true, returnedAttempts: 3, storedAttempts: 3, first: 1234, next: 9876543210, resumed: true })
    const id = await f.page.evaluate(async () => (await api.integrityTest.list(scope))[0].id)
    assert.equal(await f.page.evaluate(async id => api.integrityTest.claimLease(scope, id, 'new-owner'), id), true)
    const oldLeasePage = await f.context.newPage()
    await oldLeasePage.goto(f.url + '&old=1'); await oldLeasePage.waitForFunction(() => q.ready)
    assert.equal(await oldLeasePage.evaluate(async id => api.integrityOld.claimLease(scope, id, 'old-owner'), id), false, 'actual old fallback cannot claim removed legacy representation alongside new runtime lease')
    await f.page.evaluate(async id => api.integrityTest.releaseLease(scope, id, 'new-owner'), id)
    await f.page.reload(); await f.page.waitForFunction(() => q.ready && rows.length === 1)
    await f.page.evaluate(async id => { connected = true; await q.retry(id); online() }, id); await f.page.waitForFunction(() => rows[0]?.state === 'uploaded')
    assert.equal(await f.page.evaluate(() => legacyPuts), 0, 'runtime lease must not rewrite a legacy Blob')
    await f.done(); console.log('PASS verified prepared bytes replace unreadable backing; actual old fallback cannot claim alongside runtime lease')
  }
  {
    const f = await fixture()
    const id = await f.page.evaluate(async () => (await q.enqueue(new Blob(['authoritative'], { type: 'image/jpeg' }), { fileName: 'photo.jpg' })).id)
    const legacy = await f.context.newPage(); await legacy.goto(f.url + '?old=1'); await legacy.waitForFunction(() => q.ready)
    await legacy.evaluate(async id => { await q.enqueue(new Blob(['legacy-copyxx'], { type: 'image/jpeg' }), { id, fileName: 'photo.jpg' }) }, id)
    const result = await f.page.evaluate(async id => {
      await edit('runtime', api.integrityTest.payloadKey({ ...scope, id }), value => { new Uint8Array(value.bytes)[0] ^= 1; return value })
      const [row] = await api.integrityTest.list(scope)
      return { saved: row.localSaved, category: row.errorCategory, legacy: (await disk()).legacy.length }
    }, id)
    if (result.saved || result.category !== 'integrity') blockingFindings.push('Active checksum failure is hidden by readable legacy duplicate')
    assert.equal(result.legacy, 1, 'never delete duplicate bytes during diagnosis')
    await f.done()
    if (!result.saved && result.category === 'integrity') console.log('PASS authoritative checksum failure cannot silently fall back to a duplicate legacy payload')
  }
  {
    const f = await fixture()
    const id = await preparedLegacy(f)
    const result = await f.page.evaluate(async id => {
      // Model actual old-client state after acquiring, updating and releasing a
      // lease while the prepared migration was interrupted.
      await edit('captures', id, row => ({ ...row, attempts: 3, state: 'waiting', nextAttemptAt: Date.now() + 900000, resumeInfo: { version: 1, url: 'synthetic-resume' } }))
      const meta = (await disk()).runtime.find(x => x.active === false)
      let rejected = false
      try { await api.integrityTest.activate(await api.integrityTest.openDatabase(), meta) } catch { rejected = true }
      const d = await disk(), active = d.runtime.find(x => x.active === true)
      return { rejected, legacyAttempts: d.legacy[0]?.attempts, activeAttempts: active?.attempts, activeResume: !!active?.resumeInfo }
    }, id)
    const safe = (result.rejected && result.legacyAttempts === 3) || (result.activeAttempts === 3 && result.activeResume)
    if (!safe) blockingFindings.push('Activation discards newer old-client attempt/resume metadata')
    await f.done()
    if (safe) console.log('PASS activation rejects or preserves an old-client state update after preparation')
  }
  {
    const f = await fixture(true)
    const id = await preparedLegacy(f)
    const result = await f.page.evaluate(async id => {
      const metaKey = api.integrityTest.metadataKey({ ...scope, id })
      await edit('captures', id, row => ({ ...row, leaseOwner: 'copied-old-owner', leaseUntil: Date.now() + 60000,
        attempts: 2, state: 'waiting', errorCategory: 'auth', error: 'Sign in to finish uploading.' }))
      await edit('runtime', metaKey, row => ({ ...row, leaseOwner: 'copied-old-owner', leaseUntil: Date.now() + 60000 }))
      const meta = (await disk()).runtime.find(x => x.key === metaKey)
      let rejected = false
      try { await api.integrityTest.activate(await api.integrityTest.openDatabase(), meta) } catch { rejected = true }
      const original = Blob.prototype.arrayBuffer
      Blob.prototype.arrayBuffer = () => Promise.reject(new DOMException('synthetic unreadable legacy', 'NotReadableError'))
      let preview
      try {
        const [row] = await api.integrityTest.list(scope)
        preview = { saved: row.localSaved, owner: row.leaseOwner, attempts: row.attempts, category: row.errorCategory, state: row.state }
      } finally { Blob.prototype.arrayBuffer = original }
      const d = await disk()
      return { rejected, preview, legacy: d.legacy.length, active: d.runtime.some(x => x.active === true) }
    }, id)
    assert.deepEqual(result, { rejected: true, preview: { saved: true, owner: 'copied-old-owner', attempts: 2, category: 'auth', state: 'waiting' }, legacy: 1, active: false })
    await f.done(); console.log('PASS copied owner does not authorize activation under live legacy lease; verified preview preserves raw auth/budget/owner')
  }
  {
    const f = await fixture()
    await f.page.evaluate(async () => { await q.enqueue(new Blob(['payload'], { type: 'image/jpeg' }), { fileName: 'photo.jpg' }) })
    const result = await f.page.evaluate(async () => {
      const original = IDBObjectStore.prototype.get
      IDBObjectStore.prototype.get = function(key) {
        if (this.name === 'runtime' && String(key).startsWith('found:media:v1:payload:')) throw new DOMException('synthetic read failure', 'InvalidStateError')
        return original.apply(this, arguments)
      }
      try { await api.integrityTest.list(scope); return false }
      catch (error) { return error instanceof api.DeviceStorageError && error.diagnostic.errorName === 'InvalidStateError' }
      finally { IDBObjectStore.prototype.get = original }
    })
    assert.equal(result, true, 'IDB failures propagate as storage pause, not false checksum corruption')
    await f.done(); console.log('PASS payload read-operation error remains typed storage failure')
  }
  {
    const f = await fixture()
    const legacy = await f.context.newPage(); await legacy.goto(f.url + '?old=1'); await legacy.waitForFunction(() => q.ready)
    await legacy.evaluate(async () => q.enqueue(new Blob(['unreadable legacy'], { type: 'image/jpeg' }), { fileName: 'legacy.jpg' }))
    const state = await f.page.evaluate(async () => {
      const original = Blob.prototype.arrayBuffer
      Blob.prototype.arrayBuffer = () => Promise.reject(new DOMException('synthetic', 'NotReadableError'))
      try { const [row] = await api.integrityTest.list(scope); return { saved: row.localSaved, category: row.errorCategory, legacy: (await disk()).legacy.length } }
      finally { Blob.prototype.arrayBuffer = original }
    })
    assert.deepEqual(state, { saved: false, category: 'integrity', legacy: 1 })
    await f.done(); console.log('PASS unreadable legacy without backup stays scoped attention with original row preserved')
  }
  {
    const f = await fixture()
    const id = await f.page.evaluate(async () => (await q.enqueue(new Blob(['lease bytes'], { type: 'image/jpeg' }), { fileName: 'lease.jpg' })).id)
    for (const mode of ['unknown', 'fallback', 'web-lock']) {
      const state = await f.page.evaluate(async ({ id, mode }) => {
        const key = api.integrityTest.metadataKey({ ...scope, id })
        await edit('runtime', key, row => ({ ...row, leaseOwner: 'former-owner', leaseUntil: Date.now() + 60000, leaseMode: mode === 'unknown' ? undefined : mode,
          attempts: 2, firstAttemptAt: 1234, nextAttemptAt: 9876543210, resumeInfo: { version: 1, url: 'synthetic-resume' } }))
        const withoutProof = await api.integrityTest.claimLease(scope, id, 'replacement', false)
        const withProof = await navigator.locks.request('found-upload:' + id, async lock => {
          if (!lock) throw Error('missing real lock')
          return api.integrityTest.claimLease(scope, id, 'replacement', true)
        })
        const [row] = await api.integrityTest.list(scope)
        if (withProof) await api.integrityTest.persist({ ...row, state: 'waiting' })
        const beforeRelease = (await disk()).runtime.find(x => x.key === key)
        if (withProof) await api.integrityTest.releaseLease(scope, id, 'replacement')
        const afterRelease = (await disk()).runtime.find(x => x.key === key)
        return { withoutProof, withProof, modePreserved: beforeRelease.leaseMode, released: afterRelease.leaseOwner === undefined && afterRelease.leaseMode === undefined,
          attempts: afterRelease.attempts, first: afterRelease.firstAttemptAt, next: afterRelease.nextAttemptAt, resume: afterRelease.resumeInfo }
      }, { id, mode })
      assert.equal(state.withoutProof, false, 'a fallback caller cannot steal even a prior Web-Lock lease')
      assert.equal(state.withProof, mode === 'web-lock', 'real Web Lock cannot reclaim fallback/unknown ownership')
      assert.equal(state.attempts, 2); assert.equal(state.first, 1234); assert.equal(state.next, 9876543210)
      assert.deepEqual(state.resume, { version: 1, url: 'synthetic-resume' }, 'reclaim, metadata update and release preserve retry/resume state')
      if (mode === 'web-lock') { assert.equal(state.modePreserved, 'web-lock'); assert.equal(state.released, true) }
    }
    await f.done(); console.log('PASS runtime lease-mode separation: real Web Lock reclaims only Web-Lock leases; fallback/unknown protected; metadata preserves mode and release clears it')
  }
  {
    const f = await fixture()
    const legacy = await f.context.newPage(); await legacy.goto(f.url + '?old=1&fallback=1'); await legacy.waitForFunction(() => q.ready)
    const id = await legacy.evaluate(async () => {
      const row = await q.enqueue(new Blob(['legacy lease'], { type: 'image/jpeg' }), { fileName: 'legacy.jpg' })
      if (!await api.integrityOld.claimLease(scope, row.id, 'actual-old-owner')) throw Error('old lease not acquired')
      return row.id
    })
    const result = await f.page.evaluate(async id => {
      const claimed = await navigator.locks.request('found-upload:' + id, () => api.integrityTest.claimLease(scope, id, 'new-owner', true))
      const legacy = (await disk()).legacy[0]
      return { claimed, marked: Object.hasOwn(legacy, 'leaseMode'), ownerPreserved: legacy.leaseOwner === 'actual-old-owner' }
    }, id)
    assert.deepEqual(result, { claimed: false, marked: false, ownerPreserved: true })
    await f.done(); console.log('PASS actual old legacy fallback lease is never marked/reclaimed as Web-Lock ownership')
  }
  assert.deepEqual(blockingFindings, [], 'Integrity protocol blockers')
  console.log(`Passed ${groups} media integrity browser groups; synthetic data/transport only, physical WebKit unqualified.`)
} finally { await browser.close() }
