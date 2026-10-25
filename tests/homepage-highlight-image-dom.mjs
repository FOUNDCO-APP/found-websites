import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React, { act } from "react"
import { JSDOM } from "jsdom"

const require = createRequire(import.meta.url)
const dom = new JSDOM('<!doctype html><html><body><main id="root"></main><aside inert></aside></body></html>', { url: "https://example.test" })
const { window } = dom
const { document } = window
const globals = { window, document, navigator: window.navigator, HTMLElement: window.HTMLElement,
  Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true }
const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value })
const { createRoot } = await import("react-dom/client")
const file = "src/components/HomepageHighlightImage.tsx"
const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), { fileName: file,
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } })
const module = { exports: {} }
vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require, document, HTMLElement: window.HTMLElement }, { filename: file })
const Image = module.exports.default
const rootElement = document.getElementById("root")
const root = createRoot(rootElement)
const source = "https://example.test/original.jpg"
const button = label => document.querySelector(`button[aria-label="${label}"]`)
async function click(element) {
  assert.ok(element, "Expected a usable control")
  await act(() => { element.dispatchEvent(new window.MouseEvent("click", { bubbles: true })) })
}
async function key(element, value, shiftKey = false) {
  await act(() => { element.dispatchEvent(new window.KeyboardEvent("keydown", { key: value, shiftKey, bubbles: true, cancelable: true })) })
}
async function fail(element) {
  await act(() => { element.dispatchEvent(new window.Event("error")) })
}
try {
  await act(() => root.render(React.createElement(Image, { src: source, companyName: "Fixture Security" })))
  const trigger = button("View full size")
  assert.equal(trigger.title, "View full size")
  assert.equal(trigger.getAttribute("aria-haspopup"), "dialog")
  assert.ok(trigger.querySelector('svg[aria-hidden="true"]'))
  assert.equal(rootElement.querySelectorAll("h1, h2, a").length, 0, "No visible headline, CTA or flyer label added")
  assert.equal(trigger.textContent, "")
  assert.match(trigger.querySelector("img").className, /object-contain/)
  assert.doesNotMatch(trigger.querySelector("img").className, /object-cover/)
  const frame = trigger.parentElement
  // JSDOM drops modern svh/min() CSS. Exact frame CSS is asserted by the SSR test, not layout here.
  assert.match(frame.className, /max-w-\[640px\]/)
  document.body.style.overflow = "clip"
  trigger.focus()
  await click(trigger)
  let dialog = document.querySelector('[role="dialog"]')
  assert.ok(dialog)
  assert.equal(dialog.getAttribute("aria-modal"), "true")
  assert.equal(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent, "Fixture Security highlighted image - full size")
  assert.equal(document.body.style.overflow, "hidden")
  assert.ok(rootElement.hasAttribute("inert"))
  assert.equal(document.activeElement, button("Close image"))
  assert.equal(trigger.getAttribute("aria-expanded"), "true")
  assert.equal(dialog.querySelector("img").getAttribute("src"), source)
  assert.match(dialog.querySelector("img").className, /max-w-none/)
  const scroll = dialog.querySelector('[role="region"]')
  assert.equal(scroll.tabIndex, 0)
  assert.match(scroll.className, /overflow-auto/)
  await key(document.activeElement, "Tab", true)
  assert.equal(document.activeElement, scroll, "Shift Tab wraps to keyboard-scroll region")
  await key(scroll, "Tab")
  assert.equal(document.activeElement, button("Close image"))
  await click(dialog.querySelector("img"))
  assert.ok(document.querySelector('[role="dialog"]'), "Clicking image does not dismiss it")
  await key(document.activeElement, "Escape")
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(document.activeElement, trigger)
  assert.equal(document.body.style.overflow, "clip")
  assert.ok(!rootElement.hasAttribute("inert"))
  assert.ok(document.querySelector("aside").hasAttribute("inert"), "Existing inert state survives")

  await click(trigger)
  await click(button("Close image"))
  assert.equal(document.activeElement, trigger)
  await click(trigger)
  await click(document.querySelector('[role="dialog"]'))
  assert.equal(document.querySelector('[role="dialog"]'), null)

  await fail(trigger.querySelector("img"))
  assert.equal(button("View full size"), null, "Broken inline image is not an empty Expand control")
  assert.match(rootElement.querySelector('[role="status"]').textContent, /could not load/)
  assert.equal(rootElement.querySelector("a").href, source)
  assert.equal(rootElement.querySelector("a").target, "_blank")
  assert.ok(frame.contains(rootElement.querySelector('[role="status"]')), "Error fallback retains the same frame")
  await click(button("Retry image"))
  assert.ok(button("View full size").querySelector("img"))

  button("View full size").focus()
  await click(button("View full size"))
  dialog = document.querySelector('[role="dialog"]')
  await fail(dialog.querySelector("img"))
  assert.match(dialog.querySelector('[role="status"]').textContent, /could not load/)
  assert.equal(dialog.querySelector("a").href, source)
  await click(button("Retry image"))
  assert.ok(dialog.querySelector("img"))
  assert.equal(document.activeElement, button("Close image"), "Viewer retry leaves focus on a surviving dialog control")
  await act(() => root.unmount())
  assert.equal(document.body.style.overflow, "clip", "Unmount also restores body scrolling")
  assert.ok(!rootElement.hasAttribute("inert"))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  console.log("PASS actual ReactDOM + JSDOM: accessible icon, open/close/Escape/backdrop, focus loop/return, body/inert cleanup, uncropped image, stable frame, inline/viewer failure and retry. DOM tests only, not browser visual QA.")
} finally {
  await act(() => root.unmount())
  dom.window.close()
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
}
