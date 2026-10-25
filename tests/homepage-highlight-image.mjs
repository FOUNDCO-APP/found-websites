import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup as render } from "react-dom/server"

const require = createRequire(import.meta.url)
const imageFile = "src/components/HomepageHighlightImage.tsx"
const announcementFile = "src/components/layouts/SiteAnnouncement.tsx"
function load(file, overrides = {}, globals = {}) {
  const module = { exports: {} }
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } })
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require(id) {
    if (id in overrides) return overrides[id]
    return require(id)
  }, ...globals }, { filename: file })
  return module.exports.default
}
const Image = load(imageFile)
const src = "https://example.test/original-flyer.jpg"
const alt = "Fixture Security highlighted image"
const companyName = "Fixture Security"
const closed = render(React.createElement(Image, { src, companyName }))
assert.match(closed, /aria-label="View full size"/)
assert.match(closed, /aria-haspopup="dialog"/)
assert.match(closed, /aria-expanded="false"/)
assert.match(closed, /max-w-\[640px\]/)
assert.match(closed, /class="block h-full w-full object-contain"/)
assert.match(closed, /height:min\(80svh, 900px, calc\(\(100vw - 2rem\) \* 1.5\)\)/)
assert.match(closed, /alt="Fixture Security highlighted image"/)
assert.doesNotMatch(closed, /object-cover|View company flyer|<h[12]|role="dialog"/)
assert.equal((closed.match(/<img /g) ?? []).length, 1)

let copyCalls = 0
let copy = { title: "Original headline", body: "Original supporting copy", label: "Contact", href: "/contact", eyebrow: "Featured update" }
const Announcement = load(announcementFile, {
  "@/components/HomepageHighlightImage": { __esModule: true, default: Image },
  "@/lib/highlightLinks": { resolveHighlightHref: value => value },
  "@/lib/featuredUpdate": { getFeaturedUpdatePublicCopy() { copyCalls++; return copy } },
  "next/link": { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) },
})
const company = { name: "Fixture Security", primary_color: "#207040", website_config: {} }
function announcement(style, enabled = true, image = src) {
  company.website_config = { announcement_enabled: enabled, ...(style ? { announcement_style: style } : {}) }
  return render(React.createElement(Announcement, { company, image }))
}
assert.equal(announcement("artwork", false), "")
assert.equal(announcement("artwork", true, null), "")
copy = null
copyCalls = 0
assert.match(announcement("artwork"), /aria-label="View full size"/)
assert.equal(copyCalls, 0, "Artwork never depends on generated title, body or CTA")
copy = { title: "Original headline", body: "Original supporting copy", label: "Contact", href: "/contact", eyebrow: "Featured update" }
for (const style of [undefined, "default", "light", "dark", "accent", "image"]) {
  const html = announcement(style)
  assert.match(html, /Original headline/)
  assert.match(html, /Original supporting copy/)
  assert.match(html, /href="\/contact"/)
  assert.doesNotMatch(html, /View full size/)
  assert.equal(html.includes("object-cover"), style === "image")
  assert.equal(html.includes("bg-black/62"), style === "image")
}
assert.equal(announcement(undefined), announcement("default"))

// Exercise the actual component handlers/effect with a minimal DOM and hook harness, not a browser simulation.
let active = null
class Element {
  constructor(inert = false) { this.attrs = new Set(inert ? ["inert"] : []); this.isConnected = true }
  hasAttribute(key) { return this.attrs.has(key) }
  setAttribute(key) { this.attrs.add(key) }
  removeAttribute(key) { this.attrs.delete(key) }
  focus() { active = this }
  contains(node) { return this === node || this.targets?.includes(node) }
  querySelectorAll() { return this.targets ?? [] }
}
const trigger = new Element()
const close = new Element()
const scroll = new Element()
const modal = new Element()
modal.targets = [close, scroll]
const site = new Element()
const alreadyInert = new Element(true)
const body = { style: { overflow: "clip" }, children: [site, alreadyInert, modal] }
const listeners = new Map()
const document = { body, get activeElement() { return active },
  addEventListener(key, fn) { listeners.set(key, fn) },
  removeEventListener(key, fn) { if (listeners.get(key) === fn) listeners.delete(key) } }
let open = true
let effect
let refIndex = 0
let stateIndex = 0
const refs = [trigger, modal, close]
const HookImage = load(imageFile, {
  react: { ...React, useState: initial => stateIndex++ === 0 ? [open, value => { open = value }] : [initial, () => {}], useRef: () => ({ current: refs[refIndex++] }),
    useId: () => "test-title", useEffect: fn => { effect = fn } },
  "react-dom": { createPortal: node => node },
}, { document, HTMLElement: Element })
function nodes(node) {
  if (!node || typeof node !== "object") return []
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)]
}
active = trigger
const tree = HookImage({ src, companyName })
const all = nodes(tree)
const modalNode = all.find(node => node.props?.role === "dialog")
assert.equal(modalNode.props["aria-modal"], "true")
assert.equal(modalNode.props["aria-labelledby"], "test-title")
const imageNodes = all.filter(node => node.type === "img")
assert.equal(imageNodes.length, 2)
assert.equal(imageNodes[1].props.src, src)
assert.match(imageNodes[1].props.className, /w-auto max-w-none/)
assert.ok(all.some(node => node.props?.tabIndex === 0 && node.props.className.includes("overflow-auto")))
const cleanup = effect()
assert.equal(active, close)
assert.equal(body.style.overflow, "hidden")
assert.ok(site.hasAttribute("inert"))
assert.ok(!modal.hasAttribute("inert"))
function key(key, shiftKey = false) {
  const event = { key, shiftKey, prevented: false, preventDefault() { this.prevented = true }, stopPropagation() {} }
  listeners.get("keydown")(event)
  return event
}
assert.ok(key("Tab", true).prevented)
assert.equal(active, scroll)
assert.ok(key("Tab").prevented)
assert.equal(active, close)
active = site
key("Tab")
assert.equal(active, close)
modalNode.props.onClick({ target: close, currentTarget: modal })
assert.equal(open, true, "Image/control clicks do not count as backdrop clicks")
modalNode.props.onClick({ target: modal, currentTarget: modal })
assert.equal(open, false)
open = true
all.find(node => node.props?.["aria-label"] === "Close image").props.onClick()
assert.equal(open, false)
open = true
assert.ok(key("Escape").prevented)
assert.equal(open, false)
cleanup()
assert.equal(body.style.overflow, "clip")
assert.equal(active, trigger)
assert.ok(!site.hasAttribute("inert"))
assert.ok(alreadyInert.hasAttribute("inert"))
assert.equal(listeners.size, 0)
console.log("PASS artwork SSR, legacy styles, original-image viewer, Escape/backdrop/close, focus trap/return, inert and scroll restoration. No browser visual QA.")
