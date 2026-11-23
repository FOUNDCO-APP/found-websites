import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
// Actual queue/controller and real browser IndexedDB/Web Locks. Only cloud
// boundaries are synthetic HTTP endpoints; no real accounts or media services.
const code = ts.transpileModule(fs.readFileSync(process.env.FOUND_QUEUE_SOURCE || 'src/lib/deviceUploadQueue.ts','utf8'), { compilerOptions: {
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
} }).outputText
const script = `window.calls=[];window.attemptOptions=[];window.cancelCalls=0;window.capturePuts=0;window.mode='success';window.visibility='visible';window.connected=!location.search.includes('offline');
const originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='captures'||(this.name==='runtime'&&String(args[0]?.key).startsWith('found:media:v1:metadata:')))window.capturePuts++;return originalPut.apply(this,args)};
Object.defineProperty(navigator,'onLine',{get:()=>window.connected});Object.defineProperty(document,'visibilityState',{get:()=>window.visibility});
window.scope={accountId:new URLSearchParams(location.search).get('account')||'account-a',companyId:'company-a'};window.context={...window.scope};window.contextCalls=0;
if(location.search.includes('fallback'))Object.defineProperty(navigator,'locks',{value:undefined});
const helper={readDashboardUploadContext:async()=>{window.contextCalls++;if(window.mode==='hold-context')await new Promise(resolve=>window.releaseContext=resolve);if(window.mode==='context-failure')throw Object.assign(Error('SAFE context unavailable'),{retryable:true});return {...window.context}},createDashboardUploadSession:(blob,options)=>({cancel(){window.cancelCalls++;if(window.mode==='cancel-hold')window.rejectTransfer?.(Object.assign(Error('SAFE cancelled'),{category:'connection',retryable:true}))},run:async()=>{
window.attemptOptions.push(options);
window.calls.push({id:options.uploadId,size:blob.size,type:blob.type});
if(window.mode==='hold')await new Promise(resolve=>window.release=resolve);
if(window.mode==='cancel-hold')await new Promise((resolve,reject)=>{window.release=resolve;window.rejectTransfer=reject});
if(window.mode==='permanent')throw Object.assign(Error('SAFE size error'),{category:'size',retryable:false});
if(window.mode==='auth')throw Object.assign(Error('SAFE sign in again'),{category:'auth',retryable:false});
if(window.mode==='connection')throw Object.assign(Error('SAFE connection error'),{category:'connection',retryable:true});
if(window.mode==='resume-failure'){try{await options.onResumeInfo({version:1,url:'synthetic-resume'})}catch{throw Object.assign(Error('SAFE sanitized callback failure'),{category:'unknown',retryable:false})}}
const existing=await(await fetch('/reconcile?id='+options.uploadId)).json();if(existing.photo)return existing.photo;
const response=await fetch('/upload',{method:'POST',body:JSON.stringify({id:options.uploadId,...window.scope,bytes:[...new Uint8Array(await blob.arrayBuffer())],type:blob.type})});
const result=await response.json();if(window.mode==='lost-response'){window.mode='success';throw Object.assign(Error('SAFE lost response'),{category:'connection',retryable:true})}return result.photo;
}})};
const module={exports:{}},exports=module.exports;function require(name){if(name!=='@/lib/uploadDashboardMedia')throw Error(name);return helper}
${code}
window.api=module.exports;window.queue=window.api.getDeviceUploadQueue(window.scope);window.rows=[];window.queue.subscribe(rows=>window.rows=rows);window.stop=window.queue.start();
window.capture=(type='image/jpeg')=>window.queue.enqueue(new Blob([Uint8Array.from([9,8,7,6])],{type}),{fileName:type.startsWith('video')?'video.mp4':'photo.jpg',albumId:'album-a'});
window.online=value=>{window.connected=value;dispatchEvent(new Event(value?'online':'offline'))};
window.show=value=>{window.visibility=value?'visible':'hidden';document.dispatchEvent(new Event('visibilitychange'))};
window.diskRows=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('found-device-captures-v1');r.onsuccess=()=>{const db=r.result,t=db.transaction(['captures','runtime']),q=t.objectStore('captures').getAll(),v=t.objectStore('runtime').getAll();t.oncomplete=()=>{const rows=new Map(q.result.map(row=>[row.id,row]));for(const meta of v.result.filter(row=>String(row.key).startsWith('found:media:v1:metadata:')&&row.active)){const key='found:media:v1:payload:'+JSON.stringify([meta.accountId,meta.companyId,meta.id]);const payload=v.result.find(row=>row.key===key);rows.set(meta.id,{...meta,blob:new Blob([payload?.bytes||new ArrayBuffer(0)],{type:meta.mimeType})})}resolve([...rows.values()]);db.close()};t.onabort=()=>reject(Error('disk read failed'))}});
window.injectStorageFailure=(target,errorName='InvalidStateError')=>{
 const prototype=target==='capture-read'?IDBIndex.prototype:IDBObjectStore.prototype;
 const method=target==='capture-read'?'getAll':target==='budget-read'?'get':'put';
 const original=prototype[method];
 prototype[method]=function(...args){
  const store=this.objectStore||this;
  const match=target==='capture-read'?store.name==='captures':target==='budget-read'||target==='budget-write'?store.name==='runtime'&&String(typeof args[0]==='string'?args[0]:args[0]?.key).startsWith('['):store.name==='runtime'&&String(args[0]?.key).startsWith('found:media:v1:metadata:')&&args[0]?.state===(target==='waiting-update'?'waiting':'uploading');
  if(match)throw new DOMException('PRIVATE filename account token',errorName);
  return original.apply(this,args);
 };
 window.restoreStorage=()=>prototype[method]=original;
};
`
const remote = new Map(), writes = new Map()
const server = http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost')
  if(url.pathname==='/reconcile'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({photo:remote.get(url.searchParams.get('id'))}));return}
  if(url.pathname==='/upload'){
    let body='';for await(const chunk of req)body+=chunk
    const value=JSON.parse(body);writes.set(value.id,(writes.get(value.id)||0)+1)
    if(!remote.has(value.id))remote.set(value.id,{...value,url:'https://synthetic.invalid/'+value.id,storage_path:value.companyId+'/'+value.id,media_type:value.type.startsWith('video')?'video':'photo'})
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({photo:remote.get(value.id)}));return
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><title>Queue test</title><script>'+script.replace(/<\/script/gi,'<\\/script')+'</script>')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE?{executablePath:process.env.FOUND_BROWSER_EXECUTABLE}:{})})
const base='http://127.0.0.1:'+server.address().port
let groups=0
async function fixture(query='?offline'){
  const context=await browser.newContext(),page=await context.newPage(),errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  await page.goto(base+query);await page.waitForFunction(()=>window.queue.ready)
  return {context,page,errors,async done(){assert.deepEqual(errors,[]);await context.close();groups++}}
}
const CYCLE=900000, BASE=Date.parse('2026-11-23T03:00:00Z');
async function policyFixture(query='?offline'){
 const f=await fixture(query);await f.page.clock.install({time:new Date(BASE)});await f.page.clock.pauseAt(new Date(BASE));return f
}
async function seed(page,values){
 await page.evaluate(async values=>{await new Promise((resolve,reject)=>{const o=indexedDB.open('found-device-captures-v1');o.onsuccess=()=>{const db=o.result,t=db.transaction('runtime','readwrite'),s=t.objectStore('runtime'),r=s.getAll();r.onsuccess=()=>{for(const m of r.result)if(String(m.key).startsWith('found:media:v1:metadata:')&&m.active)s.put({...m,...values})};t.oncomplete=()=>{db.close();resolve()};t.onabort=()=>reject(t.error)}})},values)
}
async function settle(page,ms=100){await page.clock.runFor(ms);await page.waitForTimeout(30)}
async function disk(page){return page.evaluate(async()=>{const r=(await diskRows())[0];return r&&{attempts:r.attempts,first:r.firstAttemptAt,next:r.nextAttemptAt,state:r.state,lease:r.leaseOwner}})}
try {
 for(const attempts of [1,4]){
  const f=await policyFixture();await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts,firstAttemptAt:BASE-7200000,nextAttemptAt:BASE-7100000});
  await f.page.evaluate(()=>online(true));await settle(f.page);
  // Explicit immediate assertion makes old-source negative controls fail quickly.
  const result=await f.page.evaluate(()=>({calls:calls.length,state:rows[0]?.state,attempts:rows[0]?.attempts}));
  assert.equal(result.calls,1,'Aged '+attempts+'-attempt cycle must upload now, without a new 15-minute cooldown');
  await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(result.attempts,1);
  await f.done();console.log('PASS aged '+attempts+'-attempt cycle immediately recovers after hours away')
 }
 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts:4,firstAttemptAt:BASE-7200000,nextAttemptAt:BASE+60000});
  await f.page.evaluate(()=>online(true));await settle(f.page);assert.equal(await f.page.evaluate(()=>calls.length),0);
  await f.page.evaluate(()=>{for(let i=0;i<10;i++){online(false);online(true)}});await settle(f.page,59000);assert.equal(await f.page.evaluate(()=>calls.length),0);
  assert.equal((await disk(f.page)).attempts,4);assert.equal((await disk(f.page)).next,BASE+60000);
  await settle(f.page,2000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);
  await f.done();console.log('PASS exhausted aged row honors future deadline, then actually uploads')
 }
 {
  const f=await policyFixture();await f.page.evaluate(async()=>{mode='connection';await capture();online(true)});await settle(f.page);
  await f.page.waitForFunction(()=>rows[0]?.attempts===1&&rows[0]?.state==='waiting');
  const first=(await disk(f.page)).first;
  for(let n=2;n<=4;n++){
   const r=await disk(f.page),now=await f.page.evaluate(()=>Date.now());await settle(f.page,r.next-now+100);
   await f.page.waitForFunction(n=>rows[0]?.attempts===n&&rows[0]?.state==='waiting',n)
  }
  assert.equal(await f.page.evaluate(()=>calls.length),4);
  // The fourth failure directly anchors cooldown. Neither polling nor wake events may
  // erase the four actual attempts or restart this still-live cycle.
  let r=await disk(f.page);await settle(f.page,1000);
  r=await disk(f.page);assert.equal(r.attempts,4);assert.equal(r.first,first);assert.equal(r.next,first+CYCLE);assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic.reason),'cycle-cooldown');
  for(let repeat=0;repeat<3;repeat++){
   await f.page.evaluate(()=>{stop();window.stop=queue.start();for(let i=0;i<8;i++){online(false);online(true)}});await settle(f.page,1000);
   assert.equal(await f.page.evaluate(()=>calls.length),4);assert.equal((await disk(f.page)).attempts,4)
  }
  // A real reload must preserve the budget, not merely an in-memory stop/start.
  await f.page.reload();await f.page.waitForFunction(()=>queue.ready);await f.page.clock.pauseAt(new Date(first+CYCLE-5000));
  await f.page.evaluate(()=>{mode='success';online(true)});await settle(f.page,1000);
  assert.equal(await f.page.evaluate(()=>calls.length),0);assert.equal((await disk(f.page)).attempts,4);
  await settle(f.page,5000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);
  assert.equal(await f.page.evaluate(()=>rows[0].attempts),1);
  await f.done();console.log('PASS four actual attempts per anchored cycle, stop/start/online/reload preserve bounds, successful anchored expiry')
 }
 {
  const f=await policyFixture();await f.page.evaluate(async()=>{mode='context-failure';await capture();online(true)});await settle(f.page);
  for(const delay of [5000,15000,45000])await settle(f.page,delay+100);
  assert.equal(await f.page.evaluate(()=>contextCalls),4);assert.equal(await f.page.evaluate(()=>calls.length),0);
  const budget=await f.page.evaluate(()=>new Promise(resolve=>{const o=indexedDB.open('found-device-captures-v1');o.onsuccess=()=>{const db=o.result,t=db.transaction('runtime'),r=t.objectStore('runtime').get(JSON.stringify([scope.accountId,scope.companyId]));t.oncomplete=()=>{db.close();resolve(r.result)}}}));
  assert.equal(budget.failures,3);assert.ok(budget.notBefore>BASE+CYCLE);
  await f.page.evaluate(async()=>{mode='success';await capture();for(let i=0;i<10;i++){online(false);online(true)}});await settle(f.page,1000);
  assert.equal(await f.page.evaluate(()=>contextCalls),4);assert.equal(await f.page.evaluate(()=>calls.length),0);
  await settle(f.page,budget.notBefore-await f.page.evaluate(()=>Date.now())+100);
  await f.page.waitForFunction(()=>rows.length===2&&rows.every(r=>r.state==='uploaded'));
  assert.equal(await f.page.evaluate(()=>calls.length),2);
  await f.done();console.log('PASS bounded shared context cooldown blocks fresh photo, survives online, exits successfully')
 }
 {
  const f=await policyFixture('?offline&fallback');await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts:1,firstAttemptAt:BASE-7200000,nextAttemptAt:0,leaseOwner:'other-fallback-owner',leaseUntil:BASE+60000,leaseMode:'fallback'});
  await f.page.evaluate(()=>online(true));await settle(f.page,59000);assert.equal(await f.page.evaluate(()=>calls.length),0);assert.equal((await disk(f.page)).lease,'other-fallback-owner');assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic.reason),'lease-held');assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic.ownership),'other');
  await settle(f.page,7000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);
  await f.done();console.log('PASS stale cycle cannot steal fallback lease; expired lease recovers once')
 }

 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());
  assert.deepEqual(await f.page.evaluate(()=>queue.recoveryDiagnostic),{attempts:0,category:'none',ownership:'none',reason:'browser-offline',retryInSeconds:0});
  await f.page.evaluate(()=>{connected=true;visibility='hidden'});assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic.reason),'backgrounded');
  await f.page.evaluate(()=>{visibility='visible';mode='connection';online(true)});await settle(f.page);await f.page.waitForFunction(()=>rows[0]?.state==='waiting');
  let d=await f.page.evaluate(()=>queue.recoveryDiagnostic);assert.equal(d.reason,'capture-backoff');assert.equal(d.category,'connection');assert.equal(d.attempts,1);assert.ok(d.retryInSeconds>0&&d.retryInSeconds<=6);
  assert.deepEqual(Object.keys(d).sort(),['attempts','category','ownership','reason','retryInSeconds']);
  await f.page.evaluate(()=>dispatchEvent(new Event('found:signing-out')));assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic),null);
  await f.done();console.log('PASS recovery diagnostics distinguish offline/background/backoff, expose only safe fields, hide on sign-out')
 }
 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts:99,firstAttemptAt:BASE,nextAttemptAt:BASE+99999999,errorCategory:'PRIVATE filename token',leaseOwner:'PRIVATE other-owner',leaseUntil:BASE+99999999});
  await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1);
  await f.page.evaluate(()=>{connected=true});let d=await f.page.evaluate(()=>queue.recoveryDiagnostic);
  assert.deepEqual(d,{attempts:4,category:'unknown',ownership:'other',reason:'cycle-cooldown',retryInSeconds:1200});assert.doesNotMatch(JSON.stringify(d),/PRIVATE|filename|token|account|company|leaseOwner|firstAttemptAt|nextAttemptAt|blob|fileName/);
  await f.page.evaluate(()=>stop());assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic),null);
  await f.done();console.log('PASS diagnostic values bounded and unknown categories sanitized; stopped queue exposes no diagnostic')
 }
 for(const modeValue of ['context-failure','storage','auth']){
  const f=await policyFixture();await f.page.evaluate(async modeValue=>{await capture();if(modeValue==='storage'){injectStorageFailure('budget-read')}else mode=modeValue;online(true)},modeValue);await settle(f.page);
  await f.page.waitForFunction(()=>queue.error!==null||rows[0]?.state==='needs_attention');
  const d=await f.page.evaluate(()=>queue.recoveryDiagnostic);
  assert.equal(d.reason,modeValue==='storage'?'storage-paused':modeValue==='auth'?'authorization':'context-backoff');
  if(modeValue==='context-failure'){assert.ok(d.retryInSeconds>0&&d.retryInSeconds<=5);assert.equal(d.attempts,0)}
  if(modeValue==='storage')assert.equal(d.category,'storage');if(modeValue==='auth')assert.equal(d.category,'auth');
  await f.done();console.log('PASS diagnostic boundary '+modeValue)
 }

 {
  const f=await policyFixture();await f.page.evaluate(async()=>{const r=await capture();navigator.locks.request('found-upload:'+r.id,async()=>{window.testLockHeld=true;await new Promise(resolve=>window.releaseTestLock=resolve)})});
  await f.page.waitForFunction(()=>window.testLockHeld);await f.page.evaluate(()=>online(true));await settle(f.page);
  assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic.reason),'lock-busy');assert.equal(await f.page.evaluate(()=>calls.length),0);
  await f.page.evaluate(()=>releaseTestLock());await settle(f.page,5100);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic),null);
  await f.done();console.log('PASS real Web Lock contention diagnostic and successful lock-release recovery')
 }
 {
  const f=await policyFixture();await f.page.evaluate(async()=>{await capture();context.accountId='wrong-account';online(true)});await settle(f.page);await f.page.waitForFunction(()=>queue.error!==null);
  assert.equal(await f.page.evaluate(()=>rows.length),0);assert.equal(await f.page.evaluate(()=>queue.recoveryDiagnostic),null);assert.equal(await f.page.evaluate(()=>calls.length),0);
  await f.done();console.log('PASS wrong-account context hides captures and recovery diagnostics')
 }

 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());
  await f.page.evaluate(async()=>{const source=(await diskRows())[0];await new Promise((resolve,reject)=>{const o=indexedDB.open('found-device-captures-v1');o.onsuccess=()=>{const db=o.result,t=db.transaction(['captures','runtime'],'readwrite'),runtime=t.objectStore('runtime');t.objectStore('captures').put({...source,state:'waiting',attempts:4,firstAttemptAt:Date.now()-7200000,nextAttemptAt:Date.now()+60000,resumeInfo:{version:1,url:'synthetic-legacy-resume'}});const keys=runtime.getAllKeys();keys.onsuccess=()=>{for(const key of keys.result)if(String(key).startsWith('found:media:v1:'))runtime.delete(key)};t.oncomplete=()=>{db.close();resolve()};t.onabort=()=>reject(t.error)}})});
  await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1);await f.page.evaluate(()=>online(true));await settle(f.page);
  let r=await disk(f.page);assert.equal(r.attempts,4);assert.equal(r.first,BASE-7200000);assert.equal(r.next,BASE+60000);assert.equal(await f.page.evaluate(()=>calls.length),0);
  await settle(f.page,61000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);assert.deepEqual(await f.page.evaluate(()=>attemptOptions[0].previousResumeInfo),{version:1,url:'synthetic-legacy-resume'});
  await f.done();console.log('PASS legacy Blob conversion preserves latest exhausted budget, future deadline and resume identity before recovery')
 }
 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts:4,firstAttemptAt:null,nextAttemptAt:0});await f.page.evaluate(()=>online(true));await settle(f.page);
  const anchor=await disk(f.page);assert.equal(anchor.attempts,4);assert.ok(anchor.first>=BASE);assert.equal(anchor.next,anchor.first+CYCLE);assert.equal(await f.page.evaluate(()=>calls.length),0);
  for(let i=0;i<3;i++){await f.page.evaluate(()=>{stop();window.stop=queue.start();online(false);online(true)});await settle(f.page,1000);assert.deepEqual(await disk(f.page),anchor)}
  await f.page.evaluate(()=>{mode='success'});await settle(f.page,anchor.next-await f.page.evaluate(()=>Date.now())+100);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);
  await f.done();console.log('PASS exhausted missing-anchor row acquires one durable anchor, wake events cannot postpone expiry forever')
 }

 {
  const f=await policyFixture();await f.page.evaluate(()=>capture());await seed(f.page,{state:'waiting',attempts:0,firstAttemptAt:null,nextAttemptAt:BASE+30000});await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1);await f.page.evaluate(()=>online(true));await settle(f.page);
  const d=await f.page.evaluate(()=>queue.recoveryDiagnostic);assert.equal(d.reason,'cycle-cooldown');assert.equal(d.attempts,0);assert.ok(d.retryInSeconds>0&&d.retryInSeconds<=30);assert.equal(await f.page.evaluate(()=>calls.length),0);
  await settle(f.page,31000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded');assert.equal(await f.page.evaluate(()=>calls.length),1);
  await f.done();console.log('PASS retained legacy cooldown remains accurately classified in final 30 seconds and exits automatically')
 }
 console.log('Passed '+groups+' recovery-policy browser groups')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
