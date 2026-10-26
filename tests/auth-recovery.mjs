import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import * as jsx from "react/jsx-runtime"

// All application dependencies are explicit mocks. No env files, real auth,
// email, network, database, filesystem writes or application imports execute.
const base = "src/app/dashboard/(auth)/"
let groups = 0
async function test(name, run) { await run(); groups++; console.log(`PASS ${name}`) }
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve() }
function harness(file, { auth = {}, fetch = async () => { throw Error("Network disabled") }, query = "", hash = "", mocks = {} } = {}) {
  const states = [], effects = [], timers = new Map(), routes = [], logs = []
  let index = 0, mounted = false, timerId = 0
  const location = { href: "", hash, search: query ? `?${query}` : "" }
  const params = new URLSearchParams(query)
  const react = {
    useState(initial) { const slot = index++; if (!(slot in states)) states[slot] = initial; return [states[slot], value => { states[slot] = typeof value === "function" ? value(states[slot]) : value }] },
    useEffect(effect) { if (!mounted) effects.push(effect) },
    Suspense: "suspense",
  }
  const dependencies = {
    "react": { ...react, default: react, __esModule: true },
    "react/jsx-runtime": jsx,
    "next/navigation": { useSearchParams: () => params, useRouter: () => ({ replace: path => routes.push(path) }) },
    "@/components/FoundWordmark": { default: () => null, __esModule: true },
    "@/lib/supabase/client": { createClient: () => ({ auth, from() { throw Error("Password recovery must not depend on company count") } }) },
    ...mocks,
  }
  const module = { exports: {} }
  let source = fs.readFileSync(file, "utf8")
  if (file.endsWith("login/page.tsx")) source += "\nexport { LoginForm }"
  const compiled = ts.transpileModule(source, { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URL, URLSearchParams, fetch,
    AbortSignal: { timeout(ms) { assert.equal(ms, 15000); const controller = new AbortController(); timers.set(++timerId, () => controller.abort()); return controller.signal } },
    window: { location }, process: { env: { NEXT_PUBLIC_ROOT_DOMAIN: "foundco.app" } },
    console: { error(...args) { logs.push(args) } },
    setTimeout(fn, ms) { const id = ++timerId; if (ms < 1000) queueMicrotask(fn); else timers.set(id, fn); return id },
    clearTimeout(id) { timers.delete(id) },
    require(id) { assert.ok(Object.hasOwn(dependencies, id), `Unmocked dependency: ${id}`); return dependencies[id] },
  }, { filename: file })
  const component = module.exports.LoginForm ?? module.exports.default
  return {
    states, location, routes, logs, exports: module.exports,
    render() { index = 0; const tree = component(); mounted = true; return tree },
    async mount() { const tree = this.render(); for (const effect of effects) effect(); await flush(); return tree },
    async expire() { for (const fn of [...timers.values()]) fn(); await flush() },
  }
}
function nodes(tree, predicate) {
  if (!tree || typeof tree !== "object") return []
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate))
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)]
}
const find = (tree, type) => nodes(tree, node => node.type === type)[0]
const text = tree => JSON.stringify(tree)
const submit = tree => find(tree, "form").props.onSubmit({ preventDefault() {} })
const response = (ok, data) => ({ ok, json: async () => data })

for (const mode of ["password", "magic"]) {
  for (const failure of ["network", "timeout", "non-json", "http", "malformed", "api-error"]) {
    await test(`${mode} ${failure} restores submit and shows an error`, async () => {
      const h = harness(`${base}login/page.tsx`, { fetch: async (_url, options) => {
        if (failure === "network") throw Error("offline")
        if (failure === "timeout") return new Promise((_, reject) => options.signal.addEventListener("abort", () => reject(Error("timeout"))))
        if (failure === "non-json") return { ok: false, json: async () => { throw Error("HTML") } }
        return response(failure !== "http", failure === "malformed" ? null : failure === "api-error" ? { error: "Try a login link instead." } : { ok: true })
      } })
      await h.mount(); h.states[0] = mode; h.states[1] = "owner@example.test"; h.states[2] = "fixture-password"
      const pending = submit(h.render()); if (failure === "timeout") await h.expire(); await pending
      assert.equal(h.states[3], false); assert.ok(h.states[5]); assert.equal(h.states[4], false); assert.equal(h.location.href, "")
      if (failure === "api-error") assert.equal(h.states[5], "Try a login link instead.")
    })
  }
  await test(`${mode} success preserves existing navigation`, async () => {
    const h = harness(`${base}login/page.tsx`, { fetch: async (_url, options) => { assert.ok(options.signal); return response(true, { ok: true }) } })
    await h.mount(); h.states[0] = mode; h.states[1] = "owner@example.test"; h.states[2] = "fixture-password"
    await submit(h.render())
    assert.equal(h.states[3], false)
    if (mode === "password") assert.equal(h.location.href, "/select")
    else {
      assert.equal(h.states[4], true)
      find(h.render(), "button").props.onClick()
      assert.equal(h.states[4], false); assert.equal(h.states[0], "password"); assert.equal(h.states[1], "owner@example.test")
    }
  })
}
await test("expired link opens email-only mode and allows return to password", async () => {
  const h = harness(`${base}login/page.tsx`, { query: "error=link_expired" }); await h.mount()
  assert.equal(h.states[0], "magic"); assert.match(h.states[5], /expired/)
  const tree = h.render(); assert.equal(nodes(tree, node => node.type === "input").length, 1)
  nodes(tree, node => node.type === "button" && text(node).includes("Back to password"))[0].props.onClick()
  assert.equal(h.states[0], "password")
})

const signedIn = { getUser: async () => ({ data: { user: { id: "fixture-owner", email: "owner@example.test" } }, error: null }) }
await test("verified owner can set password without any company query", async () => {
  let updates = 0
  const h = harness(`${base}auth/set-password/page.tsx`, { auth: { ...signedIn, updateUser: async () => { updates++; return { error: null } } } })
  await h.mount(); assert.ok(find(h.render(), "form"))
  h.states[0] = h.states[1] = "fixture-password"; await submit(h.render())
  assert.equal(updates, 1); assert.equal(h.states[2], false); assert.equal(h.routes.at(-1), "/select")
})
await test("logged-out set-password returns to login", async () => {
  const h = harness(`${base}auth/set-password/page.tsx`, { auth: { getUser: async () => ({ data: { user: null }, error: null }) } })
  await h.mount(); assert.equal(h.routes.at(-1), "/login"); assert.equal(find(h.render(), "form"), undefined)
})
await test("password validation prevents invalid updates", async () => {
  const h = harness(`${base}auth/set-password/page.tsx`, { auth: { ...signedIn, updateUser() { throw Error("Must not update invalid passwords") } } })
  await h.mount(); h.states[0] = h.states[1] = "short"; await submit(h.render()); assert.match(h.states[4], /8 characters/)
  h.states[0] = "fixture-password"; await submit(h.render()); assert.match(h.states[4], /don't match/)
  assert.equal(h.states[2], false); assert.equal(h.routes.length, 0)
})
for (const failure of ["rejected", "timeout", "returned-error"]) {
  await test(`session check ${failure} ends spinner with return to login`, async () => {
    const h = harness(`${base}auth/set-password/page.tsx`, { auth: { getUser: () => failure === "timeout" ? new Promise(() => {}) : failure === "rejected" ? Promise.reject(Error("offline")) : Promise.resolve({ data: { user: null }, error: { message: "expired" } }) } })
    await h.mount(); if (failure === "timeout") await h.expire()
    assert.equal(h.states[3], false); assert.equal(find(h.render(), "form"), undefined)
    find(h.render(), "button").props.onClick(); assert.equal(h.routes.at(-1), "/login")
  })
  await test(`password update ${failure} ends loading and permits retry`, async () => {
    const h = harness(`${base}auth/set-password/page.tsx`, { auth: { ...signedIn, updateUser: () => failure === "timeout" ? new Promise(() => {}) : failure === "rejected" ? Promise.reject(Error("offline")) : Promise.resolve({ error: { message: "Session expired" } }) } })
    await h.mount(); h.states[0] = h.states[1] = "fixture-password"
    const pending = submit(h.render()); if (failure === "timeout") await h.expire(); await pending
    assert.equal(h.states[2], false); assert.ok(h.states[4]); assert.ok(find(h.render(), "form")); assert.equal(h.routes.length, 0)
    nodes(h.render(), node => node.type === "button" && text(node).includes("Back to login"))[0].props.onClick(); assert.equal(h.routes.at(-1), "/login")
  })
}
for (const scenario of ["expired", "missing", "valid", "rejected", "timeout", "failed-signout"]) {
  await test(`token ${scenario} leaves the loading screen`, async () => {
    const h = harness(`${base}auth/token/page.tsx`, {
      hash: scenario === "expired" ? "#error=access_denied&error_code=otp_expired" : scenario === "missing" ? "" : "#access_token=fixture&refresh_token=fixture",
      auth: {
        setSession: () => scenario === "timeout" ? new Promise(() => {}) : scenario === "rejected" ? Promise.reject(Error("offline")) : Promise.resolve({ error: scenario === "failed-signout" ? { message: "expired" } : null }),
        signOut: async () => { throw Error("offline") },
      },
    })
    await h.mount(); if (scenario === "timeout") await h.expire()
    assert.equal(h.location.href, scenario === "valid" ? "/auth/set-password" : scenario === "missing" ? "/login?error=auth_failed" : "/login?error=link_expired")
  })
}

for (const sent of [false, true]) {
  await test(`send-login email result ${sent} is reflected in response`, async () => {
    const h = harness("src/app/dashboard/api/send-login/route.ts", { mocks: {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "@/lib/supabase/admin": { createAdminClient: () => ({ auth: { admin: { generateLink: async options => { assert.equal(options.type, "magiclink"); assert.equal(options.options.redirectTo, "https://my.foundco.app/auth/callback"); return { data: { properties: { action_link: "https://fixture.invalid" } }, error: null } } } } }) },
      "@/lib/security/rateLimit": { checkPublicRateLimit: () => ({ allowed: true }), rateLimitResponse() { throw Error("unexpected") } },
      "@/lib/emailLog": { sendTrackedEmail: async () => sent },
    } })
    const result = await h.exports.POST({ json: async () => ({ email: "owner@example.test" }) })
    assert.equal(result.status, sent ? 200 : 502); assert.equal(result.body.ok, sent ? true : undefined)
    if (!sent) assert.ok(result.body.error)
  })
}
for (const scenario of ["expired-query", "failed-code", "valid-code", "implicit"]) {
  await test(`callback ${scenario} stays on the dashboard host`, async () => {
    const h = harness(`${base}auth/callback/route.ts`, { mocks: {
      "next/server": { NextResponse: { redirect: url => ({ url }) } },
      "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
      "@supabase/ssr": { createServerClient: () => ({ auth: { exchangeCodeForSession: async () => ({ error: scenario === "failed-code" ? { message: "expired" } : null }), getUser: signedIn.getUser } }) },
      "@/lib/dashboard/getCompany": { getAllCompanies: async () => [{ id: "fixture" }] },
    } })
    const query = scenario === "expired-query" ? "error=access_denied&error_code=otp_expired" : scenario.includes("code") ? "code=fixture" : ""
    const result = await h.exports.GET({ url: `https://my.foundco.app/auth/callback?${query}&next=${encodeURIComponent("//external.invalid/path")}` })
    const url = new URL(result.url); assert.equal(url.origin, "https://my.foundco.app")
    if (scenario === "expired-query" || scenario === "failed-code") assert.equal(url.pathname + url.search, "/login?error=link_expired")
    else if (scenario === "implicit") assert.equal(url.pathname, "/auth/token")
  })
}
for (const failure of ["returned-generation-error", "thrown-generation-error", "thrown-send-error"]) {
  await test(`send-login ${failure} never logs sensitive error payloads`, async () => {
    const sensitive = "fixture-sensitive-payload"
    const h = harness("src/app/dashboard/api/send-login/route.ts", { mocks: {
      "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      "@/lib/supabase/admin": { createAdminClient: () => ({ auth: { admin: { generateLink: async () => {
        if (failure === "thrown-generation-error") throw Error(sensitive)
        return failure === "returned-generation-error" ? { data: null, error: { message: sensitive, token: sensitive } } : { data: { properties: { action_link: "https://fixture.invalid" } }, error: null }
      } } } }) },
      "@/lib/security/rateLimit": { checkPublicRateLimit: () => ({ allowed: true }), rateLimitResponse() { throw Error("unexpected") } },
      "@/lib/emailLog": { sendTrackedEmail: async () => { throw Error(sensitive) } },
    } })
    const result = await h.exports.POST({ json: async () => ({ email: "owner@example.test" }) })
    assert.equal(result.status, 500); assert.ok(result.body.error); assert.equal(result.body.ok, undefined)
    assert.equal(h.logs.length, 1); assert.equal(h.logs[0].length, 1)
    assert.ok(!JSON.stringify([h.logs, result]).includes(sensitive))
  })
}
for (const stage of ["exchange", "user", "companies"]) {
  for (const failure of ["rejected", "timeout"]) {
    await test(`callback ${stage} ${failure} returns recoverable login`, async () => {
      const fail = () => failure === "timeout" ? new Promise(() => {}) : Promise.reject(Error("fixture-sensitive-payload"))
      const h = harness(`${base}auth/callback/route.ts`, { mocks: {
        "next/server": { NextResponse: { redirect: url => ({ url }) } },
        "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
        "@supabase/ssr": { createServerClient: () => ({ auth: {
          exchangeCodeForSession: () => stage === "exchange" ? fail() : Promise.resolve({ error: null }),
          getUser: () => stage === "user" ? fail() : signedIn.getUser(),
        } }) },
        "@/lib/dashboard/getCompany": { getAllCompanies: () => stage === "companies" ? fail() : Promise.resolve([{ id: "fixture" }]) },
      } })
      const pending = h.exports.GET({ url: "https://my.foundco.app/auth/callback?code=fixture&next=/select" })
      await flush(); if (failure === "timeout") await h.expire()
      const result = await pending
      assert.equal(result.url, "https://my.foundco.app/login?error=auth_failed")
      assert.equal(h.logs.length, 0)
    })
  }
}
await test("callback cannot continue with an unverified user", async () => {
  for (const user of [null, { id: "fixture" }]) {
    const h = harness(`${base}auth/callback/route.ts`, { mocks: {
      "next/server": { NextResponse: { redirect: url => ({ url }) } },
      "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
      "@supabase/ssr": { createServerClient: () => ({ auth: {
        exchangeCodeForSession: async () => ({ error: null }),
        getUser: async () => ({ data: { user }, error: user ? { message: "verification failed" } : null }),
      } }) },
      "@/lib/dashboard/getCompany": { getAllCompanies() { throw Error("Must not query companies without verified identity") } },
    } })
    const result = await h.exports.GET({ url: "https://my.foundco.app/auth/callback?code=fixture" })
    assert.equal(result.url, "https://my.foundco.app/login?error=auth_failed")
  }
})
const unsafeNextPaths = [
  "//external.invalid/path", "/\\external.invalid/path", "/%5cexternal.invalid",
  "/%255cexternal.invalid", "/%2fexternal.invalid", "/%252fexternal.invalid",
  "/%00/select", "/%250a/select", "/\n/external.invalid", "/\t/external.invalid",
  "/%7f/select", "/%25255Cexternal.invalid", "https://external.invalid",
  "select", "/%zz", "/%25%35%63external.invalid",
]
const validNextPaths = ["/api/select-company?id=fixture-company&activated=true", "/select", "/site?section=photos#gallery"]
for (const flow of ["token", "callback-code", "callback-implicit"]) {
  await test(`${flow} rejects unsafe next paths and preserves activation paths`, async () => {
    for (const next of [...unsafeNextPaths, ...validNextPaths]) {
      const valid = validNextPaths.includes(next)
      const query = `next=${encodeURIComponent(next)}`
      if (flow === "token") {
        const h = harness(`${base}auth/token/page.tsx`, {
          query, hash: "#access_token=fixture&refresh_token=fixture",
          auth: { setSession: async () => ({ error: null }) },
        })
        await h.mount()
        assert.equal(h.location.href, valid ? next : "/auth/set-password", `token next ${JSON.stringify(next)}`)
      } else {
        const h = harness(`${base}auth/callback/route.ts`, { mocks: {
          "next/server": { NextResponse: { redirect: url => ({ url }) } },
          "next/headers": { cookies: async () => ({ getAll: () => [], set() {} }) },
          "@supabase/ssr": { createServerClient: () => ({ auth: {
            exchangeCodeForSession: async () => ({ error: null }), getUser: signedIn.getUser,
          } }) },
          "@/lib/dashboard/getCompany": { getAllCompanies: async () => [{ id: "fixture" }] },
        } })
        const result = await h.exports.GET({ url: `https://my.foundco.app/auth/callback?${flow === "callback-code" ? "code=fixture&" : ""}${query}` })
        const url = new URL(result.url)
        assert.equal(url.origin, "https://my.foundco.app")
        if (flow === "callback-code") assert.equal(result.url, `https://my.foundco.app${valid ? next : "/select"}`)
        else {
          assert.equal(url.pathname, "/auth/token")
          assert.equal(url.searchParams.get("next"), valid ? next : null)
        }
      }
    }
  })
}
console.log(`${groups} auth recovery fixture groups passed; no remote operations.`)
