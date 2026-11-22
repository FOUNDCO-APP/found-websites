import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Focused inline-host/provider contract tests, not a second capture suite.
// Real React, IndexedDB and pending-review CameraSheet; mocked transport and
// dashboard scaffold. Camera acquisition is forbidden and counted. No live services.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const root = fileURLToPath(new URL('../', import.meta.url))
const modules = [], seen = new Map()
const overrides = {
 '@/components/dashboard/AnnotationEditor': 'exports.__esModule=true;exports.default=()=>null;',
 '@/lib/uploadDashboardMedia': `exports.readDashboardUploadContext=async(endpoint)=>{window.contextCalls.push(endpoint);if(window.contextFailure)throw Object.assign(Error("SECRET context"),window.contextFailure);return window.fixtureScope};exports.DashboardUploadError=class extends Error{constructor(category){super('Safe upload error');this.category=category;this.retryable=['connection','timeout','transient'].includes(category);this.retryAfterMs=0}};exports.createDashboardUploadSession=(blob,options)=>{const session={blob,options,runs:0,run(){this.runs++;return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject})}};window.sessions.push(session);return session};`,

}
function bundle(file, name) {
  const key = name && overrides[name] ? name : file
  if (seen.has(key)) return seen.get(key)
  const id = modules.length; seen.set(key, id); modules.push(null)
  let code = name && overrides[name] ? overrides[name] : fs.readFileSync(file, 'utf8')
  if (/\.tsx?$/.test(file) && !(name && overrides[name])) code = ts.transpileModule(code, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  const deps = {}
  for (const match of code.matchAll(/require\(["']([^"']+)["']\)/g)) {
    const spec = match[1]
    const local = spec.startsWith('@/') ? ['.ts', '.tsx'].map(ext => path.join(root, 'src', `${spec.slice(2)}${ext}`)).find(fs.existsSync) : null
    const target = overrides[spec] ? spec : local
      ? local
      : require.resolve(spec, { paths: [path.dirname(file), root] })
    deps[spec] = bundle(target, spec)
  }
  modules[id] = `${id}:[function(require,module,exports){${code}\n},${JSON.stringify(deps)}]`
  return id
}


const react = bundle(require.resolve('react'))
const client = bundle(require.resolve('react-dom/client'))
const provider = bundle(path.join(root,'src/components/dashboard/UploadStatusProvider.tsx'))
const inline = bundle(path.join(root,'src/components/dashboard/UploadStatusInline.tsx'))
const script = `const process={env:{NODE_ENV:"production"}};const modules={${modules.join(',')}},cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),module,module.exports);return module.exports;}const R=load(${react}),e=R.createElement;
window.sessions=[];window.contextCalls=[];window.fixtureScope={accountId:'account-a',companyId:'company-a'};window.fixtureOnline=false;window.cameraRequests=0;window.permissionChecks=0;window.storageReports=[];addEventListener('found:device-storage-diagnostic',event=>window.storageReports.push(event.detail));
Object.defineProperty(navigator,'onLine',{get:()=>window.fixtureOnline});
Object.defineProperty(navigator,'permissions',{value:{query:async()=>{window.permissionChecks++;return {state:'granted'}}}});
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.cameraRequests++;throw new DOMException('Fixture unavailable','NotFoundError')}}});
function Harness(){window.inlineFixtureStatus=load(${provider}).useUploadStatus();return e('div',null,
 e('header',{id:'header'},e('a',{href:'#home',onClick:()=>window.homeClicks=(window.homeClicks||0)+1},'F O U N D'),e('button',{onClick:()=>window.accountClicks=(window.accountClicks||0)+1},'Account')),
 e(load(${inline}).default),
 e('main',null,e('h1',null,'Ready for your next job.'),e('div',{className:'cards'},e('a',{href:'#camera'},'Camera'),e('a',{href:'#job'},'Start Job'),e('a',{href:'#contacts'},'My Contacts'),e('a',{href:'#website'},'Edit My Site'))),
 e('nav',{id:'navigation','aria-label':'Dashboard'},e('a',{href:'#home',onClick:()=>window.navClicks=(window.navClicks||0)+1},'Home'),e('a',{href:'#photos'},'Photos'),e('a',{href:'#more'},'More')))}
window.inlineCameraOverlap=[];new MutationObserver(()=>{if(document.querySelector('.found-camera')&&document.querySelector('.found-upload-inline'))window.inlineCameraOverlap.push('duplicate-owner')}).observe(document.getElementById('root'),{childList:true,subtree:true});
const root=load(${client}).createRoot(document.getElementById('root'));window.render=(identity=window.fixtureScope)=>{window.fixtureScope=identity;root.render(e(load(${provider}).default,identity,e(Harness)))};window.render();
window.enqueue=async(id='pending-a')=>{const canvas=document.createElement('canvas');canvas.width=240;canvas.height=320;const ctx=canvas.getContext('2d');ctx.fillStyle='#9e8464';ctx.fillRect(0,0,240,320);ctx.fillStyle='#c7ba9e';ctx.fillRect(30,20,180,210);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg'));await window.inlineFixtureStatus.deviceQueue.enqueue(blob,{id,fileName:id+'.jpg',albumId:null})};
`
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font-family:system-ui,sans-serif;background:#080A09;color:#ededed}*{box-sizing:border-box}button,a{font:inherit}button{min-height:44px}a{color:inherit;text-decoration:none}#header{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid #ffffff18;background:#080A09;z-index:40}#header button{background:none;border:0;color:#ddd}main{padding:24px 20px 100px;max-width:760px;margin:auto}h1{font-size:1.35rem;font-weight:600;margin:8px 0 24px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cards a{padding:30px 16px;background:#ffffff08;border:1px solid #ffffff14;border-radius:20px}.cards a:first-child{background:#32D074;color:#080A09;font-weight:700}nav{position:fixed;bottom:0;width:100%;display:flex;justify-content:space-around;padding:20px;background:#080A09;border-top:1px solid #ffffff18;z-index:40}nav a{min-height:44px;display:flex;align-items:center}</style><div id="root"></div><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>')})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE?{executablePath:process.env.FOUND_BROWSER_EXECUTABLE}:{})})
let context, page
const errors=[]
const url='http://127.0.0.1:'+server.address().port
const screenshotDir=path.join(root,'.billing-audits/upload-status-inline');fs.mkdirSync(screenshotDir,{recursive:true})
const fresh=async()=>{await context?.close();context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));await page.goto(url);await page.waitForFunction(()=>window.inlineFixtureStatus?.queueReady)}
const row=()=>page.getByRole('complementary',{name:'Upload status'})
const statusText=()=>row().getByRole('status')
const online=()=>page.evaluate(()=>{window.fixtureOnline=true;dispatchEvent(new Event('online'))})
const finish=async(index=0)=>page.evaluate(index=>window.sessions[index].resolve({id:'photo-'+index,url:'test',storage_path:'test',for_website:false,for_social:false,in_gallery:false,website_section:null,album_id:null,created_at:'test'}),index)
const screenshot=async(name)=>{for(const [width,height,large] of [[390,844,false],[320,568,false],[844,390,false],[390,844,true]]){await page.setViewportSize({width,height});await page.evaluate(large=>document.documentElement.style.fontSize=large?'24px':'16px',large);assert.equal(await row().evaluate(el=>{const r=el.getBoundingClientRect(),h=document.getElementById('header').getBoundingClientRect(),m=document.querySelector('main').getBoundingClientRect();return getComputedStyle(el).position==='static'&&r.top>=h.bottom&&r.bottom<=m.top&&r.right<=innerWidth&&r.left>=0}),true);await page.screenshot({path:path.join(screenshotDir,name+'-'+width+(large?'-large':'')+'.png')})}await page.setViewportSize({width:390,height:844});await page.evaluate(()=>document.documentElement.style.fontSize='16px')}
try{
 await fresh()
 assert.equal(await row().count(),0)
 await page.evaluate(()=>window.enqueue())
 await statusText().filter({hasText:'Saved on this device'}).waitFor()
 await statusText().filter({hasText:'1 waiting to upload'}).waitFor()
 await page.getByRole('button',{name:'Account',exact:true}).click()
 await page.getByRole('navigation',{name:'Dashboard'}).getByRole('link',{name:'Home',exact:true}).click()
 assert.equal(await page.evaluate(()=>window.accountClicks),1)
 assert.equal(await page.evaluate(()=>window.navClicks),1)
 await screenshot('pending-inline')
 console.log('PASS verified save acknowledgement becomes waiting, normal-flow row and unobstructed header/navigation at 320/390/844/150%')
 await online()
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.evaluate(()=>window.sessions[0].options.onProgress({bytesUploaded:100,bytesTotal:100,stage:'finalizing'}))
 await statusText().filter({hasText:'Finishing upload…'}).waitFor()
 assert.equal((await statusText().innerText()).includes('Uploaded'),false)
 await finish()
 await statusText().filter({hasText:'Uploaded'}).waitFor()
 const successAt=Date.now()
 await row().waitFor({state:'detached',timeout:4500})
 assert.ok(Date.now()-successAt>=2200)
 assert.equal(await page.evaluate(()=>window.inlineFixtureStatus.deviceQueue.getSnapshot().length),0)
 console.log('PASS real queue confirmation-only success, 2.6-second acknowledgement expiry and existing queue release')
 await fresh()
 await page.evaluate(()=>{window.inlineFixtureStatus.start(3,'photo');window.inlineFixtureStatus.complete(true)})
 await statusText().filter({hasText:'2 uploading'}).waitFor()
 assert.equal((await statusText().innerText()).includes('added'),false)
 assert.equal((await statusText().innerText()).includes('Uploaded'),false)
 await page.evaluate(()=>window.inlineFixtureStatus.complete(false,'SECRET provider failure'))
 await statusText().filter({hasText:'1 uploading · 1 need attention'}).waitFor()
 assert.equal(await row().getByRole('link',{name:'Check Photos'}).getAttribute('href'),'/photos')
 await page.evaluate(()=>window.inlineFixtureStatus.complete(true))
 await statusText().filter({hasText:'1 need attention'}).waitFor()
 await screenshot('legacy-attention')
 assert.equal((await row().innerText()).includes('SECRET'),false)
 await page.evaluate(()=>{window.stopPresentation=window.inlineFixtureStatus.registerCameraPresentation()})
 assert.equal(await row().count(),0)
 await page.evaluate(()=>window.stopPresentation())
 await row().waitFor()
 await page.waitForTimeout(2700)
 await page.evaluate(()=>window.inlineFixtureStatus.dismiss())
 await row().waitFor({state:'detached'})
 console.log('PASS legacy picker pending/error visibility without completed counts, safe Photos action and camera suppression')
 await fresh()
 await page.evaluate(()=>{window.inlineFixtureStatus.start(1,'video');window.inlineFixtureStatus.complete(true)})
 await statusText().filter({hasText:'Uploaded'}).waitFor()
 await row().waitFor({state:'detached',timeout:4500})
 console.log('PASS legacy file-picker success expires independently')
 await fresh()
 await page.evaluate(()=>{window.oldComplete=window.inlineFixtureStatus.complete;window.inlineFixtureStatus.start(1,'photo')})
 await statusText().filter({hasText:'1 uploading'}).waitFor()
 await page.evaluate(()=>window.render({accountId:'account-b',companyId:'company-b'}))
 await page.waitForFunction(()=>window.inlineFixtureStatus.accountId==='account-b'&&window.inlineFixtureStatus.queueReady)
 assert.equal(await row().count(),0)
 await page.evaluate(()=>window.oldComplete(true))
 assert.equal(await row().count(),0)
 await page.evaluate(()=>window.enqueue('pending-b'))
 await row().waitFor()
 await page.evaluate(()=>window.render({accountId:null,companyId:null}))
 await page.waitForFunction(()=>window.inlineFixtureStatus.accountId===null)
 assert.equal(await row().count(),0)
 console.log('PASS account/company/logout isolation, including late old-account completion')
 await fresh()
 await page.evaluate(()=>window.enqueue('attention-a'))
 await online()
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.evaluate(()=>window.sessions[0].reject(Object.assign(Error('SECRET transport'),{retryable:false,category:'auth'})))
 await statusText().filter({hasText:'Sign in to finish uploading.'}).waitFor()
 await screenshot('auth-attention')
 assert.equal(await page.getByRole('button',{name:'Review uploads'}).count(),1)
 assert.equal((await row().innerText()).includes('SECRET'),false)
 await page.evaluate(()=>{window.fixtureOnline=false;dispatchEvent(new Event('offline'))})
 await page.evaluate(()=>window.enqueue('newer-waiting'))
 await page.getByRole('button',{name:'Review uploads'}).click()
 await page.locator('[data-camera-review-status]').filter({hasText:'Sign in to finish uploading.'}).waitFor()
 assert.equal(await row().count(),0)
 assert.equal(await page.evaluate(()=>window.cameraRequests+window.permissionChecks),0)
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await row().waitFor()
 console.log('PASS attention capture is prioritized over a newer waiting capture in review')
 await fresh()
 await page.evaluate(()=>window.enqueue('review-target'))
 // The entry point must open this actual hydrated capture, without duplicate status.
 await page.getByRole('button',{name:'Review uploads',exact:true}).click()
 await page.locator('[data-camera-review-status]').waitFor()
 assert.equal(await row().count(),0)
 assert.equal(await page.evaluate(()=>window.cameraRequests),0)
 assert.equal(await page.evaluate(()=>window.permissionChecks),0)
 await page.screenshot({path:path.join(screenshotDir,'pending-review.png')})
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await row().waitFor()
 assert.deepEqual(await page.evaluate(()=>window.inlineCameraOverlap),[])
 console.log('PASS review targets hydrated pending capture, no camera permission and no duplicated inline status')
 // Inject controller-level maintenance state, leaving real committed Blob rows
 // untouched. A queue failure must never rewrite per-capture save truth.
 const queueError=async(error)=>page.evaluate(error=>{const q=window.inlineFixtureStatus.deviceQueue;Object.defineProperty(q,'error',{configurable:true,get:()=>error});q.releaseUploaded()},error)
 await fresh()
 await page.evaluate(()=>window.enqueue('verified-maintenance'))
 for(const error of ['Device storage couldn’t open. Keep Found open for new captures.','Device storage couldn’t update. Keep Found open.','Couldn’t save on this device. Keep Found open.','Upload paused.','Uploads paused. Device storage needs attention.']){
  await queueError(error)
  await statusText().filter({hasText:'Saved on this device · Upload paused.'}).waitFor()
  assert.equal(await row().locator('.inline-upload-spinner').count(),0)
  assert.equal((await row().innerText()).includes('Couldn’t save'),false)
  assert.equal(await page.evaluate(()=>window.inlineFixtureStatus.queueRows[0].localSaved),true)
 }
 await screenshot('verified-upload-paused')
 for(const [error,label] of [['Sign in to finish uploading.','Sign in to finish uploading.'],['Return to the original account and business to finish uploading.','Return to the original business.']]){
  await queueError(error)
  await statusText().filter({hasText:'Saved on this device · '+label}).waitFor()
  assert.equal(await row().locator('.inline-upload-spinner').count(),0)
 }
 // Even an in-flight transfer snapshot cannot make maintenance appear active.
 await queueError(null)
 await online()
 await page.waitForFunction(()=>window.sessions.length===1)
 await queueError('Device storage couldn’t update. Keep Found open.')
 await statusText().filter({hasText:'Saved on this device · Upload paused.'}).waitFor()
 assert.equal(await row().locator('.inline-upload-spinner').count(),0)
 console.log('PASS verified saved truth survives queue open/read/update/auth/business errors without spinner or original-loss claim')
 await fresh()
 await queueError('Device storage couldn’t open. Keep Found open for new captures.')
 await statusText().filter({hasText:'Upload paused.'}).waitFor()
 assert.equal((await row().innerText()).includes('Saved on this device'),false)
 assert.equal((await row().innerText()).includes('Couldn’t save'),false)
 // A real IndexedDB write failure is the specific evidence for unsaved guidance.
 await page.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='captures'||(this.name==='runtime'&&String(args[0]?.key).startsWith('found:media:')))throw new DOMException('synthetic quota','QuotaExceededError');return put.apply(this,args)}})
 await page.evaluate(()=>window.enqueue('unverified-original').catch(()=>{}))
 await statusText().filter({hasText:'Couldn’t save on this device. Keep this camera open.'}).waitFor()
 assert.equal(await page.evaluate(()=>window.inlineFixtureStatus.queueRows[0].localSaved),false)
 assert.equal(await row().locator('.inline-upload-spinner').count(),0)
 await screenshot('unverified-original')
 console.log('PASS neutral queue-only failure and precise unsaved guidance only after actual failed local write')
 assert.deepEqual(await page.evaluate(()=>window.storageReports),[{operation:'initial-write',category:'quota',errorName:'QuotaExceededError',verifiedOriginal:false}])
 await fresh()
 await page.evaluate(()=>{
  const q=window.inlineFixtureStatus.deviceQueue
  window.oldDiagnosticQueue=q
  Object.defineProperty(q,'storageDiagnostic',{configurable:true,get:()=>window.testStorageDiagnostic??null})
  window.testStorageDiagnostic={operation:'capture-read',category:'aborted',errorName:'AbortError',verifiedOriginal:true,accountId:'SECRET',captureId:'SECRET',message:'SECRET',blob:new Blob(['SECRET'])}
  q.releaseUploaded();q.releaseUploaded()
 })
 assert.deepEqual(await page.evaluate(()=>window.storageReports),[{operation:'capture-read',category:'aborted',errorName:'AbortError',verifiedOriginal:true}])
 await page.evaluate(()=>{window.testStorageDiagnostic={operation:'SECRET',category:'quota',errorName:'SECRET',verifiedOriginal:false};window.oldDiagnosticQueue.releaseUploaded()})
 assert.equal(await page.evaluate(()=>window.storageReports.length),1)
 await page.evaluate(()=>window.render({accountId:'account-b',companyId:'company-b'}))
 await page.waitForFunction(()=>window.inlineFixtureStatus.accountId==='account-b'&&window.inlineFixtureStatus.queueReady)
 await page.evaluate(()=>{window.testStorageDiagnostic={operation:'remove',category:'aborted',errorName:'AbortError',verifiedOriginal:true};window.oldDiagnosticQueue.releaseUploaded()})
 assert.equal(await page.evaluate(()=>window.storageReports.length),1)
 // Suppress subscription emission to exercise the separate initial snapshot path.
 await page.evaluate(()=>{
  const q=window.oldDiagnosticQueue,subscribe=q.subscribe.bind(q)
  q.subscribe=listener=>subscribe(()=>{})
  window.testStorageDiagnostic={operation:'budget-read',category:'unavailable',errorName:'InvalidStateError',verifiedOriginal:true}
  window.render({accountId:'account-a',companyId:'company-a'})
 })
 await page.waitForFunction(()=>window.inlineFixtureStatus.accountId==='account-a'&&window.storageReports.length===2)
 assert.deepEqual(await page.evaluate(()=>window.storageReports[1]),{operation:'budget-read',category:'unavailable',errorName:'InvalidStateError',verifiedOriginal:true})
 await page.evaluate(()=>window.render({accountId:null,companyId:null}))
 await page.waitForFunction(()=>window.inlineFixtureStatus.accountId===null)
 assert.equal(await page.evaluate(()=>window.storageReports.length),2)
 console.log('PASS actual failed-write diagnostic, scoped subscribe/initial snapshot reporting, sanitization, deduplication and stale-account/logout suppression')
 // Decode fixtures alter only presentation metadata; integrity below uses an
 // actual damaged immutable payload and real queue classification after reopen.
 const exposeCapture=async(kind)=>page.evaluate(kind=>{
  const q=window.inlineFixtureStatus.deviceQueue,snapshot=q.getSnapshot.bind(q),subscribe=q.subscribe.bind(q),discard=q.discard.bind(q)
  window.discardCalls=0
  const expose=rows=>rows.map(row=>kind==='integrity'?{...row,localSaved:false,state:'needs_attention',errorCategory:'integrity'}:kind==='video-decode'?{...row,mimeType:'video/mp4',fileName:'video-fixture.mp4'}:row)
  q.getSnapshot=()=>expose(snapshot())
  q.subscribe=listener=>subscribe(rows=>listener(expose(rows)))
  q.discard=async id=>{window.discardCalls++;return discard(id)}
  window.render({accountId:'account-a',companyId:'company-a',key:kind})
 },kind)
 const retainedBytes=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('found-device-captures-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['captures','runtime'],'readonly'),legacy=tx.objectStore('captures').getAll(),runtime=tx.objectStore('runtime').getAll();tx.oncomplete=async()=>{try{const old=await Promise.all(legacy.result.map(async row=>({id:row.id,bytes:[...new Uint8Array(await row.blob.arrayBuffer())]})));const payloads=runtime.result.filter(row=>String(row.key).startsWith('found:media:v1:payload:')).map(row=>({id:row.id,bytes:[...new Uint8Array(row.bytes)]}));resolve([...old,...payloads])}catch(e){reject(e)}finally{db.close()}}}}))
 await fresh()
 await page.evaluate(()=>window.enqueue('integrity-retained'))
 await page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('found-device-captures-v1');request.onsuccess=()=>{const db=request.result,tx=db.transaction('runtime','readwrite'),store=tx.objectStore('runtime'),read=store.getAll();read.onsuccess=()=>{const payload=read.result.find(row=>String(row.key).startsWith('found:media:v1:payload:')),bytes=new Uint8Array(payload.bytes).slice();bytes[0]^=255;store.put({...payload,bytes})};tx.oncomplete=()=>{db.close();resolve()};tx.onabort=()=>reject(tx.error)}}))
 await page.reload()
 await page.waitForFunction(()=>window.inlineFixtureStatus?.queueReady&&window.inlineFixtureStatus.queueRows[0]?.errorCategory==='integrity')
 await page.evaluate(()=>{const q=window.inlineFixtureStatus.deviceQueue,discard=q.discard.bind(q);window.discardCalls=0;q.discard=async id=>{window.discardCalls++;return discard(id)}})
 const originalBytes=await retainedBytes()
 assert.ok(originalBytes.length===1&&originalBytes[0].bytes.length>0)
 await statusText().filter({hasText:'Couldn’t read this capture.'}).waitFor()
 assert.equal((await row().innerText()).includes('Keep this camera open'),false)
 assert.equal(await row().locator('.inline-upload-spinner').count(),0)
 await page.getByRole('button',{name:'Review uploads'}).click()
 await page.locator('[data-camera-unreadable]').waitFor()
 await page.locator('[data-camera-review-status]').filter({hasText:'Couldn’t read this capture.'}).waitFor()
 assert.equal(await page.locator('[data-camera-review-preview] img,[data-camera-review-preview] video').count(),0)
 assert.equal(await page.getByRole('button',{name:/Retry|Try saving again/}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Annotate',exact:true}).count(),0)
 assert.equal(await page.getByRole('dialog').count(),0)
 assert.equal(await page.evaluate(()=>window.cameraRequests+window.permissionChecks),0)
 assert.deepEqual(await retainedBytes(),originalBytes)
 await page.screenshot({path:path.join(screenshotDir,'integrity-review.png')})
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await row().waitFor()
 assert.deepEqual(await retainedBytes(),originalBytes)
 assert.equal(await page.evaluate(()=>window.discardCalls),0)
 await page.getByRole('button',{name:'Review uploads'}).click()
 await page.locator('[data-camera-unreadable]').waitFor()
 await page.getByRole('button',{name:'Delete',exact:true}).click()
 await page.getByRole('button',{name:'Cancel',exact:true}).click()
 assert.deepEqual(await retainedBytes(),originalBytes)
 await online()
 await page.getByRole('button',{name:'Delete',exact:true}).click()
 await page.getByRole('button',{name:'Delete',exact:true}).last().click()
 await page.waitForFunction(()=>window.discardCalls===1)
 await page.locator('[data-camera-unreadable]').waitFor({state:'detached'})
 assert.deepEqual(await retainedBytes(),[])
 console.log('PASS integrity classification: placeholder/no Retry/no camera-open loss warning; original bytes retained through review/close/cancel, removed only on confirmed Delete')
 for(const kind of ['image-decode','video-decode']){
  await fresh()
  await page.evaluate(()=>window.enqueue('preview-'+crypto.randomUUID()))
  const bytes=await retainedBytes()
  await exposeCapture(kind)
  await page.getByRole('button',{name:'Review uploads'}).click()
  if(kind==='image-decode')await page.locator('[data-camera-review-preview] img').evaluate(img=>{img.src='data:image/jpeg;base64,YmFk'})
  await page.locator('[data-camera-unreadable]').waitFor()
  await page.locator('[data-camera-review-status]').filter({hasText:'Couldn’t read this capture.'}).waitFor()
  assert.equal(await page.getByRole('button',{name:/Retry|Try saving again/}).count(),0)
  assert.equal(await page.locator('[data-camera-review-preview] img,[data-camera-review-preview] video').count(),0)
  assert.deepEqual(await retainedBytes(),bytes)
  assert.equal(await page.evaluate(()=>window.inlineFixtureStatus.queueRows[0].localSaved),true)
  await page.getByRole('button',{name:'Done',exact:true}).click()
  assert.equal(await page.getByRole('dialog').count(),0)
 }
 console.log('PASS browser image/video decode errors become presentation-only placeholders without changing localSaved or original bytes')
 // Verify server layout mounts the actual host after its header, within provider scope.
 const layout=fs.readFileSync(path.join(root,'src/app/dashboard/(app)/layout.tsx'),'utf8')
 const host=layout.indexOf('<UploadStatusInline />')
 assert.ok(host>layout.indexOf('</header>',layout.indexOf('async function DashboardChrome'))&&host<layout.indexOf('{children}',layout.indexOf('async function DashboardChrome')))
 assert.deepEqual(errors,[])
 console.log('PASS actual React provider/inline host + real Chromium IndexedDB; transport and dashboard scaffold mocked')
}catch(error){throw error}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
