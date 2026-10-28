// In-memory PostgreSQL, actual source/parser, mocked receiving API. No live access.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
const require=createRequire(import.meta.url),ts=require('typescript')
const {PGlite}=require('@electric-sql/pglite')
let checks=0
function check(a,b,label){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);checks++}
const env={RESEND_API_KEY:'synthetic-key',RESEND_WEBHOOK_SECRET:'synthetic-svix',CRON_SECRET:'synthetic-cron'}
let fetchMock=()=>{throw new Error('Real network forbidden')}
function load(file,extra={}){
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},Buffer,AbortSignal,ReadableStream,Date,console:{error(){}},
  fetch:(...args)=>fetchMock(...args),require:name=>{
   if(Object.hasOwn(extra,name))return extra[name]
   if(name==='server-only')return {}
   if(name==='node:crypto')return {randomUUID}
   if(name==='@/lib/mailSafety')return load('src/lib/mailSafety.ts')
   throw new Error(`Unexpected dependency ${name}`)
  }})
 return module.exports
}
const store=load('src/lib/admin/mailStore.ts'),db=new PGlite()
const id1='00000000-0000-4000-8000-000000000001',id2='00000000-0000-4000-8000-000000000002'
const raw=id=>({id,from:'Sender <sender@example.test>',to:['HELLO@foundco.app'],subject:'Synthetic message',text:'A genuine synthetic inquiry for local tests.',
 message_id:'<fixture@example.test>',headers:{'in-reply-to':'<parent@example.test>',references:'<parent@example.test>','authentication-results':'spf=pass; dkim=pass; dmarc=pass'},
 authentication:{spf:'pass',dkim:'pass',dmarc:'pass'},attachments:[{id:'a',filename:'photo.png',content_type:'image/png',size:5}]})
async function rpc(name,args){
 const signatures={found_mail_accept:['p_event_id','p_provider_id'],found_mail_claim:['p_token'],found_mail_complete:['p_id','p_token','p_content'],found_mail_fail:['p_id','p_token'],found_mail_change:['p_id','p_action','p_value']}
 const keys=signatures[name];assert.ok(keys,`Unexpected RPC ${name}`)
 try {const result=await db.query(`select public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) as value`,keys.map(key=>key==='p_content'?JSON.stringify(args[key]):args[key]));return {data:result.rows[0].value,error:null}}
 catch(error){return {data:null,error}}
}
function adminClient({failTable=null,failRpc=null}={}){
 return {rpc:(name,args)=>name===failRpc?Promise.resolve({data:null,error:{message:'private DB error'}}):rpc(name,args),from(table){
  assert.ok(['found_mail_received','found_mail_replies','found_mail_rules'].includes(table))
  let fields='*',count=false,head=false,filters=[],orders=[],start=0,end=null,single=false
  const q={select(value,options={}){fields=value;count=!!options.count;head=!!options.head;return q},
   eq(key,value){filters.push([key,'=',value]);return q},is(key,value){assert.equal(value,null);filters.push([key,'is',null]);return q},
   gte(key,value){filters.push([key,'>=',value]);return q},order(key,options){orders.push([key,options.ascending]);return q},
   range(a,b){start=a;end=b;return q},maybeSingle(){single=true;return q},
   async then(resolve,reject){try{
    if(table===failTable)return resolve({data:null,error:{message:'private DB error'},count:null})
    const args=[],where=filters.map(([key,op,value])=>{assert.match(key,/^[a-z_]+$/);if(op==='is')return `${key} is null`;args.push(value);return `${key}${op}$${args.length}`}).join(' and ')
    const clause=where?' where '+where:''
    const total=count?Number((await db.query(`select count(*) as n from public.${table}${clause}`,args)).rows[0].n):null
    const order=orders.length?' order by '+orders.map(([key,asc])=>`${key} ${asc?'asc':'desc'}`).join(','):''
    const range=end===null?'':` limit ${end-start+1} offset ${start}`
    const data=head?null:(await db.query(`select ${fields} from public.${table}${clause}${order}${range}`,args)).rows
    return resolve({data:single?data?.[0]??null:data,error:null,count:total})
   }catch(error){return reject(error)}}}
  return q
 }}
}
const admin=adminClient()
try{
 await db.exec('create role anon;create role authenticated;create role service_role;grant usage on schema public to service_role;')
 await db.exec(fs.readFileSync('supabase/migrations/20261028000100_found_inbound_mail.sql','utf8'))
 // Compare actual SQL hash expressions across both independently owned migrations.
 // This catches matching-looking advisory locks that use different namespaces.
 const sql001=fs.readFileSync('supabase/migrations/20261028000100_found_inbound_mail.sql','utf8')
 const sql002=fs.readFileSync('supabase/migrations/20261028000200_found_mail_reply_actions.sql','utf8')
 const lockSites=[['found_mail_change',sql001],['found_mail_complete',sql001],['found_mail_save_reply',sql002],['found_mail_claim_reply',sql002]]
 for(const [name,source] of lockSites){
  const body=source.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`,'i'))?.[1]
  assert.ok(body,`Function present: ${name}`)
  const expression=body.match(/hashtextextended\((.+),\s*0\)/)?.[1]
  assert.ok(expression?.includes("'found-mail/sender/'"),`${name} uses shared namespace`);checks++
  const parameterized=expression.replace(/p_content->>'from_address'/g,'$1::text').replace(/coalesce\((?:lock_sender|sender),/g,'coalesce($1::text,')
  for(const sender of ['sender@example.test','Other@Example.test','',null]){
   const actual=(await db.query(`select hashtextextended(${parameterized},0)::text as key`,[sender])).rows[0].key
   const expected=(await db.query("select hashtextextended('found-mail/sender/'||coalesce($1::text,''),0)::text as key",[sender])).rows[0].key
   check(actual,expected,`${name} hashes exactly the same key`)
  }
  const senderPosition=body.indexOf('pg_advisory_xact_lock')
  const parentPosition=name==='found_mail_complete'?body.indexOf('update public.found_mail_received'):body.indexOf('for update')
  check(senderPosition>=0&&senderPosition<parentPosition,true,`${name} acquires sender before parent`)
 }
 for(const table of ['found_mail_received','found_mail_events','found_mail_replies','found_mail_rules']){
  check((await db.query(`select relrowsecurity from pg_class where oid='public.${table}'::regclass`)).rows[0].relrowsecurity,true,'RLS enabled')
  for(const role of ['anon','authenticated'])check((await db.query('select has_table_privilege($1,$2,$3) as ok',[role,'public.'+table,'SELECT,INSERT,UPDATE,DELETE'])).rows[0].ok,false,'no public table access')
 }
 for(const signature of ['found_mail_accept(text,text)','found_mail_claim(uuid)','found_mail_complete(uuid,uuid,jsonb)','found_mail_fail(uuid,uuid)','found_mail_change(uuid,text,text)']){
  const proc=(await db.query('select prosecdef,proconfig from pg_proc where oid=$1::regprocedure',['public.'+signature])).rows[0]
  check(proc.prosecdef,false,'invoker RPC');assert.ok(proc.proconfig.some(x=>x.startsWith('search_path=')));checks++
  for(const role of ['anon','authenticated'])check((await db.query('select has_function_privilege($1,$2,$3) as ok',[role,'public.'+signature,'EXECUTE'])).rows[0].ok,false,'no public RPC execution')
 }
 await db.exec('set role service_role')
 check((await store.acceptReceivedEvent(admin,'event-1',{email_id:id1})).success,true,'durable acceptance')
 check((await store.acceptReceivedEvent(admin,'event-1',{email_id:id1})).success,true,'event replay')
 check((await store.acceptReceivedEvent(admin,'event-2',{email_id:id1})).success,true,'provider replay different event')
 check((await db.query('select count(*)::int as n from found_mail_received')).rows[0].n,1,'provider dedupe')
 check((await db.query('select count(*)::int as n from found_mail_events')).rows[0].n,2,'event dedupe')
 check((await store.acceptReceivedEvent(admin,'event-1',{email_id:id2})).success,false,'event identity mismatch rejected')
 check((await db.query('select count(*)::int as n from found_mail_received')).rows[0].n,1,'conflicting event insert rolled back')
 let inbox=await store.getReceivedMail(admin,{folder:'inbox'})
 check(inbox.total,1,'pending visible');check(inbox.rows[0].processing_state,'pending','no false ready')
 check((await store.getUnreadMailCount(admin)).count,0,'pending not counted before spam classification')
 const rowId=inbox.rows[0].id,lease=randomUUID(),nextLease=randomUUID()
 check((await rpc('found_mail_claim',{p_token:lease})).data.id,rowId,'claim')
 check((await rpc('found_mail_claim',{p_token:nextLease})).data,null,'active lease cannot double claim')
 check((await rpc('found_mail_complete',{p_id:rowId,p_token:nextLease,p_content:{folder:'inbox'}})).data,false,'wrong lease cannot finish')
 await db.exec('reset role')
 await db.query("update found_mail_received set lease_until=now()-interval '1 second' where id=$1",[rowId])
 await db.exec('set role service_role')
 check((await rpc('found_mail_claim',{p_token:nextLease})).data.id,rowId,'expired lease reclaimed')
 check((await rpc('found_mail_fail',{p_id:rowId,p_token:lease})).data,false,'stale worker cannot overwrite reclaimed work')
 check((await rpc('found_mail_fail',{p_id:rowId,p_token:nextLease})).data,true,'failure durable')
 check((await rpc('found_mail_claim',{p_token:randomUUID()})).data,null,'backoff prevents immediate retry')
 await db.exec('reset role');await db.query('update found_mail_received set next_attempt_at=now() where id=$1',[rowId]);await db.exec('set role service_role')
 const processed=await store.processIncomingMail(admin,{get:async id=>raw(id)},1)
 check(processed.processed,1,'actual parser and SQL processor')
 const detail=await store.getReceivedMessage(admin,rowId)
 check(detail.message.processing_state,'ready','retrieved ready')
 check(detail.message.authentication,{spf:'pass',dkim:'pass',dmarc:'pass'},'API evidence persisted')
 check(detail.message.attachments[0].quarantined,true,'attachment metadata stays quarantined')
 check(detail.message.reference_ids,['<parent@example.test>'],'validated references persisted')
 check(detail.message.to_addresses,['hello@foundco.app'],'supported recipient normalized')
 check(detail.replies,[],'no automated replies')
 await store.acceptReceivedEvent(admin,'event-3',{email_id:id2})
 await db.query("insert into found_mail_rules(sender_address,action) values('sender@example.test','block')")
 check((await store.processIncomingMail(admin,{get:async id=>raw(id)},1)).processed,1,'blocked sender processing')
 const spam=await store.getReceivedMail(admin,{folder:'spam'})
 check(spam.total,1,'blocked mail visible in spam');check(spam.rows[0].hard_blocked,true,'hard block persisted')
 check((await store.getUnreadMailCount(admin)).count,1,'spam excluded unread inbox')
 const authFailId=randomUUID();await store.acceptReceivedEvent(admin,'event-auth-fail',{email_id:authFailId})
 await db.query("delete from found_mail_rules where sender_address='sender@example.test'")
 await store.processIncomingMail(admin,{get:async id=>({...raw(id),authentication:{spf:'fail',dkim:'fail',dmarc:'fail'}})},1)
 const authFail=(await db.query('select * from found_mail_received where provider_email_id=$1',[authFailId])).rows[0]
 check(authFail.folder,'spam','API authentication failure overrides forged pass headers')
 check(authFail.hard_blocked,true,'trusted authentication hard block persisted')
 check(authFail.authentication.dmarc,'fail','no authentication proof inferred from message headers')
 check((await store.getUnreadMailCount(admin)).count,1,'authentication spam never inflates unread badge')
 check((await store.getReceivedMail(adminClient({failTable:'found_mail_received'}),{folder:'inbox'})).total,null,'list unavailable not empty count')
 check((await store.getUnreadMailCount(adminClient({failTable:'found_mail_received'}))).count,null,'count error unknown')
 check(typeof(await store.getReceivedMessage(adminClient({failTable:'found_mail_replies'}),rowId)).error,'string','reply load error explicit')
 check((await store.acceptReceivedEvent(adminClient({failRpc:'found_mail_accept'}),'x',{email_id:id1})).success,false,'queue error cannot acknowledge')
 // A failed adapter is retried durably, never recorded ready or sent.
 const id3=randomUUID();await store.acceptReceivedEvent(admin,'event-fail',{email_id:id3})
 check((await store.processIncomingMail(admin,{get:async()=>{throw new Error('provider private secret')}} ,1)).failed,1,'provider failure retained')
 const failed=(await db.query('select * from found_mail_received where provider_email_id=$1',[id3])).rows[0]
 check(failed.processing_state,'failed','failed retrieval exposed');check(failed.last_error.includes('secret'),false,'no provider details serialized')
 await db.exec('reset role')
 await db.query("update found_mail_received set processing_state='processing',attempts=8,lease_until=now()-interval '1 second' where id=$1",[failed.id])
 await db.exec('set role service_role')
 await rpc('found_mail_claim',{p_token:randomUUID()})
 check((await db.query('select processing_state from found_mail_received where id=$1',[failed.id])).rows[0].processing_state,'failed','exhausted stale lease terminalized')
 // Pending rows remain visible, but never notify as ready. Stable 25-row pages.
 for(let i=0;i<30;i++)await db.query("insert into found_mail_received(provider_email_id,received_at) values($1,'2026-01-01T00:00:00Z')",[randomUUID()])
 const firstPage=await store.getReceivedMail(admin,{folder:'inbox',page:1})
 const secondPage=await store.getReceivedMail(admin,{folder:'inbox',page:2})
 check(firstPage.rows.length,25,'received list page size')
 check(firstPage.total,secondPage.total,'folder total stable across pages')
 check(new Set([...firstPage.rows,...secondPage.rows].map(row=>row.id)).size,firstPage.total,'timestamp ties ordered by ID without duplicate pages')
 check((await store.getUnreadMailCount(admin)).count,1,'unretrieved rows remain excluded unread')
 const change=async(id,action,value)=>rpc('found_mail_change',{p_id:id,p_action:action,p_value:value})
 check((await change(rowId,'read','1')).data,true,'read marker locked mutation')
 check((await store.getUnreadMailCount(admin)).count,0,'read removes ready inbox badge')
 await change(rowId,'read','0');check((await store.getUnreadMailCount(admin)).count,1,'explicit unread restores count')
 await change(rowId,'move','spam');check((await store.getUnreadMailCount(admin)).count,0,'manual spam excluded badge')
 await change(rowId,'move','inbox');check((await store.getUnreadMailCount(admin)).count,1,'manual inbox restores badge')
 check(!!(await change(rowId,'move','invalid')).error,true,'invalid folder rejected')
 const pendingId=firstPage.rows.find(row=>row.processing_state==='pending')?.id || secondPage.rows.find(row=>row.processing_state==='pending').id
 check(!!(await change(pendingId,'move','spam')).error,true,'pending move cannot race classification')
 await change(rowId,'rule','block');check((await db.query("select action from found_mail_rules where sender_address='sender@example.test'")).rows[0].action,'block','sender derived from parent not form')
 await change(rowId,'rule','allow');check((await db.query("select action from found_mail_rules where sender_address='sender@example.test'")).rows[0].action,'allow','rule replaced atomically')
 await change(rowId,'rule','clear');check((await db.query('select count(*)::int as n from found_mail_rules')).rows[0].n,0,'explicit rule clear')
 check((await change(failed.id,'retry','')).data,true,'exhausted failed retrieval can be manually queued')
 const reset=(await db.query('select * from found_mail_received where id=$1',[failed.id])).rows[0]
 check(reset.processing_state,'pending','retry retrieval only');check(reset.attempts,0,'manual retry resets retrieval attempts')
 check((await change(rowId,'retry','')).data,null,'ready retrieval never reset')
 await db.query("insert into found_mail_replies(parent_id,body_text,to_address,from_address,subject,status,idempotency_key,lease_until) values($1,'Fixture reply','sender@example.test','hello@foundco.app','Re: Fixture','sending','fixture-inflight',now()+interval '1 hour')",[rowId])
 check(!!(await change(rowId,'move','spam')).error,true,'in-flight reply blocks move')
 check(!!(await change(rowId,'rule','block')).error,true,'in-flight reply blocks sender-rule race')
 await change(rowId,'read','1');check((await db.query('select status from found_mail_replies where parent_id=$1',[rowId])).rows[0].status,'sending','read does not mutate send state')
 await db.query("update found_mail_replies set status='draft' where parent_id=$1",[rowId])

 const evidenceToken=randomUUID()
 for(const [action,value] of [['read','0'],['move','spam'],['rule','block']]){
  await db.query("update found_mail_replies set status='sending',lease_until=now()-interval '1 second',lease_token=$2,provider_email_id=$3,provider_message_id='<evidence@example.test>' where parent_id=$1",[rowId,evidenceToken,id2])
  check((await change(rowId,action,value)).data,true,`expired send permits ${action} recovery`)
  const evidence=(await db.query('select * from found_mail_replies where parent_id=$1',[rowId])).rows[0]
  check(evidence.status,'unconfirmed',`${action} durably reaps expired send`)
  check(evidence.lease_token,evidenceToken,'reaping preserves reconciliation token')
  check(evidence.provider_email_id,id2,'reaping preserves provider ID')
  check(evidence.provider_message_id,'<evidence@example.test>','reaping preserves provider message ID')
 }
 await change(rowId,'move','inbox');await change(rowId,'rule','clear')
 const otherParent=(await db.query("insert into found_mail_received(provider_email_id,from_address,processing_state,read_at) values($1,'sender@example.test','ready',now()) returning id",[randomUUID()])).rows[0].id
 await db.query("insert into found_mail_replies(parent_id,body_text,to_address,from_address,subject,status,idempotency_key,lease_until,lease_token) values($1,'Other parent reply','sender@example.test','hello@foundco.app','Re: Other','sending','fixture-other-parent',now()+interval '1 hour',$2)",[otherParent,evidenceToken])
 check(!!(await change(rowId,'rule','block')).error,true,'sender-wide block rejected during another parent active send')
 check((await db.query("select count(*)::int as n from found_mail_rules where sender_address='sender@example.test'")).rows[0].n,0,'failed sender-wide change leaves rule untouched')
 await db.query("update found_mail_replies set lease_until=now()-interval '1 second' where parent_id=$1",[otherParent])
 check((await change(rowId,'rule','block')).data,true,'sender-wide rule recovers after other parent send expires')
 check((await db.query('select status from found_mail_replies where parent_id=$1',[otherParent])).rows[0].status,'unconfirmed','other parent expired send reaped')
 const completionToken=randomUUID()
 const completionParent=(await db.query("insert into found_mail_received(provider_email_id,processing_state,lease_token,lease_until) values($1,'processing',$2,now()+interval '1 hour') returning id",[randomUUID(),completionToken])).rows[0].id
 const parsed=load('src/lib/mailSafety.ts').parseInboundEmail(raw(id1))
 check((await rpc('found_mail_complete',{p_id:completionParent,p_token:completionToken,p_content:parsed})).data,true,'completion commits against current rule under sender lock')
 const completed=(await db.query('select folder,hard_blocked from found_mail_received where id=$1',[completionParent])).rows[0]
 check(completed,{folder:'spam',hard_blocked:true},'rule changed after parse cannot be bypassed by completion')
 await change(rowId,'rule','clear')
 await db.query("update found_mail_replies set status='sending',lease_until=now()-interval '1 second' where parent_id=$1",[rowId])
 const interrupted=await store.getReceivedMessage(admin,rowId)
 check(interrupted.replies[0].status,'unconfirmed','expired sending projected as uncertain')
 check(interrupted.replies[0].last_error.includes('Reconcile'),true,'interrupted send has review instruction')
 check((await db.query('select status from found_mail_replies where parent_id=$1',[rowId])).rows[0].status,'sending','projection makes no database write or resend')
 await db.query("update found_mail_replies set lease_until=now()+interval '1 hour' where parent_id=$1",[rowId])
 check((await store.getReceivedMessage(admin,rowId)).replies[0].status,'sending','live send lease remains in progress')
 await db.query("update found_mail_replies set status='draft' where parent_id=$1",[rowId])

 const adapter=store.createReceivingAdapter()
 let fetchCalls=0
 fetchMock=async(url,options)=>{fetchCalls++;check(url,`https://api.resend.com/emails/receiving/${id1}?html_format=cid`,'fixed CID endpoint');check(options.redirect,'error','no redirect credential forwarding');check(options.signal.aborted,false,'timeout signal supplied');return new Response(JSON.stringify(raw(id1)))}
 check((await adapter.get(id1)).id,id1,'bounded API payload retrieved')
 await assert.rejects(adapter.get('https://evil.invalid'),/unavailable/);checks++;check(fetchCalls,1,'invalid ID cannot fetch arbitrary URL')
 fetchMock=async()=>new Response('provider-secret',{status:500})
 await assert.rejects(adapter.get(id1),error=>!error.message.includes('secret'));checks++
 let canceled=false
 fetchMock=async()=>new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(2*1024*1024+1))},cancel(){canceled=true}}))
 await assert.rejects(adapter.get(id1),/Could not retrieve/);checks++;check(canceled,true,'oversize streamed body canceled')
 fetchMock=async()=>new Response('{}',{headers:{'content-length':String(2*1024*1024+1)}})
 await assert.rejects(adapter.get(id1),/Could not retrieve/);checks++
 fetchMock=async()=>{throw new Error('aborted private credentials')}
 await assert.rejects(adapter.get(id1),error=>!error.message.includes('credentials'));checks++
 fetchMock=async()=>new Response(JSON.stringify(raw(id2)))
 await assert.rejects(adapter.get(id1),/Could not retrieve/);checks++

 // Actual webhook: signature check precedes inbound gates/queue; outbound untouched.
 let verified=true,event={type:'email.received',data:{email_id:id1}},queueCalls=0,outbound=[],afterTasks=[],backgroundCalls=0
 let receipts=[],receiptFailure=false,outboundFailure=false
 const response={json:(body,opts={})=>({body,status:opts.status??200,headers:opts.headers})}
 const webhook=load('src/app/api/resend/webhook/route.ts',{
  'next/server':{NextResponse:response,after:fn=>afterTasks.push(fn)},svix:{Webhook:class{verify(){if(!verified)throw new Error('invalid');return event}}},
  '@supabase/supabase-js':{createClient:()=>({from:table=>({update:patch=>({eq:async(key,value)=>{outbound.push({table,patch,key,value});return {error:outboundFailure?{message:'private DB failure'}:null}}})})})},
  '@/lib/admin/mailReplies':{recordReplyDelivery:async(_admin,id,status,eventAt)=>{receipts.push({id,status,eventAt});return {success:!receiptFailure,error:receiptFailure?'private failure':null}}},
  '@/lib/admin/mailStore':{acceptReceivedEvent:async(...args)=>{queueCalls++;return store.acceptReceivedEvent(admin,args[1],args[2])},
    createReceivingAdapter:()=>({get:async()=>{throw new Error('No network in fixture')}}),
    processIncomingMail:async(_admin,_adapter,limit)=>{backgroundCalls++;check(limit,1,'immediate work limited to one message');return {processed:0,failed:0,error:null}}},
 })
 const req={text:async()=>JSON.stringify(event),headers:new Headers({'svix-id':'event-1','svix-timestamp':'fixture','svix-signature':'fixture'})}
 verified=false;check((await webhook.POST(req)).status,400,'signature reject');check(queueCalls,0,'no unsigned writes')
 verified=true;check((await webhook.POST(req)).status,503,'receiving default off');check(queueCalls,0,'disabled no queue')
 env.FOUND_INBOUND_ENABLED='true';check((await webhook.POST(req)).status,200,'signed event durably queued')
 check(afterTasks.length,1,'background retrieval registered only after committed acceptance')
 check(backgroundCalls,0,'webhook acknowledgment does not await provider retrieval')
 await afterTasks[0]();check(backgroundCalls,1,'registered post-response attempt')
 event={type:'email.received',data:{email_id:'invalid'}};check((await webhook.POST(req)).status,503,'invalid incoming cannot acknowledge')
 check(afterTasks.length,1,'failed queue write never registers retrieval')
 env.FOUND_INBOUND_ENABLED='false';event={type:'email.delivered',data:{email_id:id1}}
 check((await webhook.POST(req)).status,200,'outbound independent of inbound flag');check(outbound[0].patch.delivery_status,'delivered','existing outbound status preserved')
 check(receipts.length,0,'inbound disabled never calls new receipt table')
 env.FOUND_INBOUND_ENABLED='true'
 for(const [type,status] of [['email.sent','sent'],['email.delivered','delivered'],['email.delivery_delayed','delayed'],['email.bounced','bounced'],['email.complained','complained']]){
  event={type,created_at:'2026-10-28T00:00:00Z',data:{email_id:id1}}
  check((await webhook.POST(req)).status,200,'delivery receipt acknowledged only after persistence')
  check(receipts.at(-1),{id:id1,status,eventAt:'2026-10-28T00:00:00Z'},'all mapped statuses and original event time forwarded')
 }
 receiptFailure=true;check((await webhook.POST(req)).status,503,'receipt persistence failure triggers provider retry')
 receiptFailure=false;outboundFailure=true
 const priorReceiptCount=receipts.length
 check((await webhook.POST(req)).status,503,'existing email log update errors no longer falsely acknowledged')
 check(receipts.length,priorReceiptCount,'failed outbound update cannot masquerade as complete processing')
 outboundFailure=false;env.FOUND_INBOUND_ENABLED='false'
 let workerCalls=0
 const cron=load('src/app/api/cron/found-mail/route.ts',{'next/server':{NextResponse:response},
  '@/lib/supabase/admin':{createAdminClient:()=>admin},'@/lib/admin/mailStore':{processIncomingMail:async()=>{workerCalls++;return {processed:0,failed:0,error:null}}}})
 check((await cron.GET({headers:new Headers()})).status,401,'cron unauthorized')
 check((await cron.GET({headers:new Headers({authorization:'Bearer synthetic-cron'})})).status,503,'cron disabled')
 env.FOUND_INBOUND_ENABLED='true';check((await cron.GET({headers:new Headers({authorization:'Bearer synthetic-cron'})})).status,200,'explicit authorized worker')
 check(workerCalls,1,'no disabled/unauthorized processing')
 // Actual server actions must authorize before reading even a FormData field.
 let authorized=false,createdClients=0,draftCalls=[],sendCalls=[],actionTasks=[],rpcArguments=[]
 const guardedClient={...admin,rpc:async(name,args)=>{rpcArguments.push({name,args});return admin.rpc(name,args)}}
 const guard={requireAdmin:async()=>{if(!authorized)throw new Error('Not authorized')},getAdminClient:()=>{createdClients++;return guardedClient}}
 const actions=load('src/app/admin/emails/received/actions.ts',{
  '../../lib':guard,'next/cache':{revalidatePath(){}},'next/server':{after:fn=>actionTasks.push(fn)},
  '@/lib/admin/mailReplies':{saveManualReplyDraft:async(_admin,input)=>{draftCalls.push(input);return {success:true,replyId:input.replyId}},
    sendSavedReply:async(_admin,input)=>{sendCalls.push(input);return {success:true,state:'accepted'}}},
  '@/lib/admin/mailStore':{createReceivingAdapter:()=>({get:async()=>{throw new Error('No network')}}),processIncomingMail:async(_admin,_adapter,limit)=>{check(limit,1,'manual retry runs only one retrieval');return {processed:0,failed:0,error:null}}},
 })
 for(const name of ['saveReplyDraft','sendManualReply','markMailRead','moveMail','setSenderRule','retryMailRetrieval']){
  await assert.rejects(actions[name]({get(){throw new Error('Form read before auth')}}),/Not authorized/);checks++
 }
 check(createdClients,0,'unauthorized actions never create service client')
 authorized=true;env.FOUND_INBOUND_ENABLED='false'
 const form=(extra={})=>{const data=new FormData();for(const [key,value] of Object.entries({messageId:rowId,...extra}))data.set(key,value);return data}
 for(const name of ['saveReplyDraft','sendManualReply','markMailRead','moveMail','setSenderRule','retryMailRetrieval'])check((await actions[name](form())).success,false,'mutations disabled by default')
 check(createdClients,0,'disabled actions never query data')
 env.FOUND_INBOUND_ENABLED='true'
 check((await actions.saveReplyDraft(form({replyId:id2,body:'Draft only'}))).success,true,'save delegates only draft helper')
 check(draftCalls.length,1,'draft helper called');check(sendCalls.length,0,'save never sends')
 check((await actions.sendManualReply(form({replyId:id2}))).success,false,'separate send flag required')
 env.FOUND_MAIL_SEND_ENABLED='true'
 await actions.sendManualReply(form({replyId:id2,expectedTo:'sender@example.test',expectedVersion:'2026-10-28T00:00:00Z',confirmDifferentRecipient:'1'}))
 check(sendCalls[0].confirmDifferentRecipient,true,'explicit different-recipient consent forwarded')
 check(sendCalls[0].expectedTo,'sender@example.test','displayed recipient forwarded')
 check(sendCalls[0].expectedVersion,'2026-10-28T00:00:00Z','displayed draft version forwarded')
 check((await actions.markMailRead(form({read:'0'}))).success,true,'actual mark action')
 check((await actions.moveMail(form({folder:'spam'}))).success,true,'actual move action')
 check((await actions.setSenderRule(form({rule:'block'}))).success,true,'actual sender rule action')
 const beforeInvalid=rpcArguments.length
 check((await actions.moveMail(form({folder:'other'}))).success,false,'action validates folder')
 check(rpcArguments.length,beforeInvalid,'invalid values do not reach RPC')
 await db.exec('reset role');await db.query("update found_mail_received set processing_state='failed',attempts=8 where id=$1",[failed.id]);await db.exec('set role service_role')
 check((await actions.retryMailRetrieval(form({messageId:failed.id}))).success,true,'retry action queues retrieval')
 check(actionTasks.length,1,'retry registers post-response retrieval only')
 check(sendCalls.length,1,'retry never invokes reply send')
 await actionTasks[0]()
 const unreadRoute=load('src/app/api/admin/mail-unread/route.ts',{'next/server':{NextResponse:response},'@/app/admin/lib':guard,'@/lib/admin/mailStore':store})
 authorized=false;const countBefore=createdClients
 check((await unreadRoute.GET()).status,401,'unread API guarded');check(createdClients,countBefore,'unauthorized unread no client')
 authorized=true;env.FOUND_INBOUND_ENABLED='false';check((await unreadRoute.GET()).status,503,'disabled unread unknown')
 env.FOUND_INBOUND_ENABLED='true';const countResponse=await unreadRoute.GET()
 check(countResponse.status,200,'authorized unread API');check(countResponse.body.count,0,'API counts ready inbox unread only')
 check(countResponse.headers['Cache-Control'],'private, no-store','unread never cached')
 check(countResponse.headers.Vary,'Cookie','unread varies by authenticated cookie')
 check(countResponse.headers['X-Content-Type-Options'],'nosniff','unread content type fixed')
 const render=(type,props)=>({type:typeof type==='string'?type:'component',props})
 const receivedPage=load('src/app/admin/emails/received/page.tsx',{
  '../../lib':guard,'@/lib/admin/mailStore':store,'../MailNavigation':{default:()=>null},'./InboxWorkspace':{default:()=>null},
  'react/jsx-runtime':{jsx:render,jsxs:render},
 }).default
 env.FOUND_INBOUND_ENABLED='false'
 const clientsBeforeDisabledPage=createdClients
 const disabledPage=await receivedPage({searchParams:Promise.resolve({})})
 check(JSON.stringify(disabledPage).includes('not enabled yet'),true,'disabled inbox explicitly not operational')
 check(createdClients,clientsBeforeDisabledPage,'disabled inbox never creates service client or queries database')
 authorized=false
 await assert.rejects(receivedPage({searchParams:Promise.resolve({})}),/Not authorized/);checks++
 authorized=true;env.FOUND_INBOUND_ENABLED='true'
 // Actual middleware: exact admin API exception; ordinary settings protected routing retained.
 const middleware=load('src/middleware.ts',{'next/server':{NextResponse:{next:()=>({kind:'next'}),rewrite:url=>({kind:'rewrite',path:url.pathname}),redirect:()=>({kind:'redirect'})}}}).middleware
 const nextUrl=value=>{const url=new URL(value);url.clone=()=>nextUrl(url.href);return url}
 const request=(host,path)=>({headers:new Headers({host}),nextUrl:nextUrl(`https://${host}${path}`)})
 check((await middleware(request('admin.foundco.app','/api/admin/mail-unread'))).kind,'next','admin unread bypasses /admin rewrite')
 check((await middleware(request('admin.foundco.app','/settings'))).path,'/admin/settings','admin page protection unchanged')
 check((await middleware(request('my.foundco.app','/settings'))).path,'/dashboard/settings','dashboard routing unchanged')
 console.log(`Found mail store: ${checks} checks passed. Synthetic PostgreSQL and mocked APIs only; no live DB/install/sends/network. Multi-session lock scheduling not simulated.`)
}finally{await db.close()}
