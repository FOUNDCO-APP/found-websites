// Run: node tests/found-mail-retirement.mjs
// Real Svix verification and NextResponse; isolated DB, receipt and auth boundaries.
import fs from "node:fs"
import vm from "node:vm"
import crypto from "node:crypto"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
const { Webhook } = require("svix")
const { NextResponse } = require("next/server")
const root = new URL("../", import.meta.url)
const paths = [
  "src/app/api/resend/webhook/route.ts",
  "src/app/admin/emails/received/actions.ts",
  "src/app/api/cron/found-mail/route.ts",
  "src/app/api/admin/mail-unread/route.ts",
]
const read = path => fs.readFileSync(new URL(path, root))
const hashes = () => paths.map(path => crypto.createHash("sha256").update(read(path)).digest("hex"))
const before = hashes()
const secret = "whsec_" + Buffer.from("synthetic-regression-signing-key").toString("base64")
// Never reads production credentials or modifies the real process environment.
const env = { RESEND_WEBHOOK_SECRET: secret, CRON_SECRET: "synthetic-cron" }
let calls = [], authorized = true, authCalls = 0, dbError = false, receiptError = false
const admin = {
  from(table) {
    calls.push(["from", table])
    return { update(values) {
      calls.push(["update", values])
      return { eq: async (column, id) => {
        calls.push(["eq", column, id])
        return { error: dbError ? {} : null }
      } }
    } }
  },
}

function load(path) {
  const exports = {}
  const { outputText } = ts.transpileModule(read(path).toString(), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  vm.runInNewContext(outputText, {
    exports, process: { env }, console: { error() {} },
    require(id) {
      if (id === "next/server") return { NextResponse }
      if (id === "svix") return { Webhook }
      if (id === "@supabase/supabase-js") return { createClient() {
        calls.push(["client"])
        return admin
      } }
      if (id === "@/lib/admin/mailReplies") return { recordReplyDelivery: async (client, id, status, time) => {
        assert.equal(client, admin)
        calls.push(["receipt", id, status, time])
        return { success: !receiptError }
      } }
      if (id === "../../lib" || id === "@/app/admin/lib") return { requireAdmin: async () => {
        authCalls++
        if (!authorized) throw new Error("Unauthorized")
      } }
      // Unexpected dependencies fail closed rather than reaching a live service.
      throw new Error(`Unexpected dependency: ${id}`)
    },
  }, { filename: path })
  return exports
}

const webhook = load(paths[0]), actions = load(paths[1]), cron = load(paths[2]), unread = load(paths[3])
const time = new Date().toISOString()
function request(type, mode = "signed") {
  const body = JSON.stringify({ type, created_at: time, data: { email_id: "historical-provider-id" } })
  const id = "msg_regression", timestamp = new Date(), headers = new Headers()
  if (mode !== "unsigned") {
    headers.set("svix-id", id)
    headers.set("svix-timestamp", String(Math.floor(timestamp.getTime() / 1000)))
    headers.set("svix-signature", mode === "invalid" ? "v1,invalid" : new Webhook(secret).sign(id, timestamp, body))
  }
  return new Request("https://example.invalid/api/resend/webhook", { method: "POST", headers, body })
}

let cases = 0
for (const inbound of ["true", "false"]) for (const sending of ["true", "false"]) {
  env.FOUND_INBOUND_ENABLED = inbound
  env.FOUND_MAIL_SEND_ENABLED = sending
  calls = []
  const received = await webhook.POST(request("email.received"))
  assert.equal(received.status, 200)
  assert.equal((await received.json()).retired, true)
  assert.equal(calls.length, 0, "Late inbound must not create a DB client")
  cases++
  for (const mode of ["unsigned", "invalid"]) {
    calls = []
    assert.equal((await webhook.POST(request("email.received", mode))).status, 400)
    assert.equal(calls.length, 0)
    cases++
  }
  for (const [type, status] of Object.entries({
    "email.sent": "sent", "email.delivered": "delivered", "email.delivery_delayed": "delayed",
    "email.bounced": "bounced", "email.complained": "complained",
  })) {
    calls = []
    assert.equal((await webhook.POST(request(type))).status, 200, `${type}, inbound=${inbound}, sending=${sending}`)
    assert.deepEqual(calls.map(call => call[0]), ["client", "from", "update", "eq", "receipt"])
    assert.equal(calls[1][1], "email_log")
    assert.equal(calls[2][1].delivery_status, status)
    assert.ok(!isNaN(Date.parse(calls[2][1].delivery_status_at)))
    assert.deepEqual(calls[3], ["eq", "resend_email_id", "historical-provider-id"])
    assert.deepEqual(calls[4], ["receipt", "historical-provider-id", status, time])
    cases++
  }
}

assert.deepEqual(Object.keys(actions).sort(), [
  "saveReplyDraft", "sendManualReply", "markMailRead", "saveComposeDraft",
  "sendComposeDraft", "moveMail", "setSenderRule", "retryMailRetrieval",
].sort())
for (const [name, action] of Object.entries(actions)) {
  calls = []
  authorized = false
  let count = authCalls
  await assert.rejects(action(new FormData()), /Unauthorized/, name)
  assert.equal(authCalls, count + 1)
  authorized = true
  count = authCalls
  const result = await action(new FormData())
  assert.equal(authCalls, count + 1)
  assert.equal(result.success, false)
  assert.match(result.error, /retired/)
  assert.equal(calls.length, 0)
  cases += 2
}

calls = []
authorized = false
assert.equal((await unread.GET()).status, 401)
authorized = true
const count = await unread.GET()
assert.equal((await count.json()).count, 0)
assert.equal(count.headers.get("cache-control"), "private, no-store")
assert.equal(calls.length, 0)
cases += 2
assert.equal((await cron.GET(new Request("https://example.invalid"))).status, 401)
const cronResponse = await cron.GET(new Request("https://example.invalid", {
  headers: { authorization: "Bearer synthetic-cron" },
}))
assert.equal((await cronResponse.json()).retired, true)
assert.equal(calls.length, 0)
cases += 2

dbError = true
assert.equal((await webhook.POST(request("email.delivered"))).status, 503)
dbError = false
receiptError = true
assert.equal((await webhook.POST(request("email.delivered"))).status, 503)
cases += 2
assert.deepEqual(hashes(), before, "Source files must remain unchanged")
assert.equal(cases, 54)
console.log(`PASS ${cases} focused runtime cases; real Svix signatures, all four flag combinations, source hashes unchanged.`)
