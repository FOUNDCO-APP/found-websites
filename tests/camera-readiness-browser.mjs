import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Real CameraSheet and UploadStatusProvider run in React Chromium with mocked
// camera media and transport sessions; the real device queue uses Chromium IndexedDB.
// No live services or accounts are used.
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
const camera = bundle(path.join(root, 'src/components/dashboard/CameraSheet.tsx'))
const provider = bundle(path.join(root, 'src/components/dashboard/UploadStatusProvider.tsx'))
// This fixture renders CameraSheet directly; no substitute camera handlers.

// App handlers are never copied or replaced. Fault injection is confined to browser APIs.
const script = `const process={env:{NODE_ENV:'production'}};const modules={${modules.join(',')}},cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),module,module.exports);return module.exports;}
const R=load(${react}),e=R.createElement;
window.sessions=[];window.recorders=[];window.contextCalls=[];window.fixtureScope={accountId:'account-a',companyId:'company-a'};window.fixtureClosed=0;
Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:'granted'})}});
window.settings={width:4096,height:3072,frameRate:30};window.constraints=[];
window.syncDimensions=()=>document.querySelectorAll('video').forEach(v=>{for(const key of ['width','height'])Object.defineProperty(v,key==='width'?'videoWidth':'videoHeight',{value:window.settings[key],configurable:true});v.dispatchEvent(new Event('resize'))});
const track={readyState:'live',stop(){},getCapabilities(){return {}},getSettings(){return {...window.settings}},async applyConstraints(value){window.constraints.push(value);if(window.hangConstraints)await new Promise(resolve=>window.releaseConstraints=resolve);window.settings={width:value.width?.ideal||4096,height:value.height?.ideal||3072,frameRate:30};window.syncDimensions()}};
const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{const freshTrack={...track};window.mediaRequests=(window.mediaRequests||0)+1;return {getTracks:()=>[freshTrack],getVideoTracks:()=>[freshTrack]}}}});
Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{set(){setTimeout(()=>{Object.defineProperty(this,'readyState',{value:2,configurable:true});window.syncDimensions();this.dispatchEvent(new Event('loadedmetadata'))},20)}});
const scene=document.createElement('canvas');scene.width=32;scene.height=32;scene.getContext('2d').fillRect(0,0,32,32);
const nativeContext=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(...args){const ctx=nativeContext.apply(this,args);const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(image,...values)=>draw(image instanceof HTMLVideoElement?scene:image,...values);return ctx};
const nativeBlob=HTMLCanvasElement.prototype.toBlob;window.encodes=[];
HTMLCanvasElement.prototype.toBlob=function(callback,...args){if(window.throwEncoder){window.throwEncoder=false;throw new Error('Synthetic encoder exception')}if(window.delayEncoder){const canvas=this;window.encodes.push(()=>nativeBlob.call(canvas,callback,...args));return}return nativeBlob.call(this,callback,...args)};
window.fixtureScene=scene;window.fixtureSceneReady=Promise.resolve();
const NativeRecorder=window.MediaRecorder;
window.fixtureVideoReady=window.fixtureSceneReady.then(()=>new Promise((resolve,reject)=>{
 const stream=window.fixtureScene.captureStream(0),track=stream.getVideoTracks()[0],chunks=[],recorder=new NativeRecorder(stream,{mimeType:'video/webm'});
 recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
 recorder.onerror=()=>{stream.getTracks().forEach(track=>track.stop());reject(Error('Fixture recorder failed'))};
 recorder.onstart=()=>{let frame=0;const draw=()=>{const ctx=window.fixtureScene.getContext('2d');ctx.save();ctx.fillStyle=frame%2?'#bba68a':'#bca78b';ctx.fillRect(0,0,2,2);ctx.restore();track.requestFrame();if(++frame<4)setTimeout(draw,75);else setTimeout(()=>recorder.stop(),100)};draw()};
 recorder.onstop=()=>{stream.getTracks().forEach(track=>track.stop());const blob=new Blob(chunks,{type:'video/webm'}),video=document.createElement('video'),url=URL.createObjectURL(blob);let settled=false;const done=error=>{if(settled)return;settled=true;clearTimeout(timeout);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);if(error)reject(error);else{window.fixtureVideoBlob=blob;window.fixtureVideoDecoded=true;resolve(blob)}};const timeout=setTimeout(()=>done(Error('Fixture WebM decode timed out')),10000);video.muted=true;video.preload='auto';video.onloadeddata=()=>done(video.videoWidth>0&&video.videoHeight>0?null:Error('Fixture video has no decoded frame'));video.onerror=()=>done(Error('Fixture WebM is not decodable'));video.src=url;video.load()};
 recorder.start();
}));
class Recorder{static isTypeSupported(mime){return mime==='video/webm'}state='inactive';constructor(stream,options={}){this.stream=stream;this.options=options;this.mimeType=options.mimeType||'video/webm';this.videoBitsPerSecond=options.videoBitsPerSecond;this.audioBitsPerSecond=options.audioBitsPerSecond;window.recorders.push(this)}start(){this.state='recording'}stop(){this.state='inactive';window.finishRecording=async()=>{this.ondataavailable({data:await window.fixtureVideoReady});this.onstop()};if(!window.deferRecording)window.finishRecording()}}
window.MediaRecorder=Recorder;

function Harness(){const [open,setOpen]=R.useState(true);window.unmountCamera=()=>setOpen(false);window.openCamera=()=>setOpen(true);window.queueStatus=load(${provider}).useUploadStatus();return open?e(load(${camera}).default,{pendingAlbumId:'job-a',onUploaded:()=>{},onClose:()=>{window.fixtureClosed++;setOpen(false)}}):null}
const reactRoot=load(${client}).createRoot(document.getElementById('root'));window.renderIdentity=identity=>reactRoot.render(e(load(${provider}).default,{...identity,key:JSON.stringify(identity)},e(Harness)));window.renderIdentity(window.fixtureScope);`
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>')})
let browser,context,page
const errors=[]
const deadline=setTimeout(()=>{console.error('FAIL camera readiness deadline');process.exit(1)},120000)
const mode=name=>page.getByRole('button',{name,exact:true})
const selected=async name=>assert.equal(await mode(name).getAttribute('aria-pressed'),'true',`${name} must be selected`)
const ready=async name=>{await page.getByRole('button',{name,exact:true}).waitFor();await page.waitForFunction(label=>!document.querySelector('button[aria-label="'+label+'"]').disabled,name)}
const fresh=async()=>{await context?.close();context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));await page.goto('http://127.0.0.1:'+server.address().port);await ready('Take photo');await page.waitForFunction(()=>window.queueStatus.queueReady)}
const beginStill=async()=>{await page.evaluate(()=>window.delayEncoder=true);await page.getByRole('button',{name:'Take photo',exact:true}).click();assert.equal(await page.evaluate(()=>window.encodes.length),1)}
const finishStill=()=>page.evaluate(()=>window.encodes.shift()())
const waitLabel=async()=>{await page.getByRole('status').filter({hasText:/prepar|finish|saving|switch|wait/i}).first().waitFor()}
const retained=()=>page.waitForFunction(()=>window.queueStatus.queueRows.length===1 && window.queueStatus.queueRows[0].state!=='saving')
try {
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE?{executablePath:process.env.FOUND_BROWSER_EXECUTABLE}:{})})
 await fresh();await beginStill();await mode('video').click();await waitLabel();await selected('photo');await finishStill();await ready('Record video');await selected('video');await retained()
 // Exercise the reported sequence through actual recording handlers, not just readiness.
 const photoId=await page.evaluate(()=>window.queueStatus.queueRows[0].id)
 await page.getByRole('button',{name:'Record video',exact:true}).click()
 await page.getByRole('button',{name:'Stop recording',exact:true}).click()
 await page.waitForFunction(()=>window.queueStatus.queueRows.length===2 && window.queueStatus.queueRows.every(row=>row.localSaved))
 const originals=await page.evaluate(async photoId=>{
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('')
  const expected=new Map(await Promise.all(window.queueStatus.queueRows.map(async row=>[row.id,{id:row.id,type:row.blob.type,bytes:row.blob.size,digest:await hash(await row.blob.arrayBuffer())}])))
  const values=await new Promise((resolve,reject)=>{const request=indexedDB.open('found-device-captures-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction('runtime','readonly'),read=tx.objectStore('runtime').getAll();tx.oncomplete=()=>{db.close();resolve(read.result)};tx.onerror=()=>reject(tx.error)}})
  for(const row of expected.values()){
   const metadata=values.find(value=>value.id===row.id && value.active)
   const payload=values.find(value=>value.id===row.id && value.bytes instanceof ArrayBuffer)
   if(!metadata?.localSaved || !payload || payload.bytes.byteLength!==row.bytes || await hash(payload.bytes)!==row.digest)throw Error('Original bytes not durably retained')
  }
  const video=[...expected.values()].find(row=>row.type.startsWith('video/'))
  return {count:expected.size,photoRetained:expected.has(photoId),videoBytes:video?.bytes,videoMatches:video?.digest===await hash(await window.fixtureVideoBlob.arrayBuffer())}
 },photoId)
 assert.equal(originals.count,2);assert.equal(originals.photoRetained,true);assert.ok(originals.videoBytes>0);assert.equal(originals.videoMatches,true)
 console.log('PASS delayed actual toBlob -> Video -> Record -> Stop: both originals retained with committed byte/hash verification')
 await fresh();await beginStill();await mode('video').click();await mode('photo').click();await finishStill();await retained();await selected('photo');assert.equal(await page.getByRole('button',{name:'Record video',exact:true}).count(),0)
 console.log('PASS selecting Photo cancels pending Video intent')
 await fresh();await beginStill();await mode('video').click();await mode('photo').click();await mode('video').click();await finishStill();await ready('Record video');await selected('video');await retained()
 console.log('PASS repeated mode requests: last requested destination wins')
 await fresh();await beginStill();await mode('video').click();await page.getByRole('button',{name:'Close camera',exact:true}).click();await page.getByRole('dialog').waitFor();assert.equal(await page.evaluate(()=>window.fixtureClosed),0);await page.getByRole('button',{name:'Keep camera open',exact:true}).click();await finishStill();await retained()
 console.log('PASS close during encoding protects pending original')
 await fresh();await beginStill();await mode('video').click();await page.evaluate(()=>window.unmountCamera());await page.locator('.found-camera').waitFor({state:'detached'});await finishStill();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await page.locator('.found-camera').count(),0);assert.equal(await page.evaluate(()=>window.queueStatus.queueRows.length),0);assert.equal(await page.evaluate(()=>window.sessions.length),0)
 console.log('PASS late encoder callback after unmount cannot resurrect camera or enqueue capture')
 await fresh();await beginStill();await mode('video').click();await page.evaluate(()=>window.renderIdentity({accountId:'account-b',companyId:'company-b'}));await ready('Take photo');await page.waitForFunction(()=>window.queueStatus.companyId==='company-b' && window.queueStatus.queueReady);await finishStill();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await selected('photo');assert.equal(await page.evaluate(()=>window.queueStatus.queueRows.length),0);assert.equal(await page.evaluate(()=>window.sessions.length),0)
 console.log('PASS account/company scope replacement: old encoder callback cannot enqueue or switch new camera')
 await fresh();await page.evaluate(()=>window.throwEncoder=true);await page.getByRole('button',{name:'Take photo',exact:true}).click();await page.getByRole('status').filter({hasText:'Photo couldn’t be taken. Try again.'}).waitFor();await mode('video').click();await ready('Record video');await selected('video');assert.equal(await page.evaluate(()=>window.queueStatus.queueRows.length),0)
 console.log('PASS synchronous encoder exception clears readiness guard and permits Video')
 await fresh();await page.evaluate(()=>window.hangConstraints=true);await mode('video').click();await page.getByRole('button',{name:'Restart camera',exact:true}).waitFor();await page.getByRole('status').filter({hasText:'Camera isn’t ready. Try restarting it.'}).waitFor();assert.equal(await page.getByRole('button',{name:'Record video',exact:true}).isDisabled(),true);await page.evaluate(()=>{window.hangConstraints=false;window.releaseConstraints?.()});await page.getByRole('button',{name:'Restart camera',exact:true}).click();await ready('Record video');assert.equal(await page.evaluate(()=>window.mediaRequests),2);
 console.log('PASS hanging constraints reach visible bounded failure and cannot authorize recording')
 assert.deepEqual(errors,[],'no uncaught React/browser errors')
} finally {await context?.close();await browser?.close();await new Promise(resolve=>server.close(resolve));clearTimeout(deadline)}
