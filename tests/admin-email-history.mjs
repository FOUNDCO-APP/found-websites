import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
let checks = 0
const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++ }
function load(file, stubs = {}) {
  const module = {exports:{}}
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
  }}).outputText
  vm.runInNewContext(code,{module,exports:module.exports,require:name => {
    if (Object.hasOwn(stubs,name)) return stubs[name]
    if (name === 'server-only') return {}
    throw new Error(`Unexpected dependency: ${name}`)
  },fetch:()=>{throw new Error('Network forbidden')},console})
  return module.exports
}
const {classifyEmail,emailDeliveryLabel,getAdminEmailHistory} = load('src/lib/admin/emailHistory.ts')
const plain = value => JSON.parse(JSON.stringify(value))
const direct = {email_type:'site_live',recipient_type:'client_owner',source:'activationEmails/sendSiteLiveEmailOnce'}
const alert = {email_type:'new_signup_alert',recipient_type:'admin',source:'adminAlerts/sendNewSignupAlert'}
const login = {email_type:'magic_link_login',recipient_type:'client_owner',source:'dashboard/api/send-login'}
const business = {email_type:'lead_notification',recipient_type:'client_owner',source:'actions/leads/submitLead'}
for (const scope of ['found','client',null,'unexpected']) {
  check(classifyEmail({...direct,email_scope:scope}),'found_clients','default scope does not override known tuple')
  check(classifyEmail({...business,email_scope:scope}),'business','business purpose remains separate')
  check(classifyEmail({...alert,email_scope:scope}),'admin_alerts','admin recipient isolated')
  check(classifyEmail({email_type:'future',recipient_type:'admin',email_scope:scope}),'unclassified','unknown never scope fallback')
}
for (const tuple of [direct,alert]) {
  check(classifyEmail({...tuple,lead_id:'conflicting-lead'}),'unclassified','contradictory lead link preserved')
  check(classifyEmail({...tuple,source:'unknown-source'}),'unclassified','unknown source retained')
  check(classifyEmail({...tuple,recipient_type:'lead'}),'unclassified','conflicting recipient retained')
}
for (const recipient of ['admin','client_owner','lead']) {
  const tuple = {email_type:'billing_payment_attention',recipient_type:recipient,source:'billing-notification/00000000-0000-4000-8000-000000000001'}
  check(classifyEmail(tuple),recipient === 'admin' ? 'admin_alerts' : recipient === 'client_owner' ? 'found_clients' : 'unclassified','billing purpose plus recipient')
  check(classifyEmail({...tuple,lead_id:'conflict'}),'unclassified','billing lead conflict')
  check(classifyEmail({...tuple,source:'billing-notification/not-a-job'}),'unclassified','billing source validated')
}
check(emailDeliveryLabel({success:true,delivery_status:'sent'}),'Accepted — delivery unconfirmed','acceptance is not delivery')
check(emailDeliveryLabel({success:true,delivery_status:'email.delivered'}),'Delivered','provider prefix')
check(emailDeliveryLabel({success:true,delivery_status:'email.delivery_delayed'}),'Delayed','provider delayed alias')
check(emailDeliveryLabel({success:true,delivery_status:'delivery_delayed'}),'Delayed','legacy delayed alias')
check(emailDeliveryLabel({success:false,delivery_status:'delivered'}),'Failed','send failure not success')
check(emailDeliveryLabel({success:null,delivery_status:null}),'Delivery unknown','null success not failed/sent')
check(emailDeliveryLabel({success:true,delivery_status:null}),'Accepted by provider; delivery unknown','no delivery inferred')

const company = (id,extra={}) => ({id,name:`Synthetic ${id}`,slug:id,email:`${id}@example.test`,
  account_kind:'client',is_test:false,retired_at:null,subscription_status:'active',client_state:'current',...extra})
const companies = [company('barrio'),company('rc',{subscription_status:'canceled'}),company('zero'),
  company('retired',{retired_at:'2026-01-01'}),company('test',{is_test:true}),company('internal',{account_kind:'internal'}),
  company('marketing',{email:'synthetic-marketing@example.test'}),company('legacy',{account_kind:null})]
const leads = [{id:'fixture-lead',flagged:true},{id:'not-flagged',flagged:false}]
const row = (id,extra={}) => ({id,company_id:'barrio',lead_id:null,recipient_email:'synthetic@example.test',
  recipient_type:'client_owner',email_type:'site_live',source:'activationEmails/sendSiteLiveEmailOnce',
  email_scope:'client',subject:`Fixture ${id}`,success:true,delivery_status:'delivered',handled_at:null,handled_note:null,
  created_at:'2026-01-01T00:00:00.000Z',...extra})
// >300 newer business rows must not crowd older Found correspondence out.
const emails = Array.from({length:721},(_,i)=>row(`business-${String(i).padStart(4,'0')}`,{
  ...business,created_at:'2026-10-27T00:00:00.000Z',lead_id:'fixture-lead',email_scope:'found'}))
emails.push(...Array.from({length:31},(_,i)=>row(`direct-${String(i).padStart(3,'0')}`)))
emails.push(row('rc-direct',{company_id:'rc',delivery_status:'email.delivery_delayed'}),
  row('alert',{...alert}),row('unknown',{email_type:'future',email_scope:'found'}),
  row('conflict',{lead_id:'fixture-lead'}),row('unlinked-login',{...login,company_id:null,recipient_email:'barrio@example.test'}),
  row('handled',{handled_at:'2026-01-02',delivery_status:'bounced'}),row('failed',{success:false}),
  row('retired-message',{company_id:'retired'}))
function client({failTable,failPage,throwNetwork=false,missingHandling=false,noCount=false,drift=false}={}) {
  const calls=[]
  const admin={from(table){
    const request={table,fields:'',orders:[],start:0,end:0}; calls.push(request)
    return {select(fields,options){request.fields=fields;check(options.count,'exact','every page requires exact count');return this},
      order(column,options){request.orders.push([column,options.ascending]);return this},
      range(start,end){request.start=start;request.end=end;return this},
      then(resolve,reject){
        if(throwNetwork) return Promise.reject(new Error('synthetic transport')).then(resolve,reject)
        if(table===failTable || (table==='email_log' && failPage && request.start>=failPage))
          return Promise.resolve({data:null,error:{message:'private fixture failure'},count:null}).then(resolve,reject)
        if(missingHandling && request.fields.includes('handled_at')) return Promise.resolve({data:null,error:{code:'42703',message:'column handled_at does not exist'}}).then(resolve,reject)
        assert.ok(!/\bhtml\b|text_body/.test(request.fields),'never fetch message bodies')
        const all=[...(table==='email_log'?emails:table==='leads'?leads:companies)].sort((a,b)=>{
          for(const [key,ascending] of request.orders){const value=String(a[key]).localeCompare(String(b[key]));if(value)return ascending?value:-value}return 0
        })
        // Simulate configured server cap 73, lower than the requested 500.
        const data=all.slice(request.start,Math.min(request.end+1,request.start+73))
        return Promise.resolve({data,error:null,count:noCount?null:all.length+(drift&&request.start>0?1:0)}).then(resolve,reject)
      }}
  }}
  return {admin,calls}
}
const fixture=client()
const history=await getAdminEmailHistory(fixture.admin)
check(history.error,null,'complete scan succeeds')
check(history.total,36,'all direct records counted past newer business history')
check(history.rows.length,25,'page size 25')
check(history.categoryCounts.business,721,'business counts full history')
check(history.categoryCounts.admin_alerts,1,'alerts isolated')
check(history.categoryCounts.unclassified,2,'unknown/conflict retained')
check(history.unlinkedFoundCount,1,'unlinked direct visible separately')
check(history.unlinkedLoginCount,1,'unlinked login count')
check(plain(history.clients.map(c=>c.id)),['barrio','marketing','rc','zero'],'current clients use explicit flags; real marketing addresses stay included')
check(history.clients.find(c=>c.id==='marketing').messageCount,0,'marketing email address never implies test identity')
check(history.clients.find(c=>c.id==='zero').messageCount,0,'zero-message clients visible')
check(history.clients.find(c=>c.id==='rc').subscription_status,'canceled','stored state unchanged not billing verified')
check(history.clients.find(c=>c.id==='rc').issueCount,1,'legacy delayed issue counted')
check(history.clients.find(c=>c.id==='barrio').messageCount,33,'admin/business/unlinked never inflate client direct count')
assert.ok(fixture.calls.filter(c=>c.table==='email_log').length>10);checks++
const page2=await getAdminEmailHistory(client().admin,{page:2})
check(page2.total,36,'same full-history count on next page')
check(page2.rows.length,11,'remaining page')
check(new Set([...history.rows,...page2.rows].map(r=>r.id)).size,36,'same-timestamp stable ID tie-break no overlap')
const older=await getAdminEmailHistory(client().admin,{q:'direct-000'})
check(older.total,1,'search applies after full scan')
const unlinked=await getAdminEmailHistory(client().admin,{clientId:'unlinked'})
check(plain(unlinked.rows.map(r=>r.id)),['unlinked-login'],'explicit unlinked filter; no email inference')
const barrio=await getAdminEmailHistory(client().admin,{clientId:'barrio'})
check(barrio.total,33,'company links only')
check(barrio.rows.some(r=>r.id==='unlinked-login'),false,'matching recipient email never implies company link')
const issues=await getAdminEmailHistory(client().admin,{status:'issues'})
check(issues.total,3,'issues across full direct history')
const flagged=await getAdminEmailHistory(client().admin,{category:'business',status:'flagged'})
check(flagged.total,721,'staff-flagged delivery-success emails remain reviewable')
check(flagged.rows.every(row=>row.staff_flagged && row.success && row.delivery_status==='delivered'),true,'staff signal distinct from delivery status')
const businessIssues=await getAdminEmailHistory(client().admin,{category:'business',status:'issues'})
check(businessIssues.total,0,'staff flags never become delivery issues')
check(flagged.categoryCounts.business,721,'staff flags never change category')
const handled=await getAdminEmailHistory(client().admin,{status:'handled'})
check(plain(handled.rows.map(r=>r.id)),['handled'],'handled filter')
const all=await getAdminEmailHistory(client().admin,{category:'all'})
check(all.total,emails.length,'all records preserved')
check(all.rows.every(r=>r.category===r.history_category),true,'compatibility category alias')
for(const failure of [{failPage:300},{failTable:'companies'},{failTable:'leads'},{throwNetwork:true},{noCount:true},{drift:true}]){
  const result=await getAdminEmailHistory(client(failure).admin)
  check(typeof result.error,'string','incomplete metadata unavailable')
  check(result.total,null,'no partial/zero count on errors')
  check(result.categoryCounts,null,'no misleading empty categories')
  check(result.rows.length,0,'partial rows withheld')
}
const fallback=await getAdminEmailHistory(client({missingHandling:true}).admin)
check(fallback.error,null,'missing optional handling fields supported')
check(fallback.handlingReady,false,'handling unavailable explicit')
check(fallback.total,36,'fallback also scans full history')

// Actual page must authorize before accessing the service client/loader.
let authorized=false,loaderCalls=0,clientCalls=0
const page=load('src/app/admin/emails/page.tsx',{
  '../lib':{requireAdmin:async()=>{if(!authorized)throw new Error('Not authorized')},getAdminClient:()=>{clientCalls++;return {}}},
  '@/lib/admin/emailHistory':{getAdminEmailHistory:async()=>{loaderCalls++;return history}},
  './EmailsWorkspace':{default:()=>null},'react/jsx-runtime':{jsx:()=>null,jsxs:()=>null},
  'next/link':{default:()=>null},
}).default
await assert.rejects(page({searchParams:Promise.resolve({})}),/Not authorized/);checks++
check(loaderCalls,0,'unauthorized caller never loads history')
check(clientCalls,0,'unauthorized caller never creates service client')
authorized=true
await page({searchParams:Promise.resolve({})})
check(loaderCalls,1,'authorized caller reaches loader')
console.log(`Admin email history passed: ${checks} checks; synthetic metadata only, >300 history, server cap 73, conservative categories, client inventory and guarded caller. No live reads/writes/sends.`)
