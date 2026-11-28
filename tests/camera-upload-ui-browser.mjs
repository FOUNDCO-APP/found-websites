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
const inlineHost = bundle(path.join(root, 'src/components/dashboard/UploadStatusInline.tsx'))
const script = `const process={env:{NODE_ENV:"production"}};const modules={${modules.join(',')}},cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),module,module.exports);return module.exports;}const R=load(${react}),e=R.createElement;window.sessions=[];window.uploaded=[];window.contextCalls=[];window.fixtureScope={accountId:'account-a',companyId:'company-a'};window.fixtureOnline=true;Object.defineProperty(navigator,'onLine',{get:()=>window.fixtureOnline});window.fixtureClosed=0;window.permission=new URLSearchParams(location.search).has('denied')?'denied':'granted';window.mediaError=new URLSearchParams(location.search).has('device')?'NotFoundError':null;window.recorders=[];
Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:window.permission})}});
window.profileConstraints=[];window.fixtureSettings={width:4096,height:3072,frameRate:30};window.syncFixtureDimensions=()=>document.querySelectorAll('video[data-fixture-stream]').forEach(v=>{for(const key of ['width','height'])Object.defineProperty(v,key==='width'?'videoWidth':'videoHeight',{value:window.fixtureSettings[key],configurable:true});v.dispatchEvent(new Event('resize'))});const track={readyState:'live',stop(){},getCapabilities(){return {}},async applyConstraints(value){window.profileConstraints.push(value);window.fixtureSettings={width:value.width?.ideal||4096,height:value.height?.ideal||3072,frameRate:value.frameRate?.ideal||30};if(window.ignorePortraitConstraints&&window.fixtureSettings.height>window.fixtureSettings.width)window.fixtureSettings={width:1920,height:1080,frameRate:30};window.syncFixtureDimensions()},getSettings(){return {...window.fixtureSettings}}};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
window.mediaRequests=0;Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{window.mediaRequests++;if(window.mediaError)throw new DOMException('test',window.mediaError);return stream}}});
// A real local photo may be supplied for visual review; otherwise draw a textured room.
window.fixtureScene=document.createElement('canvas');window.fixtureScene.width=720;window.fixtureScene.height=960;
const scene=window.fixtureScene.getContext('2d');
window.fixtureSceneReady=(async()=>{
 if(${Boolean(process.env.FOUND_CAMERA_FIXTURE_IMAGE)}){const img=new Image();img.src='/fixture-scene';await img.decode();
   if(img.naturalWidth===589&&img.naturalHeight===1280)scene.drawImage(img,22,250,475,530,0,0,720,960);else scene.drawImage(img,0,0,720,960);
 }else{
   scene.fillStyle='#bba68a';scene.fillRect(0,0,720,960);
   const light=scene.createLinearGradient(0,0,720,960);light.addColorStop(0,'#e4d5b9');light.addColorStop(1,'#6c5744');scene.fillStyle=light;scene.fillRect(0,0,720,960);
   for(let y=0;y<750;y+=42)for(let x=-70;x<750;x+=110){scene.fillStyle=(x+y)%3?'#b29170':'#a17a58';scene.fillRect(x+(y%84?55:0),y,105,37)}
   scene.fillStyle='#4d3b2c';scene.fillRect(80,180,250,540);scene.fillStyle='#8b6743';scene.fillRect(96,195,218,510);
   for(let x=100;x<315;x+=27){scene.fillStyle='#68482e';scene.fillRect(x,195,3,510)}
   scene.fillStyle='#ddd5be';scene.fillRect(410,220,240,300);scene.fillStyle='#9cb4b9';scene.fillRect(427,237,206,265);scene.fillStyle='#eadcc3';scene.fillRect(525,237,10,265);scene.fillRect(427,365,206,10);
   scene.fillStyle='#594735';scene.fillRect(0,740,720,220);for(let x=-500;x<1000;x+=95){scene.strokeStyle='#887152';scene.lineWidth=3;scene.beginPath();scene.moveTo(360+(x-360)*.22,740);scene.lineTo(x,960);scene.stroke()}
   for(let i=0;i<20000;i++){scene.fillStyle=i%2?'#ffffff0b':'#0000000b';scene.fillRect((i*137)%720,(i*277)%960,2,2)}
 }
})();
Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{set(){window.fixtureSceneReady.then(()=>{this.dataset.fixtureStream='true';this.poster=window.fixtureScene.toDataURL();Object.defineProperty(this,'readyState',{value:2,configurable:true});Object.defineProperty(this,'videoWidth',{value:window.fixtureSettings.width,configurable:true});Object.defineProperty(this,'videoHeight',{value:window.fixtureSettings.height,configurable:true});this.dispatchEvent(new Event('loadedmetadata'))})}});
const canvasContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const ctx=canvasContext.apply(this,args);const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(image,...values)=>draw(image instanceof HTMLVideoElement?window.fixtureScene:image,...values);return ctx};

// Valid encoded fixture bytes keep ordinary recording tests distinct from the
// dedicated unreadable-media tests. No device permission or network is needed.
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
const root=load(${client}).createRoot(document.getElementById('root'));new MutationObserver(()=>document.querySelectorAll('video').forEach(video=>{if(!video.poster)video.poster=window.fixtureScene.toDataURL()})).observe(document.getElementById('root'),{childList:true,subtree:true});
function Harness(){const [open,setOpen]=R.useState(true);window.unmountCamera=()=>setOpen(false);window.openCamera=()=>setOpen(true);window.openReviewCamera=id=>{window.fixtureReviewId=id;setOpen(true)};window.uploadFixtureStatus=load(${provider}).useUploadStatus();return e(R.Fragment,null,e('header',{style:{height:60}},'FOUND'),e(load(${inlineHost}).default),open?e(load(${camera}).default,{pendingAlbumId:'job-a',initialReviewCaptureId:window.fixtureReviewId,onUploaded:photo=>window.uploaded.push(photo),onClose:()=>{window.fixtureClosed++;setOpen(false)}}):null)}
window.render=(identity=window.fixtureScope)=>root.render(e(load(${provider}).default,{...identity,key:JSON.stringify(identity)},e(Harness)));window.render();`
const server=http.createServer((req,res)=>{if(req.url==='/fixture-scene'&&process.env.FOUND_CAMERA_FIXTURE_IMAGE){res.setHeader('Content-Type','image/jpeg');res.end(fs.readFileSync(process.env.FOUND_CAMERA_FIXTURE_IMAGE));return}res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;background:#080A09}*{box-sizing:border-box}button{font:inherit}button:disabled{opacity:.45}dialog::backdrop{background:#000b}</style><div id="root"></div><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>')})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE ? {executablePath:process.env.FOUND_BROWSER_EXECUTABLE} : {})})
let context=await browser.newContext({viewport:{width:390,height:844}})
let page=await context.newPage()
const screenshotDir=path.join(root,'.billing-audits/camera-upload');fs.mkdirSync(screenshotDir,{recursive:true});
const errors=[];const attach=()=>{page.on('dialog',dialog=>dialog.accept());page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message)})};attach()
const url='http://127.0.0.1:'+server.address().port
const fresh=async(query='')=>{await context.close();context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();attach();await page.goto(url+query);await page.evaluate(()=>window.fixtureVideoReady);assert.equal(await page.evaluate(()=>window.fixtureVideoDecoded),true);await page.getByRole('button',{name:'Take photo',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('button[aria-label="Take photo"]').disabled && window.uploadFixtureStatus.queueReady)}
const finish=async(index=0)=>{await page.waitForFunction(i=>typeof window.sessions[i]?.resolve==='function',index);return page.evaluate(i=>window.sessions[i].resolve({id:'photo-'+i,url:'test',storage_path:'test',for_website:false,for_social:false,in_gallery:false,website_section:null,album_id:'job-a',created_at:'test'}),index)}

const bounds=async(locator)=>assert.equal(await locator.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=-0.5&&r.right<=innerWidth+0.5&&r.top>=0&&r.bottom<=innerHeight}),true)
const noGlobal=async()=>assert.equal(await page.getByRole('complementary',{name:'Upload status'}).count(),0)
const shots=async(name,review=false)=>{
 for(const [width,height,enlarged] of [[390,844,false],[320,568,false],[844,390,false],[390,844,true],[844,390,true]]){
  await page.setViewportSize({width,height})
  await page.evaluate(enlarged=>document.documentElement.style.fontSize=enlarged?'24px':'16px',enlarged)
  const surface=page.locator(review?'.camera-review':'.camera-dock')
  const undersized=await surface.locator('button').evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<43.5||r.height<43.5)}).map(b=>b.getAttribute('aria-label')||b.textContent))
  assert.deepEqual(undersized,[])
  if(!review){
   const relation=await page.locator('[data-camera-status-slot]').evaluate(el=>{const r=el.getBoundingClientRect(),shutter=el.nextElementSibling.getBoundingClientRect();return getComputedStyle(el).position!=='absolute'&&r.height>=44&&r.bottom<=shutter.top&&Math.abs((r.left+r.right)/2-(shutter.left+shutter.right)/2)<1})
   assert.equal(relation,true)
   await bounds(page.getByRole('button',{name:/^(Take photo|Record video|Stop recording)$/}))
  }
  if(review){
   await bounds(page.locator('[data-camera-review-status]'))
   const relation=await page.locator('[data-camera-review-status]').evaluate(el=>{const r=el.getBoundingClientRect(),preview=el.nextElementSibling.getBoundingClientRect(),header=el.previousElementSibling.getBoundingClientRect();return r.top>=header.bottom-.5&&r.bottom<=preview.top+.5})
   assert.equal(relation,true)
   assert.equal(await page.getByRole('button',{name:'Delete',exact:true}).count(),1)
  }else if(await page.getByRole('status',{name:'Camera upload status'}).count()) await bounds(page.getByRole('status',{name:'Camera upload status'}))
  await page.screenshot({path:path.join(screenshotDir,name+'-'+width+(enlarged?'-large':'')+'.png')})
 }
 await page.setViewportSize({width:390,height:844})
 await page.evaluate(()=>document.documentElement.style.fontSize='16px')
}

const takePhoto=async()=>{await page.getByRole('button',{name:'Take photo',exact:true}).click();await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows.length>0)}
const setOnline=async(value)=>page.evaluate(value=>{window.fixtureOnline=value;dispatchEvent(new Event(value?'online':'offline'))},value)
const persisted=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const request=indexedDB.open('found-device-captures-v1');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,tx=db.transaction(['captures','runtime'],'readonly'),legacy=tx.objectStore('captures').getAll(),runtime=tx.objectStore('runtime').getAll();tx.oncomplete=()=>{const rows=new Map(legacy.result.map(row=>[row.id,{id:row.id,localSaved:row.localSaved,bytes:row.blob.size}]));for(const row of runtime.result)if(String(row.key).startsWith('found:media:v1:metadata:')&&row.active)rows.set(row.id,{id:row.id,localSaved:row.localSaved,bytes:row.byteLength});resolve([...rows.values()]);db.close()}}}))
const unloadBlocked=()=>page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented})
try{
 // Format is optional; preserve defaults and keep dismissal/focus predictable.
 await fresh()
 const format=()=>page.getByRole('button',{name:/^Format,/})
 const formatPanel=()=>page.getByRole('dialog',{name:'Camera format'})
 assert.equal(await format().getAttribute('aria-label'),'Format, 16:9 · Portrait')
 assert.equal(await formatPanel().count(),0)
 await format().focus()
 await page.keyboard.press('Enter')
 await formatPanel().waitFor()
 assert.equal(await formatPanel().getByRole('button',{name:'16:9',exact:true}).getAttribute('aria-pressed'),'true')
 await page.keyboard.press('Escape')
 await formatPanel().waitFor({state:'hidden'})
 assert.equal(await format().evaluate(el=>el===document.activeElement),true)
 await format().click()
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await formatPanel().waitFor({state:'hidden'})
 await format().click()
 await formatPanel().getByRole('button',{name:'4:3',exact:true}).click()
 await formatPanel().waitFor({state:'hidden'})
 assert.equal(await format().getAttribute('aria-label'),'Format, 4:3 · Portrait')
 await format().click()
 await formatPanel().getByRole('button',{name:'Landscape',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Take photo"]').disabled)
 assert.equal(await format().getAttribute('aria-label'),'Format, 4:3 · Landscape')
 await format().click()
 await formatPanel().getByRole('button',{name:'1:1',exact:true}).click()
 await format().click()
 assert.equal(await formatPanel().getByRole('group',{name:'Orientation'}).count(),0)
 await page.mouse.click(5,200)
 await formatPanel().waitFor({state:'hidden'})
 await format().click()
 await formatPanel().getByRole('button',{name:'16:9',exact:true}).click()
 assert.equal(await format().getAttribute('aria-label'),'Format, 16:9 · Landscape')
 for(const [width,height] of [[320,568],[844,390]]){
  await page.setViewportSize({width,height})
  await page.evaluate(()=>document.documentElement.style.fontSize='24px')
  await format().click()
  await bounds(formatPanel())
  assert.equal(await formatPanel().getByRole('button').evaluateAll(buttons=>buttons.every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44})),true)
  await page.screenshot({path:path.join(screenshotDir,'format-open-'+width+'-large.png')})
  await page.getByRole('button',{name:'Done',exact:true}).click()
 }
 console.log('PASS optional Format, unchanged defaults, selected values, orientation preservation, 44px targets, keyboard/Escape/Done/outside dismissal and bounded enlarged-text popover')
 await fresh()
 await format().click()
 await formatPanel().getByRole('button',{name:'1:1',exact:true}).click()
 await page.getByRole('button',{name:'2x',exact:true}).click()
 const livePreview=page.locator('video').first()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Take photo"]').disabled)
 assert.equal(await page.evaluate(()=>window.profileConstraints.some(value=>value.advanced?.some(item=>item.zoom===2))),true)
 await page.getByRole('button',{name:'video',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Record video"]').disabled)
 assert.equal(await livePreview.evaluate(el=>getComputedStyle(el).objectFit),'contain')
 // CSS transforms animate, so inspect the target style rather than an intermediate matrix.
 assert.equal(await livePreview.evaluate(el=>el.style.transform),'')
 assert.equal(await livePreview.evaluate(el=>getComputedStyle(el.nextElementSibling).display),'none')
 assert.equal(await format().getAttribute('aria-label'),'Format, Portrait')
 assert.equal(await page.evaluate(()=>window.profileConstraints.some(c=>c.width?.ideal===1080&&c.height?.ideal===1920)),true,'Missing capability metadata must still request portrait')
 await page.evaluate(()=>{window.fixtureSettings={width:1920,height:1080,frameRate:30};window.syncFixtureDimensions()})
 await page.getByRole('button',{name:'Format, Portrait unavailable',exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Record video',exact:true}).isDisabled(),true,'Wide delivered frames must not be labelled or recorded as portrait')
 await page.evaluate(()=>{window.fixtureSettings={width:1080,height:1920,frameRate:30};window.syncFixtureDimensions()})
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Record video"]').disabled)
 assert.equal(await format().getAttribute('aria-label'),'Format, Portrait')
 await page.getByRole('button',{name:'2x',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Record video"]').disabled)
 assert.equal(await format().getAttribute('aria-label'),'Format, Portrait','Video zoom must restart settled orientation verification')
 await format().click()
 assert.equal(await formatPanel().getByRole('group',{name:'Aspect ratio'}).count(),0)
 assert.equal(await formatPanel().getByRole('group',{name:'Orientation'}).count(),1)
 await formatPanel().getByRole('button',{name:'Landscape',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Record video"]').disabled)
 for(const [width,height,enlarged] of [[320,568,false],[390,844,false],[844,390,false],[390,844,true],[844,390,true]]){
  await page.setViewportSize({width,height})
  await page.evaluate(enlarged=>document.documentElement.style.fontSize=enlarged?'24px':'16px',enlarged)
  await page.screenshot({path:path.join(screenshotDir,'video-actual-preview-'+width+(enlarged?'-large':'')+'.png')})
 }
 await page.getByRole('button',{name:'photo',exact:true}).click()
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Take photo"]').disabled)
 assert.equal(await format().getAttribute('aria-label'),'Format, 1:1')
 assert.equal(await livePreview.evaluate(el=>getComputedStyle(el).objectFit),'cover')
 assert.equal(await livePreview.evaluate(el=>getComputedStyle(el.nextElementSibling).display),'flex')
 await format().click()
 assert.equal(await formatPanel().getByRole('button',{name:'1:1',exact:true}).getAttribute('aria-pressed'),'true')
 await page.getByRole('button',{name:'Done',exact:true}).click()
 console.log('PASS video contain/no CSS zoom/no still crop frame, orientation-only Format and restored stored photo ratio')
 // Desktop Chromium reports zero safe-area insets. Substitute representative
 // landscape values in rendered CSS only; application source stays unchanged.
 await fresh()
 await page.setViewportSize({width:844,height:390})
 await page.evaluate(()=>{
  const replace=value=>value.replace(/env\(safe-area-inset-(left|right|top|bottom),\s*0px\)/g,(_,edge)=>({left:'44px',right:'44px',top:'0px',bottom:'21px'}[edge]))
  for(const style of document.querySelectorAll('style'))style.textContent=replace(style.textContent)
  for(const el of document.querySelectorAll('[style]'))el.setAttribute('style',replace(el.getAttribute('style')))
 })
 const insetViolations=await page.locator('.camera-topbar button,.camera-dock button').evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(b).opacity!=='0'&&(r.left<44||r.right>innerWidth-44||r.bottom>innerHeight-21)}).map(b=>({name:b.getAttribute('aria-label')||b.textContent,left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right,bottom:b.getBoundingClientRect().bottom})))
 await page.screenshot({path:path.join(screenshotDir,'camera-side-insets-844.png')})
 await page.evaluate(()=>document.documentElement.style.fontSize='24px')
 insetViolations.push(...await page.locator('.camera-topbar button,.camera-dock button').evaluateAll(buttons=>buttons.filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(b).opacity!=='0'&&(r.left<44||r.right>innerWidth-44||r.bottom>innerHeight-21)}).map(b=>({name:'150% text: '+(b.getAttribute('aria-label')||b.textContent),left:b.getBoundingClientRect().left,right:b.getBoundingClientRect().right,bottom:b.getBoundingClientRect().bottom}))))
 await page.screenshot({path:path.join(screenshotDir,'camera-side-insets-844-large.png')})
 console.log('SIDE INSET CHECK',JSON.stringify(insetViolations))
 assert.equal(await page.locator('.found-camera').evaluate(el=>getComputedStyle(el).fontFamily.includes('system-ui')),true)
 // A held device transaction is never advertised as saved or safe to close.
 await fresh()
 await setOnline(false)
 await page.evaluate(()=>{const q=window.uploadFixtureStatus.deviceQueue,original=q.enqueue.bind(q);q.enqueue=(...args)=>new Promise((resolve,reject)=>{window.finishDeviceSave=()=>{q.enqueue=original;original(...args).then(resolve,reject)}})})
 await page.getByRole('button',{name:'Take photo',exact:true}).click()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saving…'}).waitFor()
 assert.equal(await unloadBlocked(),true)
 assert.equal(await page.evaluate(()=>window.sessions.length),0)
 assert.deepEqual(await persisted(),[])
 await shots('durable-saving')
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.getByRole('dialog').waitFor()
 assert.equal(await page.getByRole('button',{name:'Close anyway'}).count(),0)
 await page.getByRole('button',{name:'Keep camera open'}).click()
 await page.evaluate(()=>window.finishDeviceSave())
 await page.getByRole('status').filter({hasText:'Saved on this device'}).waitFor()
 assert.equal(await unloadBlocked(),false)
 assert.equal((await persisted()).length,1)
 await shots('durable-device-saved',true)
 assert.equal(await page.getByRole('button',{name:/Retry|Try again/}).count(),0)
 await noGlobal()
 // Device-saved captures close freely; provider owns the queue beyond CameraSheet.
 await page.getByRole('button',{name:'Camera',exact:true}).click()
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.waitForFunction(()=>window.fixtureClosed===1)
 assert.equal(await page.getByRole('dialog').count(),0)
 await page.getByRole('complementary',{name:'Upload status'}).filter({hasText:/Saved on this device|waiting to upload/}).waitFor()
 const inlinePosition=await page.getByRole('complementary',{name:'Upload status'}).evaluate(el=>({position:getComputedStyle(el).position,top:el.getBoundingClientRect().top,headerBottom:document.querySelector('header').getBoundingClientRect().bottom}))
 assert.ok(!['fixed','absolute'].includes(inlinePosition.position)&&inlinePosition.top>=inlinePosition.headerBottom,'Status must be inline below the header')
 const acquisitionCount=await page.evaluate(()=>window.mediaRequests)
 await page.getByRole('button',{name:'Review uploads',exact:true}).click()
 await page.locator('.camera-review').waitFor()
 assert.equal(await page.evaluate(()=>window.mediaRequests),acquisitionCount,'Pending review must not acquire camera or microphone')
 await noGlobal()
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await page.evaluate(()=>window.openCamera())
 await page.getByRole('button',{name:'Review captures'}).click()
 await page.getByRole('status').filter({hasText:/Saved on this device|waiting to upload/}).waitFor()
 await page.getByRole('button',{name:'Camera',exact:true}).click()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'1 waiting to upload'}).waitFor()
 assert.doesNotMatch(await page.getByRole('status',{name:'Camera upload status'}).innerText(),/uploaded/)
 await page.getByRole('button',{name:'Review captures'}).click()
 assert.equal(await unloadBlocked(),false)
 console.log('PASS verified local save, close safety, provider lifetime and camera reopen hydration')
 // Reload recovers real IndexedDB bytes, uploads automatically, never uses a new ID.
 const originalId=(await persisted())[0].id
 await page.reload()
 await page.waitForFunction(()=>window.sessions.length===1)
 assert.equal(await page.evaluate(()=>window.sessions[0].options.uploadId),originalId)
 assert.equal(await page.evaluate(()=>window.sessions[0].options.accountId),'account-a')
 assert.equal(await page.evaluate(()=>window.sessions[0].options.companyId),'company-a')
 await page.getByRole('button',{name:'Review captures'}).click()
 await shots('durable-review-uploading',true)
 assert.equal(await page.getByRole('button',{name:/Retry|Try again/}).count(),0)
 assert.equal(await page.getByRole('button',{name:'Delete',exact:true}).isDisabled(),true)
 await page.evaluate(()=>{window.restoredEvents=[];addEventListener('found:photo-uploaded',e=>window.restoredEvents.push(e.detail.photo))})
 await finish()
 await page.getByRole('status').filter({hasText:'Uploaded'}).waitFor()
 assert.deepEqual(await persisted(),[])
 assert.equal(await page.evaluate(()=>window.uploaded.length),0)
 assert.equal(await page.evaluate(()=>window.restoredEvents.length),1)
 assert.equal(await unloadBlocked(),false)
 await shots('durable-uploaded',true)
 await page.getByRole('button',{name:'Camera',exact:true}).click()
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows.length===0)
 console.log('PASS automatic reload recovery, original identity/album, cloud-only cleanup and preview release')
 // A failed local write retains the original and ID, with no persisted claim.
 await fresh()
 await setOnline(false)
 await page.evaluate(()=>{window.failDeviceSave=true;const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(window.failDeviceSave)throw new DOMException('synthetic quota','QuotaExceededError');return put.apply(this,args)}})
 await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Couldn’t save on this device. Keep this camera open.'}).waitFor()
 const failedId=await page.evaluate(()=>window.uploadFixtureStatus.queueRows[0].id)
 assert.equal(await unloadBlocked(),true)
 assert.deepEqual(await persisted(),[])
 assert.equal(await page.evaluate(()=>window.sessions.length),0)
 await page.getByRole('button',{name:'Review captures'}).click()
 await shots('durable-save-failed',true)
 assert.equal(await page.getByRole('button',{name:'Delete',exact:true}).isDisabled(),true)
 await page.getByRole('button',{name:'Camera',exact:true}).click()
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.getByRole('button',{name:'Close anyway'}).waitFor()
 await page.getByRole('button',{name:'Keep camera open'}).click()
 await page.evaluate(()=>window.failDeviceSave=false)
 await page.getByRole('button',{name:'Try saving again'}).click()
 await page.getByRole('status').filter({hasText:'Saved on this device'}).waitFor()
 assert.equal((await persisted())[0].id,failedId)
 assert.equal(await unloadBlocked(),false)
 assert.equal(await page.getByRole('button',{name:'Review photo 1'}).count(),1)
 assert.equal(await page.getByRole('button',{name:'Review photo 2'}).count(),0)
 console.log('PASS quota failure, retained original, close warning and stable device-save retry')
 // Recoverable failure waits automatically; Retry is only an attention fallback.
 await fresh()
 await takePhoto()
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.getByRole('button',{name:'Review captures'}).click()
 await page.evaluate(()=>window.sessions[0].reject(Object.assign(Error('SECRET transport'),{retryable:true,category:'connection'})))
 await page.getByRole('status').filter({hasText:'Saved on this device'}).waitFor()
 assert.equal(await page.getByRole('button',{name:/Retry|Try again/}).count(),0)
 assert.equal((await page.locator('body').innerText()).includes('SECRET'),false)
 await page.waitForFunction(()=>window.sessions.length===2,{},{timeout:10000})
 assert.equal(await page.evaluate(()=>window.sessions.length),2)
 await page.evaluate(()=>window.sessions[1].reject(Object.assign(Error('SECRET validation'),{retryable:false,category:'validation'})))
 await page.getByRole('button',{name:'Retry photo',exact:true}).waitFor()
 await shots('durable-attention',true)
 await page.evaluate(()=>{const b=document.querySelector('[aria-label="Retry photo"]');b.click();b.click()})
 await page.waitForFunction(()=>window.sessions.length===3)
 assert.equal(await page.evaluate(()=>window.sessions.length),3)
 await finish(2)
 await page.getByRole('status').filter({hasText:'Uploaded'}).waitFor()
 assert.equal(await page.evaluate(()=>window.uploaded.length),1)
 assert.equal(await page.getByRole('button',{name:'Retry photo',exact:true}).count(),0)
 console.log('PASS foreground automatic recovery, no normal Retry, fallback single-flight and no raw errors')
 // Known permanent categories are actionable, safe, and never offer a pointless Retry.
 for(const [category,label] of [['auth','Sign in to finish uploading.'],['size','File too large to upload.'],['business','Return to the original business.']]){
  await fresh()
  await takePhoto()
  await page.waitForFunction(()=>window.sessions.length===1)
  await setOnline(false)
  await page.evaluate(category=>window.sessions[0].reject(Object.assign(Error('SECRET permanent detail'),{retryable:false,category})),category)
  await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:label}).waitFor()
  await page.getByRole('button',{name:'Review captures'}).click()
  await page.locator('[data-camera-review-status]').filter({hasText:label}).waitFor()
  assert.equal(await page.getByRole('button',{name:/Retry|Try again/}).count(),0)
  assert.equal((await page.locator('body').innerText()).includes('SECRET'),false)
  assert.equal(await unloadBlocked(),false)
  await noGlobal()
  await shots('durable-permanent-'+category,true)
 }
 // Context auth/business errors remain visible instead of an unqualified Saved label.
 for(const business of [false,true]){
  await fresh()
  await setOnline(false)
  await takePhoto()
  await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
  await page.evaluate(business=>{if(business)window.fixtureScope={accountId:'account-a',companyId:'another-business'};else window.contextFailure={retryable:false,category:'auth'}},business)
  await setOnline(true)
  const label=business?'Return to the original business.':'Sign in to finish uploading.'
  await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:label}).waitFor()
  await page.getByRole('button',{name:'Review captures'}).click()
  await page.locator('[data-camera-review-status]').filter({hasText:label}).waitFor()
  assert.equal(await page.getByRole('button',{name:/Retry|Try again/}).count(),0)
  assert.equal(await page.evaluate(()=>window.sessions.length),0)
  await noGlobal()
  await shots(business?'durable-queue-business':'durable-queue-auth',true)
  await page.getByRole('button',{name:'Camera',exact:true}).click()
  await page.getByRole('button',{name:'Close camera'}).click()
  await page.getByRole('complementary',{name:'Upload status'}).filter({hasText:label}).waitFor()
  assert.equal((await page.locator('body').innerText()).includes('SECRET'),false)
 }
 console.log('PASS permanent auth/size/business labels without Retry and visible queue-level auth/business guidance')
 // Video bytes survive recorder finalization; device save and cloud status remain distinct.
 await fresh()
 await setOnline(false)
 await page.getByRole('button',{name:'video',exact:true}).click()
 await page.evaluate(()=>window.deferRecording=true)
 await page.getByRole('button',{name:'Record video',exact:true}).click()
 await page.getByRole('button',{name:'Stop recording',exact:true}).click()
  assert.equal(await page.getByRole('button',{name:'Record video',exact:true}).isDisabled(),true,'Finalizing video visibly blocks a second recording')
  await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Finishing video…'}).waitFor()
 assert.equal(await page.evaluate(()=>window.recorders.length),1)
 assert.equal(await unloadBlocked(),true)
 await page.evaluate(()=>window.finishRecording())
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 assert.equal((await persisted())[0].bytes,await page.evaluate(()=>window.fixtureVideoBlob.size))
 assert.equal(await unloadBlocked(),false)
 await shots('durable-video-device-saved')
 await setOnline(true)
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Uploading video'}).waitFor()
 await shots('durable-video-uploading')
 // Inject transient progress into the real queue snapshot, then emit through its public API.
 const progress=async(value)=>page.evaluate(value=>{window.sessions[0].options.onProgress(value)},value)
 await progress({bytesUploaded:42,bytesTotal:100,stage:'transferring'})
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Uploading video · 42%'}).waitFor()
 await page.getByRole('button',{name:'Review captures'}).click()
 await page.locator('[data-camera-review-status]').filter({hasText:'Uploading video · 42%'}).waitFor()
 await progress({bytesUploaded:100,bytesTotal:100,stage:'finalizing'})
 await page.locator('[data-camera-review-status]').filter({hasText:'Finishing upload…'}).waitFor()
 assert.equal(await page.getByRole('status').filter({hasText:/^Uploaded$/}).count(),0)
 await shots('durable-video-finalizing',true)
 await page.getByRole('button',{name:'Camera',exact:true}).click()

 await page.getByRole('button',{name:'Record video',exact:true}).click()
 assert.equal(await page.evaluate(()=>window.recorders.length),2)
 // Legacy mixed counts stay independent and compact.
 await page.evaluate(()=>{window.uploadFixtureStatus.start(3);window.uploadFixtureStatus.complete(false,'raw detail');window.uploadFixtureStatus.complete(true)})
 await noGlobal()
 await page.getByRole('button',{name:'Stop recording',exact:true}).click()
 await page.evaluate(()=>window.finishRecording())
 await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows.length===2&&window.uploadFixtureStatus.queueRows.every(row=>row.localSaved))
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.getByRole('complementary',{name:'Upload status'}).filter({hasText:/uploading|not confirmed/}).waitFor()
 assert.doesNotMatch(await page.getByRole('complementary',{name:'Upload status'}).innerText(),/added|uploaded/)
 await bounds(page.getByRole('complementary',{name:'Upload status'}))
 assert.equal(await page.getByRole('button',{name:/Hide|Dismiss/}).count(),0)
 // Provider safely resumes without a camera at all.
 await fresh()
 await setOnline(false)
 await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 await page.getByRole('button',{name:'Close camera'}).click()
 await setOnline(true)
 await page.waitForFunction(()=>window.sessions.length===1)
 await finish()
 await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows.length===0)
 assert.deepEqual(await persisted(),[])
 await page.goto(url+'?denied')
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/blocked|denied/)
 await page.goto(url+'?device')
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/couldn’t start/)
 assert.equal((await page.getByRole('alert').innerText()).includes('Allow'),false)
 // Scope changes never hydrate another account's originals into the new camera.
 await fresh()
 await setOnline(false)
 await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 const scopedId=(await persisted())[0].id
 await page.evaluate(()=>window.render({accountId:'account-b',companyId:'company-b'}))
 await page.waitForFunction(()=>window.uploadFixtureStatus.accountId==='account-b'&&window.uploadFixtureStatus.queueReady)
 assert.equal(await page.evaluate(()=>window.uploadFixtureStatus.queueRows.length),0)
 assert.equal(await page.getByRole('status',{name:'Camera upload status'}).count(),0)
 assert.equal((await persisted())[0].id,scopedId)
 await page.evaluate(()=>window.render({accountId:null,companyId:null}))
 await page.waitForFunction(()=>window.uploadFixtureStatus.accountId===null)
 await page.getByRole('button',{name:'Take photo',exact:true}).click()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Couldn’t save on this device. Keep this camera open.'}).waitFor()
 assert.equal(await unloadBlocked(),true)
 assert.equal(await page.evaluate(()=>window.uploadFixtureStatus.deviceQueue),null)

 console.log('PASS video finalization, scoped global/legacy status and camera-free recovery')
 // Terminal uploaded rows can arrive before a review-only camera hydrates.
 await fresh();await setOnline(false);await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 const terminalId=(await persisted())[0].id
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.evaluate(()=>window.releaseTestPresentation=window.uploadFixtureStatus.registerCameraPresentation())
 await setOnline(true);await page.waitForFunction(()=>window.sessions.length===1);await finish()
 await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows[0]?.state==='uploaded')
 const terminalAcquisitions=await page.evaluate(()=>window.mediaRequests)
 await page.evaluate(id=>window.openReviewCamera(id),terminalId)
 await page.getByRole('status').filter({hasText:'This upload is no longer pending.'}).waitFor()
 assert.equal(await page.evaluate(()=>window.mediaRequests),terminalAcquisitions)
 assert.equal(await page.getByText('Loading uploads…',{exact:true}).count(),0)
 await page.getByRole('button',{name:'Done',exact:true}).click()
 await page.evaluate(()=>window.releaseTestPresentation())
 // Selection follows a stable ID, not an array index when another capture arrives.
 await fresh();await setOnline(false);await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 await page.getByRole('button',{name:'Review captures'}).click()
 const selectedPreview=await page.locator('.camera-review-preview img').getAttribute('src')
 await page.evaluate(async()=>window.uploadFixtureStatus.deviceQueue.enqueue(await window.fixtureVideoReady,{fileName:'video-newer.webm'}))
 await page.waitForFunction(()=>window.uploadFixtureStatus.queueRows.length===2)
 await page.waitForFunction(()=>document.querySelectorAll('.picker-scroll button').length===2)
 assert.equal(await page.locator('.camera-review-preview img').getAttribute('src'),selectedPreview)
 console.log('PASS uploaded-before-hydration terminal handling and stable selected capture through prepend')
 // Reproduce the production error-plus-hydration combination: the Blob is
 // already committed, but a controller-level error exists before review mounts.
 const maintenance=async(error)=>page.evaluate(error=>{const q=window.uploadFixtureStatus.deviceQueue;Object.defineProperty(q,'error',{configurable:true,get:()=>error});q.releaseUploaded()},error)
 await fresh();await setOnline(false);await takePhoto()
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device'}).waitFor()
 const committedBeforeReview=await persisted()
 await maintenance('Device storage couldn’t update. Keep Found open.')
 await page.getByRole('status',{name:'Camera upload status'}).filter({hasText:'Saved on this device · Upload paused.'}).waitFor()
 assert.equal(await page.getByRole('status',{name:'Camera upload status'}).locator('.camera-upload-spinner').count(),0)
 await page.getByRole('button',{name:'Close camera'}).click()
 const requestsBeforeErrorReview=await page.evaluate(()=>window.mediaRequests)
 await page.getByRole('button',{name:'Review uploads',exact:true}).click()
 await page.locator('.camera-review-preview img').waitFor()
 await page.locator('[data-camera-review-status]').filter({hasText:'Saved on this device · Upload paused.'}).waitFor()
 assert.deepEqual(await persisted(),committedBeforeReview)
 assert.equal(await page.evaluate(()=>window.mediaRequests),requestsBeforeErrorReview)
 await noGlobal()
 // A global error must not permanently settle a target that arrives later.
 await fresh();await setOnline(false)
 await page.getByRole('button',{name:'Close camera'}).click()
 await maintenance('Device storage couldn’t update. Keep Found open.')
 const delayedTarget='44444444-4444-4444-a444-444444444444'
 await page.evaluate(id=>window.openReviewCamera(id),delayedTarget)
 await page.getByRole('region',{name:'Upload review'}).getByRole('status').filter({hasText:'Upload paused.'}).waitFor()
 await page.evaluate(async id=>window.uploadFixtureStatus.deviceQueue.enqueue(await new Promise(resolve=>window.fixtureScene.toBlob(resolve,'image/jpeg')),{id,fileName:'photo-late.jpg'}),delayedTarget)
 await page.locator('.camera-review-preview img').waitFor()
 assert.equal((await persisted())[0].id,delayedTarget)
 assert.equal(await page.getByText('This upload is no longer pending.',{exact:true}).count(),0)
 // Changing scope while hydration is unresolved never reveals that late Blob.
 await fresh();await setOnline(false)
 await page.getByRole('button',{name:'Close camera'}).click()
 await maintenance('Device storage couldn’t update. Keep Found open.')
 await page.evaluate(id=>{window.oldQueue=window.uploadFixtureStatus.deviceQueue;window.openReviewCamera(id)},delayedTarget)
 await page.getByRole('region',{name:'Upload review'}).getByRole('status').filter({hasText:'Upload paused.'}).waitFor()
 await page.evaluate(()=>window.render({accountId:'account-b',companyId:'company-b'}))
 await page.waitForFunction(()=>window.uploadFixtureStatus.accountId==='account-b'&&window.uploadFixtureStatus.queueReady)
 await page.evaluate(async id=>window.oldQueue.enqueue(await new Promise(resolve=>window.fixtureScene.toBlob(resolve,'image/jpeg')),{id,fileName:'photo-private.jpg'}),delayedTarget)
 assert.equal(await page.locator('.camera-review-preview img').count(),0)
 assert.equal(await page.evaluate(()=>window.uploadFixtureStatus.queueRows.length),0)
 assert.equal((await persisted())[0].id,delayedTarget)
 console.log('PASS error-present review hydration, late target recovery, scoped isolation and retained originals')
 assert.deepEqual(errors,[])
 assert.deepEqual(insetViolations,[], 'Camera controls must remain inside simulated landscape safe areas')
 console.log('PASS durable queue UI integration: real React + real IndexedDB + mocked transport; 320/390 portrait, 844 landscape, 150% text, transferring/finalizing progress')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
