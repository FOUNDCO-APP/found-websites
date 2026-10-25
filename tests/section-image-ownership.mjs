import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"
import { createRequire } from "node:module"
import ts from "typescript"
import React from "react"
import { renderToStaticMarkup as render } from "react-dom/server"

// Run real route/layout selection against local fixtures. All external boundaries fail closed.
const require = createRequire(import.meta.url)
const cache = new Map()
const stock = [1, 2, 3, 4, 5].map(n => `https://fixture.invalid/stock-${n}.jpg`)
const badge = "https://fixture.invalid/gallery-badge.jpg"
const hero = "https://fixture.invalid/owner-hero.jpg"
const about = "https://fixture.invalid/owner-about.jpg"
const cta = "https://fixture.invalid/owner-cta.jpg"
const services = "https://fixture.invalid/owner-services.jpg"
const video = "https://fixture.invalid/owner-hero.mp4"
const company = {
  id: "fixture", slug: "fixture", name: "Fixture Company", industry_category: "home_services",
  sub_industry: "remodeling", primary_intent: "quote", primary_color: "#147354", vibe: "calm",
  city: "Tucson", state: "AZ", phone: "5205550100", plan: "found", subscription_status: "active",
  website_config: { services: [{ name: "Fixture service", description: "Owner service description" }],
    about_preview: "Owner narrative marker.", about_story: "Owner narrative marker.", about_text: "Owner narrative marker.",
    stock_images: stock, hero_images: [], hero_image_url: null, hero_video_url: null, testimonials: [], social_links: {} },
}
const tables = { company_photos: [], photo_albums: [] }
const row = (url, section = null, inGallery = false, enabled = true) => ({
  id: url, url, company_id: company.id, website_section: section, in_gallery: inGallery, for_website: enabled, album_id: null,
})
function query(table) {
  const filters = []
  let single = false, limit = Infinity
  const q = new Proxy({}, { get(_, key) {
    if (key === "then") return resolve => {
      const data = (tables[table] ?? []).filter(item => filters.every(filter => filter(item))).slice(0, limit)
      resolve({ data: single ? data[0] ?? null : data, error: null })
    }
    if (key === "eq") return (field, value) => { filters.push(item => item[field] === value); return q }
    if (key === "neq") return (field, value) => { filters.push(item => item[field] !== value); return q }
    if (key === "in") return (field, values) => { filters.push(item => values.includes(item[field])); return q }
    if (key === "is") return (field, value) => { filters.push(item => item[field] == value); return q }
    if (key === "not") return (field, _operator, value) => { filters.push(item => item[field] != value); return q }
    if (key === "or") return () => { filters.push(item => item.in_gallery || ["hero", "about", "cta", "announcement"].includes(item.website_section)); return q }
    if (key === "limit") return value => { limit = value; return q }
    if (key === "single" || key === "maybeSingle") return () => { single = true; return q }
    if (key === "select" || key === "order") return () => q
    throw new Error(`Unexpected query operation: ${String(key)}`)
  } })
  return q
}
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? ".ts" : ".tsx"
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: absolute,
  }).outputText
  function localRequire(id) {
    if (id === "next/link") return { __esModule: true, default: ({ children, href, ...rest }) => React.createElement("a", { href, ...rest }, children) }
    if (id === "next/navigation") return { notFound() { throw Error("notFound") } }
    if (id === "@/lib/company") return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }
    if (id === "@/lib/supabase/admin") return { createAdminClient: () => ({ from: query }) }
    if (id === "@/lib/stripe/connect") return { getStripeConnectStatus: async () => ({ chargesEnabled: false }) }
    if (id === "@/lib/bookings/getAvailableSlots") return { getAvailableSlots: async () => [] }
    if (id === "@/lib/bookings/ensureDefaultAvailability") return { ensureDefaultAvailability() { throw Error("Unexpected availability write") } }
    if (id === "@supabase/supabase-js") return { createClient() { throw Error("Unexpected live client") } }
    if (id === "@/components/layouts/HeroVideo") return { __esModule: true, default: ({ src }) => React.createElement("video", { src }) }
    if (id === "@/components/PublicPageHeroMedia") return load("src/components/PublicPageHeroMedia")
    if (id === "@/components/GalleryLightbox") return { __esModule: true, default: ({ photos }) => React.createElement("div", {}, photos.map((photo, index) => React.createElement("img", { key: index, src: typeof photo === "string" ? photo : photo.url }))) }
    if (id.startsWith("@/components/layouts/") && /Layout$/.test(id)) return load(`src/${id.slice(2)}`)
    if (id.startsWith("@/components/") || /^\.\/(ContactForm|EstimateForm|ReservationForm|JobLeadCapture)$/.test(id) || /OnlineOrderClient/.test(id)) return { __esModule: true, default: ({ children }) => children ?? null }
    if (id.startsWith("@/")) return load(`src/${id.slice(2)}`)
    if (id.startsWith(".")) return load(path.resolve(path.dirname(absolute), id))
    if (["react", "react/jsx-runtime"].includes(id)) return require(id)
    throw Error(`Unexpected dependency ${id}`)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, console, process: { env: {} }, URL, Date,
    fetch() { throw Error("Unexpected network access") } }, { filename: absolute })
  return module.exports
}
let assertions = 0
function check(condition, label) { assert.ok(condition, label); assertions++ }
const sections = html => [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0])
const hasMedia = html => /<(img|video)\b/.test(html)
async function element(route = "") { return load(`src/app/[slug]/${route ? `${route}/` : ""}page.tsx`).default({ params: Promise.resolve({ slug: "fixture" }) }) }
async function page(route = "") { return render(await element(route)) }
function reset() {
  tables.company_photos = []
  tables.photo_albums = []
  company.website_config.hero_images = []
  company.website_config.hero_image_url = null
  company.website_config.hero_video_url = null
  company.plan = "found"
}

for (const [industry, subtype] of [["home_services", "remodeling"], ["professional_services", "Security Guard Services"], ["wellness", "massage therapy"]]) {
  company.industry_category = industry
  company.sub_industry = subtype
  for (const layout of ["Impact", "Editorial", "Portrait", "Cinematic", "WellnessLuxe", "WellnessCinematic"]) {
    const Component = load(`src/components/layouts/${layout}Layout`).default
    const props = { company, activeAddons: [], primaryCTA: { label: "Contact", href: "/contact" }, secondaryCTA: null,
      imgs: stock, gradient: "#111111", heroImage: null, heroVideo: null, uploadedImgs: [hero, about, cta], sectionImages: { gallery: [badge] } }
    const emptyHtml = render(React.createElement(Component, props))
    const emptySections = sections(emptyHtml)
    check(!hasMedia(emptySections[0]), `${industry}/${layout}: gallery and stock cannot become hero`)
    check(!hasMedia(emptySections.at(-1)), `${industry}/${layout}: gallery, stock and legacy uploads cannot become CTA`)
    const aboutSection = emptySections.find(section => section.includes("Owner narrative marker"))
    check(Boolean(aboutSection) && !stock.some(url => aboutSection.includes(url)) && !aboutSection.includes(hero), `${industry}/${layout}: About has no borrowed backdrop; owner gallery body is allowed`)
    check(emptyHtml.includes(badge), `${industry}/${layout}: gallery body still displays owner badge`)
    if (["Impact", "Portrait", "WellnessLuxe", "WellnessCinematic"].includes(layout)) check(emptyHtml.includes(stock[2]), `${industry}/${layout}: stock gallery body is preserved`)
    const assignedHtml = render(React.createElement(Component, { ...props, heroImage: hero, sectionImages: { gallery: [badge], about, cta } }))
    const assignedSections = sections(assignedHtml)
    check(assignedSections[0].includes(hero), `${industry}/${layout}: explicit hero renders`)
    check(assignedSections.at(-1).includes(cta) && !assignedSections.at(-1).includes(hero), `${industry}/${layout}: CTA uses only its assignment`)
    check(assignedHtml.includes(badge), `${industry}/${layout}: explicit backdrop does not remove gallery body`)
  }
  reset()
  tables.company_photos = [row(badge, null, true), row(cta, "cta")]
  const home = await element()
  check(home.props.heroImage === null && home.props.heroVideo === null, `${industry}: neither CTA nor gallery promoted into hero`)
  check(home.props.sectionImages.cta === cta && home.props.sectionImages.gallery[0] === badge, `${industry}: assignments and gallery preserved`)
  for (const route of ["about", "services", "contact", "menu", "book", "estimate"]) {
    const htmlSections = sections(await page(route))
    check(!hasMedia(htmlSections[0]), `${industry}/${route}: header cannot borrow gallery, CTA or stock`)
    if (["about", "services", "menu"].includes(route)) check(htmlSections.at(-1).includes(cta), `${industry}/${route}: explicit CTA renders`)
  }
  reset()
  company.website_config.hero_images = [hero, about, cta]
  company.website_config.hero_image_url = "https://fixture.invalid/legacy-alternate.jpg"
  let legacyHome = await element()
  check(legacyHome.props.heroImage === hero, `${industry}: legacy hero_images[0] retained`)
  check(legacyHome.props.sectionImages.about === null && legacyHome.props.sectionImages.cta === null, `${industry}: legacy extra hero entries are not section assignments`)
  for (const route of ["about", "services", "contact", "menu", "gallery"]) {
    const html = await page(route)
    check(!html.includes(hero) && !html.includes(about) && !html.includes(cta), `${industry}/${route}: legacy hero confined to Home`)
  }
  company.website_config.hero_images = []
  company.website_config.hero_image_url = hero
  check((await element()).props.heroImage === hero, `${industry}: legacy hero_image_url retained`)
  company.website_config.hero_video_url = video
  check((await element()).props.heroVideo === video, `${industry}: legacy hero video retained`)
  tables.company_photos = [row(services, "hero")]
  legacyHome = await element()
  check(legacyHome.props.heroImage === services && legacyHome.props.heroVideo === null, `${industry}: explicit hero still overrides legacy video`)
  tables.company_photos = [row(video, "hero")]
  legacyHome = await element()
  check(legacyHome.props.heroImage === null && legacyHome.props.heroVideo === video, `${industry}: explicit hero video cannot borrow a still`)
  reset()
  tables.company_photos = [row(about, "about"), row(services, "services")]
  for (const [route, expected] of [["about", about], ["services", services]]) {
    const htmlSections = sections(await page(route))
    check(htmlSections[0].includes(expected), `${industry}/${route}: assigned header photo renders`)
    check(!hasMedia(htmlSections.at(-1)), `${industry}/${route}: header photo does not become CTA`)
  }
  tables.company_photos = [row(about, "about", false, false)]
  check(!hasMedia(sections(await page("about"))[0]), `${industry}: unpublished assignments excluded`)
  for (const route of ["book", "estimate", "menu"]) {
    for (const media of [about, video]) {
      tables.company_photos = [row(media, route)]
      const header = sections(await page(route))[0]
      check(header.includes(media), `${industry}/${route}: independent assigned header renders`)
      check(header.includes(media === video ? "<video" : "<img"), `${industry}/${route}: assigned media type preserved`)
      tables.company_photos = [row(media, route, false, false), row(hero, "hero"), row(cta, "cta"), row(badge, null, true)]
      check(!hasMedia(sections(await page(route))[0]), `${industry}/${route}: unpublished slot stays plain without cross-section fallback`)
    }
  }
  reset()
  for (const media of [about, video]) {
    tables.company_photos = [row(media, "contact")]
    const contactHeader = sections(await page("contact"))[0]
    check(contactHeader.includes(media), `${industry}: explicit Contact media renders`)
    check(contactHeader.includes(media === video ? "<video" : "<img"), `${industry}: Contact preserves assigned media type`)
  }
  tables.company_photos = [row(about, "contact", false, false)]
  check(!hasMedia(sections(await page("contact"))[0]), `${industry}: unpublished Contact assignment stays plain`)
  tables.company_photos = []
  check(!hasMedia(sections(await page("contact"))[0]), `${industry}: removed Contact assignment stays plain despite stock inventory`)
  reset()
  tables.company_photos = [row(badge, null, true)]
  for (const plan of ["found", "found_pro"]) {
    company.plan = plan
    const htmlSections = sections(await page("gallery"))
    check((await page("gallery")).includes(badge), `${industry}/${plan}: gallery-only badge displayed`)
    check(!hasMedia(htmlSections.at(-1)), `${industry}/${plan}: gallery badge never used behind CTA`)
    tables.company_photos.push(row(cta, "cta"))
    check(sections(await page("gallery")).at(-1).includes(cta), `${industry}/${plan}: gallery CTA supports explicit assignment`)
    tables.company_photos.pop()
  }
  reset()
}
console.log(`Section image ownership passed: ${assertions} assertions across 6 layouts, 3 industries and public routes. No external reads or writes.`)

if (process.argv.includes("--visual-review")) {
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright")
  const outputDir = process.env.SECTION_IMAGE_REVIEW_DIR
  if (!outputDir) throw Error("Set SECTION_IMAGE_REVIEW_DIR for fixture screenshots")
  fs.mkdirSync(outputDir, { recursive: true })
  const cssDir = path.resolve(".next/static/css")
  const css = fs.readdirSync(cssDir).filter(name => name.endsWith(".css")).map(name => fs.readFileSync(path.join(cssDir, name), "utf8")).join("\n")
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined })
  const results = []
  try {
    const tab = await browser.newPage()
    await tab.route("**/*", async request => {
      if (request.request().url().startsWith("https://fixture.invalid/")) {
        const label = new URL(request.request().url()).pathname.slice(1)
        const fill = label.startsWith("stock") ? "#718d78" : label.includes("badge") ? "#b49b49" : "#456d7d"
        await request.fulfill({ contentType: "image/svg+xml", body: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${fill}"/><text x="60" y="400" fill="white" font-size="48">${label}</text></svg>` })
      } else await request.abort()
    })
    reset()
    company.industry_category = "home_services"
    company.sub_industry = "remodeling"
    for (const assigned of [false, true]) {
      tables.company_photos = [row(badge, null, true), ...(assigned ? [row(hero, "hero"), row(about, "about"), row(cta, "cta"), row(services, "services")] : [])]
      const cases = []
      for (const layout of ["Impact", "Editorial", "Portrait", "Cinematic", "WellnessLuxe", "WellnessCinematic"]) {
        const Component = load(`src/components/layouts/${layout}Layout`).default
        cases.push([layout, render(React.createElement(Component, { company, activeAddons: [], primaryCTA: { label: "Contact", href: "/contact" }, secondaryCTA: null,
          imgs: stock, gradient: "#111111", heroImage: assigned ? hero : null, heroVideo: null,
          sectionImages: { gallery: [badge], about: assigned ? about : null, cta: assigned ? cta : null } }))])
      }
      for (const route of ["about", "services", "gallery", "menu", "book", "estimate"]) cases.push([route, await page(route)])
      for (const [name, html] of cases) {
        for (const width of [375, 1440]) {
          await tab.setViewportSize({ width, height: 900 })
          await tab.setContent(`<!doctype html><html><head><style>${css}</style><style>body{margin:0;font-family:Arial,sans-serif}*,*::before,*::after{animation:none!important;transition:none!important}</style></head><body>${html}</body></html>`, { waitUntil: "load" })
          const filename = `${name}-${assigned ? "assigned" : "plain"}-${width}.png`
          await tab.screenshot({ path: path.join(outputDir, filename), fullPage: true })
          const dimensions = await tab.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))
          results.push({ filename, ...dimensions })
        }
      }
    }
    fs.writeFileSync(path.join(outputDir, "review.json"), JSON.stringify(results, null, 2))
    console.log(`Saved ${results.length} fixture screenshots to ${outputDir}. Overflow cases: ${results.filter(result => result.scrollWidth > result.width).map(result => result.filename).join(", ") || "none"}`)
  } finally {
    await browser.close()
  }
}
