import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const cache = new Map()
const company = {
  id: "contact-fixture", name: "Contact Fixture", primary_color: "#147354",
  industry_category: "professional_services", sub_industry: "Security Guard Services",
  primary_intent: "contact", phone: "5205550100",
  email: "intelligenceprotectionsecurity@example.com", city: "Tucson", state: "AZ",
  website_config: {},
}
let result = { success: false, error: "" }
const query = {
  select() { return this }, eq() { return this }, order() { return this },
  limit: async () => ({ data: [] }),
}

// Run the real page and form with fixture reads and a non-submitting action.
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(absolute + ".ts") ? ".ts" : ".tsx"
  if (cache.has(absolute)) return cache.get(absolute)
  const module = { exports: {} }
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  function localRequire(id) {
    if (id === "react") return { ...React, useActionState: () => [result, undefined, false], useMemo: fn => fn() }
    if (id === "react/jsx-runtime") return require(id)
    if (id === "next/navigation") return { notFound() { throw Error("Unexpected missing fixture") } }
    if (id === "@/app/actions/leads") return { submitLead() { throw Error("Submission forbidden") } }
    if (id === "@/lib/company") return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: () => query }) }
    if (id === "@/lib/stockImages") return { getStockImages: async () => [], pickImg: () => null }
    if (id.startsWith("@/")) return load("src/" + id.slice(2))
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    throw Error("Unexpected dependency: " + id)
  }
  vm.runInNewContext(source, {
    module, exports: module.exports, require: localRequire, Date,
    fetch() { throw Error("Network forbidden") },
  }, { filename: absolute })
  cache.set(absolute, module.exports)
  return module.exports
}

const Page = load("src/app/[slug]/contact/page.tsx").default
const Form = load("src/app/[slug]/contact/ContactForm.tsx").default
const render = () => Page({ params: Promise.resolve({ slug: "fixture" }) }).then(renderToStaticMarkup)
const promise = /We respond within 1 business day.*usually the same day/
const neutral = "Contact us to discuss your security needs."
const guardHTML = await render()
assert.ok(guardHTML.includes(neutral))
assert.doesNotMatch(guardHTML, promise)
assert.ok(guardHTML.includes(`href="mailto:${company.email}"`))
assert.ok(guardHTML.includes(`>${company.email}</a>`))
assert.ok(guardHTML.includes('href="tel:5205550100"'))
for (const [category, subIndustry, guard] of [
  ["professional_services", "Armed Guards", true],
  ["professional_services", "Accountant", false],
  ["construction", "General Contractor", false],
  ["construction", "Security Guard Services", false],
]) {
  company.industry_category = category
  company.sub_industry = subIndustry
  const html = await render()
  assert.equal(promise.test(html), !guard, `${category}/${subIndustry}: response copy`)
  assert.equal(html.includes(neutral), guard)
}
assert.match(renderToStaticMarkup(React.createElement(Form, { companyId: "fixture", primaryColor: "#147354" })), promise)
result = { success: false, error: "Fixture error" }
assert.ok((await render()).includes("Fixture error"))
result = { success: true, error: "" }
assert.ok((await render()).includes("Message sent!"))
result = { success: false, error: "" }

// Optional browser run uses the real Tailwind output, without a live app or data client.
if (process.env.CONTACT_PLAYWRIGHT_MODULE) {
  const { chromium } = require(process.env.CONTACT_PLAYWRIGHT_MODULE)
  const postcss = require("postcss")
  const tailwind = require("@tailwindcss/postcss")
  const css = await postcss([tailwind()]).process('@import "tailwindcss";', { from: path.resolve("src/app/globals.css") })
  const browser = await chromium.launch({ headless: true, ...(process.env.CONTACT_BROWSER_CHANNEL ? { channel: process.env.CONTACT_BROWSER_CHANNEL } : {}) })
  try {
    const page = await browser.newPage()
    await page.route("**/*", route => route.abort())
    for (const width of [320, 375, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.setContent(`<style>${css.css}</style>${guardHTML}`)
      const metrics = await page.locator('a[href^="mailto:"]').evaluate(link => {
        const rect = link.getBoundingClientRect()
        const style = getComputedStyle(link)
        return { right: rect.right, width: rect.width, scroll: link.scrollWidth, page: document.documentElement.scrollWidth,
          wrap: style.overflowWrap, font: style.fontSize, weight: style.fontWeight,
          icon: link.parentElement.previousElementSibling.getBoundingClientRect().width }
      })
      assert.ok(metrics.right <= width, `${width}px: email right ${metrics.right}`)
      assert.ok(metrics.scroll <= metrics.width + 1, `${width}px: email text overflows`)
      assert.ok(metrics.page <= width, `${width}px: document overflows`)
      assert.equal(metrics.wrap, "anywhere")
      assert.equal(metrics.font, "20px")
      assert.equal(metrics.weight, "900")
      assert.equal(metrics.icon, 44)
      console.log(`${width}px: email right ${metrics.right.toFixed(2)}, page width ${metrics.page}; full address, typography and icon preserved`)
    }
  } finally { await browser.close() }
}
console.log("Contact fixture tests passed: guard-only copy, unchanged industry fallback, links, error and success states.")
