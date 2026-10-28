import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import ts from 'typescript'
const mod = { exports: {} }
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/mailSafety.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: mod, exports: mod.exports })
const { parseInboundEmail, parseSingleMailbox, getManualReplyTarget, safeMessageId } = mod.exports
let checks = 0
const check = (value, expected, name) => { assert.deepEqual(JSON.parse(JSON.stringify(value)), expected, name); checks++ }
const clean = { from: 'Example Owner <owner@example.com>', to: ['support@foundco.app'], subject: 'Help with email marketing', text: 'Can I use the marketing tool with my clients? My website is https://example.com.', message_id: '<msg-1@example.com>', reply_to: [], headers: {}, authentication: { spf: 'pass', dkim: 'pass', dmarc: 'pass' }, attachments: [] }
check(parseInboundEmail(clean).folder, 'inbox', 'normal support vocabulary and links are not spam')
check(parseInboundEmail({ ...clean, authentication: null, headers: { 'Authentication-Results': 'spf=pass; dmarc=pass' } }).authentication.dmarc, 'unknown', 'sender headers cannot manufacture authentication evidence')
check(parseInboundEmail({ ...clean, authentication: { dmarc: 'fail' } }, { allowed: true }).folder, 'spam', 'allow rule cannot bypass failed authentication')
check(parseInboundEmail(clean, { blocked: true }).folder, 'spam', 'explicit sender block')
check(parseInboundEmail(clean, { recentCount: 20 }).folder, 'spam', 'volume review')
check(parseInboundEmail({ ...clean, to: ['other@foundco.app'] }).folder, 'spam', 'unknown recipient is quarantined')
check(parseInboundEmail({ ...clean, to: ['SUPPORT@FOUNDCO.APP'] }).folder, 'inbox', 'supported case-insensitive recipient')
check(parseInboundEmail({ ...clean, to: ['support@foundco.app.evil.example'] }).folder, 'spam', 'suffix spoof rejected')
for (const address of ['x@example.com\r\nBcc: attacker@evil.example', 'a@example.com,b@example.com', 'not-an-address', 'a@localhost', '<a@example.com><b@example.com>']) check(parseSingleMailbox(address), null, 'unsafe/ambiguous mailbox rejected')
check(parseSingleMailbox('"Owner, Example" <OWNER@EXAMPLE.COM>').address, 'owner@example.com', 'display name cannot introduce multiple recipients')
for (const url of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'vbscript:evil']) check(parseInboundEmail({ ...clean, text: url }, { allowed: true }).folder, 'spam', 'dangerous URL retained in quarantine')
for (const filename of ['invoice.pdf.exe', 'invoice.HTML', 'file.svg', 'file.zip', 'script.ps1']) {
  const parsed = parseInboundEmail({ ...clean, attachments: [{ id: 'attachment-1', filename, content_type: 'image/png', size: 40 }] }, { allowed: true })
  check(parsed.folder, 'spam', 'dangerous filename not made safe by reported MIME/allow rule')
  check(parsed.attachments[0].quarantined, true, 'attachment never auto-released')
}
const pdf = parseInboundEmail({ ...clean, attachments: [{ id: 'pdf', filename: 'quote.pdf', content_type: 'application/pdf', size: 1234 }] })
check(pdf.attachments[0].quarantined, true, 'normal PDF also remains quarantined without a scanner')
const html = parseInboundEmail({ ...clean, text: null, html: '<script>bad()</script><p>Hello<img src="https://tracker.example/pixel"></p><p>Need help &amp; support</p>' })
assert.ok(!html.body_text.includes('bad()') && !html.body_text.includes('tracker.example') && html.body_text.includes('Need help & support')); checks++
check(parseInboundEmail({ ...clean, reply_to: ['other@example.com'] }).reply_warnings.length, 1, 'different reply destination is explained')
check(parseInboundEmail({ ...clean, reply_to: ['a@example.com', 'b@example.com'] }).hard_blocked, true, 'multi-recipient reply-to cannot become reply-all')
check(parseInboundEmail({ ...clean, reply_to: ['a@example.com\nBcc: b@example.com'] }).hard_blocked, true, 'header injection reply-to rejected')
const reply = getManualReplyTarget(parseInboundEmail(clean))
check(reply.to, 'owner@example.com', 'single authoritative reply target')
check(reply.from, 'support@foundco.app', 'supported Found address selected')
check(getManualReplyTarget({ ...parseInboundEmail(clean), hard_blocked: true }).to, null, 'hard security findings block reply')
check(getManualReplyTarget({ ...parseInboundEmail(clean), from_address: 'hello@foundco.app' }).to, null, 'never reply to own supported mailbox')
for (const id of ['<valid@example.com>', '<other.123@domain.example>']) check(safeMessageId(id), id, 'valid thread identifier')
for (const id of ['<valid@example.com>\r\nBcc: x@y.com', 'abc', '<no-domain>', '<a b@example.com>']) check(safeMessageId(id), null, 'invalid thread identifier')
check(parseInboundEmail({ ...clean, headers: { References: '<old@example.com> invalid <old@example.com> <new@example.com>' } }).reference_ids, ['<old@example.com>', '<new@example.com>'], 'references validated and deduplicated')
check(parseInboundEmail({ ...clean, text: 'x'.repeat(200001) }).hard_blocked, true, 'oversized body is explicitly quarantined, not silently complete')
check(parseInboundEmail({ ...clean, text: 'We will improve your SEO. Buy our backlinks.' }).folder, 'spam', 'combined unsolicited pitch signals')
check(parseInboundEmail({ ...clean, attachments: [{id:'unknown-size',filename:'quote.pdf'}] }).attachments[0].size, null, 'missing attachment size is unavailable, never invented zero')
console.log(`${checks} inbound-mail safety checks passed; no external calls or messages.`)
