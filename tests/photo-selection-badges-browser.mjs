import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const source = fs.readFileSync(new URL('../src/app/dashboard/(app)/photos/page.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('photos.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
// Extract actual components, including their styles/handlers; no copied card markup.
function extract(name, tree = ast) {
  const node = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name)
  assert.ok(node, `Missing actual ${name}`)
  return node.getText(tree)
}
const baseline = ts.createSourceFile('baseline.tsx', execFileSync('git', ['show', 'HEAD:src/app/dashboard/(app)/photos/page.tsx'], {encoding:'utf8'}), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const modules = [], seen = new Map()
function bundle(file, override) {
  if (seen.has(file)) return seen.get(file)
  const id = modules.length
  seen.set(file, id); modules.push(null)
  let code = override ?? fs.readFileSync(file, 'utf8')
  if (override || /\.tsx?$/.test(file)) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const deps = {}
  for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    deps[match[1]] = bundle(require.resolve(match[1], { paths: [path.dirname(file)] }))
  }
  modules[id] = `${id}:[function(require,module,exports){${code}\n},${JSON.stringify(deps)}]`
  return id
}
const react = bundle(require.resolve('react'))
const client = bundle(require.resolve('react-dom/client'))
const typography = bundle(path.resolve('src/lib/dashboard/typography.ts'))
const mediaKind = bundle(path.resolve('src/lib/mediaKind.ts'))
const card = bundle(path.resolve('photo-card-fixture.tsx'), `
import React, { useRef, useState } from 'react';
const { GREEN: SIGNAL_GREEN, BLACK: FOUND_BLACK } = window.fixtureTypography;
const { isVideoMedia } = window.fixtureMediaKind;
${extract('PhotoCard')}
${extract('PhotoCard', baseline).replace('function PhotoCard(', 'function BaselinePhotoCard(')}
${extract('VideoPreviewTile')}
// Placement lookup is outside this badge test; fixture has no assigned section.
function photoSitePlacementLabel() { return null }
export { PhotoCard, BaselinePhotoCard };
`)
const script = `const process={env:{NODE_ENV:'production'}};const modules={${modules.join(',')}},cache={};
function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),module,module.exports);return module.exports;}
window.fixtureTypography=load(${typography});window.fixtureMediaKind=load(${mediaKind});
const R=load(${react}),e=R.createElement;
window.calls=[];
const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#b5a67e"/></svg>');
const root=load(${client}).createRoot(document.getElementById('root'));
let renderSequence=0;
window.render=(mode,variant,baseline=false,columns=2)=>{const Card=load(${card})[baseline?'BaselinePhotoCard':'PhotoCard'];window.calls=[];root.render(e('div',{className:'grid',style:{gridTemplateColumns:columns===3?'repeat(3, 1fr)':'1fr 1fr',...(columns===3?{padding:'0 24px',gap:3}:{})},key:++renderSequence},...['photo','video'].flatMap(kind=>[false,true].map(selected=>{
const id=kind+'-'+selected;return e('div',{'data-case':id,key:id},e(Card,{photo:{id,url:kind==='video'?'/fixture.mp4':image,mime_type:kind==='video'?'video/mp4':'image/svg+xml',for_social:false,for_website:false,in_gallery:false,website_section:null},variant,selectMode:mode,selected,
onToggleSelect:id=>window.calls.push(['select',id]),onView:p=>window.calls.push(['view',p.id]),onFlag:()=>window.calls.push(['favorite']),onGallery:()=>window.calls.push(['gallery']),onPlace:()=>window.calls.push(['place']),onShare:()=>window.calls.push(['share']),onRequestDelete:()=>window.calls.push(['delete'])}));}))));};`
const server = http.createServer((req,res) => {
  if (req.url === '/fixture.mp4') { res.writeHead(204); res.end(); return }
  res.setHeader('Content-Type','text/html; charset=utf-8')
  res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#080a09;font-family:Arial}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:20px}</style><div id="root"></div><script>${script.replace(/<\/script/gi,'<\\/script')}</script>`)
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
let browser
const screenshots = process.env.FOUND_PHOTO_BADGE_SCREENSHOTS || path.join(os.tmpdir(),'found-photo-selection-badges')
fs.mkdirSync(screenshots,{recursive:true})
let groups = 0
const existingCollisions=[]
const selectionCollisions=[]
const clipping=[]
try {
  browser = await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE ? {executablePath:process.env.FOUND_BROWSER_EXECUTABLE} : {})})
  const page = await browser.newPage()
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  for (const columns of [2,3]) for (const width of [320,390]) for (const scale of [1,2]) for (const variant of ['library','job']) for (const mode of [false,true]) {
    await page.setViewportSize({width,height:900})
    await page.evaluate(({mode,variant,scale,columns})=>{document.documentElement.style.fontSize=16*scale+'px';window.render(mode,variant,false,columns)}, {mode,variant,scale,columns})
    await page.waitForFunction(mode=>document.querySelector('button')?.getAttribute('aria-label')===(mode?'Select photo':'Open business photo'),mode)
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    // Root text enlargement plus pixel-label stress, not an iOS Dynamic Type claim.
    await page.evaluate(scale=>document.querySelectorAll('[data-case]').forEach(host=>host.querySelectorAll('*').forEach(el=>{
      if (el.style.fontSize.endsWith('px')) el.style.fontSize=parseFloat(el.style.fontSize)*scale+'px'
    })),scale)
    for (const kind of ['photo','video']) for (const selected of [false,true]) {
      const host=page.locator(`[data-case="${kind}-${selected}"]`)
      const button=host.getByRole('button',{name:mode?`Select ${kind}`:`Open business ${kind}`,exact:true})
      assert.equal(await button.getAttribute('aria-pressed'),mode?String(selected):null)
      assert.equal(await host.locator('button button').count(),0)
      assert.equal(await host.locator('button').count(),mode?1:6)
      const geometry=await host.evaluate((host,{mode,kind})=>{
        const card=host.firstElementChild, bounds=card.getBoundingClientRect()
        const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
        const badge=[...card.children].find(el=>el.textContent==='VIDEO')
        const indicator=[...card.querySelectorAll('div')].find(el=>el.style.width==='22px')
        const controls=[...card.querySelectorAll('button')].slice(1)
        const items=[...controls,...(badge?[badge]:[]),...(indicator?[indicator]:[])]
        return {bounds:rect(card),badge:badge&&rect(badge),indicator:indicator&&rect(indicator),items:items.map(el=>({...rect(el),label:el.getAttribute('aria-label')||(el===badge?'VIDEO':'selection')}))}
      },{mode,kind})
      const overlap=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+0.5&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+0.5
      for (const [i,a] of geometry.items.entries()) {
        const fits=a.x>=geometry.bounds.x && a.right<=geometry.bounds.right+0.5
        if(columns===2 || mode) assert.ok(fits,'Overlay clips card horizontally')
        else if(!fits) clipping.push({columns,width,scale,variant,mode,kind,selected,label:a.label})
        for (const b of geometry.items.slice(i+1)) {
          if(overlap(a,b)) {
            const issue={columns,width,scale,variant,kind,selected,pair:[a.label,b.label],overlapWidth:+(Math.min(a.right,b.right)-Math.max(a.x,b.x)).toFixed(2),overlapHeight:+(Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)).toFixed(2)}
            if(mode) { selectionCollisions.push(issue);if(columns===2)assert.fail(`Two-column selection collision: ${JSON.stringify(issue)}`) }
            else existingCollisions.push(issue)
          }
        }
      }
      if(mode) { assert.ok(Math.abs(geometry.bounds.right-geometry.indicator.right-8)<2,'Selection stays top-right'); for(const a of geometry.items) assert.ok(a.bottom<=geometry.bounds.bottom+0.5,'Selection overlay clips card vertically: '+JSON.stringify({columns,width,scale,variant,a,bounds:geometry.bounds})) }
      if(kind==='video') assert.ok(Math.abs(mode?geometry.badge.x-geometry.bounds.x-4:geometry.bounds.right-geometry.badge.right-8)<2,'VIDEO uses correct corner')
      await page.evaluate(()=>{window.calls=[]})
      // Center play cue and selection-corner taps both reach the whole-tile button.
      // Three-column normal geometry is audited separately: existing action
      // containers can intercept the center; do not force-click through them.
      if(mode || columns===2) {
        await button.click()
        assert.deepEqual(await page.evaluate(()=>window.calls),[[mode?'select':'view',`${kind}-${selected}`]])
      }
      if(mode) {
        await page.evaluate(()=>{window.calls=[]})
        await button.click({position:{x:geometry.bounds.width-18,y:18}})
        assert.deepEqual(await page.evaluate(()=>window.calls),[['select',`${kind}-${selected}`]])
        await button.focus();await page.keyboard.press('Space')
        assert.equal((await page.evaluate(()=>window.calls)).length,2)
      } else if(columns===2) {
        for(const [label,event] of [['Add to gallery','gallery'],['Add to favorites','favorite'],['Use on page','place'],['Share photo','share'],['Delete photo','delete']]) {
          await page.evaluate(()=>{window.calls=[]});await host.getByRole('button',{name:label,exact:true}).click()
          assert.deepEqual(await page.evaluate(()=>window.calls),[[event]])
        }
      }
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.screenshot({path:path.join(screenshots,`${columns}col-${width}-${scale}x-${variant}-${mode?'select':'normal'}.png`),fullPage:true})
    if(!mode) {
      const current=await page.locator('.grid').innerHTML()
      await page.evaluate(({variant,columns})=>{window.render(false,variant,true,columns)}, {variant,columns})
      await page.waitForFunction(()=>document.querySelector('button')?.getAttribute('aria-label')==='Open business photo')
      // Flush the replacement React tree before comparing unchanged normal UI.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
      await page.evaluate(scale=>document.querySelectorAll('[data-case] *').forEach(el=>{
        if(el.style.fontSize.endsWith('px'))el.style.fontSize=parseFloat(el.style.fontSize)*scale+'px'
      }),scale)
      assert.equal(await page.locator('.grid').innerHTML(),current,'Normal-mode markup/styles changed')
    }
    groups++
  }
  assert.deepEqual(errors,[])
  fs.writeFileSync(path.join(screenshots,'geometry-report.json'),JSON.stringify({groups,existingCollisions,selectionCollisions,clipping},null,2))
  console.log(`PASS ${groups} actual-component behavior/ARIA/baseline groups; zero selection collisions and full selection-overlay containment at two/three columns. Screenshots/report: ${screenshots}`)
  console.log(JSON.stringify({existingCollisions,selectionCollisions,clipping}))
  if(selectionCollisions.length) { console.error('FAIL three-column selection geometry; application fix NOT broadened.');process.exitCode=1 }
} finally { await browser?.close();await new Promise(resolve=>server.close(resolve)) }
