import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Source execution with a failing IndexedDB boundary. Real Blob/IDB retention,
// blocked scheduling and spinner state are tested in device-upload-queue-browser.
const source = fs.readFileSync('src/lib/deviceUploadQueue.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText
function fixture(failureName = 'InvalidStateError', boundary = 'transaction') {
  const fail = () => { throw new DOMException('PRIVATE filename secret-token account-id', failureName) }
  let currentTx
  const failedRequest = () => {
    if (boundary !== 'request-event') return fail()
    queueMicrotask(() => currentTx.onerror({ target: { error: new DOMException('PRIVATE asynchronous error', failureName) } }))
    return {}
  }
  const store = { get: failedRequest, put: failedRequest, getAll: failedRequest, index: () => ({ getAll: failedRequest }) }
  const db = { transaction() {
    if (boundary === 'transaction') return fail()
    currentTx = { error: null, objectStore() { if (boundary === 'objectStore') return fail(); return store } }
    return currentTx
  } }
  const module = { exports: {} }
  vm.runInNewContext(code + '\nexports.boundaries={budget,persist,list,remove,claimLease,releaseLease};', {
    module, exports: module.exports, Blob, DOMException, setTimeout, clearTimeout,
    indexedDB: { open() {
      if (boundary === 'open') return fail()
      const request = { result: db }
      queueMicrotask(() => request.onsuccess())
      return request
    } },
    IDBKeyRange: { only: value => value, bound: (lower, upper) => ({ lower, upper }) },
    require(id) { assert.equal(id, '@/lib/uploadDashboardMedia'); return {} },
  })
  return module.exports
}
const scope = { accountId: 'PRIVATE-account', companyId: 'PRIVATE-company' }
const row = { ...scope, id: 'PRIVATE-id', fileName: 'PRIVATE-file.jpg', blob: new Blob(['original']), mimeType: 'image/jpeg', localSaved: true }
let groups = 0
const clean = diagnostic => {
  assert.deepEqual(Object.keys(diagnostic).sort(), ['category', 'errorName', 'operation', 'verifiedOriginal'])
  assert.doesNotMatch(JSON.stringify(diagnostic), /PRIVATE|secret|account-id|\.jpg/)
}
for (const boundary of ['transaction', 'objectStore', 'request', 'request-event', 'open']) {
  for (const [method, args, operation, verified] of [
    ['budget', [scope], 'budget-read', false], ['budget', [scope, { failures: 1, notBefore: 1 }], 'budget-write', false],
    ['persist', [row, true], 'initial-write', false], ['persist', [row], 'capture-update', true],
    ['list', [scope], 'capture-read', false], ['remove', [scope, row.id], 'remove', false],
    ['claimLease', [scope, row.id, 'owner'], 'lease-claim', false], ['releaseLease', [scope, row.id, 'owner'], 'lease-release', false],
  ]) {
    const api = fixture('InvalidStateError', boundary)
    await assert.rejects(() => api.boundaries[method](...args), error => {
      assert.ok(error instanceof api.DeviceStorageError)
      assert.equal(error.diagnostic.operation, boundary === 'open' ? 'open' : operation)
      assert.equal(error.diagnostic.errorName, 'InvalidStateError', `${boundary}/${method}`)
      assert.equal(error.diagnostic.category, 'unavailable')
      assert.equal(error.diagnostic.verifiedOriginal, boundary === 'open' ? false : verified)
      assert.doesNotMatch(error.message, /sign in|auth|PRIVATE/i)
      clean(error.diagnostic); return true
    })
    groups++
  }
}
const { DeviceStorageError } = fixture()
for (const [name, category, expectedName] of [
  ['QuotaExceededError', 'quota', 'QuotaExceededError'], ['AbortError', 'aborted', 'AbortError'],
  ['TimeoutError', 'timeout', 'TimeoutError'], ['PRIVATE secret-token', 'unknown', 'UnknownError'],
]) {
  const error = new DeviceStorageError(row, 'capture-update', { name, message: 'PRIVATE secret-token' }, undefined, true)
  clean(error.diagnostic)
  assert.equal(error.diagnostic.category, category); assert.equal(error.diagnostic.errorName, expectedName)
  assert.equal(error.capture, row, 'Retain backward-compatible capture access')
  assert.equal(Object.keys(error).includes('capture'), false)
  assert.doesNotMatch(JSON.stringify(error), /PRIVATE|secret-token|\.jpg/)
  assert.equal(Object.isFrozen(error.diagnostic), true)
  groups++
}
const unsafeName = Object.defineProperty({}, 'name', { get() { throw Error('PRIVATE') } })
assert.equal(new DeviceStorageError(undefined, 'capture-read', unsafeName).diagnostic.errorName, 'UnknownError')
groups++
console.log(`Passed ${groups} sanitized storage diagnostic groups; no real accounts, network or media access.`)
