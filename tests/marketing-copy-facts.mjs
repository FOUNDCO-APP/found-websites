import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const industries = fs.readdirSync("src/app/industries", { withFileTypes: true })
  .filter(entry => entry.isDirectory() && fs.existsSync(`src/app/industries/${entry.name}/page.tsx`))
  .map(entry => `src/app/industries/${entry.name}/page.tsx`)
const plans = ["found", "found-pro", "found-business"].map(plan => `src/app/plans/${plan}/page.tsx`)
const files = [...industries, ...plans, "src/app/HomeClient.tsx", "src/app/page.tsx", "src/app/layout.tsx",
  "src/app/how-it-works/page.tsx", "src/app/compare/page.tsx", "src/app/plans/page.tsx",
  "src/components/PlanPage.tsx", "src/lib/foundPlans.ts"]
const asts = new Map()
let checks = 0
function check(label, run) { run(); checks++; console.log(`PASS ${label}`) }

function syntax(file) {
  if (!asts.has(file)) asts.set(file, ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true,
    file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS))
  return asts.get(file)
}
function copy(file) {
  const values = []
  function visit(node) {
    if (ts.isStringLiteralLike(node) || ts.isJsxText(node) || ts.isTemplateHead(node) || ts.isTemplateTail(node)) values.push(node.text)
    ts.forEachChild(node, visit)
  }
  visit(syntax(file))
  return values.join(" ").replace(/\s+/g, " ")
}
function declaration(file, name) {
  const ast = syntax(file)
  const statement = ast.statements.find(node => ts.isVariableStatement(node)
    && node.declarationList.declarations.some(item => item.name.getText(ast) === name))
  assert.ok(statement, `${file}: ${name} exists`)
  const output = ts.transpileModule(`${statement.getText(ast)}\nmodule.exports = ${name}`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(output, { module })
  return module.exports
}

let intro = true
function load(file) {
  const absolute = path.resolve(file)
  const module = { exports: {} }
  const output = ts.transpileModule(fs.readFileSync(absolute, "utf8"), { fileName: absolute,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const empty = { __esModule: true, default: () => null }
  function localRequire(id) {
    if (id === "react") return { ...React, useState: initial => [typeof initial === "function" ? initial() : initial, () => {}],
      useEffect() {}, useCallback: fn => fn, useRef: value => ({ current: value }) }
    if (id === "react/jsx-runtime") return require(id)
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) }
    if (id === "next/image") return empty
    if (id === "@/lib/pricingDisplay") return { useIntroRatePeriod: () => intro }
    if (id === "@/lib/introRate") return { INTRO_RATE_CUTOFF_LABEL: "November 15", isIntroRatePeriod: () => intro }
    if (id === "@/lib/foundPlans") return load("src/lib/foundPlans.ts")
    if (id.startsWith("@/components/")) return empty
    throw Error(`Unexpected dependency: ${id}`)
  }
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, URL,
    process: { env: {} }, fetch() { throw Error("Network forbidden") } }, { filename: absolute })
  return module.exports
}

check("marketing and metadata contain no measured launch-time promises", () => {
  for (const file of files) {
    assert.doesNotMatch(copy(file), /\bminutes\b|\bsame[- ]day\b|\blive (?:today|tonight)\b|\bonline today\b|second cup of coffee/i, file)
    assert.equal(syntax(file).parseDiagnostics.length, 0, `${file}: valid syntax`)
  }
})
check("industry setup FAQs put review before activation and qualify custom domains", () => {
  for (const file of industries) {
    const props = load(file).default().props
    const setup = props.faqs.find(item => /how do i get/i.test(item.q))
    assert.ok(setup, file)
    assert.match(setup.a, /review.+activat/i, file)
    assert.match(setup.a, /custom.domain.+longer/i, file)
  }
})
check("camera explanations distinguish private Favorites from public Gallery and explicit page placement", () => {
  for (const file of [...industries, ...plans.slice(0, 2), "src/app/HomeClient.tsx", "src/app/how-it-works/page.tsx", "src/app/compare/page.tsx"]) {
    const text = copy(file)
    assert.match(text, /private Favorite/i, file)
    assert.match(text, /Gallery to publish/i, file)
    assert.match(text, /Use on Page/i, file)
    assert.doesNotMatch(text, /heart.{0,70}(?:goes live|they appear|it's live|it appears|it's on your|go on the website)/i, file)
  }
})
check("Home FAQ explains activation, custom-domain timing and support-assisted cancellation", () => {
  const faqs = declaration("src/app/HomeClient.tsx", "HOME_FAQS")
  assert.match(faqs.find(item => /site live/.test(item.q)).a, /review.+activate.+custom.domain.+longer/i)
  const cancellation = faqs.find(item => /cancel/i.test(item.q)).a
  assert.match(cancellation, /Contact Found.+cancel/i)
  assert.match(cancellation, /future renewals.+paid billing period/i)
})
check("review requests are not offered as a currently included checkmark", () => {
  const rows = declaration("src/app/plans/page.tsx", "ROWS")
  const review = rows.find(row => /review request/i.test(row.label))
  assert.ok(review)
  assert.match(review.label, /coming soon/i)
  assert.match(review.values[2], /coming soon/i)
  const library = load("src/lib/foundPlans.ts").FOUND_PLAN_OPTIONS
  for (const file of ["src/app/HomeClient.tsx", "src/app/plans/found-business/page.tsx"]) {
    assert.doesNotMatch(copy(file), /collect reviews|more five.star reviews/i)
    assert.match(copy(file), /review requests.+coming soon/i)
  }
  assert.ok(library.find(plan => plan.key === "found_business").homepageBullets.some(value => /review requests.+coming soon/i.test(value)))
})
check("upgrade FAQs ask for confirmation without creating an intro-rate policy", () => {
  for (const file of [plans[0], plans[2]]) {
    const answer = load(file).default().props.faqs.find(item => /upgrade/i.test(item.q)).a
    assert.match(answer, /Contact Found.+confirm.+pric/i, file)
    assert.match(answer, /promotional period/i, file)
    assert.doesNotMatch(answer, /regardless|reset.{0,12}clock|billed the difference|updates immediately/i, file)
  }
})
check("intro and standard views retain truthful billing and publishing copy", () => {
  for (intro of [true, false]) {
    for (const file of ["src/app/HomeClient.tsx", "src/app/plans/page.tsx", "src/app/how-it-works/page.tsx"]) {
      const html = renderToStaticMarkup(React.createElement(load(file).default))
      assert.doesNotMatch(html, /live (?:today|tonight)|same day|three minutes|collect reviews/i, file)
      if (file !== "src/app/how-it-works/page.tsx") assert.match(html, /Contact Found for help canceling/i, file)
      if (intro) assert.match(html, /12 months.+(?:standard pricing|regular price)/i, file)
      if (file === "src/app/plans/page.tsx") {
        const row = html.match(/<tr\b[^>]*><td[^>]*>Automatic review requests[\s\S]*?<\/tr>/)?.[0]
        assert.ok(row)
        assert.match(row, /Coming soon/)
        assert.doesNotMatch(row, /<svg/)
      }
    }
  }
})
console.log(`${checks} factual marketing-copy groups passed; fixtures only, no network or persistence.`)
