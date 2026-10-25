import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
const module = { exports: {} }
const response = {
  redirect: (url, status = 307) => ({ kind: 'redirect', url: String(url), status }),
  rewrite: url => ({ kind: 'rewrite', url: String(url) }),
  next: () => ({ kind: 'next' }),
}
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  { module, exports: module.exports, Headers, process: { env: {} }, require(name) {
    assert.equal(name, 'next/server')
    return { NextResponse: response }
  } })
const old = 'intelligence-protection-security-llc-arizona.foundco.app'
const next = 'intellsecurity.foundco.app'
let checks = 0
async function request(host, path, method = 'GET') {
  const url = new URL(`https://${host}${path}`)
  url.clone = () => new URL(url)
  return module.exports.middleware({ headers: new Headers({ host }), nextUrl: url, method })
}
for (const path of ['/', '/about', '/services', '/contact', '/gallery', '/gallery/site-visits',
  '/q/retained-id?token=a%2Bb&source=email', '/favicon.ico?v=2', '/site.webmanifest',
  '/api/accept-estimate/retained-id?source=old', '/api/pay-estimate/retained-id', '/api/decline-estimate/retained-id']) {
  for (const method of ['GET', 'HEAD', 'POST']) {
    const actual = await request(old, path, method)
    assert.equal(actual.kind, 'redirect')
    assert.equal(actual.status, 308)
    assert.equal(actual.url, `https://${next}${path}`)
    checks++
  }
}
for (const host of [next, 'intelligence-protection-security-llc.foundco.app', 'rc-bicycles.foundco.app',
  'barriobuilders.foundco.app', 'other.example.com', `${old}.evil.example`]) {
  const actual = await request(host, '/contact?from=check')
  assert.equal(actual.kind, 'rewrite')
  assert.notEqual(actual.url, `https://${next}/contact?from=check`)
  checks++
}
for (const host of ['foundco.app', 'www.foundco.app', 'my.foundco.app', 'admin.foundco.app']) {
  const actual = await request(host, '/')
  assert.notEqual(actual.kind, 'redirect')
  checks++
}
assert.equal((await request(next, '/contact')).url, `https://${next}/intellsecurity/contact`)
checks++
console.log(`${checks} address-forwarding checks passed; no remote requests or writes.`)
