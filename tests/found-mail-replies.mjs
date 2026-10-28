// Local-only actual SQL and actual reply orchestration. No credentials or network.
// PGlite serializes connections: double-claim checks do not prove multi-session scheduling.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {randomUUID} from 'node:crypto'
const require=createRequire(import.meta.url), ts=require('typescript'), {PGlite}=require('@electric-sql/pglite')
const db=new PGlite(), env={FOUND_INBOUND_ENABLED:'true',FOUND_MAIL_SEND_ENABLED:'true',RESEND_API_KEY:'synthetic'}
let checks=0, fetchMock=()=>{throw Error('Network forbidden')}
const probes=[]
function eq(a,b,label){assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);checks++}
function load(file,extra={}){
 const module={exports:{}}
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
 {module,exports:module.exports,process:{env},Buffer,URL,AbortSignal,Date,console,fetch:(...args)=>fetchMock(...args),require:name=>{
  if(name in extra)return extra[name]
  if(name==='server-only')return {}
  if(name==='node:crypto')return {randomUUID}
  if(name==='@/lib/mailSafety')return load('src/lib/mailSafety.ts')
  throw Error('Unexpected import '+name)
 }})
 return module.exports
}
const signatures={found_mail_claim_reply_reviewed:['p_id','p_parent_id','p_to','p_from','p_token','p_expected_updated_at'],found_mail_save_reply:['p_parent_id','p_reply_id','p_body','p_to','p_from','p_subject'],found_mail_claim_reply:['p_id','p_parent_id','p_to','p_token','p_expected_updated_at'],found_mail_finish_reply:['p_id','p_token','p_status','p_provider_id','p_error'],found_mail_record_reply_delivery:['p_provider_id','p_status','p_event_at']}
async function rpc(name,args){
 assert.ok(signatures[name],name)
 try {const r=await db.query(`select public.${name}(${signatures[name].map((_,i)=>'$'+(i+1)).join(',')}) as v`,signatures[name].map(k=>args[k]??null));return {data:r.rows[0].v,error:null}}
 catch(error){return {data:null,error}}
}
const parent=randomUUID(), recipient='sender@example.test'
async function thread(){const r=await db.query('select * from found_mail_received where id=$1',[parent]);return {message:r.rows[0],replies:[],error:null}}
const replies=load('src/lib/admin/mailReplies.ts',{'@/lib/admin/mailStore':{getReceivedMessage:thread}})
const admin={rpc,from(){throw Error('Unexpected direct table mutation')}}
async function row(id){return (await db.query('select * from found_mail_replies where id=$1',[id])).rows[0]}
async function save(id=randomUUID(),body='Reviewed synthetic reply'){
 const r=await replies.saveManualReplyDraft(admin,{messageId:parent,replyId:id,body});eq(r.success,true,'draft save');return await row(id)
}
function sendInput(r){return {messageId:parent,replyId:r.id,expectedTo:r.to_address,expectedVersion:new Date(r.updated_at).toISOString(),confirmDifferentRecipient:false}}
async function claim(r,token=randomUUID()){return rpc('found_mail_claim_reply',{p_id:r.id,p_parent_id:parent,p_to:r.to_address,p_token:token,p_expected_updated_at:r.updated_at})}
async function finish(r,token,status,provider=randomUUID()){return rpc('found_mail_finish_reply',{p_id:r.id,p_token:token,p_status:status,p_provider_id:provider,p_error:null})}
async function receipt(id,status,at='2026-10-28T12:00:00Z'){return rpc('found_mail_record_reply_delivery',{p_provider_id:id,p_status:status,p_event_at:at})}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;grant usage on schema public to service_role;
 create table email_log(id uuid default gen_random_uuid(),company_id uuid,lead_id uuid,recipient_email text,recipient_type text,email_type text,subject text,text_body text,success boolean,source text,email_scope text,resend_email_id text,delivery_status text,delivery_status_at timestamptz);
 grant select,insert,update on email_log to service_role;`)
 await db.exec(fs.readFileSync('supabase/migrations/20261028000100_found_inbound_mail.sql','utf8'))
 await db.exec(fs.readFileSync('supabase/migrations/20261028000200_found_mail_reply_actions.sql','utf8'))
 const composeMigrations=fs.readdirSync('supabase/migrations').filter(f=>f.endsWith('_found_mail_compose.sql'))
 assert.equal(composeMigrations.length,1,'one additive compose migration')
 await db.exec(fs.readFileSync('supabase/migrations/'+composeMigrations[0],'utf8'))
 for(const role of ['anon','authenticated']){
  for(const sig of ['found_mail_save_reply(uuid,uuid,text,text,text,text)','found_mail_claim_reply(uuid,uuid,text,uuid,timestamptz)','found_mail_finish_reply(uuid,uuid,text,text,text)','found_mail_record_reply_delivery(text,text,timestamptz)']){
   eq((await db.query("select has_function_privilege($1,$2,'EXECUTE') as ok",[role,'public.'+sig])).rows[0].ok,false,role+' RPC denial')
  }
  await db.exec('set role '+role)
  await assert.rejects(db.query('select * from found_mail_delivery_receipts'),/permission denied/);checks++
  await assert.rejects(db.query('select public.found_mail_claim_reply($1,$2,$3,$4,now())',[randomUUID(),parent,recipient,randomUUID()]),/permission denied/);checks++
  await db.exec('reset role')
 }
 await db.query("insert into found_mail_received(id,provider_email_id,from_address,to_addresses,subject,message_id,reference_ids,processing_state) values($1,$2,$3,array['hello@foundco.app'],'Synthetic','<parent@example.test>',array['<prior@example.test>'],'ready')",[parent,randomUUID(),recipient])
 await db.exec('set role service_role')
 const stable=await save();const edited=await save(stable.id,'Changed reviewed text')
 eq(edited.id,stable.id,'stable save ID');eq(edited.idempotency_key,stable.idempotency_key,'stable idempotency');eq((await db.query('select count(*)::int n from found_mail_replies')).rows[0].n,1,'one row after repeated save')
 const stale=await claim({...edited,updated_at:'2000-01-01T00:00:00Z'});eq(!!stale.error,true,'stale review rejected');eq((await row(stable.id)).status,'draft','stale claim cannot mutate')
 const token=randomUUID();eq(!!(await claim(edited,token)).data,true,'valid claim');eq((await claim(edited)).data,null,'second claim denied')
 eq((await finish(edited,randomUUID(),'accepted')).data,false,'wrong token cannot finish')
 const pid=randomUUID();eq((await finish(edited,token,'accepted',pid)).data,true,'accepted atomic finish')
 const log=(await db.query('select * from email_log where resend_email_id=$1',[pid])).rows
 eq(log.length,1,'one accepted log');eq([log[0].company_id,log[0].recipient_type,log[0].email_type,log[0].source],[null,'prospect','found_manual_reply','admin/mail/manual-reply'],'unlinked exact purpose tuple')
 eq((await finish(edited,token,'accepted',pid)).data,false,'replayed finish cannot duplicate');eq((await receipt(pid,'delivered')).data,true,'late receipt accepted');eq((await row(edited.id)).status,'delivered','late delivery projected')
 await receipt(pid,'sent','2026-10-28T13:00:00Z');eq((await row(edited.id)).status,'delivered','sent cannot downgrade terminal delivery')
 const early=await save(),et=randomUUID(),ep=randomUUID();await claim(early,et);await receipt(ep,'delivered');await finish(early,et,'accepted',ep)
 eq(new Date((await db.query('select delivery_status_at from email_log where resend_email_id=$1',[ep])).rows[0].delivery_status_at).toISOString(),'2026-10-28T12:00:00.000Z','accepted finish preserves early receipt timestamp')
 eq((await row(early.id)).status,'delivered','early delivered receipt applied');eq((await db.query('select delivery_status from email_log where resend_email_id=$1',[ep])).rows[0].delivery_status,'delivered','early receipt applied to log')
 const bounced=await save(),bt=randomUUID(),bp=randomUUID();await claim(bounced,bt);await receipt(bp,'bounced');await finish(bounced,bt,'accepted',bp);eq((await row(bounced.id)).status,'failed','early bounce projected')
 const atomic=await save(),at=randomUUID();await claim(atomic,at)
 await db.exec('reset role')
 await db.exec(`create function reject_reply_log() returns trigger language plpgsql as $$ begin raise exception 'synthetic log rejection'; end $$;create trigger reject_reply_log before insert on email_log for each row execute function reject_reply_log();`)
 await db.exec('set role service_role')
 const ap=randomUUID();eq(!!(await finish(atomic,at,'accepted',ap)).error,true,'log error surfaces');eq((await row(atomic.id)).status,'sending','failed log insert rolls back accepted transition');eq((await db.query('select count(*)::int n from email_log where resend_email_id=$1',[ap])).rows[0].n,0,'no partial log')
 await db.exec('reset role');await db.exec('drop trigger reject_reply_log on email_log');await db.exec('set role service_role')
 // Actual orchestration: immutable body/key, no transport call on second send.
 const good=await save();let calls=0,wire
 const transport={async send(input){calls++;wire=input;return {kind:'accepted',id:randomUUID()}}}
 eq((await replies.sendSavedReply(admin,sendInput(good),transport)).success,true,'actual accepted send');eq(wire.text,good.body_text,'send persisted body');eq(wire.idempotencyKey,good.idempotency_key,'send persisted key');eq(wire.headers['In-Reply-To'],'<parent@example.test>','RFC threading identity');eq(wire.headers.References,'<prior@example.test> <parent@example.test>','RFC references')
 eq((await replies.sendSavedReply(admin,sendInput(good),transport)).success,false,'accepted resend denied');eq(calls,1,'only one provider attempt')
 for(const kind of ['unconfirmed','throw','rejected']){
  const r=await save();let attempts=0
  const t={async send(){attempts++;if(kind==='throw')throw Error('synthetic timeout');return {kind}}}
  const result=await replies.sendSavedReply(admin,sendInput(r),t)
  eq(result.state,kind==='rejected'?'failed':'unconfirmed','honest transport state '+kind)
  await replies.sendSavedReply(admin,sendInput(r),t);eq(attempts,1,'no retry '+kind)
 }
 for(const gate of ['FOUND_INBOUND_ENABLED','FOUND_MAIL_SEND_ENABLED']){
  env[gate]='false';const r=await save();let n=0;eq((await replies.sendSavedReply(admin,sendInput(r),{async send(){n++;throw Error('must not send')}})).success,false,'gate '+gate);eq(n,0,'disabled provider not called');eq((await row(r.id)).status,'draft','disabled gate does not claim');env[gate]='true'
 }
 await db.query('update found_mail_received set reply_to_address=$1 where id=$2',['other@example.test',parent]);const different=await save();let n=0
 eq((await replies.sendSavedReply(admin,sendInput(different),{async send(){n++;return {kind:'unconfirmed'}}})).success,false,'different recipient needs consent');eq(n,0,'no unconfirmed-recipient send')
 await db.query('update found_mail_received set reply_to_address=null where id=$1',[parent])
 // Actual HTTP adapter: bounded response, malformed success and redirects are uncertain.
 const adapter=replies.createReplyTransport(),request={from:'hello@foundco.app',to:recipient,subject:'Synthetic',text:'Synthetic',headers:{},idempotencyKey:'fixture/key'}
 for(const [response,want] of [[new Response(JSON.stringify({id:randomUUID()})), 'accepted'],[new Response('x'.repeat(65537)),'unconfirmed'],[new Response('{}'),'unconfirmed'],[new Response('',{status:503}),'unconfirmed'],[new Response('',{status:429}),'rejected']]){
  fetchMock=async(url,options)=>{eq(url,'https://api.resend.com/emails','fixed endpoint');eq(options.redirect,'error','no redirect');return response}
  eq((await adapter.send(request)).kind,want,'HTTP outcome')
 }
 // Both actual callers read the same reviewed version; SQL permits one claim.
 const competing=await save();let competingSends=0
 const competition={async send(){competingSends++;return {kind:'accepted',id:randomUUID()}}}
 const competingResults=await Promise.all([replies.sendSavedReply(admin,sendInput(competing),competition),replies.sendSavedReply(admin,sendInput(competing),competition)])
 eq(competingResults.filter(r=>r.success).length,1,'one accepted concurrent orchestration');eq(competingSends,1,'one transport for competing claims')
 // Returned database errors must produce unconfirmed and retain the known provider ID.
 const logFailure=await save(),knownId=randomUUID();let finishCalls=0
 const failingLog={...admin,async rpc(name,args){
  if(name==='found_mail_finish_reply' && ++finishCalls===1)return {data:null,error:{message:'synthetic atomic finish failure'}}
  return rpc(name,args)
 }}
 eq((await replies.sendSavedReply(failingLog,sendInput(logFailure),{async send(){return {kind:'accepted',id:knownId}}})).state,'unconfirmed','returned finish error is uncertain')
 eq((await row(logFailure.id)).provider_email_id,knownId,'fallback retains accepted provider ID')
 await receipt(knownId,'delivered');eq((await row(logFailure.id)).status,'delivered','late receipt reconciles unconfirmed')
 eq((await db.query('select count(*)::int n from email_log where resend_email_id=$1',[knownId])).rows[0].n,1,'reconciliation creates one log')
 // Ignore stale status events AND retain the timestamp belonging to the winning event.
 await receipt(pid,'delivered','2026-10-28T15:00:00Z')
 await receipt(pid,'sent','2026-10-28T10:00:00Z')
 const receiptTime=(await db.query('select event_at from found_mail_delivery_receipts where provider_email_id=$1',[pid])).rows[0].event_at
 const logTime=(await db.query('select delivery_status_at from email_log where resend_email_id=$1',[pid])).rows[0].delivery_status_at
 eq(new Date(logTime).getTime(),new Date(receiptTime).getTime(),'stale receipt cannot rewrite winning delivery timestamp')
 // Regression probes explicitly report unsafe outcomes, without accepting them as guarantees.
 const thrown=await save();let sends=0
 const broken={...admin,async rpc(name,args){if(name==='found_mail_finish_reply')throw Error('synthetic RPC connection failure');return rpc(name,args)}}
 let outcome;try{outcome=await replies.sendSavedReply(broken,sendInput(thrown),{async send(){sends++;return {kind:'accepted',id:randomUUID()}}})}catch(error){outcome={threw:true}}
 eq(sends,1,'finish exception probe sends once')
 eq(outcome.state,'unconfirmed','thrown finish and fallback return honest uncertainty');eq(outcome.success,false,'thrown finish is not success')
 let recoveredFinishes=0,recoveredSends=0
 const recoverable=await save(),recoveredId=randomUUID()
 const onceBroken={...admin,async rpc(name,args){if(name==='found_mail_finish_reply' && ++recoveredFinishes===1)throw Error('synthetic first finish failure');return rpc(name,args)}}
 const recovered=await replies.sendSavedReply(onceBroken,sendInput(recoverable),{async send(){recoveredSends++;return {kind:'accepted',id:recoveredId}}})
 eq(recovered.state,'unconfirmed','thrown first finish returns uncertain');eq((await row(recoverable.id)).status,'unconfirmed','fallback persists uncertainty');eq((await row(recoverable.id)).provider_email_id,recoveredId,'fallback preserves known provider ID')
 await replies.sendSavedReply(admin,sendInput(recoverable),{async send(){recoveredSends++;throw Error('must not resend')}})
 eq(recoveredSends,1,'no resend after thrown finish with successful fallback')
 const post=await row(thrown.id)
 if(post.status==='sending'){
  await db.query("update found_mail_replies set lease_until=now()-interval '1 second' where id=$1",[thrown.id])
  const visible=await row(thrown.id)
  const realStore=load('src/lib/admin/mailStore.ts')
  const readAdmin={rpc,from(table){
   assert.ok(['found_mail_received','found_mail_replies'].includes(table))
   let key,value,single=false
   const q={select(){return q},eq(k,v){key=k;value=v;return q},order(){return q},maybeSingle(){single=true;return q},async then(resolve,reject){
    try{assert.ok(['id','parent_id'].includes(key));const data=(await db.query(`select * from ${table} where ${key}=$1`,[value])).rows;return resolve({data:single?data[0]??null:data,error:null})}catch(error){return reject(error)}
   }};return q
  }}
  const projected=await realStore.getReceivedMessage(readAdmin,parent)
  eq(projected.error,null,'actual detail getter succeeds')
  eq(projected.replies.find(r=>r.id===thrown.id).status,'unconfirmed','actual detail getter projects expired send honestly')
  eq((await row(thrown.id)).status,'sending','read projection does not mutate durable send')
  eq(sends,1,'projection performs no send')
  // Expire every synthetic send on this parent; action must reap without transport.
  await db.query("update found_mail_replies set lease_until=now()-interval '1 second' where parent_id=$1 and status='sending'",[parent])
  let moved
  try{moved=await db.query("select found_mail_change($1,'move','spam') as ok",[parent])}
  catch(error){assert.match(error.message,/reconciliation/);probes.push('EXPIRED_ACTION_LOCK: detail shows unconfirmed but move/rule still rejects stored expired sending')}
  if(moved){
   eq(moved.rows[0].ok,true,'move reaps expired sends')
   eq((await row(thrown.id)).status,'unconfirmed','move persists expired uncertainty')
   await db.query("select found_mail_change($1,'move','inbox')",[parent])
  }
  eq((await claim(visible)).data,null,'expiry claim never sends');eq((await row(thrown.id)).status,'unconfirmed','explicit expiry claim resolves uncertainty without resend')
 }
 // Cross-parent sender contract: block cannot pretend an already-started send was canceled.
 const otherParent=randomUUID(),otherReply=randomUUID()
 await db.query("insert into found_mail_received(id,provider_email_id,from_address,to_addresses,subject,processing_state) values($1,$2,$3,array['hello@foundco.app'],'Other conversation','ready')",[otherParent,randomUUID(),recipient])
 eq(!!(await rpc('found_mail_save_reply',{p_parent_id:otherParent,p_reply_id:otherReply,p_body:'Other reviewed reply',p_to:recipient,p_from:'hello@foundco.app',p_subject:'Re: Other'})).data,true,'other parent draft saved')
 const active=await save(),activeToken=randomUUID();await claim(active,activeToken)
 await assert.rejects(db.query("select found_mail_change($1,'rule','block')",[otherParent]),/already in progress/);checks++
 eq((await db.query('select count(*)::int n from found_mail_rules where sender_address=$1',[recipient])).rows[0].n,0,'rejected block does not install rule')
 const evidenceId=randomUUID()
 await db.query("update found_mail_replies set lease_until=now()-interval '1 second',provider_email_id=$1 where id=$2",[evidenceId,active.id])
 eq((await db.query("select found_mail_change($1,'rule','block') as ok",[otherParent])).rows[0].ok,true,'sender action reaps expired other-parent send')
 const reaped=await row(active.id)
 eq(reaped.status,'unconfirmed','expired other-parent send remains uncertain');eq(reaped.lease_token,activeToken,'reaping preserves token');eq(reaped.provider_email_id,evidenceId,'reaping preserves provider evidence')
 const other=await row(otherReply)
 eq(!!(await rpc('found_mail_claim_reply',{p_id:otherReply,p_parent_id:otherParent,p_to:recipient,p_token:randomUUID(),p_expected_updated_at:other.updated_at})).error,true,'block-first denies future claim')
 eq(!!(await rpc('found_mail_save_reply',{p_parent_id:parent,p_reply_id:randomUUID(),p_body:'Blocked',p_to:recipient,p_from:'hello@foundco.app',p_subject:'Blocked'})).error,true,'sender block denies save on another parent')
 const sql1=fs.readFileSync('supabase/migrations/20261028000100_found_inbound_mail.sql','utf8')
 const sql2=fs.readFileSync('supabase/migrations/20261028000200_found_mail_reply_actions.sql','utf8')
 for(const [sql,name,parentClause] of [[sql1,'found_mail_change','id=p_id for update'],[sql2,'found_mail_save_reply','id=p_parent_id for update'],[sql2,'found_mail_claim_reply','id=p_parent_id for update']]){
  const fn=sql.slice(sql.indexOf('create function public.'+name+'(')).split('end; $$;')[0]
  const canonical=fn.replaceAll('pg_catalog.','')
  assert.match(canonical,/pg_advisory_xact_lock\(hashtextextended\('found-mail\/sender\/'\|\|coalesce\((sender|lock_sender),''\),0\)\)/);checks++
  eq(canonical.indexOf('pg_advisory_xact_lock')<canonical.indexOf(parentClause),true,name+' sender lock before parent')
 }
 console.log(`${checks} reply SQL/orchestration checks passed; no network/live operations.`)
 for(const probe of probes)console.log('REVIEW FINDING: '+probe)
 console.log('PGlite does not prove real multi-session locking or receipt/finish interleavings.')
}finally{await db.close()}
