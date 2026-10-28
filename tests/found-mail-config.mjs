// Synthetic metadata only. No real key/environment/network/provider operations.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const secret='SYNTHETIC_PRIVATE_DO_NOT_RETURN',rootId='11111111-1111-4111-8111-111111111111',hookId='22222222-2222-4222-8222-222222222222'
let checks=0,requests=[],logs=[],envReads=[],timeouts=[],fetchMock
const values={RESEND_API_KEY:secret,FOUND_INBOUND_ENABLED:'false',FOUND_MAIL_SEND_ENABLED:'false'}
const env=new Proxy(values,{get(target,key){envReads.push(String(key));return target[key]}})
function eq(actual,expected,label){assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),label);checks++}
function load(file,extra={}){
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module,exports:module.exports,process:{env},Buffer,URL,Date,TextDecoder,AbortSignal:{timeout(ms){timeouts.push(ms);return AbortSignal.timeout(ms)}},fetch:async(...args)=>{requests.push(args);return fetchMock(...args)},console:{log(...args){logs.push(args)},error(...args){logs.push(args)},warn(...args){logs.push(args)}},require:name=>{
  if(name in extra)return extra[name]
  if(name==='server-only')return {}
  throw Error('Unexpected dependency '+name)
 }})
 return module.exports
}
function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json',...headers}})}
function poison(){return {api_key:secret,signing_secret:secret,secret,headers:{Authorization:'Bearer '+secret},metadata:{password:secret,deep:{token:secret}},html:'PRIVATE_EMAIL_CONTENT',text:'PRIVATE_EMAIL_CONTENT'}}
function fixture(url){
 const path=new URL(url).pathname
 if(path==='/domains')return json({object:'list',has_more:false,data:[{id:rootId,name:'foundco.app',status:'verified',...poison()},{id:'33333333-3333-4333-8333-333333333333',name:'UNRELATED_PRIVATE_DOMAIN.example',...poison()}],...poison()})
 if(path==='/domains/'+rootId)return json({id:rootId,name:'foundco.app',status:'verified',capabilities:{sending:'enabled',receiving:'enabled',...poison()},records:[{record:'SPF',name:'send',type:'TXT',value:'v=spf1 include:amazonses.com ~all',ttl:'Auto',status:'verified',priority:10,...poison()}],...poison()})
 if(path==='/webhooks')return json({object:'list',has_more:false,data:[{id:hookId,endpoint:'https://foundco.app/api/resend/webhook',status:'enabled',events:['email.received','email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained'],...poison()},{id:'44444444-4444-4444-8444-444444444444',endpoint:'https://UNRELATED_PRIVATE_DOMAIN.example/private?token='+secret,status:'enabled',events:['email.received'],...poison()}],...poison()})
 throw Error('Forbidden provider path '+path)
}
function reset(){requests=[];logs=[];envReads=[];timeouts=[];fetchMock=fixture}
function safeOutput(result){const output=JSON.stringify(result);assert.ok(!output.includes(secret),'private nested provider fields must not escape');assert.ok(!output.includes('PRIVATE_EMAIL_CONTENT'),'email content must never escape');assert.ok(!output.includes('UNRELATED_PRIVATE_DOMAIN'),'unrelated provider configuration must not escape');checks+=3;eq(logs.length,0,'provider data/errors are not logged')}
function safeRequests(){assert.ok(requests.length<=3,'bounded request count');checks++;for(const [url,options] of requests){const target=new URL(url);eq(target.origin,'https://api.resend.com','fixed provider origin');assert.ok(['/domains','/domains/'+rootId,'/webhooks'].includes(target.pathname),'only approved metadata paths, never webhook detail');checks++;eq(options.method,'GET','read-only GET');eq(options.redirect,'error','no redirects');eq(options.cache,'no-store','no provider caching');eq(options.headers.Authorization ?? options.headers.authorization,'Bearer '+secret,'key used only in provider request');assert.ok(options.signal,'timeout signal provided');checks++}assert.ok(timeouts.every(ms=>ms>0&&ms<=20000),'bounded per-request timeout');checks++}
async function checkHelper(){
 reset();const api=load('src/lib/admin/mailConfig.ts');eq(envReads.length,0,'module import does not read credential')
 const good=await api.getAdminMailConfig();safeOutput(good);safeRequests();assert.ok(JSON.stringify(good).includes('foundco.app'),'root-domain summary present');checks++
 // No provider call is made without the existing runtime key.
 reset();delete values.RESEND_API_KEY
 const missing=await api.getAdminMailConfig();eq(missing.keyConfigured,false,'missing key is explicit');eq(requests.length,0,'missing key no provider requests');safeOutput(missing);values.RESEND_API_KEY=secret
 for(const status of [401,403,429,500,302]){
  reset();fetchMock=async()=>json({...poison(),message:secret},status,status===302?{Location:'https://evil.example/?key='+secret}:{})
  const result=await api.getAdminMailConfig();safeOutput(result);safeRequests();assert.match(JSON.stringify(result),/cannot_verify/,'provider '+status+' is not readiness');checks++
 }
 reset();fetchMock=async()=>{throw Error(secret+' PRIVATE_EMAIL_CONTENT')}
 const thrown=await api.getAdminMailConfig();safeOutput(thrown);safeRequests();assert.match(JSON.stringify(thrown),/cannot_verify/,'transport failure is not readiness');checks++
 reset();fetchMock=async()=>json({...poison(),data:[],has_more:true})
 const partial=await api.getAdminMailConfig();safeOutput(partial);safeRequests();assert.match(JSON.stringify(partial),/cannot_verify|partial|truncated/,'partial lists cannot mean absent');checks++
 reset();fetchMock=async(url)=>new URL(url).pathname==='/domains'?json({data:[{id:'../../emails?token='+secret,name:'foundco.app'}],has_more:false}):fixture(url)
 const invalidId=await api.getAdminMailConfig();safeOutput(invalidId);safeRequests();assert.ok(!requests.some(([url])=>new URL(url).pathname.startsWith('/domains/')),'invalid domain UUID never interpolated');checks++
 reset();fetchMock=async(url)=>new URL(url).pathname==='/domains'?json({data:[{id:rootId,name:'foundco.app.evil.example'}],has_more:false}):fixture(url)
 const suffix=await api.getAdminMailConfig();safeOutput(suffix);safeRequests();assert.ok(!requests.some(([url])=>new URL(url).pathname.startsWith('/domains/')),'suffix domain cannot be selected');checks++
 reset();fetchMock=async(url)=>new URL(url).pathname==='/webhooks'?json({data:[{id:hookId,endpoint:'https://foundco.app/api/resend/webhook?secret='+secret,status:'enabled',events:['email.received']}],has_more:false}):fixture(url)
 const wrongHook=await api.getAdminMailConfig();safeOutput(wrongHook);safeRequests();assert.ok(!JSON.stringify(wrongHook).includes(secret),'webhook query token never projected');checks++
 let cancels=0
 reset();fetchMock=async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2*1024*1024))},cancel(){cancels++}}),{headers:{'content-type':'application/json'}})
 const oversized=await api.getAdminMailConfig();safeOutput(oversized);safeRequests();assert.ok(cancels>0,'oversized reader canceled');checks++;assert.match(JSON.stringify(oversized),/cannot_verify/,'oversized body is not readiness');checks++
 reset();fetchMock=async(url)=>new URL(url).pathname==='/domains/'+rootId?json({id:rootId,name:'foundco.app',status:secret,capabilities:{sending:secret,receiving:{secret}},records:[{name:'send',type:'TXT',value:secret,record:secret,status:secret,ttl:secret,priority:secret,...poison()}]}):new URL(url).pathname==='/webhooks'?json({has_more:false,data:[{id:hookId,endpoint:'https://foundco.app/api/resend/webhook',status:secret,events:[secret,'email.received'],...poison()}]}):fixture(url)
 const poisonedFields=await api.getAdminMailConfig();safeOutput(poisonedFields);safeRequests();eq(poisonedFields.domain.data.status,'unknown','unknown domain status is not copied');eq(poisonedFields.domain.data.capabilities.sending,'unknown','unknown capability is not copied');eq(poisonedFields.domain.data.records[0].value,null,'private-looking DNS value withheld');eq(poisonedFields.webhook.status,'unknown','unknown webhook status is not copied')
 for(const [value,accepted] of [['receive.forge.rmta.net',true],['receive.forge.rmta.net.',true],['receive-euw1.forge.rmta.net',true],['receive-euw1.forge.rmta.net.',true],['receive.forge.rmta.net.evil.example',false],['receive.forge.rmta.net.evil.example.',false],['receive.forge-rmta.net',false],['https://receive.forge.rmta.net',false]]){
  reset();fetchMock=async(url)=>new URL(url).pathname==='/domains/'+rootId?json({id:rootId,name:'foundco.app',status:'verified',capabilities:{receiving:'enabled',sending:'enabled'},records:[{name:'@',type:'MX',record:'Receiving',value,status:'verified',ttl:'Auto',priority:10}]}):fixture(url)
  const mx=await api.getAdminMailConfig();safeOutput(mx);safeRequests();eq(mx.domain.data.records[0].value,accepted?value:null,'Forge MX target exact suffix/trailing dot: '+value)
 }
 reset();fetchMock=async()=>new Response('not-json '+secret,{headers:{'content-type':'application/json'}})
 const malformed=await api.getAdminMailConfig();safeOutput(malformed);safeRequests();assert.match(JSON.stringify(malformed),/cannot_verify/,'malformed body is not readiness');checks++
}
async function checkRoute(){
 let authorized=false,helperCalls=0,throwHelper=false
 reset()
 const route=load('src/app/api/admin/mail-config/route.ts',{
  '@/app/admin/lib':{async requireAdmin(){if(!authorized)throw Error('private auth '+secret)}},
  '@/lib/admin/mailConfig':{async getAdminMailConfig(){helperCalls++;if(throwHelper)throw Error(secret+' PRIVATE_EMAIL_CONTENT');return {keyConfigured:true,readiness:'synthetic'}}},
  'next/server':{NextResponse:{json(value,init={}){return new Response(JSON.stringify(value),{status:init.status??200,headers:init.headers})}}}
 })
 function request(query=''){const url=new URL('https://admin.foundco.app/api/admin/mail-config'+query);return {url:url.href,nextUrl:url}}
 let response=await route.GET(request('?url=https://evil.example'))
 eq(response.status,401,'authorization precedes query/provider handling');eq(helperCalls,0,'unauthorized provider not called');eq(envReads.length,0,'unauthorized credential not read');safeOutput(await response.json())
 for(const query of ['?url=https://evil.example','?domain=other.example','?headers=Authorization','?x=']){
  authorized=true;response=await route.GET(request(query));eq(response.status,400,'all query parameters refused');eq(helperCalls,0,'query cannot become provider proxy')
 }
 response=await route.GET(request());eq(response.status,200,'authorized fixed operation');eq(helperCalls,1,'one helper invocation')
 for(const [header,match] of [['cache-control',/no-store/],['vary',/Cookie/i],['x-content-type-options',/nosniff/]]){assert.match(response.headers.get(header)??'',match,'private diagnostic header '+header);checks++}
 throwHelper=true;response=await route.GET(request());eq(response.status,503,'unexpected helper failure is unavailable');safeOutput(await response.json());assert.match(response.headers.get('cache-control')??'',/no-store/);checks++
 eq(logs.length,0,'route never logs raw failures')
}
try{await checkHelper();await checkRoute();console.log(`${checks} narrow mail-config checks passed; fake key, mocked GET metadata only. No live operations.`)}catch(error){console.error(error.stack??error.message);process.exitCode=1}
