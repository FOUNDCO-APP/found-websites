import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const file = new URL('../src/lib/foundClientEducation.ts', import.meta.url)
const source = fs.readFileSync(file, 'utf8')
const module = { exports: {} }
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(code, { module, exports: module.exports, URL, encodeURIComponent }, { filename: file.pathname })
const { NEW_CLIENT_PATH, EXISTING_CLIENT_PATH, MONTHLY, disabledByDefault, getEducationEligibility, buildOrientationEmail } = module.exports
let checks = 0
function check(fn) { fn(); checks++ }
const input = { companyId: '12345678-1234-4234-8234-123456789abc', businessName: 'Example Security', firstName: 'Example', websiteUrl: 'https://example-security.foundco.app', websiteVerified: true, usesIncludedAddress: true, helpEmail: 'help@example.invalid' }
const eligibility = { eligibilityVerified: true, active: true, retired: false, optedOut: false, bounced: false, complained: false, onHold: false, enrollmentApproved: true, exactDraftApproved: true }

check(() => assert.equal(disabledByDefault, true))
check(() => assert.equal(JSON.stringify(NEW_CLIENT_PATH.map(x => x.dayOffset)), '[3,7,14,21,28,35]'))
check(() => assert.equal(JSON.stringify(EXISTING_CLIENT_PATH.map(x => x.dayOffset)), '[0,7,14,21,28,35]'))
check(() => assert.equal(JSON.stringify(NEW_CLIENT_PATH.map(x => x.lesson)), '["orientation","camera","gallery","update","pro","share"]'))
check(() => assert.ok([...NEW_CLIENT_PATH, ...EXISTING_CLIENT_PATH, MONTHLY].every(x => x.status === 'Planned' && x.disabledByDefault)))
check(() => assert.ok(MONTHLY.requiresSeparateOptIn && MONTHLY.daysAfterLastLesson === 30 && MONTHLY.intervalDays === 30))
check(() => assert.ok(Object.isFrozen(NEW_CLIENT_PATH) && Object.isFrozen(NEW_CLIENT_PATH[0])))
check(() => assert.equal(getEducationEligibility(eligibility).eligible, true))
check(() => assert.equal(getEducationEligibility({}).eligible, false))
for (const key of Object.keys(eligibility)) {
  for (const value of [null, undefined, !eligibility[key]]) {
    check(() => assert.equal(getEducationEligibility({ ...eligibility, [key]: value }).eligible, false, `${key}=${value}`))
  }
}
const draft = buildOrientationEmail(input)
check(() => assert.equal(draft.subject, 'A quick check-in from Shawn at Found'))
check(() => assert.match(draft.text, /https:\/\/my\.foundco\.app\/api\/select-company\?id=12345678-1234-4234-8234-123456789abc/))
check(() => assert.equal((draft.html.match(/<a\s/g) ?? []).length, 1))
check(() => assert.match(draft.text, /works now.*text.*Google Business Profile.*Facebook.*business cards/s))
check(() => assert.match(draft.text, /YourBusiness\.com.*subject to availability.*GoDaddy.*own account.*purchase and yearly renewal.*separate from Found.*walk you through connecting/is))
check(() => assert.doesNotMatch(draft.text, /Nothing is purchased or connected automatically/))
check(() => assert.match(draft.text, /stop these tips\? Email help@example\.invalid\./))
check(() => assert.doesNotMatch(draft.text, /monitored|reply and|scheduled|you haven.t|inactive/i))
const custom = buildOrientationEmail({ ...input, websiteUrl: 'https://example-security.com', usesIncludedAddress: false })
check(() => assert.doesNotMatch(custom.text, /GoDaddy|buy|YourBusiness|renewal/))
check(() => assert.match(custom.text, /https:\/\/example-security\.com/))
const escaped = buildOrientationEmail({ ...input, businessName: '<script>alert("x")</script>', firstName: '<img src=x onerror=alert(1)>' })
check(() => assert.doesNotMatch(escaped.html, /<script>|<img/))
check(() => assert.match(escaped.html, /&lt;script&gt;/))
for (const websiteUrl of ['javascript:alert(1)', 'http://example.com', '//evil.example', 'https://user:pass@example.com', 'https://example.com?next=https://evil.com', 'https://example.com/#x', 'https://example.com/redirect', 'https://localhost', 'https://127.0.0.1', 'https://my.foundco.app', 'https://evil.com', 'https://foo.foundco.app.evil.com', 'https://example.com:8443']) {
  check(() => assert.throws(() => buildOrientationEmail({ ...input, websiteUrl })))
}
for (const companyId of ['', '../admin', 'https://evil.example', '12345678-1234-4234-8234-123456789abc&next=//evil.example']) {
  check(() => assert.throws(() => buildOrientationEmail({ ...input, companyId })))
}
check(() => assert.throws(() => buildOrientationEmail({ ...input, websiteVerified: false })))
for (const helpEmail of ['', 'help@example.com\r\nBcc: bad@example.com', '<script>@example.com', 'mailto:help@example.com']) {
  check(() => assert.throws(() => buildOrientationEmail({ ...input, helpEmail })))
}
check(() => assert.doesNotMatch(source, /\b(?:fetch|setTimeout|setInterval|sendTrackedEmail|createClient)\s*\(/))
console.log(`Found client education: ${checks} checks passed; pure drafts only, no external calls.`)
