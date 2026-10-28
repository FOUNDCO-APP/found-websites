// Local-only 003 compose/alias regression tests. Never reads credentials or uses network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {randomUUID} from 'node:crypto'
const require=createRequire(import.meta.url),ts=require('typescript'),{PGlite}=require('@electric-sql/pglite')
const db=new PGlite(),env={FOUND_INBOUND_ENABLED:'true',FOUND_MAIL_SEND_ENABLED:'true',RESEND_API_KEY:'synthetic'}
let checks=0
function eq(actual,expected,label){assert.deepEqual(JSON.parse(JSON.stringify(actual)),JSON.parse(JSON.stringify(expected)),label);checks++}
function load(file,extra={}){
 const module={exports:{}}
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
 vm.runInNewContext(code,{module,exports:module.exports,process:{env},Buffer,URL,AbortSignal,Date,console,fetch(){throw Error('Network forbidden')},require:name=>{
  if(name in extra)return extra[name]
  if(name==='server-only')return {}
  if(name==='node:crypto')return {randomUUID}
  if(name==='@/lib/mailSafety')return load('src/lib/mailSafety.ts')
  throw Error('Unexpected dependency '+name)
 }})
 return module.exports
}
async function rpc(name,args){
 assert.match(name,/^found_mail_[a-z_]+$/)
 const keys=Object.keys(args);keys.forEach(key=>assert.match(key,/^p_[a-z_]+$/))
 try{return {data:(await db.query(`select public.${name}(${keys.map((k,i)=>`${k} => $${i+1}`).join(',')}) as v`,keys.map(k=>args[k]??null))).rows[0].v,error:null}}
 catch(error){return {data:null,error}}
}
function table(table){
 assert.ok(['found_mail_received','found_mail_replies','found_mail_rules'].includes(table))
 const filters=[],orders=[];let single=false,limit=null
 const q={select(){return q},eq(key,value){assert.match(key,/^[a-z_]+$/);filters.push([key,value]);return q},is(key,value){assert.equal(value,null);filters.push([key,null]);return q},order(key,opt={}){assert.match(key,/^[a-z_]+$/);orders.push(key+(opt.ascending===false?' desc':' asc'));return q},maybeSingle(){single=true;return q},single(){single=true;return q},limit(n){limit=n;return q},async then(resolve,reject){
  try{const values=[],where=filters.map(([key,value])=>value===null?`${key} is null`:(values.push(value),`${key}=$${values.length}`));const rows=(await db.query(`select * from ${table}${where.length?' where '+where.join(' and '):''}${orders.length?' order by '+orders.join(','):''}${limit===null?'':' limit '+Number(limit)}`,values)).rows;return resolve({data:single?rows[0]??null:rows,error:null})}catch(error){return reject(error)}
 }};return q
}
const admin={rpc,from:table}
async function row(id){return (await db.query('select * from found_mail_replies where id=$1',[id])).rows[0]}
async function setup(){
 await db.exec(`create role anon;create role authenticated;create role service_role;grant usage on schema public to service_role;
 create table email_log(id uuid default gen_random_uuid(),company_id uuid,lead_id uuid,recipient_email text,recipient_type text,email_type text,subject text,text_body text,success boolean,source text,email_scope text,resend_email_id text,delivery_status text,delivery_status_at timestamptz);
 grant select,insert,update on email_log to service_role;`)
 const files=fs.readdirSync('supabase/migrations')
 for(const prefix of ['202610280001','202610280002','compose']){
  const matches=files.filter(f=>prefix==='compose'?f.endsWith('_found_mail_compose.sql'):f.startsWith(prefix));assert.equal(matches.length,1,'one migration for '+prefix)
  await db.exec(fs.readFileSync('supabase/migrations/'+matches[0],'utf8'))
 }
}
const aliases=['hello@foundco.app','support@foundco.app','shawn@foundco.app']
const parent=randomUUID(),recipient='outside@example.test'
let mail,safety
function saveArgs(overrides={}){return {p_reply_id:randomUUID(),p_to:recipient,p_from:aliases[2],p_subject:'Reviewed synthetic subject',p_body:'Reviewed plain text',...overrides}}
async function sqlSave(overrides={}){const args=saveArgs(overrides);const result=await rpc('found_mail_save_compose',args);eq(!!result.error,false,'SQL compose save');return await row(args.p_reply_id)}
function claimArgs(draft,overrides={}){return {p_id:draft.id,p_to:draft.to_address,p_from:draft.from_address,p_subject:draft.subject,p_token:randomUUID(),p_expected_updated_at:draft.updated_at,...overrides}}
function sendArgs(draft,overrides={}){return {replyId:draft.id,expectedTo:draft.to_address,expectedFrom:draft.from_address,expectedSubject:draft.subject,expectedVersion:new Date(draft.updated_at).toISOString(),...overrides}}
async function helperSave(overrides={}){const input={replyId:randomUUID(),to:recipient,from:aliases[2],subject:'Reviewed synthetic subject',body:'Reviewed plain text',...overrides};const result=await mail.saveManualComposeDraft(admin,input);eq(result.success,true,'actual helper compose save');return row(input.replyId)}
try{
 await setup()
 safety=load('src/lib/mailSafety.ts')
 mail=load('src/lib/admin/mailReplies.ts',{'@/lib/admin/mailStore':{getReceivedMessage:async(_admin,id)=>({message:(await db.query('select * from found_mail_received where id=$1',[id])).rows[0]??null,replies:[],error:null})}})
 eq(safety.FOUND_MAIL_ADDRESSES,aliases,'exact approved TS From identities')
 const clean={from:recipient,to:[],subject:'Need help',text:'Please help with my website.',authentication:{spf:'pass',dkim:'pass',dmarc:'pass'},attachments:[]}
 for(const alias of aliases){const parsed=safety.parseInboundEmail({...clean,to:[alias]});eq(parsed.folder,'inbox','approved alias received');eq(safety.getManualReplyTarget(parsed).from,alias,'single alias reply default')}
 const unknown=safety.parseInboundEmail({...clean,to:['typo@foundco.app']},{allowed:true})
 eq(unknown.folder,'spam','unknown address remains quarantined even for allowed sender');eq(unknown.to_addresses,['typo@foundco.app'],'unknown original address retained');eq(unknown.hard_blocked,false,'unknown address alone is not malicious-content block')
 eq(safety.getManualReplyTarget(unknown).from,null,'unknown address never becomes default From')
 const multi=safety.parseInboundEmail({...clean,to:[aliases[0],aliases[2]]})
 eq(safety.getManualReplyTarget(multi).from,null,'multiple known recipients need explicit From')
 for(const alias of [aliases[0],aliases[2]])eq(safety.getManualReplyTarget(multi,alias).from,alias,'addressed explicit From allowed')
 eq(safety.getManualReplyTarget(multi,aliases[1]).from,null,'unaddressed alias cannot replace multi-known choice')
 for(const bad of ['typo@foundco.app','shawn@foundco.app.evil.example','personal@example.test'])eq(safety.getManualReplyTarget({...unknown,folder:'inbox'},bad).from,null,'rescue cannot authorize unknown From')
 for(const alias of aliases)eq(safety.getManualReplyTarget({...unknown,folder:'inbox'},alias).from,alias,'rescued unknown can choose approved From')
 await db.query("insert into found_mail_received(id,provider_email_id,from_address,to_addresses,subject,processing_state) values($1,$2,$3,$4,'Reply parent','ready')",[parent,randomUUID(),recipient,[aliases[0],aliases[2]]])
 const rescuedParent=randomUUID()
 await db.query("insert into found_mail_received(id,provider_email_id,from_address,to_addresses,subject,processing_state,folder,hard_blocked) values($1,$2,$3,array['typo@foundco.app'],'Rescued unknown','ready','inbox',false)",[rescuedParent,randomUUID(),recipient])
 // Inspect and exercise grants: both old and additive reply/compose RPCs remain server-only.
 const funcs=(await db.query("select oid::regprocedure::text as signature,prosecdef,proconfig from pg_proc where pronamespace='public'::regnamespace and proname like 'found_mail_%'")).rows
 for(const fn of funcs){eq(fn.prosecdef,false,'invoker '+fn.signature);assert.ok(fn.proconfig?.some(x=>x.startsWith('search_path=')));checks++;for(const role of ['anon','authenticated'])eq((await db.query("select has_function_privilege($1,$2,'EXECUTE') as ok",[role,fn.signature])).rows[0].ok,false,'role denial '+fn.signature)}
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select public.found_mail_save_compose($1,$2,$3,$4,$5)',[randomUUID(),recipient,aliases[2],'Subject','Body']),/permission denied/);checks++;await db.exec('reset role')}
 await db.exec('set role service_role')
 for(const [parentId,intent] of [[null,'reply'],[parent,'compose']]){
  await assert.rejects(db.query("insert into found_mail_replies(parent_id,intent,body_text,to_address,from_address,subject,idempotency_key) values($1,$2,'Body',$3,$4,'Subject',$5)",[parentId,intent,recipient,aliases[2],randomUUID()]),/check constraint/);checks++
 }
 for(const alias of aliases)eq(!!(await rpc('found_mail_save_reply',{p_parent_id:rescuedParent,p_reply_id:randomUUID(),p_body:'Reviewed rescue reply',p_to:recipient,p_from:alias,p_subject:'Reply'})).error,false,'SQL rescued unknown accepts explicit approved From')
 eq(!!(await rpc('found_mail_save_reply',{p_parent_id:rescuedParent,p_reply_id:randomUUID(),p_body:'Must reject',p_to:recipient,p_from:'typo@foundco.app',p_subject:'Reply'})).error,true,'SQL rescue never sends from unknown address')
 await db.query("update found_mail_received set folder='spam' where id=$1",[rescuedParent])
 eq(!!(await rpc('found_mail_save_reply',{p_parent_id:rescuedParent,p_reply_id:randomUUID(),p_body:'Must rescue first',p_to:recipient,p_from:aliases[2],p_subject:'Reply'})).error,true,'unknown requires explicit rescue before reply')
 await db.query("update found_mail_received set folder='inbox' where id=$1",[rescuedParent])
 const rescuedId=randomUUID()
 eq((await mail.saveManualReplyDraft(admin,{messageId:rescuedParent,replyId:rescuedId,from:aliases[2],body:'Rescued manual reply'})).success,true,'actual helper saves rescued reply with explicit approved From')
 const rescuedDraft=await row(rescuedId);let rescuedSends=0
 eq((await mail.sendSavedReply(admin,{messageId:rescuedParent,replyId:rescuedId,expectedTo:recipient,expectedFrom:aliases[2],expectedVersion:new Date(rescuedDraft.updated_at).toISOString(),confirmDifferentRecipient:false},{async send(input){rescuedSends++;eq(input.from,aliases[2],'rescued transport From remains approved');return {kind:'accepted',id:randomUUID()}}})).success,true,'informational unknown-address warning is not a false different-recipient requirement')
 eq(rescuedSends,1,'rescued manual reply sends once')
 const stable=await sqlSave(),again=await sqlSave({p_reply_id:stable.id,p_body:'Edited reviewed body'})
 eq(again.id,stable.id,'stable compose save ID');eq(again.idempotency_key,stable.idempotency_key,'stable compose key');eq(again.idempotency_key,'found-compose/'+stable.id,'compose key namespace');eq(again.parent_id,null,'standalone no fake parent');eq(again.intent,'compose','explicit compose intent')
 for(const alias of aliases)eq((await sqlSave({p_from:alias})).from_address,alias,'SQL exact approved alias')
 for(const bad of ['typo@foundco.app','personal@example.test','shawn@foundco.app.evil.example','hello@foundco.app\r\nBcc: attacker@example.test'])eq(!!(await rpc('found_mail_save_compose',saveArgs({p_from:bad}))).error,true,'SQL invalid From')
 for(const bad of ['a@example.test,b@example.test','a@example.test\nBcc: attacker@example.test','not an email'])eq(!!(await rpc('found_mail_save_compose',saveArgs({p_to:bad}))).error,true,'SQL single recipient boundary')
 const cross=await rpc('found_mail_save_reply',{p_parent_id:parent,p_reply_id:stable.id,p_body:'Cannot turn compose into reply',p_to:recipient,p_from:aliases[0],p_subject:'Reply'})
 eq(!!cross.error,true,'compose ID cannot become reply');eq((await row(stable.id)).intent,'compose','compose intent preserved')
 const replyId=randomUUID();eq(!!(await rpc('found_mail_save_reply',{p_parent_id:parent,p_reply_id:replyId,p_body:'Reviewed reply',p_to:recipient,p_from:aliases[0],p_subject:'Reply'})).error,false,'explicit multi-known reply saved')
 eq(!!(await rpc('found_mail_save_compose',saveArgs({p_reply_id:replyId}))).error,true,'reply ID cannot become compose');eq((await row(replyId)).parent_id,parent,'reply parent preserved')
 const wrongIntentClaim=await rpc('found_mail_claim_compose',claimArgs(await row(replyId)));eq(!!wrongIntentClaim.error || !wrongIntentClaim.data,true,'compose claim cannot send reply')
 const explicitReplyId=randomUUID()
 eq((await mail.saveManualReplyDraft(admin,{messageId:parent,replyId:explicitReplyId,from:aliases[2],body:'Explicit multi-known manual reply'})).success,true,'actual helper saves explicit multi-known reply')
 const explicitDraft=await row(explicitReplyId);let explicitSends=0
 eq((await mail.sendSavedReply(admin,{messageId:parent,replyId:explicitReplyId,expectedTo:recipient,expectedFrom:aliases[2],expectedVersion:new Date(explicitDraft.updated_at).toISOString(),confirmDifferentRecipient:false},{async send(input){explicitSends++;eq(input.from,aliases[2],'explicit multi-known From reaches transport');return {kind:'accepted',id:randomUUID()}}})).success,true,'multi-known From choice does not invent a Reply-To confirmation')
 eq(explicitSends,1,'explicit multi-known send called once')
 const reviewedReply=await row(replyId)
 eq(!!(await rpc('found_mail_claim_reply',{p_id:replyId,p_parent_id:parent,p_to:recipient,p_token:randomUUID(),p_expected_updated_at:reviewedReply.updated_at})).error,true,'legacy claim cannot silently select among multiple addressed aliases')
 eq(!!(await rpc('found_mail_claim_reply_reviewed',{p_id:replyId,p_parent_id:parent,p_to:recipient,p_from:aliases[2],p_token:randomUUID(),p_expected_updated_at:reviewedReply.updated_at})).error,true,'reviewed reply claim rejects changed From')
 for(const [field,bad] of [['p_to','other@example.test'],['p_from',aliases[1]],['p_subject','Not reviewed'],['p_expected_updated_at','2000-01-01T00:00:00Z']]){
  eq(!!(await rpc('found_mail_claim_compose',claimArgs(again,{[field]:bad}))).error,true,'exact claim rejects '+field);eq((await row(again.id)).status,'draft','invalid review leaves draft')
 }
 const claim=claimArgs(again);eq(!!(await rpc('found_mail_claim_compose',claim)).data,true,'reviewed compose claim');eq((await rpc('found_mail_claim_compose',claimArgs(again))).data,null,'second compose claim denied')
 eq(!!(await rpc('found_mail_save_compose',saveArgs({p_reply_id:again.id}))).error,true,'sending draft cannot be edited')
 const provider=randomUUID();eq((await rpc('found_mail_finish_reply',{p_id:again.id,p_token:claim.p_token,p_status:'accepted',p_provider_id:provider,p_error:null})).data,true,'compose reuses atomic finish')
 const log=(await db.query('select * from email_log where resend_email_id=$1',[provider])).rows
 eq(log.length,1,'one compose log');eq([log[0].company_id,log[0].lead_id,log[0].recipient_type],[null,null,'prospect'],'compose has no guessed ownership');eq([log[0].email_type,log[0].source],['found_manual_compose','admin/mail/manual-compose'],'compose has explicit new-message purpose tuple')
 await rpc('found_mail_record_reply_delivery',{p_provider_id:provider,p_status:'delivered',p_event_at:'2026-10-28T22:00:00Z'});eq((await row(again.id)).status,'delivered','compose late delivery reconciliation')
 await rpc('found_mail_record_reply_delivery',{p_provider_id:provider,p_status:'delivered',p_event_at:'2026-10-28T22:00:00Z'})
 eq((await db.query('select count(*)::int n from email_log where resend_email_id=$1',[provider])).rows[0].n,1,'replayed compose receipt cannot duplicate accepted log')
 const earlyDraft=await sqlSave(),earlyClaim=claimArgs(earlyDraft),earlyProvider=randomUUID()
 await rpc('found_mail_claim_compose',earlyClaim)
 await rpc('found_mail_record_reply_delivery',{p_provider_id:earlyProvider,p_status:'delivered',p_event_at:'2026-10-28T22:10:00Z'})
 await rpc('found_mail_finish_reply',{p_id:earlyDraft.id,p_token:earlyClaim.p_token,p_status:'accepted',p_provider_id:earlyProvider,p_error:null})
 const earlyLog=(await db.query('select * from email_log where resend_email_id=$1',[earlyProvider])).rows
 eq(earlyLog.length,1,'early compose receipt logged once at finish');eq([earlyLog[0].email_type,earlyLog[0].source],['found_manual_compose','admin/mail/manual-compose'],'early compose log has correct purpose');eq(earlyLog[0].delivery_status,'delivered','early compose receipt status preserved');eq(new Date(earlyLog[0].delivery_status_at).toISOString(),'2026-10-28T22:10:00.000Z','early compose receipt timestamp preserved')
 // Actual orchestration: no caller-supplied body sent; no duplicate transport calls.
 const drafted=await helperSave();let attempts=0,wire
 const transport={async send(input){attempts++;wire=input;return {kind:'accepted',id:randomUUID()}}}
 eq((await mail.sendSavedCompose(admin,sendArgs(drafted),transport)).success,true,'actual compose send');eq(wire.text,drafted.body_text,'only stored reviewed body');eq(wire.idempotencyKey,drafted.idempotency_key,'stable compose wire key');eq(wire.headers,{},'new message has no fabricated reply headers')
 await mail.sendSavedCompose(admin,sendArgs(drafted),transport);eq(attempts,1,'no accepted resend')
 const competing=await helperSave();let concurrentCalls=0
 const raceTransport={async send(){concurrentCalls++;return {kind:'accepted',id:randomUUID()}}}
 const race=await Promise.all([mail.sendSavedCompose(admin,sendArgs(competing),raceTransport),mail.sendSavedCompose(admin,sendArgs(competing),raceTransport)])
 eq(race.filter(x=>x.success).length,1,'one competing accepted compose');eq(concurrentCalls,1,'one competing provider call')
 for(const outcome of ['unconfirmed','throw','rejected']){
  const draft=await helperSave();let n=0;const t={async send(){n++;if(outcome==='throw')throw Error('Synthetic timeout');return {kind:outcome}}}
  const result=await mail.sendSavedCompose(admin,sendArgs(draft),t);eq(result.state,outcome==='rejected'?'failed':'unconfirmed','honest compose outcome')
  await mail.sendSavedCompose(admin,sendArgs(draft),t);eq(n,1,'no uncertain/rejected resend')
 }
 for(const gate of ['FOUND_INBOUND_ENABLED','FOUND_MAIL_SEND_ENABLED']){const draft=await helperSave();env[gate]='false';let n=0;eq((await mail.sendSavedCompose(admin,sendArgs(draft),{async send(){n++;throw Error('Forbidden')}})).success,false,'disabled '+gate);eq(n,0,'disabled transport not called');eq((await row(draft.id)).status,'draft','disabled no claim');env[gate]='true'}
 const wrongReview=await helperSave();for(const overrides of [{expectedFrom:aliases[1]},{expectedTo:'other@example.test'},{expectedSubject:'Different review'},{expectedVersion:'2000-01-01T00:00:00Z'}]){let n=0;eq((await mail.sendSavedCompose(admin,sendArgs(wrongReview,overrides),{async send(){n++;throw Error('Forbidden')}})).success,false,'helper rejects changed review');eq(n,0,'changed review never transports')}
 const ambiguous=await helperSave();let n=0
 const broken={...admin,async rpc(name,args){if(name==='found_mail_finish_reply')throw Error('Synthetic DB outage');return rpc(name,args)}}
 eq((await mail.sendSavedCompose(broken,sendArgs(ambiguous),{async send(){n++;return {kind:'accepted',id:randomUUID()}}})).state,'unconfirmed','finish throws remain uncertain');await mail.sendSavedCompose(admin,sendArgs(ambiguous),{async send(){n++;throw Error('Forbidden')}});eq(n,1,'finish outage never resends')
 const store=load('src/lib/admin/mailStore.ts')
 eq((await store.getComposeDraft(admin,replyId)).draft,null,'actual compose getter cannot load reply intent')
 eq((await store.getComposeDraft(admin,drafted.id)).draft.id,drafted.id,'actual compose getter loads compose intent')
 eq((await store.getComposeDraft(admin,ambiguous.id)).draft.status,'sending','active uncertain finish claim retains non-resendable sending until expiry')
 await db.query("update found_mail_replies set lease_until=now()-interval '1 second' where id=$1",[ambiguous.id])
 eq((await store.getComposeDraft(admin,ambiguous.id)).draft.status,'unconfirmed','actual compose getter projects expired send uncertainty')
 // Route/action authorization is exercised before any service-client access.
 let authorized=false,clientReads=0,helperSaves=0,helperSends=0
 const access={async requireAdmin(){if(!authorized)throw Error('Not authorized')},getAdminClient(){clientReads++;return admin}}
 const actions=load('src/app/admin/emails/received/actions.ts',{
  '../../lib':access,'next/server':{after(){throw Error('Unexpected background work')}},'next/cache':{revalidatePath(){}},
  '@/lib/admin/mailStore':{createReceivingAdapter(){throw Error('Unexpected adapter')},processIncomingMail(){throw Error('Unexpected worker')}},
  '@/lib/admin/mailReplies':{...mail,async saveManualComposeDraft(){helperSaves++;return {success:true,replyId:drafted.id}},async sendSavedCompose(){helperSends++;return {success:false,state:'unconfirmed'}}}
 })
 for(const name of ['saveComposeDraft','sendComposeDraft']){await assert.rejects(actions[name](new FormData()),/Not authorized/);checks++}
 eq(clientReads,0,'unauthorized compose actions do not create admin client')
 authorized=true;env.FOUND_INBOUND_ENABLED='false'
 for(const name of ['saveComposeDraft','sendComposeDraft'])eq((await actions[name](new FormData())).success,false,'disabled action refuses '+name)
 eq(clientReads,0,'disabled compose actions do not create admin client');env.FOUND_INBOUND_ENABLED='true'
 for(const forbidden of ['cc','bcc','attachments','recipients','bulk','html','ai']){const form=new FormData();form.set(forbidden,'untrusted');eq((await actions.saveComposeDraft(form)).success,false,'unsupported form field '+forbidden)}
 const duplicate=new FormData();duplicate.append('to',recipient);duplicate.append('to','other@example.test');eq((await actions.saveComposeDraft(duplicate)).success,false,'duplicate recipient form field denied')
 eq(clientReads,0,'invalid compose forms do not read admin client');eq(helperSaves,0,'invalid forms never save');eq(helperSends,0,'invalid forms never dispatch')
 const route=load('src/app/admin/emails/compose/page.tsx',{
  '../../lib':access,'@/lib/admin/mailStore':{async getComposeDraft(){throw Error('Unauthorized route read')}},
  'react/jsx-runtime':require('react/jsx-runtime'),'../MailNavigation':{__esModule:true,default:'nav'},'./ComposeWorkspace':{__esModule:true,default:'workspace'}
 })
 authorized=false;await assert.rejects(route.default({searchParams:Promise.resolve({draft:drafted.id})}),/Not authorized/);checks++
 eq(clientReads,0,'unauthorized compose route creates no service client')
 authorized=true;env.FOUND_INBOUND_ENABLED='false';await route.default({searchParams:Promise.resolve({draft:drafted.id})});eq(clientReads,0,'disabled compose route performs no draft read');env.FOUND_INBOUND_ENABLED='true'
 // A standalone active send shares recipient serialization with sender-rule actions.
 const activeCompose=await sqlSave(),activeComposeClaim=claimArgs(activeCompose)
 eq(!!(await rpc('found_mail_claim_compose',activeComposeClaim)).data,true,'standalone reviewed send claimed')
 await assert.rejects(db.query("select found_mail_change($1,'rule','block')",[parent]),/already in progress/);checks++
 eq((await db.query('select count(*)::int n from found_mail_rules where sender_address=$1',[recipient])).rows[0].n,0,'rule cannot imply active compose cancellation')
 const preservedProvider=randomUUID()
 await db.query("update found_mail_replies set lease_until=now()-interval '1 second',provider_email_id=$1 where id=$2",[preservedProvider,activeCompose.id])
 eq((await db.query("select found_mail_change($1,'rule','block') as ok",[parent])).rows[0].ok,true,'rule reaps expired standalone compose')
 const expiredCompose=await row(activeCompose.id)
 eq(expiredCompose.status,'unconfirmed','expired standalone remains uncertain');eq(expiredCompose.lease_token,activeComposeClaim.p_token,'compose reaping retains token');eq(expiredCompose.provider_email_id,preservedProvider,'compose reaping retains provider evidence')
 eq(!!(await rpc('found_mail_claim_compose',claimArgs(wrongReview))).error,true,'block denies later standalone claim')
 eq(!!(await rpc('found_mail_save_compose',saveArgs())).error,true,'block denies new standalone draft')
 const classifier=load('src/lib/admin/emailHistory.ts')
 const purpose={email_type:'found_manual_compose',recipient_type:'prospect',source:'admin/mail/manual-compose',company_id:null}
 eq(classifier.classifyEmail(purpose),'found_clients','explicit compose purpose appears in Found Sent')
 eq(classifier.classifyEmail({...purpose,source:'unknown'}),'unclassified','scope/name cannot replace exact compose source')
 eq(classifier.classifyEmail({...purpose,lead_id:randomUUID()}),'unclassified','conflicting lead association is not promoted')
 console.log(`${checks} compose/alias SQL and orchestration checks passed. Synthetic only; no network, credentials, DB installation or messages.`)
 console.log('PGlite serializes sessions: real concurrent lock scheduling remains an activation prerequisite.')
}catch(error){console.error(error.stack ?? error.message);process.exitCode=1}finally{await db.close()}
