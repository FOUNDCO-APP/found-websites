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
  email: "intellprotrctionsec2023@gmail.com", city: "Tucson", state: "AZ",
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
assert.ok(guardHTML.includes(`${company.email.split("@")[0]}<wbr/><span`))
assert.ok(guardHTML.includes(`>@${company.email.split("@")[1]}</span></a>`))
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
    // 640 CSS pixels also covers a 1280px desktop viewport at 200% zoom.
    for (const width of [320, 375, 390, 768, 1280, 640]) {
      await page.setViewportSize({ width, height: 900 })
      await page.setContent(`<style>${css.css}</style>${guardHTML}`)
      const metrics = await page.locator('a[href^="mailto:"]').evaluate(link => {
        const rect = link.getBoundingClientRect()
        const style = getComputedStyle(link)
        return { right: rect.right, width: rect.width, scroll: link.scrollWidth, page: document.documentElement.scrollWidth,
          wrap: style.overflowWrap, font: style.fontSize, weight: style.fontWeight,
          text: link.textContent, href: link.getAttribute("href"), left: rect.left, top: rect.top,
          domain: link.querySelector("span").getBoundingClientRect().toJSON(),
          icon: link.parentElement.previousElementSibling.getBoundingClientRect().toJSON(),
          phoneFont: getComputedStyle(document.querySelector('a[href^="tel:"]')).fontSize,
          phoneWeight: getComputedStyle(document.querySelector('a[href^="tel:"]')).fontWeight }
      })
      assert.ok(metrics.right <= width, `${width}px: email right ${metrics.right}`)
      assert.ok(metrics.scroll <= metrics.width + 1, `${width}px: email text overflows`)
      assert.ok(metrics.page <= width, `${width}px: document overflows`)
      assert.equal(metrics.wrap, "anywhere")
      assert.equal(metrics.font, "16px")
      assert.equal(metrics.weight, "500")
      assert.equal(metrics.icon.width, 44)
      assert.equal(metrics.text, company.email)
      assert.equal(metrics.href, `mailto:${company.email}`)
      assert.equal(metrics.phoneFont, "20px")
      assert.equal(metrics.phoneWeight, "900")
      if (width < 768) {
        assert.equal(metrics.left, metrics.icon.left, "Mobile email uses the full row")
        assert.ok(metrics.top >= metrics.icon.bottom, "Mobile email sits below icon and label")
      }
      assert.ok(metrics.domain.height <= 24, "Gmail domain stays on one line")
      if (width === 375 && process.env.CONTACT_SCREENSHOT) {
        await page.screenshot({ path: process.env.CONTACT_SCREENSHOT, fullPage: true })
      }
      console.log(`${width}px: full email fits; 16px medium type, intact domain, unchanged phone and icon`)
    }
    company.email = `${"longlocalpart".repeat(8)}@${"longdomain".repeat(8)}.example`
    for (const width of [320, 375, 390, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.setContent(`<style>${css.css}</style>${await render()}`)
      const link = page.locator('a[href^="mailto:"]')
      assert.equal(await link.textContent(), company.email)
      assert.equal(await link.getAttribute("href"), `mailto:${company.email}`)
      assert.ok(await link.evaluate(node => node.scrollWidth <= node.clientWidth + 1), "Long address wraps without clipping")
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Long address does not widen the page")
    }
  } finally { await browser.close() }
}
console.log("Contact fixture tests passed: guard-only copy, unchanged industry fallback, links, error and success states.")
