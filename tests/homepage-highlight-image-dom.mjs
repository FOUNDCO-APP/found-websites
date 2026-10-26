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
vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require, document, window, HTMLElement: window.HTMLElement }, { filename: file })
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
async function historyChange(action) {
  let listener, timeout
  const changed = new Promise((resolve, reject) => {
    listener = () => resolve()
    window.addEventListener("popstate", listener, { once: true })
    timeout = setTimeout(() => reject(Error("Expected a history traversal")), 1500)
  })
  try { await act(async () => { action(); await changed }) }
  finally { clearTimeout(timeout); window.removeEventListener("popstate", listener) }
}
const dispatchClick = element => element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }))
const dispatchEscape = element => element.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }))
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
  assert.match(dialog.querySelector("img").className, /max-w-full object-contain/)
  assert.equal(button("Enlarge image").getAttribute("aria-pressed"), "false")
  const scroll = dialog.querySelector('[role="region"]')
  assert.equal(scroll.tabIndex, 0)
  assert.match(scroll.className, /overflow-auto/)
  button("Enlarge image").focus()
  await key(document.activeElement, "Tab", true)
  assert.equal(document.activeElement, scroll, "Shift Tab wraps to keyboard-scroll region")
  await key(scroll, "Tab")
  assert.equal(document.activeElement, button("Enlarge image"), "Tab wraps to the new first focusable control")
  await click(dialog.querySelector("img"))
  assert.ok(document.querySelector('[role="dialog"]'), "Clicking image does not dismiss it")
  await historyChange(() => dispatchEscape(document.activeElement))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.equal(document.activeElement, trigger)
  assert.equal(document.body.style.overflow, "clip")
  assert.ok(!rootElement.hasAttribute("inert"))
  assert.ok(document.querySelector("aside").hasAttribute("inert"), "Existing inert state survives")

  await click(trigger)
  await historyChange(() => dispatchClick(button("Close image")))
  assert.equal(document.activeElement, trigger)
  await click(trigger)
  await historyChange(() => dispatchClick(document.querySelector('[role="dialog"]')))
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
  await historyChange(() => dispatchClick(button("Close image")))

  const nextState = { __NA: true, tree: ["", { children: ["home", {}] }], custom: "preserve me" }
  window.history.replaceState(nextState, "", "/home?source=test#details")
  const originalUrl = window.location.href
  await act(() => root.render(React.createElement(Image, { src: source, companyName: "Fixture Security",
    triggerLabel: "Take a closer look", triggerClassName: "btn w-full md:w-auto", triggerStyle: { color: "white" } })))
  const textTrigger = rootElement.querySelector("button")
  assert.equal(textTrigger.textContent, "Take a closer look")
  assert.equal(textTrigger.className, "btn w-full md:w-auto")
  assert.equal(textTrigger.style.color, "white")
  assert.equal(rootElement.querySelectorAll("img, section, h1, h2, a").length, 0, "Text trigger never embeds a second poster or heading")
  textTrigger.focus()
  await click(textTrigger)
  assert.equal(window.location.href, originalUrl, "Opening the photo does not change the page URL")
  assert.ok(window.history.state.foundHighlight)
  assert.deepEqual({ ...window.history.state, foundHighlight: undefined }, { ...nextState, foundHighlight: undefined }, "Modal marker preserves Next state and custom state")
  dialog = document.querySelector('[role="dialog"]')
  let photo = dialog.querySelector("img")
  assert.match(photo.className, /max-w-full object-contain/)
  assert.equal(photo.style.maxHeight, "calc(100dvh - 7rem)", "Fit mode bounds image height without document zoom")
  assert.equal(photo.src, source)
  await click(button("Enlarge image"))
  assert.equal(button("Fit image").getAttribute("aria-pressed"), "true")
  assert.match(dialog.querySelector("img").className, /max-w-none/)
  assert.equal(dialog.querySelector("img").style.maxHeight, "")
  assert.match(dialog.querySelector('[role="region"]').className, /overflow-auto/)
  assert.equal(document.body.style.overflow, "hidden")
  await click(button("Fit image"))
  assert.equal(button("Enlarge image").getAttribute("aria-pressed"), "false")
  assert.match(dialog.querySelector("img").className, /max-w-full/)
  await fail(dialog.querySelector("img"))
  assert.equal(dialog.querySelector("a").href, source)
  assert.equal(dialog.querySelector("a").rel, "noopener noreferrer")
  assert.equal(dialog.querySelector("a").target, "_blank")
  await click(button("Retry image"))
  assert.equal(dialog.querySelector("img").src, source, "Retry uses the same original, not a transformed substitute")
  await historyChange(() => window.history.back())
  assert.equal(document.querySelector('[role="dialog"]'), null, "Browser Back closes the open photo")
  assert.deepEqual(window.history.state, nextState)
  assert.equal(window.location.href, originalUrl)
  assert.equal(document.activeElement, textTrigger)
  assert.equal(document.body.style.overflow, "clip")
  assert.ok(!rootElement.hasAttribute("inert"))
  assert.ok(document.querySelector("aside").hasAttribute("inert"))
  assert.equal(rootElement.querySelectorAll("img").length, 0)

  await click(textTrigger)
  await click(button("Enlarge image"))
  await historyChange(() => dispatchClick(button("Close image")))
  assert.deepEqual(window.history.state, nextState, "Close consumes only its modal history entry")
  await click(textTrigger)
  assert.ok(button("Enlarge image"), "Reopening resets zoom to Fit")
  const foreignState = { ...nextState, differentNavigation: true }
  window.history.replaceState(foreignState, "", "/another-page")
  await click(button("Close image"))
  assert.deepEqual(window.history.state, foreignState, "Close never traverses a history entry it no longer owns")
  assert.equal(window.location.pathname, "/another-page")

  await click(textTrigger)
  await act(() => root.unmount())
  assert.equal(document.body.style.overflow, "clip", "Unmount also restores body scrolling")
  assert.ok(!rootElement.hasAttribute("inert"))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  console.log("PASS actual ReactDOM + JSDOM: legacy/text-only triggers, Fit/Enlarge, original-source failure/retry, zoom-aware focus loop, Escape/Close/Back, owned history marker preserving Next state, and scroll/inert cleanup. DOM tests only, not browser visual QA.")
} finally {
  await act(() => root.unmount())
  dom.window.close()
  for (const [key, descriptor] of previous) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor)
    else delete globalThis[key]
  }
}
