import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import { execFileSync } from "node:child_process"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup as render } from "react-dom/server"

const require = createRequire(import.meta.url)
const cache = new Map()
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? ".ts" : ".tsx"
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText
  function localRequire(id) {
    if (id === "react" || id === "react/jsx-runtime") return require(id)
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
    if (id === "next/navigation") return { useRouter: () => ({ push() { throw Error("Unexpected navigation") } }) }
    if (id === "next/server") return { NextResponse: {
      next: options => ({ kind: "next", options }),
      rewrite: (url, options) => ({ kind: "rewrite", url, options }),
      redirect: (url, status = 307) => ({ kind: "redirect", url, status }),
    } }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    throw Error(`Unexpected dependency ${id}`)
  }
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, URL, Headers,
    process: { env: {} }, fetch() { throw Error("No live reads or writes allowed") } }, { filename: absolute })
  return module.exports
}
let checks = 0
function check(condition, message) { assert.ok(condition, message); checks++ }
const { middleware } = load("src/middleware.ts")
function nextUrl(value) { const url = new URL(value); url.clone = () => nextUrl(url.href); return url }
function request(host, pathname, extra = {}) { return { headers: new Headers({ host, ...extra }), nextUrl: nextUrl(`https://${host}${pathname}`) } }
const pages = ["support", "contact", "about"]
for (const host of ["foundco.app", "www.foundco.app", "foundco.app:443", "localhost:3000", "127.0.0.1:3000"]) {
  for (const pathname of ["/pricing", "/pricing/", "/pricing?utm_source=legacy&next=https://evil.invalid"]) {
    const result = await middleware(request(host, pathname))
    check(result.kind === "redirect" && result.status === 301 && result.url.pathname === "/plans", `${host}: pricing uses explicit 301`)
    check(result.url.host === new URL(`https://${host}${pathname}`).host && result.url.search === new URL(`https://${host}${pathname}`).search, `${host}: redirect stays on host and preserves query`)
  }
  for (const page of pages) {
    const result = await middleware(request(host, `/${page}?from=footer`))
    check(result.kind === "rewrite" && result.url.pathname === `/_found-marketing/${page}`, `${host}: real root ${page} route`)
    check(result.url.search === "?from=footer" && result.options.request.headers.get("x-found-root-site") === "1", `${host}: root marker and query preserved`)
    const direct = await middleware(request(host, `/_found-marketing/${page}`))
    check(direct.kind === "redirect" && direct.status === 301 && direct.url.pathname === `/${page}`, `${host}: internal route canonicalizes without exposing an alternate public URL`)
  }
}
for (const host of ["hiram.foundco.app", "pricing.foundco.app", "about.foundco.app", "contact.foundco.app", "support.foundco.app", "customer.example", "www.customer.example", "foundco.app.evil.invalid"]) {
  const slug = host.endsWith(".foundco.app") ? host.slice(0, -".foundco.app".length) : `__domain__${host.replace(/^www\./, "")}`
  for (const pathname of ["/", "/pricing", "/support", "/contact", "/about", "/_found-marketing/support"]) {
    const result = await middleware(request(host, pathname, { "x-found-root-site": "1", "x-forwarded-host": "foundco.app" }))
    check(result.kind === "rewrite" && result.url.pathname === `/${slug}${pathname === "/" ? "" : pathname}`, `${host}${pathname}: tenant routing stays unchanged even with spoofed marketing headers`)
  }
}
for (const [host, prefix] of [["my.foundco.app", "/dashboard"], ["admin.foundco.app", "/admin"]]) {
  const result = await middleware(request(host, "/pricing"))
  check(result.kind === "rewrite" && result.url.pathname === `${prefix}/pricing`, `${host}: app routing is not marketing pricing`)
}
for (const pathname of ["/plans", "/terms", "/privacy", "/api/places"]) {
  check((await middleware(request("foundco.app", pathname))).kind === "next", `${pathname}: existing root route stays unchanged`)
}
const footer = render(React.createElement(load("src/components/SiteFooter").default))
for (const href of ["/support", "/about", "/contact", "/plans", "/terms", "/privacy"]) check(footer.includes(`href="${href}"`), `Marketing footer retains ${href}`)
check(footer.includes("flex-wrap"), "Footer links wrap on mobile")
for (const page of pages) {
  check(!fs.existsSync(`src/app/${page}/page.tsx`), `${page}: no static root page shadows a tenant slug`)
  const route = load(`src/app/%5Ffound-marketing/${page}/page.tsx`)
  const html = render(React.createElement(route.default))
  check(html.includes("<main>") && html.includes("<h1"), `${page}: actual accessible page content renders`)
  check(route.metadata.alternates.canonical === `https://foundco.app/${page}`, `${page}: canonical is the public URL`)
  for (const href of ["/how-it-works", "/compare", "/plans", "/industries", "/support", "/contact", "/about", "/terms", "/privacy"]) {
    check(html.includes(`href="${href}"`), `${page}: existing marketing navigation and working footer ${href}`)
  }
  const content = html.match(/<main>([\s\S]*?)<\/main>/)?.[1] ?? ""
  check(!/one.click|24\/7|one business day|within (?:24|one)|response time|guaranteed (?:response|retention)|tel:|<form\b|<img\b/i.test(content), `${page}: no invented service promises, contact phone, form, or portrait`)
}
const support = render(React.createElement(load("src/app/%5Ffound-marketing/support/page.tsx").default))
check(support.includes("mailto:hello@foundco.app") && support.includes("Support assists with cancellation requests"), "Cancellation is support-assisted by public email")
check(support.includes("90-day window") && support.includes("Export requests are handled by support") && support.includes("not guaranteed"), "Export is requested with correct window and no retention guarantee")
check(support.includes("/terms#section-3") && support.includes("/terms#section-14") && support.includes("/privacy"), "Support links to existing policy sections, not new policies")
check(support.includes("request account deletion"), "Deletion is an email request")
const about = render(React.createElement(load("src/app/%5Ffound-marketing/about/page.tsx").default))
check(about.includes("Found Co. LLC") && about.includes("Tucson, Arizona") && about.includes("Camera and photo tools"), "About uses approved company and mobile/camera facts")
check(!/founder|Shawn|testimonials?|<blockquote/i.test(about), "No founder identity or testimonial invented")
for (const policy of ["terms", "privacy"]) {
  const filename = `src/app/${policy}/page.tsx`
  const current = fs.readFileSync(filename, "utf8")
  const original = execFileSync("git", ["show", `a0cade7:${filename}`], { encoding: "utf8" })
  check(current.split("{/* Footer strip */}")[0].replace(/\r\n/g, "\n") === original.split("{/* Footer strip */}")[0].replace(/\r\n/g, "\n"), `${policy}: policy body unchanged apart from checkout line endings`)
  const html = render(React.createElement(load(filename).default))
  if (policy === "terms") {
    const cancellation = html.split('<div id="section-3">')[1]?.split('<div id="section-4">')[0] ?? ""
    const exportSection = html.split('<div id="section-14">')[1]?.split('<div id="section-15">')[0] ?? ""
    check(cancellation.includes("Subscription Plans, Billing, and Cancellation") && cancellation.includes("Cancellation"), "Support cancellation anchor points to the actual Terms heading")
    check(exportSection.includes("Termination and What Happens to Your Site") && exportSection.includes("90 days") && exportSection.includes("request an export"), "Support export anchor points to the actual Terms heading and 90-day request text")
  }
  for (const href of ["/support", "/about", "/contact", "/plans"]) check(html.includes(`href="${href}"`), `${policy}: footer links to ${href}`)
}
console.log(`Marketing safe routes passed: ${checks} checks; rendered marketing pages/navigation, root-only 301, tenant collisions/spoofed headers, and unchanged policy bodies. No live reads/writes or build.`)
