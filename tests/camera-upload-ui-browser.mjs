import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

// Real CameraSheet and UploadStatusProvider run in React Chromium with mocked
// camera media and upload sessions. No live services or accounts are used.
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const root = fileURLToPath(new URL('../', import.meta.url))
const modules = [], seen = new Map()
const overrides = {
 '@/components/dashboard/AnnotationEditor': 'exports.__esModule=true;exports.default=()=>null;',
 '@/lib/uploadDashboardMedia': `exports.createDashboardUploadSession=(blob,options)=>{const session={blob,options,runs:0,run(){this.runs++;return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject})}};window.sessions.push(session);return session};`,
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
const script = `const process={env:{NODE_ENV:"production"}};const modules={${modules.join(',')}},cache={};function load(id){if(cache[id])return cache[id].exports;const module=cache[id]={exports:{}};const [fn,deps]=modules[id];fn(name=>load(deps[name]),module,module.exports);return module.exports;}const R=load(${react}),e=R.createElement;window.sessions=[];window.uploaded=[];window.fixtureClosed=0;window.permission=new URLSearchParams(location.search).has('denied')?'denied':'granted';window.mediaError=new URLSearchParams(location.search).has('device')?'NotFoundError':null;window.recorders=[];
Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:window.permission})}});
const track={stop(){},getCapabilities(){return {}}};const stream={getTracks:()=>[track],getVideoTracks:()=>[track]};
Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:async()=>{if(window.mediaError)throw new DOMException('test',window.mediaError);return stream}}});
Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{set(){Object.defineProperty(this,'videoWidth',{value:640,configurable:true});Object.defineProperty(this,'videoHeight',{value:480,configurable:true});queueMicrotask(()=>this.dispatchEvent(new Event('loadedmetadata')))}});
const canvasContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const ctx=canvasContext.apply(this,args);ctx.drawImage=()=>{};return ctx};
class Recorder{static isTypeSupported(){return true}state='inactive';constructor(){window.recorders.push(this)}start(){this.state='recording'}stop(){this.state='inactive';window.finishRecording=()=>{this.ondataavailable({data:new Blob(['original-video'],{type:'video/mp4'})});this.onstop()};if(!window.deferRecording)window.finishRecording()}}
window.MediaRecorder=Recorder;
const root=load(${client}).createRoot(document.getElementById('root'));
function Harness(){const [open,setOpen]=R.useState(true);window.unmountCamera=()=>setOpen(false);window.uploadFixtureStatus=load(${provider}).useUploadStatus();return open?e(load(${camera}).default,{pendingAlbumId:'job-a',onUploaded:photo=>window.uploaded.push(photo),onClose:()=>{window.fixtureClosed++;setOpen(false)}}):null}
window.render=()=>root.render(e(load(${provider}).default,{companyId:'company-a'},e(Harness)));window.render();`
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;background:#080A09}*{box-sizing:border-box}button{font:inherit}button:disabled{opacity:.45}dialog::backdrop{background:#000b}</style><div id="root"></div><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>')})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE ? {executablePath:process.env.FOUND_BROWSER_EXECUTABLE} : {})})
const page=await browser.newPage({viewport:{width:390,height:844}})
page.on('dialog',dialog=>dialog.accept());
const screenshotDir=path.join(root,'.billing-audits/camera-upload');fs.mkdirSync(screenshotDir,{recursive:true});
const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.message)})
const url='http://127.0.0.1:'+server.address().port
const fresh=async()=>{await page.goto(url);await page.getByRole('button',{name:'Take photo',exact:true}).waitFor();await page.waitForFunction(()=>!document.querySelector('button[aria-label="Take photo"]').disabled)}
const finish=async(index=0)=>page.evaluate(i=>window.sessions[i].resolve({id:'photo-'+i,url:'test',storage_path:'test',for_website:false,for_social:false,in_gallery:false,website_section:null,album_id:'job-a',created_at:'test'}),index)
try{
 await fresh()
 await page.getByRole('button',{name:'Take photo',exact:true}).click()
 await page.waitForFunction(()=>window.sessions.length===1)
 assert.equal(await page.evaluate(()=>window.sessions[0].options.companyId),'company-a')
 await page.getByRole('button',{name:'Review captures'}).click()
 assert.equal(await page.getByRole('button',{name:'Delete',exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'Annotate',exact:true}).isDisabled(),true)
 assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented}),true)
 await page.clock.install()
 await page.clock.fastForward(16000)
 await page.getByText('Still uploading. Keep Found open until it finishes.',{exact:true}).waitFor()
 assert.equal(await page.locator('[role="progressbar"]').count(),0)
 await page.evaluate(()=>window.sessions[0].reject(Error('SECRET provider detail')))
 await page.getByRole('button',{name:'Retry photo',exact:true}).first().waitFor()
 assert.equal(await page.getByRole('complementary',{name:'Upload status'}).evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),true)
 await page.screenshot({path:path.join(screenshotDir,'retry-mobile.png')})
 assert.equal((await page.locator('body').innerText()).includes('SECRET'),false)
 assert.equal((await page.locator('body').innerText()).includes('Camera access denied'),false)
 await page.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Retry photo');b.click();b.click()})
 await page.waitForFunction(()=>window.sessions[0].runs===2)
 assert.equal(await page.evaluate(()=>window.sessions.length),1)
 await finish()
 await page.waitForFunction(()=>window.uploaded.length===1)
 assert.equal(await page.getByRole('button',{name:'Retry photo',exact:true}).count(),0)
 assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});dispatchEvent(e);return e.defaultPrevented}),false)
 console.log("PASS retry/slow/mutation guards");
 // Mixed legacy and tracked operations preserve failures and use neutral labels.
 await page.evaluate(()=>{window.uploadFixtureStatus.start(2);window.uploadFixtureStatus.complete(false,'raw detail');window.uploadFixtureStatus.complete(true);window.endVideo=window.uploadFixtureStatus.beginOperation({id:'mixed-video',kind:'video'})})
 await page.getByRole('status').filter({hasText:'Uploading 3 items'}).waitFor()
 await page.evaluate(()=>window.endVideo(true))
 await page.getByRole('status').filter({hasText:'2 added · 1 upload not confirmed'}).waitFor()
 await page.getByRole('button',{name:'Dismiss',exact:true}).click()
 await page.getByRole('button',{name:'Show upload status'}).click()
 await page.getByRole('status').filter({hasText:'1 upload not confirmed'}).waitFor()
 console.log("PASS mixed provider");
 // Active/settled close, session release, and deliberate loss warning.
 await fresh()
 await page.getByRole('button',{name:'Take photo',exact:true}).click()
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.getByRole('button',{name:'Hide status'}).click()
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.getByRole('dialog').waitFor()
 assert.equal(await page.getByRole('button',{name:'Close anyway'}).count(),0)
 await page.getByRole('button',{name:'Keep camera open'}).click()
 await page.evaluate(()=>window.sessions[0].reject(Error('unconfirmed')))
 await page.waitForFunction(()=>document.body.textContent.includes('Upload not confirmed.'))
 await page.getByRole('button',{name:'Camera',exact:true}).click()
 await page.getByRole('button',{name:'Close camera'}).click()
 await page.getByRole('button',{name:'Close anyway'}).click()
 await page.waitForFunction(()=>window.fixtureClosed===1)
 assert.equal(await page.getByRole('button',{name:'Retry photo',exact:true}).count(),0)
 console.log("PASS close/unload");
 // Recorder must retain its chunks while onstop is pending.
 await fresh()
 await page.getByRole('button',{name:'video',exact:true}).click()
 await page.evaluate(()=>window.deferRecording=true)
 await page.getByRole('button',{name:'Record video',exact:true}).click()
 await page.getByRole('button',{name:'Stop recording',exact:true}).click()
 await page.getByRole('button',{name:'Record video',exact:true}).click()
 assert.equal(await page.evaluate(()=>window.recorders.length),1)
 await page.evaluate(()=>window.finishRecording())
 await page.waitForFunction(()=>window.sessions.length===1)
 await page.getByRole('status').filter({hasText:'Uploading video'}).waitFor()
 await page.screenshot({path:path.join(screenshotDir,'pending-video-mobile.png')})
 await page.setViewportSize({width:320,height:568})
 assert.equal(await page.getByRole('complementary',{name:'Upload status'}).evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth}),true)
 await page.screenshot({path:path.join(screenshotDir,'pending-video-320.png')})
 await page.setViewportSize({width:390,height:844})
 assert.equal(await page.evaluate(()=>window.sessions[0].blob.size),14)
 await page.getByRole('button',{name:'Record video',exact:true}).click()
 assert.equal(await page.evaluate(()=>window.recorders.length),2)
 console.log("PASS recorder finalization");
 // Actual permission denial vs unrelated camera startup error.
 await page.goto(url+'?denied')
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/blocked|denied/)
 await page.goto(url+'?device')
 await page.getByRole('alert').waitFor()
 assert.match(await page.getByRole('alert').innerText(),/couldn’t start/)
 assert.equal((await page.getByRole('alert').innerText()).includes('Allow'),false)
 assert.deepEqual(errors,[])
 console.log('PASS: React Chromium camera retry, duplicate taps, media labels, mixed operations, slow guidance, close/unload and recording finalization')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
