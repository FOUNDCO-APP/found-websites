import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
function load(file, globals={}) {
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,...globals})
 return module.exports
}
let now=10000; const events=[], listeners=new Map()
const window={dispatchEvent:e=>{events.push(e);listeners.get(e.type)?.(e)},addEventListener:(n,f)=>listeners.set(n,f)}
class CustomEvent { constructor(type,{detail}) { this.type=type;this.detail=detail } }
const globals={window,CustomEvent,Date:{now:()=>now}}
const api=load('src/lib/mediaUploadDiagnostics.ts',globals)
const value={reason:'cycle-cooldown',attempts:1,retryInSeconds:900,category:'connection',ownership:'none'}
const privateFields={id:'PRIVATE',url:'PRIVATE',filename:'PRIVATE',hash:'PRIVATE',accountId:'PRIVATE',message:'PRIVATE',timestamp:12345}
assert.deepEqual(JSON.parse(JSON.stringify(api.sanitizeMediaUploadDiagnostic({...value,...privateFields}))),value)
for(const [key,values] of Object.entries({reason:['PRIVATE',null],attempts:[-1,5,1.5,NaN,Infinity,'1'],retryInSeconds:[-1,1201,0.5,NaN,Infinity,'1'],category:['PRIVATE'],ownership:['PRIVATE']})) {
 for(const bad of values) assert.equal(api.sanitizeMediaUploadDiagnostic({...value,[key]:bad}),null)
}
for(const bad of [null,undefined,{},new Proxy({},{get(){throw Error('PRIVATE')}})]) assert.equal(api.sanitizeMediaUploadDiagnostic(bad),null)
for(const reason of ['capture-backoff','cycle-cooldown','context-backoff','lock-busy','lease-held','storage-paused','authorization','needs-attention','browser-offline','backgrounded']) assert(api.sanitizeMediaUploadDiagnostic({...value,reason,attempts:4,retryInSeconds:1200}))
api.reportMediaUploadDiagnostic({...value,...privateFields});api.reportMediaUploadDiagnostic(value)
assert.equal(events.length,1)
for(let retryInSeconds=899;retryInSeconds>880;retryInSeconds--) api.reportMediaUploadDiagnostic({...value,retryInSeconds})
assert.equal(events.length,1,'countdown ticks must not consume the report budget')
now+=299999;api.reportMediaUploadDiagnostic(value);assert.equal(events.length,1)
now++;api.reportMediaUploadDiagnostic({...value,retryInSeconds:600});assert.equal(events.length,2)
assert.equal(events[1].detail.retryInSeconds,600,'report retains the current countdown')
for(let i=0;i<20;i++){now+=300000;api.reportMediaUploadDiagnostic(value)}
assert.equal(events.length,10)
assert(!JSON.stringify(events).includes('PRIVATE'))
const grouped=[]
const grouping=load('src/lib/mediaUploadDiagnostics.ts',{...globals,window:{dispatchEvent:e=>grouped.push(e)}})
grouping.reportMediaUploadDiagnostic(value)
for(const change of [{reason:'lock-busy'},{attempts:2},{category:'unknown'},{ownership:'other'}]) grouping.reportMediaUploadDiagnostic({...value,...change})
assert.equal(grouped.length,5,'each blocker/attempt/category/ownership change remains observable')
let config;const captures=[]
const storage=load('src/lib/mediaStorageDiagnostics.ts',globals)
load('src/instrumentation-client.ts',{...globals,process:{env:{NODE_ENV:'production'}},require:n=>n==='@sentry/nextjs'?{init:c=>config=c,captureEvent:e=>captures.push(e),captureRouterTransitionStart(){}}:n==='@/lib/mediaUploadDiagnostics'?api:storage})
window.dispatchEvent(new CustomEvent(api.MEDIA_UPLOAD_DIAGNOSTIC_EVENT,{detail:{...value,...privateFields}}))
assert.equal(captures.length,1)
const polluted={...captures[0],message:'PRIVATE',request:privateFields,user:privateFields,extra:privateFields,breadcrumbs:[privateFields],exception:privateFields,contexts:{upload_recovery:{...value,...privateFields},other:privateFields},tags:{...captures[0].tags,other:'PRIVATE'}}
const clean=config.beforeSend(polluted)
assert(!JSON.stringify(clean).includes('PRIVATE'))
assert.deepEqual(JSON.parse(JSON.stringify(clean.contexts)),{upload_recovery:value})
assert.equal(clean.message,'Found upload recovery waiting')
assert.deepEqual(Object.keys(clean).sort(),['contexts','event_id','level','message','platform','tags','timestamp','type'])
assert.equal(config.beforeSend({...polluted,contexts:{upload_recovery:{...value,attempts:5}}}),null)
const normal={message:'ordinary event',user:{id:'test'}};assert.equal(config.beforeSend(normal),normal)
for(const overrides of [{window:undefined},{window:{dispatchEvent(){throw Error('observer')}}},{Date:{now(){throw Error('clock')}}},{CustomEvent:class{constructor(){throw Error('event')}}}]) {
 const broken=load('src/lib/mediaUploadDiagnostics.ts',{...globals,...overrides})
 assert.doesNotThrow(()=>broken.reportMediaUploadDiagnostic(value))
}
load('src/instrumentation-client.ts',{...globals,process:{env:{NODE_ENV:'production'}},require:n=>n==='@sentry/nextjs'?{init(){},captureEvent(){throw Error('observer')},captureRouterTransitionStart(){}}:n==='@/lib/mediaUploadDiagnostics'?api:storage})
assert.doesNotThrow(()=>window.dispatchEvent(new CustomEvent(api.MEDIA_UPLOAD_DIAGNOSTIC_EVENT,{detail:value})))
assert.doesNotThrow(()=>listeners.get(api.MEDIA_UPLOAD_DIAGNOSTIC_EVENT)(Object.defineProperty({},'detail',{get(){throw Error('detail')}})))
console.log('PASS upload diagnostics: whitelist/bounds, privacy reconstruction, dedupe boundary/cap, normal events, SSR and observer/getter/clock/event faults')
