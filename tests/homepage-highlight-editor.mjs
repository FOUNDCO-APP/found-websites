import assert from "node:assert/strict"
import fs from "node:fs"
import vm from "node:vm"
import ts from "typescript"
import React from "react"
import * as jsx from "react/jsx-runtime"

const source = fs.readFileSync("src/components/dashboard/HomepageHighlightEditor.tsx", "utf8")
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText
const photo = (id, url = `${id}.jpg`) => ({ id, url, website_section: null, media_type: "photo" })
let assertions = 0
function check(value, message) { assertions++; assert.ok(value, message) }

function harness(overrides = {}) {
  const slots = [], effects = [], calls = { upload: [], publish: [], disable: [], published: [], disabled: [], uploaded: [], busy: [] }
  let cursor = 0, tree
  const state = {
    upload: async () => ({ photo: photo("upload") }),
    publish: async ({ photoId }) => ({ photo: photo(photoId), clearedPhotoIds: ["previous"] }),
    disable: async () => ({ success: true }),
  }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i] },
    useEffect(fn) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(fn()) } },
  }
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, FormData,
    require(name) {
      if (name === "react") return hooks
      if (name === "react/jsx-runtime") return jsx
      if (name === "lucide-react") return Object.fromEntries(["Upload", "Image", "Trash2", "Check"].map(name => [name, props => React.createElement("svg", props)]))
      if (name.endsWith("highlightActions")) return {
        uploadHighlightImage: async data => { calls.upload.push(data); return state.upload(data) },
        publishHomepageHighlight: async input => { calls.publish.push(input); return state.publish(input) },
        disableHomepageHighlight: async () => { calls.disable.push(true); return state.disable() },
      }
      if (name.endsWith("mediaKind")) return { isVideoMedia: url => /\.(mp4|mov|webm)(\?|$)/i.test(url) }
      throw Error(name)
    },
  })
  const props = { companyName: "Example", photos: [photo("current"), photo("next"), { ...photo("video"), media_type: "video" }, photo("urlvideo", "movie.mp4")], enabled: true, currentImage: "current.jpg",
    onPublished: result => calls.published.push(result), onDisabled: () => calls.disabled.push(true), onUploaded: result => calls.uploaded.push(result), onBusyChange: value => calls.busy.push(value), ...overrides }
  function render() { cursor = 0; tree = module.exports.default(props); return tree }
  function all(node = tree) {
    if (!node || typeof node !== "object") return []
    if (Array.isArray(node)) return node.flatMap(all)
    return [node, ...(node.props?.children === undefined ? [] : all(node.props.children))]
  }
  function text(node) { if (typeof node === "string") return node; if (!node) return ""; if (Array.isArray(node)) return node.map(text).join(""); return text(node.props?.children) }
  function button(label) { const found = all().find(node => node.type === "button" && (node.props["aria-label"] === label || text(node) === label)); assert.ok(found, label); return found }
  function image() { return all().find(node => node.type === "img" && node.props.alt.includes("preview")) }
  async function upload(file) { const input = all().find(node => node.type === "input"); input.props.onChange({ target: { files: [file], value: "file" } }); await new Promise(resolve => setImmediate(resolve)); render() }
  render()
  return { props, calls, state, render, all, text: () => text(tree), button, image, upload, unmount: () => effects.forEach(cleanup => cleanup?.()) }
}

const h = harness()
check(h.image().props.src === "current.jpg", "current preview")
check(h.image().props.className.includes("object-contain"), "uncropped preview")
check(h.button("Publish highlight").props.disabled, "unchanged live image cannot duplicate publish")
h.button("Choose from Photos").props.onClick(); h.render()
check(h.all().filter(node => node.type === "button" && node.props["aria-label"]?.startsWith("Choose photo")).length === 2, "both video forms excluded")
h.button("Choose photo 2").props.onClick(); h.render()
check(h.image().props.src === "next.jpg" && h.calls.publish.length === 0, "selection stays draft")
h.button("Cancel changes").props.onClick(); h.render()
check(h.image().props.src === "current.jpg" && h.calls.disable.length === 0, "cancel restores current without mutation")
await h.upload(new File(["bytes"], "x.gif", { type: "image/gif" }))
check(h.calls.upload.length === 0 && h.text().includes("10 MB"), "invalid file rejected")
await h.upload({ type: "image/png", size: 10 * 1024 * 1024 + 1 })
check(h.calls.upload.length === 0, "oversized file rejected")
check(h.calls.busy.length === 0, "invalid files never acquire busy lock")
await h.upload(new File(["bytes"], "x.png", { type: "image/png" }))
check(h.calls.upload.length === 1 && h.calls.upload[0].get("file").name === "x.png", "file contract")
check(h.calls.uploaded.length === 1 && h.calls.publish.length === 0 && h.image().props.src === "upload.jpg", "upload is private draft only")
check(JSON.stringify(h.calls.busy) === "[true,false]", "upload reports busy transitions")
h.state.publish = async () => ({ error: "Owner error" })
await h.button("Publish highlight").props.onClick(); await new Promise(resolve => setImmediate(resolve)); h.render()
check(h.text().includes("Owner error") && h.calls.published.length === 0 && h.image().props.src === "upload.jpg", "publish failure preserves draft")
check(JSON.stringify(h.calls.busy.slice(-2)) === "[true,false]", "failed publish releases parent busy state")
let finish
h.state.publish = () => new Promise(resolve => { finish = resolve })
h.button("Publish highlight").props.onClick(); h.button("Publish highlight").props.onClick(); h.render()
check(h.calls.publish.length === 2 && h.button("Publish highlight").props.disabled, "immediate duplicate publish blocked")
finish({ photo: photo("published"), clearedPhotoIds: ["previous"] }); await new Promise(resolve => setImmediate(resolve)); h.render()
check(h.calls.published.length === 1 && h.calls.published[0].clearedPhotoIds[0] === "previous", "publish callback includes cleared ids")
h.state.disable = async () => ({ error: "Still enabled" })
h.button("Turn off highlight").props.onClick(); await new Promise(resolve => setImmediate(resolve)); h.render()
check(h.calls.disabled.length === 0 && h.text().includes("Still enabled"), "disable failure retained")
h.state.disable = async () => ({ success: true })
h.button("Turn off highlight").props.onClick(); await new Promise(resolve => setImmediate(resolve)); h.render()
check(h.calls.disabled.length === 1 && h.calls.upload.length === 1 && h.calls.publish.length === 2, "turn off only disables")

const unknown = harness({ currentImage: "legacy.jpg", photos: [] })
check(unknown.image().props.src === "legacy.jpg" && unknown.button("Publish highlight").props.disabled, "unknown current image preserved")
const pending = harness()
let uploadDone
pending.state.upload = () => new Promise(resolve => { uploadDone = resolve })
await pending.upload(new File(["bytes"], "x.webp", { type: "image/webp" }))
await pending.upload(new File(["bytes"], "y.webp", { type: "image/webp" }))
check(pending.calls.upload.length === 1, "concurrent uploads blocked")
check(JSON.stringify(pending.calls.busy) === "[true]", "duplicate upload does not notify twice")
pending.unmount(); uploadDone({ photo: photo("late") }); await new Promise(resolve => setImmediate(resolve))
check(pending.calls.uploaded.length === 0, "unmounted result ignored")
check(JSON.stringify(pending.calls.busy) === "[true,false]", "unmount releases parent busy state without late notification")
const retry = harness({ enabled: false })
check(!retry.button("Publish highlight").props.disabled, "existing saved photo can be explicitly re-enabled")
retry.state.upload = async () => ({ error: "Upload failed" })
await retry.upload(new File(["bytes"], "x.png", { type: "image/png" }))
check(retry.text().includes("Upload failed") && retry.image().props.src === "current.jpg", "upload error preserves saved image")
retry.state.upload = async () => ({ photo: photo("private") })
await retry.upload(new File(["bytes"], "x.png", { type: "image/png" }))
retry.button("Cancel changes").props.onClick(); retry.render()
check(retry.image().props.src === "current.jpg" && retry.calls.published.length === 0, "cancel uploaded draft never publishes")
retry.button("Choose from Photos").props.onClick(); retry.render()
check(retry.all().filter(node => node.type === "button" && node.props["aria-label"]?.startsWith("Choose photo")).length === 3, "cancel keeps private uploaded photo available")
retry.all().find(node => node.props?.["aria-label"] === "Photos").props.onKeyDown({ key: "Escape" }); retry.render()
check(!retry.button("Choose from Photos").props["aria-expanded"], "Escape closes chooser")
const disablePending = harness()
let disableDone
disablePending.state.disable = () => new Promise(resolve => { disableDone = resolve })
disablePending.button("Turn off highlight").props.onClick(); disablePending.button("Turn off highlight").props.onClick()
check(disablePending.calls.disable.length === 1, "duplicate disable blocked")
disableDone({ success: true }); await new Promise(resolve => setImmediate(resolve))
check(JSON.stringify(disablePending.calls.busy) === "[true,false]", "disable reports busy transitions")
const changedCallback = harness({ enabled: false })
let publishDone
const replacementBusy = []
changedCallback.state.publish = () => new Promise(resolve => { publishDone = resolve })
changedCallback.button("Publish highlight").props.onClick()
changedCallback.props.onBusyChange = value => replacementBusy.push(value)
changedCallback.render()
check(JSON.stringify(changedCallback.calls.busy) === "[true]" && replacementBusy.length === 0, "callback change does not run unmount cleanup")
publishDone({ photo: photo("current"), clearedPhotoIds: [] }); await new Promise(resolve => setImmediate(resolve))
check(JSON.stringify(replacementBusy) === "[false]" && changedCallback.calls.published.length === 1, "completion uses latest callback and stays mounted")
const photoPublishes = []
const photoDestination = harness({ enabled: false, showTurnOff: false, publishPhoto: async input => {
  photoPublishes.push(input)
  return { photo: photo("current"), clearedPhotoIds: ["old"], style: "accent" }
} })
photoDestination.button("Publish highlight").props.onClick(); await new Promise(resolve => setImmediate(resolve)); photoDestination.render()
check(photoPublishes.length === 1 && photoDestination.calls.publish.length === 0, "Photo destination uses the new atomic action, not artwork publisher")
check(photoDestination.calls.published[0].style === "accent", "server-returned style reaches parent")
check(!photoDestination.text().includes("Turn off highlight"), "destination chooser leaves parent announcement toggle intact")
const siteEditor = fs.readFileSync("src/app/dashboard/(app)/site/SiteEditor.tsx", "utf8")
check(siteEditor.includes('aria-label="Button destination"') && siteEditor.includes('["page", "photo"]'), "existing editor offers Page or Photo")
check(!siteEditor.includes("setArtworkSetup") && siteEditor.includes('startEdit("announcement_title"') && siteEditor.includes('startEdit("announcement_body"') && siteEditor.includes('startEdit("announcement_cta_label"'), "headline, body, button remain visible instead of artwork-only editor")
check(siteEditor.includes('publishPhoto={input => publishAnnouncementPhoto') && siteEditor.includes('announcement_style: result.style'), "owner UI publishes through corrected action and uses saved style")
check(siteEditor.includes('announcementStyle === "image" && !isHighlightPhotoHref') && siteEditor.includes('style.value === "image" && (announcementDestination === "photo"'), "Photo destination never previews as backdrop or enables background-photo style")
check(!source.includes("deletePhoto") && !source.includes("toggleGallery"), "no delete or Gallery operation")
check(source.includes("max-h-[420px]") && source.includes("flex-wrap") && source.includes('role="alert"'), "responsive preview and persistent accessible errors")
console.log(`Homepage highlight editor: ${assertions} assertions PASS`)
