import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file,globals={}){
  const module={exports:{}}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,...globals})
  return module.exports
}
let now=10000;const events=[];const listeners=new Map()
const window={dispatchEvent:e=>{events.push(e);listeners.get(e.type)?.(e)},addEventListener:(name,fn)=>listeners.set(name,fn)}
class CustomEvent{constructor(type,options){this.type=type;this.detail=options.detail}}
const api=load('src/lib/mediaStorageDiagnostics.ts',{window,CustomEvent,Date:{now:()=>now}})
const uploadApi=load('src/lib/mediaUploadDiagnostics.ts',{window,CustomEvent,Date:{now:()=>now}})
const value={operation:'capture-update',category:'quota',errorName:'QuotaExceededError',verifiedOriginal:true}
const privateFields={filename:'PRIVATE.jpg',accountId:'PRIVATE',blob:new Blob(['PRIVATE']),token:'PRIVATE',message:'PRIVATE'}
const clean=api.sanitizeMediaStorageDiagnostic({...value,...privateFields})
assert.deepEqual(JSON.parse(JSON.stringify(clean)),value)
assert(!JSON.stringify(clean).includes('PRIVATE'))
for(const v of [null,{}, {...value,errorName:'PRIVATE'}, {...value,operation:'PRIVATE'}, {...value,category:'PRIVATE'}, {...value,verifiedOriginal:'yes'},Object.defineProperty({},'operation',{get(){throw Error('PRIVATE')}})])assert.equal(api.sanitizeMediaStorageDiagnostic(v),null)
api.reportMediaStorageDiagnostic({...value,...privateFields});api.reportMediaStorageDiagnostic(value)
assert.equal(events.length,1)
now+=5*60_000;api.reportMediaStorageDiagnostic(value);assert.equal(events.length,2)
for(let i=0;i<20;i++){now+=5*60_000;api.reportMediaStorageDiagnostic(value)}
assert.equal(events.length,10)
let config;const captures=[]
load('src/instrumentation-client.ts',{window,process:{env:{NODE_ENV:'production'}},require:name=>name==='@sentry/nextjs'?{init:v=>config=v,captureEvent:v=>captures.push(v),captureRouterTransitionStart(){}}:name==='@/lib/mediaUploadDiagnostics'?uploadApi:api})
window.dispatchEvent(new CustomEvent(api.MEDIA_STORAGE_DIAGNOSTIC_EVENT,{detail:{...value,...privateFields}}))
assert.equal(captures.length,1)
assert(!JSON.stringify(captures).includes('PRIVATE'))
const event={...captures[0],event_id:'event',timestamp:123,message:'PRIVATE',user:{id:'PRIVATE'},request:{url:'PRIVATE'},breadcrumbs:[{data:{token:'PRIVATE'}}],exception:{values:[{stacktrace:'PRIVATE'}]},extra:privateFields,tags:{...captures[0].tags,account:'PRIVATE'},contexts:{...captures[0].contexts,user:privateFields}}
const scrubbed=config.beforeSend(event)
assert(!JSON.stringify(scrubbed).includes('PRIVATE'))
assert.deepEqual(Object.keys(scrubbed).sort(),['contexts','event_id','level','message','platform','tags','timestamp','type'])
assert.equal(config.beforeSend({...event,contexts:{device_storage:{...value,errorName:'PRIVATE'}}}),null)
const unrelated={message:'normal existing application event'};assert.equal(config.beforeSend(unrelated),unrelated)
const broken=load('src/lib/mediaStorageDiagnostics.ts',{CustomEvent,window:{dispatchEvent(){throw Error('observer failed')}},Date:{now:()=>1}})
assert.doesNotThrow(()=>broken.reportMediaStorageDiagnostic(value))
console.log('PASS storage diagnostics whitelist, payload stripping, dedupe/cap, existing-event preservation and noncritical observer failure')
