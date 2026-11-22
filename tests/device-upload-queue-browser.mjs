import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import ts from 'typescript'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
// Actual queue/controller and real browser IndexedDB/Web Locks. Only cloud
// boundaries are synthetic HTTP endpoints; no real accounts or media services.
const code = ts.transpileModule(fs.readFileSync('src/lib/deviceUploadQueue.ts','utf8'), { compilerOptions: {
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
} }).outputText
const script = `window.calls=[];window.attemptOptions=[];window.cancelCalls=0;window.capturePuts=0;window.mode='success';window.visibility='visible';window.connected=!location.search.includes('offline');
const originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='captures')window.capturePuts++;return originalPut.apply(this,args)};
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
window.diskRows=()=>new Promise((resolve,reject)=>{const r=indexedDB.open('found-device-captures-v1');r.onsuccess=()=>{const db=r.result,t=db.transaction('captures'),q=t.objectStore('captures').getAll();t.oncomplete=()=>{resolve(q.result);db.close()};t.onabort=()=>reject(Error('disk read failed'))}});
window.injectStorageFailure=(target,errorName='InvalidStateError')=>{
 const prototype=target==='capture-read'?IDBIndex.prototype:IDBObjectStore.prototype;
 const method=target==='capture-read'?'getAll':target==='budget-read'?'get':'put';
 const original=prototype[method];
 prototype[method]=function(...args){
  const store=this.objectStore||this;
  const match=target==='capture-read'?store.name==='captures':target==='budget-read'||target==='budget-write'?store.name==='runtime':store.name==='captures'&&args[0]?.state===(target==='waiting-update'?'waiting':'uploading');
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
try{
  {
    const f=await fixture();const id=await f.page.evaluate(async()=>{const row=await capture('video/mp4');return row.id})
    assert.equal(await f.page.evaluate(()=>calls.length),0)
    assert.deepEqual(await f.page.evaluate(async()=>{const [r]=await diskRows();return {id:r.id,bytes:[...new Uint8Array(await r.blob.arrayBuffer())],mime:r.mimeType,local:r.localSaved}}),{id,bytes:[9,8,7,6],mime:'video/mp4',local:true})
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1)
    assert.equal(await f.page.evaluate(()=>rows[0].id),id)
    await f.page.evaluate(()=>online(true));await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),0);assert.equal(writes.get(id),1)
    assert.deepEqual(remote.get(id).bytes,[9,8,7,6]);await f.done();console.log('PASS real disk commit, reload and automatic video recovery')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>capture())
    await f.page.goto(base+'?offline&account=account-b');await f.page.waitForFunction(()=>queue.ready)
    assert.equal(await f.page.evaluate(()=>rows.length),0)
    await f.page.goto(base+'?offline');await f.page.waitForFunction(()=>queue.ready&&rows.length===1)
    await f.page.evaluate(()=>{window.context.accountId='account-b';online(true)})
    await f.page.waitForFunction(()=>queue.error!==null)
    assert.equal(await f.page.evaluate(()=>calls.length),0);assert.equal(await f.page.evaluate(()=>rows.length),0)
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),1);await f.done();console.log('PASS account filtering and stale-account fail closed')
  }
  {
    const f=await fixture();await f.page.clock.install();await f.page.evaluate(()=>{mode='lost-response'})
    const id=await f.page.evaluate(async()=>{const row=await capture();online(true);return row.id})
    await f.page.waitForFunction(()=>rows[0]?.state==='waiting')
    await f.page.clock.fastForward(7000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(writes.get(id),1);assert.equal(await f.page.evaluate(()=>calls.length),2)
    await f.done();console.log('PASS automatic reconciliation after lost cloud confirmation')
  }
  {
    const f=await fixture();await f.page.clock.install();await f.page.evaluate(()=>{mode='permanent'})
    await f.page.evaluate(async()=>{await capture();online(true)})
    await f.page.waitForFunction(()=>rows[0]?.state==='needs_attention')
    await f.page.evaluate(()=>{for(let i=0;i<8;i++){online(false);online(true)}})
    await f.page.clock.fastForward(120000)
    assert.equal(await f.page.evaluate(()=>calls.length),1);assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),1)
    await f.done();console.log('PASS permanent errors retain originals without retry loop')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>{mode='hold'})
    const id=await f.page.evaluate(async()=>{const row=await capture();online(true);return row.id})
    await f.page.waitForFunction(()=>calls.length===1&&typeof window.release==='function')
    const second=await f.context.newPage();await second.goto(base);await second.waitForFunction(()=>queue.ready)
    await second.waitForTimeout(200);assert.equal(await second.evaluate(()=>calls.length),0)
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    await second.waitForFunction(()=>rows.length===0);assert.equal(writes.get(id),1)
    await f.done();console.log('PASS real cross-tab Web Lock prevents overlapping transfers')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>{const original=IDBObjectStore.prototype.put;window.restorePut=()=>IDBObjectStore.prototype.put=original;IDBObjectStore.prototype.put=function(){throw new DOMException('synthetic quota','QuotaExceededError')}})
    const result=await f.page.evaluate(async()=>{try{await capture();return 'bad'}catch(error){return {name:error.name,saved:error.capture?.localSaved,message:error.message}}})
    assert.equal(result.name,'DeviceStorageError');assert.equal(result.saved,false)
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),0)
    await f.page.evaluate(()=>{restorePut();online(true)});await f.page.waitForTimeout(100)
    assert.equal(await f.page.evaluate(()=>calls.length),0)
    await f.done();console.log('PASS quota failure never claims device save or sends unsaved original')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>capture());await f.page.evaluate(()=>{dispatchEvent(new Event('found:signing-out'));online(true)})
    await f.page.waitForTimeout(100);assert.equal(await f.page.evaluate(()=>calls.length),0)
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),1)
    await f.done();console.log('PASS sign-out pauses without deleting pending originals')
  }
  {
    const f=await fixture();await f.page.clock.install();await f.page.evaluate(()=>{mode='connection'})
    await f.page.evaluate(async()=>{await capture();online(true)})
    for(let attempt=1;attempt<=4;attempt++){
      await f.page.waitForFunction(n=>rows[0]?.attempts===n&&rows[0]?.state==='waiting',attempt)
      if(attempt<4)await f.page.clock.fastForward([7000,17000,47000][attempt-1])
    }
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready)
    await f.page.evaluate(()=>online(true));await f.page.waitForFunction(()=>rows[0]?.attempts===4&&rows[0]?.nextAttemptAt>Date.now())
    await f.page.clock.fastForward(60000)
    await f.page.waitForFunction(()=>rows[0]?.attempts===0&&rows[0]?.nextAttemptAt>Date.now())
    assert.equal(await f.page.evaluate(()=>calls.length),0)
    await f.page.evaluate(()=>{for(let i=0;i<10;i++){online(false);online(true)}})
    await f.page.clock.fastForward(10000);assert.equal(await f.page.evaluate(()=>calls.length),0)
    await f.done();console.log('PASS persisted retry budget/cooldown survives reopening and online events')
  }
  {
    const f=await fixture();await f.page.clock.install()
    await f.page.evaluate(async()=>{await capture();mode='context-failure';online(true)})
    await f.page.waitForFunction(()=>queue.error!==null)
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready)
    await f.page.evaluate(()=>online(true));await f.page.waitForTimeout(100)
    assert.equal(await f.page.evaluate(()=>contextCalls),0)
    await f.page.evaluate(()=>{for(let i=0;i<10;i++){online(false);online(true)}})
    await f.page.clock.fastForward(6000);await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(await f.page.evaluate(()=>calls.length),1)
    await f.done();console.log('PASS context backoff persists across reopening and online events')
  }
  {
    const f=await fixture('?offline&fallback');await f.page.evaluate(async()=>{await capture();mode='auth';online(true)})
    await f.page.waitForFunction(()=>rows[0]?.state==='needs_attention')
    const id=await f.page.evaluate(()=>rows[0].id)
    const second=await f.context.newPage();await second.goto(base+'?offline&fallback');await second.waitForFunction(()=>queue.ready&&rows.length===1)
    await f.page.evaluate(async id=>{mode='hold';await queue.retry(id)},id)
    await f.page.waitForFunction(()=>calls.length===2&&typeof window.release==='function')
    const before=await f.page.evaluate(async()=>(await diskRows())[0])
    await second.evaluate(async id=>{online(true);await queue.retry(id)},id)
    await second.waitForTimeout(200)
    const after=await second.evaluate(async()=>(await diskRows())[0])
    assert.equal(after.leaseOwner,before.leaseOwner);assert.equal(after.leaseUntil,before.leaseUntil)
    assert.equal(after.attempts,before.attempts);assert.equal(after.state,'uploading')
    assert.equal(await second.evaluate(()=>calls.length),0)
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    await second.waitForFunction(()=>rows.length===0)
    assert.equal(writes.get(id),1);await f.done();console.log('PASS fallback lease protects manual retry and auth resumption in another tab')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='hold';await capture();online(true)})
    await f.page.waitForFunction(()=>typeof window.release==='function')
    await f.page.evaluate(()=>dispatchEvent(new Event('found:signing-out')))
    assert.equal(await f.page.evaluate(()=>rows.length),0)
    await f.page.evaluate(()=>release())
    await f.page.waitForFunction(async()=>(await diskRows()).length===0)
    assert.equal(await f.page.evaluate(()=>rows.length),0)
    await f.done();console.log('PASS late cloud completion stays hidden after sign-out')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{await capture();mode='auth';online(true)})
    await f.page.waitForFunction(()=>rows[0]?.state==='needs_attention')
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready)
    await f.page.evaluate(()=>online(true));await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(await f.page.evaluate(()=>calls.length),1)
    await f.done();console.log('PASS original account sign-in recovery resumes auth-paused capture automatically')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{await capture();mode='hold-context';online(true)})
    await f.page.waitForFunction(()=>typeof window.releaseContext==='function')
    await f.page.evaluate(()=>{dispatchEvent(new Event('found:signing-out'));releaseContext()})
    await f.page.waitForTimeout(100)
    assert.equal(await f.page.evaluate(()=>rows.length),0);assert.equal(await f.page.evaluate(()=>calls.length),0)
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),1)
    await f.done();console.log('PASS delayed context response cannot reauthorize after sign-out')
  }
  assert.equal(groups,13,'Preserve all existing queue groups')
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='hold';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>attemptOptions.length===1)
    const expected=await f.page.evaluate(async()=>{
      const o=attemptOptions[0];if(!o.resumable)throw Error('Queue did not opt in');
      const info={version:1,url:'https://fixture.storage.supabase.co/storage/v1/upload/resumable/session',createdAt:Date.now(),endpoint:'https://fixture.storage.supabase.co/storage/v1/upload/resumable',objectPath:scope.companyId+'/'+o.uploadId+'.mp4',bucket:'company-assets',uploadId:o.uploadId,accountId:scope.accountId,companyId:scope.companyId,fileSize:4,contentType:'video/mp4'};
      await o.onResumeInfo(info);return info
    })
    assert.deepEqual(await f.page.evaluate(async()=>(await diskRows())[0].resumeInfo),expected)
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1)
    await f.page.evaluate(()=>{mode='hold';online(true)})
    await f.page.waitForFunction(()=>attemptOptions.length===1)
    assert.deepEqual(await f.page.evaluate(()=>attemptOptions[0].previousResumeInfo),expected)
    assert.deepEqual(await f.page.evaluate(async()=>[...new Uint8Array(await (await diskRows())[0].blob.arrayBuffer())]),[9,8,7,6])
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    await f.done();console.log('PASS resume metadata survives reload and is supplied to fresh attempt')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='hold';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>attemptOptions.length===1)
    const result=await f.page.evaluate(async()=>{
      const before=capturePuts;
      for(let i=0;i<100;i++)attemptOptions[0].onProgress({bytesUploaded:i,bytesTotal:100,stage:'transferring'});
      attemptOptions[0].onProgress({bytesUploaded:100,bytesTotal:100,stage:'finalizing'});
      return {before,after:capturePuts,progress:rows[0].uploadProgress,disk:(await diskRows())[0].uploadProgress}
    })
    assert.equal(result.after,result.before);assert.equal(result.disk,undefined)
    assert.deepEqual(result.progress,{bytesUploaded:100,bytesTotal:100,stage:'finalizing'})
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(await f.page.evaluate(()=>rows[0].uploadProgress),undefined)
    await f.done();console.log('PASS byte progress stays transient without IndexedDB Blob rewrites')
  }
  {
    const f=await fixture('?offline&fallback');await f.page.clock.install()
    await f.page.evaluate(async()=>{mode='connection';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>rows[0]?.state==='waiting'&&rows[0]?.attempts===1)
    await f.page.evaluate(()=>{mode='hold'})
    await f.page.clock.fastForward(7000);await f.page.waitForFunction(()=>attemptOptions.length===2)
    await f.page.evaluate(async()=>{await attemptOptions[1].onResumeInfo({version:1,url:'new-resume'});await attemptOptions[1].onResumeInfo(null)})
    const disk=await f.page.evaluate(async()=>{const r=(await diskRows())[0];return {attempts:r.attempts,state:r.state,resume:r.resumeInfo,lease:!!r.leaseOwner}})
    assert.deepEqual(disk,{attempts:2,state:'uploading',resume:null,lease:true})
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    await f.done();console.log('PASS current attempt resume callbacks preserve retry counter and fallback lease')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='cancel-hold';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>attemptOptions.length===1&&typeof rejectTransfer==='function')
    await f.page.evaluate(()=>dispatchEvent(new Event('found:signing-out')))
    await f.page.waitForFunction(async()=>(await diskRows())[0]?.state==='waiting')
    assert.equal(await f.page.evaluate(()=>cancelCalls),1)
    const result=await f.page.evaluate(async()=>{
      const before=capturePuts;
      attemptOptions[0].onProgress({bytesUploaded:3,bytesTotal:4,stage:'transferring'});
      let rejected=false;try{await attemptOptions[0].onResumeInfo({version:1,url:'late'})}catch{rejected=true}
      return {before,after:capturePuts,rejected,visible:rows.length,disk:(await diskRows()).length}
    })
    assert.equal(result.before,result.after);assert.equal(result.rejected,true)
    assert.equal(result.visible,0);assert.equal(result.disk,1)
    assert.equal(await f.page.evaluate(()=>calls.length),1)
    await f.done();console.log('PASS sign-out cancels active session and late callbacks cannot resurrect captures')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='cancel-hold';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>attemptOptions.length===1&&typeof rejectTransfer==='function')
    await f.page.evaluate(()=>stop())
    await f.page.waitForFunction(async()=>(await diskRows())[0]?.state==='waiting')
    assert.equal(await f.page.evaluate(()=>cancelCalls),1)
    const result=await f.page.evaluate(async()=>{
      const before=capturePuts;
      attemptOptions[0].onProgress({bytesUploaded:4,bytesTotal:4,stage:'finalizing'});
      let rejected=false;try{await attemptOptions[0].onResumeInfo({version:1,url:'late-stop'})}catch{rejected=true}
      const disk=(await diskRows())[0];online(false);online(true);
      return {before,after:capturePuts,rejected,progress:queue.getSnapshot()[0]?.uploadProgress,bytes:[...new Uint8Array(await disk.blob.arrayBuffer())],state:disk.state}
    })
    assert.equal(result.before,result.after);assert.equal(result.rejected,true)
    assert.equal(result.progress,undefined);assert.deepEqual(result.bytes,[9,8,7,6]);assert.equal(result.state,'waiting')
    assert.equal(await f.page.evaluate(()=>calls.length),1)
    await f.done();console.log('PASS last queue consumer stop cancels transfer and preserves originals without late progress')
  }
  for(const target of ['budget-read','budget-write','capture-read','capture-update','waiting-update']){
    const f=await fixture();await f.page.clock.install()
    const id=await f.page.evaluate(async target=>{
      const row=await capture('video/mp4');
      mode=target==='budget-write'?'context-failure':target==='waiting-update'?'connection':'success';
      injectStorageFailure(target);online(true);return row.id
    },target)
    await f.page.waitForFunction(()=>queue.error==='Uploads paused. Device storage needs attention.')
    const state=await f.page.evaluate(()=>({diagnostic:queue.storageDiagnostic,rows:rows.map(r=>({id:r.id,state:r.state,saved:r.localSaved,progress:r.uploadProgress})),calls:calls.length,contexts:contextCalls}))
    assert.equal(state.diagnostic.operation,target==='waiting-update'?'capture-update':target)
    assert.equal(state.diagnostic.errorName,'InvalidStateError')
    assert.equal(state.diagnostic.category,'unavailable');assert.equal(state.diagnostic.verifiedOriginal,true)
    assert.doesNotMatch(JSON.stringify(state.diagnostic),/PRIVATE|account|filename|token/)
    assert.equal(state.rows[0].saved,true);assert.notEqual(state.rows[0].state,'uploading')
    assert.equal(state.rows[0].progress,undefined)
    assert.equal(state.calls,target==='waiting-update'?1:0)
    await f.page.evaluate(()=>{restoreStorage();for(let i=0;i<5;i++){online(false);online(true);show(false);show(true)}})
    await f.page.clock.fastForward(20*60*1000)
    assert.equal(await f.page.evaluate(()=>calls.length),state.calls)
    assert.equal(await f.page.evaluate(()=>contextCalls),state.contexts)
    const disk=await f.page.evaluate(async()=>{const [r]=await diskRows();return {id:r.id,bytes:[...new Uint8Array(await r.blob.arrayBuffer())],attempts:r.attempts,state:r.state}})
    assert.equal(disk.id,id);assert.deepEqual(disk.bytes,[9,8,7,6])
    assert.equal(disk.attempts,target==='waiting-update'?1:0)
    if(target==='waiting-update')assert.equal(disk.state,'uploading','Presentation correction must not rewrite original durable state')
    await f.page.evaluate(()=>dispatchEvent(new Event('found:signing-out')))
    assert.equal(await f.page.evaluate(()=>queue.storageDiagnostic),null)
    assert.equal(await f.page.evaluate(()=>rows.length),0)
    await f.done();console.log('PASS '+target+' failure retains verified originals, pauses spinner truth and blocks automatic retry')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>{
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){if(this.name==='captures')throw new DOMException('PRIVATE filename secret-token','QuotaExceededError');return original.apply(this,args)};
      window.restoreStorage=()=>IDBObjectStore.prototype.put=original;
    })
    const result=await f.page.evaluate(async()=>{try{await capture('video/mp4');return null}catch(error){return {diagnostic:queue.storageDiagnostic,errorDiagnostic:error.diagnostic,saved:error.capture.localSaved,errorJSON:JSON.stringify(error),message:error.message}}})
    assert.equal(result.diagnostic.operation,'initial-write');assert.equal(result.diagnostic.category,'quota')
    assert.equal(result.diagnostic.verifiedOriginal,false);assert.equal(result.saved,false)
    assert.equal(result.diagnostic.errorName,'QuotaExceededError');assert.deepEqual(result.errorDiagnostic,result.diagnostic)
    assert.match(result.message,/Keep Found open/);assert.doesNotMatch(result.errorJSON,/PRIVATE|secret-token|fileName|blob|accountId/)
    await f.page.evaluate(()=>restoreStorage());assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),0)
    assert.equal(await f.page.evaluate(()=>rows[0].localSaved),false);assert.equal(await f.page.evaluate(()=>calls.length),0)
    await f.done();console.log('PASS initial-write quota failure remains unverified with sanitized capture-free diagnostics')
  }
  {
    const f=await fixture();await f.page.evaluate(()=>{
      const original=IDBObjectStore.prototype.get;
      IDBObjectStore.prototype.get=function(...args){if(this.name==='captures')throw new DOMException('PRIVATE filename token','TransactionInactiveError');return original.apply(this,args)};
      window.restoreStorage=()=>IDBObjectStore.prototype.get=original;
    })
    const result=await f.page.evaluate(async()=>{try{await capture();return null}catch(error){return {diagnostic:error.diagnostic,saved:error.capture.localSaved}}})
    assert.equal(result.diagnostic.operation,'initial-write');assert.equal(result.diagnostic.errorName,'TransactionInactiveError')
    assert.equal(result.saved,false);assert.equal(result.diagnostic.verifiedOriginal,false)
    await f.page.evaluate(()=>restoreStorage());assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),0)
    await f.done();console.log('PASS exception inside write-success verification callback aborts commit without uncaught browser error')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{
      await capture('video/mp4');mode='resume-failure';
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){if(this.name==='captures'&&args[0]?.resumeInfo)throw new DOMException('PRIVATE token','InvalidStateError');return original.apply(this,args)};
      window.restoreStorage=()=>IDBObjectStore.prototype.put=original;online(true)
    })
    await f.page.waitForFunction(()=>queue.error==='Uploads paused. Device storage needs attention.')
    const result=await f.page.evaluate(()=>({diagnostic:queue.storageDiagnostic,state:rows[0].state,saved:rows[0].localSaved,calls:calls.length}))
    assert.equal(result.diagnostic.operation,'capture-update');assert.equal(result.diagnostic.verifiedOriginal,true)
    assert.equal(result.diagnostic.errorName,'InvalidStateError');assert.equal(result.state,'waiting');assert.equal(result.saved,true);assert.equal(result.calls,1)
    await f.page.evaluate(()=>restoreStorage())
    assert.deepEqual(await f.page.evaluate(async()=>[...new Uint8Array(await (await diskRows())[0].blob.arrayBuffer())]),[9,8,7,6])
    await f.done();console.log('PASS resume metadata persistence failure survives helper sanitization and pauses verified original honestly')
  }
  for(const fault of ['subscriber','broadcast']){
    const f=await fixture()
    const result=await f.page.evaluate(async fault=>{
      if(fault==='subscriber')queue.subscribe(()=>{throw Error('PRIVATE observer failure')});
      else BroadcastChannel.prototype.postMessage=function(){throw Error('PRIVATE optional notification')};
      window.healthyUpdates=0;queue.subscribe(()=>healthyUpdates++);
      const row=await capture('video/mp4');
      const disk=(await diskRows())[0];
      return {id:row.id,saved:row.localSaved,diagnostic:queue.storageDiagnostic,error:queue.error,updates:healthyUpdates,diskSaved:disk.localSaved,bytes:[...new Uint8Array(await disk.blob.arrayBuffer())]}
    },fault)
    assert.equal(result.saved,true);assert.equal(result.diskSaved,true)
    assert.equal(result.diagnostic,null);assert.equal(result.error,null)
    assert.ok(result.updates>=2);assert.deepEqual(result.bytes,[9,8,7,6])
    await f.page.evaluate(()=>online(true));await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    assert.equal(writes.get(result.id),1)
    assert.equal(await f.page.evaluate(async()=>(await diskRows()).length),0)
    assert.equal(await f.page.evaluate(()=>queue.storageDiagnostic),null)
    await f.done();console.log('PASS throwing '+fault+' cannot reject a verified commit or block healthy observers and upload')
  }
  {
    const f=await fixture();await f.page.evaluate(async()=>{mode='hold';await capture('video/mp4');online(true)})
    await f.page.waitForFunction(()=>calls.length===1&&rows[0]?.state==='uploading')
    await f.page.evaluate(()=>{history.replaceState(null,'','?offline')})
    await f.page.reload();await f.page.waitForFunction(()=>queue.ready&&rows.length===1)
    assert.equal(await f.page.evaluate(()=>rows[0].state),'waiting')
    assert.equal(await f.page.evaluate(()=>calls.length),0)
    assert.equal(await f.page.evaluate(async()=>(await diskRows())[0].state),'uploading')
    await f.page.evaluate(()=>{mode='hold-context';online(true)})
    await f.page.waitForFunction(()=>typeof releaseContext==='function')
    assert.equal(await f.page.evaluate(()=>rows[0].state),'waiting')
    await f.page.evaluate(()=>{mode='hold';releaseContext()})
    await f.page.waitForFunction(()=>calls.length===1&&rows[0]?.state==='uploading')
    await f.page.evaluate(()=>release());await f.page.waitForFunction(()=>rows[0]?.state==='uploaded')
    await f.done();console.log('PASS stale uploading row waits offline and during context check; spinner resumes only for live attempt')
  }
  console.log(`Passed ${groups} durable queue groups using real browser storage; cloud is synthetic.`)
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
