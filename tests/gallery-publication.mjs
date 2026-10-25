import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import ts from 'typescript'
import React from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'

const require = createRequire(import.meta.url)
const cache = new Map()
const hero = 'https://fixture.invalid/gallery-header.jpg'
const owner = 'https://fixture.invalid/owner-work.jpg'
const hidden = 'https://fixture.invalid/hidden-album.jpg'
const company = { id: 'fixture', slug: 'fixture', name: 'Fixture Security', primary_color: '#147354',
  industry_category: 'professional_services', sub_industry: 'Security Guard Services', primary_intent: 'contact',
  plan: 'found', subscription_status: 'active', website_config: { stock_images: [], services: [] } }
const tables = { company_photos: [], photo_albums: [] }
const projections = []
let albumsFail = false
let openLightbox = false
let stockFallback = []
let checks = 0
function check(condition, label) { assert.ok(condition, label); checks++ }
function query(table) {
  const predicates = []
  let single = false, maximum = Infinity
  const q = new Proxy({}, { get(_, key) {
    if (key === 'then') return resolve => {
      const data = tables[table].filter(row => predicates.every(test => test(row))).slice(0, maximum)
      resolve({ data: single ? data[0] ?? null : data, error: table === 'photo_albums' && albumsFail ? { message: 'fixture read failure' } : null })
    }
    if (key === 'eq') return (field, value) => { predicates.push(row => row[field] === value); return q }
    if (key === 'in') return (field, values) => { predicates.push(row => values.includes(row[field])); return q }
    if (key === 'is') return (field, value) => { predicates.push(row => row[field] == value); return q }
    if (key === 'not') return (field, _operator, value) => { predicates.push(row => row[field] != value); return q }
    if (key === 'neq') return (field, value) => { predicates.push(row => row[field] !== value); return q }
    if (key === 'limit') return value => { maximum = value; return q }
    if (key === 'single' || key === 'maybeSingle') return () => { single = true; return q }
    if (key === 'select') return fields => { projections.push(fields); return q }
    if (key === 'order') return () => q
    throw Error(`Unexpected query operation: ${String(key)}`)
  } })
  return q
}
function load(file) {
  let absolute = path.resolve(file)
  if (!path.extname(absolute)) absolute += fs.existsSync(`${absolute}.ts`) ? '.ts' : '.tsx'
  if (cache.has(absolute)) return cache.get(absolute).exports
  const module = { exports: {} }
  cache.set(absolute, module)
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    fileName: absolute, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  function localRequire(id) {
    if (id === 'next/navigation') return { notFound() { throw Error('notFound') } }
    if (id === 'next/og') return { ImageResponse: class { constructor(element, options) { this.element = element; this.options = options } } }
    if (id === 'next/link') return { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) }
    if (id === '@/lib/company') return { getCompanyBySlug: async () => company, getCompanyByDomain: async () => company }
    if (id === '@/lib/supabase/admin') return { createAdminClient: () => ({ from: query }) }
    if (id === '@/lib/stockImages') return { getStockImages: async () => stockFallback }
    if (id === './JobLeadCapture') return { __esModule: true, default: props => React.createElement('p', {}, props.ctaLabel) }
    if (id === '@/components/InView') return { __esModule: true, default: ({ children }) => children }
    if (id === 'react' && absolute.endsWith('GalleryLightbox.tsx')) return { ...React,
      useState: initial => [initial === null && openLightbox ? 0 : initial, () => {}],
      useEffect() {}, useCallback: callback => callback, useRef: value => ({ current: value }) }
    if (id === 'react' || id === 'react/jsx-runtime') return require(id)
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}`)
    if (id.startsWith('.')) return load(path.resolve(path.dirname(absolute), id))
    throw Error(`Unexpected dependency: ${id}`)
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: localRequire, URL, Date,
    process: { env: {} }, fetch() { throw Error('Unexpected network') } }, { filename: absolute })
  return module.exports
}
const gallery = load('src/app/[slug]/gallery/page.tsx')
const album = load('src/app/[slug]/gallery/[album]/page.tsx')
const og = load('src/app/[slug]/gallery/[album]/opengraph-image.tsx')
const photo = (id, url, extra = {}) => ({ id, url, company_id: company.id, website_section: null,
  for_website: false, in_gallery: false, album_id: null, ...extra })
const publicAlbum = { id: 'album', company_id: company.id, slug: 'published', name: 'Published Photos',
  show_on_website_gallery: true, created_at: '2026-10-24T00:00:00Z' }
const page = () => gallery.default({ params: Promise.resolve({ slug: company.slug }) }).then(render)
const albumPage = slug => album.default({ params: Promise.resolve({ slug: company.slug, album: slug }) }).then(render)
const ogPage = slug => og.default({ params: Promise.resolve({ slug: company.slug, album: slug }) }).then(result => render(result.element))
const sections = html => [...html.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/g)].map(match => match[0])
const badgeCount = html => (html.match(/<p\b[^>]*>\s*Illustrative stock\s*<\/p>/g) ?? []).length
const explanationCount = html => [...html.matchAll(/<p\b[^>]*>([^<]*)<\/p>/g)]
  .filter(match => /stock photography|stock is grouped|stock, not our personnel/i.test(match[1])).length

for (const plan of ['found', 'found_pro']) {
  company.plan = plan
  tables.photo_albums = []
  tables.company_photos = [photo('owner', owner, { in_gallery: true })]
  let html = await page()
  check(!sections(html)[0].includes('<img'), `${plan}: no inferred gallery hero`)
  check(html.includes(owner), `${plan}: independent gallery membership renders`)
  tables.company_photos.push(photo('header', hero, { website_section: 'gallery_hero', for_website: true }))
  html = await page()
  check(sections(html)[0].includes(hero), `${plan}: explicit gallery hero renders`)
  check(html.split(`src="${hero}"`).length - 1 === 1, `${plan}: hero-only photo not added to gallery or CTA`)
  check(!sections(html).at(-1).includes(hero), `${plan}: hero never becomes CTA`)
  tables.company_photos[1].for_website = false
  check(!(await page()).includes(hero), `${plan}: unpublished gallery hero excluded`)
  tables.company_photos[1] = photo('header', 'https://fixture.invalid/header.mp4', { website_section: 'gallery_hero', for_website: true })
  html = await page()
  check(sections(html)[0].includes('<video'), `${plan}: explicitly assigned video supported`)
  tables.company_photos = [photo('header', hero, { website_section: 'gallery_hero', for_website: true })]
  html = await page()
  check(html.includes('No photos to display'), `${plan}: hero assignment does not create gallery membership`)
}
company.plan = 'found_pro'
tables.photo_albums = [publicAlbum, { ...publicAlbum, id: 'hidden', slug: 'hidden', name: 'Hidden Album', show_on_website_gallery: false }]
tables.company_photos = [photo('published', owner, { album_id: 'album' }), photo('hidden', hidden, { album_id: 'hidden' })]
let html = await page()
check(html.includes(owner) && !html.includes(hidden), 'Pro: only published album photos exposed')
check((await albumPage('published')).includes(owner), 'Published album route renders its members')
await assert.rejects(albumPage('hidden'), /notFound/)
checks++
const metadata = await album.generateMetadata({ params: Promise.resolve({ slug: company.slug, album: 'hidden' }) })
check(!JSON.stringify(metadata).includes('Hidden Album'), 'Hidden album metadata does not reveal its name')
company.plan = 'found'
tables.company_photos = [photo('published', owner, { album_id: 'album', in_gallery: true }), photo('hidden', hidden, { album_id: 'hidden', in_gallery: true })]
html = await page()
check(html.includes(owner) && !html.includes(hidden), 'Base: hidden album photos stay hidden even with a stale gallery flag')
company.plan = 'found_pro'
tables.photo_albums[0].cover_photo_id = 'hidden'
tables.company_photos = [photo('published', owner, { album_id: 'album' }), photo('hidden', hidden, { album_id: 'hidden' })]
html = await page()
check(html.includes(owner) && !html.includes(hidden), 'Album cover cannot borrow a hidden album photo')

const stockMetadata = load('src/lib/stockPhotoLibrary').STOCK_PHOTO_LIBRARY[0]
const stock = stockMetadata.urls[0]
for (const plan of ['found', 'found_pro']) {
  company.plan = plan
  tables.photo_albums = []
  tables.company_photos = [photo('stock', stock, { in_gallery: true })]
  html = await page()
  check(html.includes('Illustrative Security Photography'), `${plan}: stock has a clearly named collection`)
  check(!html.includes(`A closer look at ${company.name}`), `${plan}: stock intro does not imply company personnel`)
  check(badgeCount(html) === 0 && !html.includes(stockMetadata.sourceUrl), `${plan}: thumbnails show no badges or full credits`)
  check(explanationCount(html) === 1 && html.includes('text-sm max-w-xl'), `${plan}: one discreet Gallery explanation remains`)
  tables.company_photos.push(photo('stock-header', stock, { website_section: 'gallery_hero', for_website: true }))
  html = await page()
  check(explanationCount(html) === 1 && !html.includes(stockMetadata.caption.split('.')[0]), `${plan}: stock Gallery header adds no repeated caption`)
  check(badgeCount(html) === 0 && html.includes(stockMetadata.alt), `${plan}: stock Gallery header keeps honest alt without a badge`)
  tables.company_photos.pop()
  tables.company_photos.push(photo('owner', owner, { in_gallery: true }))
  html = await page()
  check(html.includes('Shared Photos') && html.includes('Illustrative Security Photography'), `${plan}: mixed flat gallery separates stock and shared photos`)
  check(html.includes(owner) && html.includes(stock), `${plan}: mixed membership remains intact`)
  check(badgeCount(html) === 0 && explanationCount(html) === 1, `${plan}: mixed groups do not duplicate the explanation or add badges`)
  openLightbox = true
  html = await page()
  check(html.split(stockMetadata.sourceUrl).length === 2, `${plan}: full source credit appears in open stock lightbox`)
  check(badgeCount(html) === 1 && html.includes(stockMetadata.photographer) && html.includes(stockMetadata.license.url), `${plan}: open stock details retain disclosure, photographer and license`)
  openLightbox = false
}
company.plan = 'found_pro'
tables.photo_albums = [{ ...publicAlbum, name: 'Our completed work' }]
tables.company_photos = [photo('stock', stock, { album_id: 'album' })]
html = await page()
check(html.includes('Illustrative Security Photography') && !html.includes('Our completed work'), 'Stock-only album card never presented as completed work')
check(badgeCount(html) === 0 && explanationCount(html) === 1, 'Stock album cards have no per-card badge or duplicated explanation')
check(!html.includes('Illustrative stock photography</p>') && !html.includes('Includes illustrative stock photography</p>'), 'Album-card badge variants are absent')
html = await albumPage('published')
check(html.includes('Illustrative Security Photography') && !html.includes('Our completed work'), 'Stock-only album page uses truthful heading')
check(badgeCount(html) === 0 && explanationCount(html) === 1, 'Stock album retains one quiet explanation without grid badges')
check(html.includes('Discuss your security needs') && !html.includes('work like this'), 'Stock album lead capture does not claim actual jobs')
const stockSeo = await album.generateMetadata({ params: Promise.resolve({ slug: company.slug, album: 'published' }) })
check(stockSeo.title === 'Illustrative Security Photography' && stockSeo.description.includes('Illustrative'), 'Stock album metadata is truthful')
tables.company_photos.push(photo('owner', owner, { album_id: 'album' }))
html = await albumPage('published')
check(html.includes('Shared Photos') && html.includes('Illustrative Security Photography'), 'Mixed album separates actual shared photos from stock')
check(html.includes(owner) && html.includes(stock), 'Mixed album retains both kinds of media')
check(badgeCount(html) === 0 && explanationCount(html) === 1, 'Mixed album keeps group headings and one explanation, not tile labels')
openLightbox = true
html = await albumPage('published')
check(html.split(stockMetadata.sourceUrl).length === 2, 'Stock album lightbox retains full source credit')
openLightbox = false
tables.photo_albums[0].show_on_website_gallery = false
await assert.rejects(albumPage('published'), /notFound/)
checks++
company.plan = 'found'
company.sub_industry = 'Accountant'
tables.photo_albums = [{ ...publicAlbum, name: 'Stock examples' }]
tables.company_photos = [photo('stock', stock, { album_id: 'album' })]
check(!(await albumPage('published')).includes('Illustrative Security Photography'), 'Non-security stock album does not acquire a security heading')
const nonGuardMetadata = await album.generateMetadata({ params: Promise.resolve({ slug: company.slug, album: 'published' }) })
check(nonGuardMetadata.title === 'Illustrative Photography', 'Non-security stock metadata uses generic collection label')
tables.company_photos = []
tables.photo_albums = []
const unlistedStock = 'https://fixture.invalid/unlisted-cached-stock.jpg'
company.website_config.stock_images = [unlistedStock]
html = await page()
check(html.includes('Illustrative Photography') && html.includes('Illustrative stock'), 'Cached stock without manifest metadata is still labeled stock')
check(!html.includes(`A closer look at ${company.name}`) && !html.includes(`${company.name} — photo`), 'Generic stock does not imply company photos in intro or alt')
check(!html.includes('Ron Lach') && !html.includes('Pexels License'), 'Unknown stock source does not acquire fabricated credits')
openLightbox = true
html = await page()
check(html.includes('Illustrative stock; not the company'), 'Generic stock disclosure persists in the open lightbox')
openLightbox = false
company.website_config.stock_images = null
stockFallback = [unlistedStock]
check((await page()).includes('Illustrative Photography'), 'Stock helper fallback retains explicit stock-origin label')
stockFallback = []
company.website_config.stock_images = []
tables.company_photos = [photo('owner', owner, { in_gallery: true })]
html = await page()
check(html.includes(owner) && !html.includes('Illustrative stock'), 'Unknown uploaded URL is not automatically classified as stock')
company.sub_industry = 'Security Guard Services'
company.plan = 'found_pro'
tables.company_photos = [photo('hidden', hidden, { album_id: 'hidden' })]
tables.photo_albums = [{ ...publicAlbum, id: 'hidden', show_on_website_gallery: false }]
albumsFail = true
html = await page()
check(!html.includes(owner) && !html.includes(hidden) && !html.includes(stock), 'Album read failure never falls back to unpublished albums')
await assert.rejects(albumPage('published'), /notFound/)
checks++
albumsFail = false
tables.photo_albums = [{ ...publicAlbum, name: 'Private Album', customer_name: 'Private Customer', service_address: 'Private Address',
  show_address_public: false, show_on_website_gallery: false }]
tables.company_photos = [photo('private-stock', stock, { album_id: 'album' })]
html = await ogPage('published')
check(!html.includes(stock) && !html.includes('Private'), 'Hidden album OG exposes no photo, customer or address')
tables.photo_albums[0].show_on_website_gallery = true
projections.length = 0
html = await ogPage('published')
check(html.includes(stock) && html.includes('Illustrative Security Photography'), 'Published stock OG includes truthful collection label')
check(html.includes('Illustrative stock, not our personnel') && html.includes(stockMetadata.photographer), 'Stock OG retains disclosure and source attribution')
check(!html.includes('Private Customer') && !html.includes('Private Address'), 'OG never emits private customer fields')
check(!projections.some(fields => fields.includes('service_address') || fields.includes('customer_name')), 'OG does not fetch private address or customer columns')
tables.photo_albums[0].show_address_public = true
check(!(await ogPage('published')).includes('Private Address'), 'OG introduces no address output even when public-address flag is set')
company.sub_industry = 'Accountant'
html = await ogPage('published')
check(html.includes('Illustrative Photography') && !html.includes('Illustrative Security Photography'), 'Non-security OG uses generic stock title')
company.sub_industry = 'Security Guard Services'
tables.photo_albums[0].show_on_website_gallery = false
check(!(await ogPage('private-album')).includes(stock), 'Name-derived OG lookup also excludes hidden albums')
tables.photo_albums[0].show_on_website_gallery = true
tables.company_photos = [photo('owner-og', owner, { album_id: 'album' })]
html = await ogPage('published')
check(html.includes(owner) && !html.includes('Illustrative stock'), 'Non-stock OG keeps existing photo presentation')
tables.photo_albums[0].company_id = 'another-company'
check(!(await ogPage('published')).includes(owner), 'OG album lookup remains tenant scoped')
tables.photo_albums[0].company_id = company.id
albumsFail = true
check(!(await ogPage('published')).includes(owner), 'OG read failures fail closed without schema fallback')
console.log(`Gallery publication passed: ${checks} assertions, fixture-only reads, no live clients or writes.`)
