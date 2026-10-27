// Synthetic Barrio only. No credentials, network, Stripe, or email providers.
// Run: node tests/pro-included-choice.mjs (or set NODE_PATH to isolated deps).
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { PGlite } = require('@electric-sql/pglite')
const ts = require('typescript')
const db = new PGlite()
const companyId = '00000000-0000-4000-8000-000000000001'
const actorId = '00000000-0000-4000-8000-000000000002'
const otherId = '00000000-0000-4000-8000-000000000003'
const email = 'barrio-owner@example.test'
const slugs = ['online_ordering', 'shopping_cart', 'quote_payments', 'reservation_calendar', 'email_marketing']
let checks = 0
function check(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++ }
await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create table public.companies (
    id uuid primary key, user_id uuid, email text, plan text, subscription_status text,
    retired_at timestamptz, included_addon_slug text, disabled_addons text[],
    config jsonb default '{"keep":true}', stripe_customer_id text default 'synthetic-do-not-change');
  create table public.company_members (company_id uuid, user_id uuid, email text, role text, status text);
  create table public.addon_subscriptions (company_id uuid, addon_slug text, active boolean);
  create table public.company_availability (
    company_id uuid, day_of_week smallint, block_order smallint,
    is_working boolean, start_time time, end_time time, slot_duration_minutes integer,
    buffer_minutes integer, unique(company_id, day_of_week, block_order));
  grant usage on schema public to service_role;
  grant select, insert, update on all tables in schema public to service_role;
`)
const migration = fs.readdirSync('supabase/migrations').find(f => f.endsWith('_pro_included_choice_guard.sql'))
await db.exec(fs.readFileSync(`supabase/migrations/${migration}`, 'utf8'))
const visibilityMigration = fs.readdirSync('supabase/migrations').find(f => f.endsWith('_atomic_addon_visibility.sql'))
await db.exec(fs.readFileSync(`supabase/migrations/${visibilityMigration}`, 'utf8'))
async function reset(overrides = {}) {
  await db.exec('truncate companies, company_members, addon_subscriptions, company_availability')
  await db.query(`insert into companies (id,user_id,email,plan,subscription_status,included_addon_slug,disabled_addons)
    values ($1,$2,$3,$4,$5,$6,$7)`, [companyId, actorId, email, 'found_pro', 'active', null, [],])
  for (const [key, value] of Object.entries(overrides)) {
    assert.ok(['user_id','email','plan','subscription_status','retired_at','included_addon_slug','disabled_addons'].includes(key))
    await db.query(`update companies set ${key}=$1 where id=$2`, [value, companyId])
  }
}
async function call(slug, expected = null, consent = false, actor = actorId, actorEmail = email) {
  return (await db.query('select public.select_pro_included_addon($1,$2,$3,$4,$5,$6) as result',
    [companyId, actor, actorEmail, slug, expected, consent])).rows[0].result
}
async function snapshot() {
  return { company: (await db.query('select * from companies')).rows,
    hours: (await db.query('select * from company_availability order by day_of_week')).rows,
    paid: (await db.query('select * from addon_subscriptions')).rows }
}
async function visibility(slug, hide) {
  return (await db.query('select public.set_addon_visibility_atomic($1,$2,$3) as result',
    [companyId,slug,hide])).rows[0].result
}
try {
  const proc = (await db.query(`select prosecdef,proconfig from pg_proc where proname='select_pro_included_addon'`)).rows[0]
  check(proc.prosecdef, false, 'invoker only')
  assert.ok(proc.proconfig.some(v => v.startsWith('search_path='))); checks++
  for (const role of ['anon','authenticated']) {
    check((await db.query(`select has_function_privilege($1,
      'public.select_pro_included_addon(uuid,uuid,text,text,text,boolean)','EXECUTE') as allowed`, [role])).rows[0].allowed, false, role)
  }
  await reset()
  await db.exec('set role service_role')
  check((await call('quote_payments')).success, true, 'service role works')
  await db.exec('reset role')
  for (const slug of slugs) {
    await reset()
    check((await call(slug)).success, true, `allowed ${slug}`)
  }
  for (const overrides of [{plan:'found'}, {plan:'found_business'}, {plan:null},
    {subscription_status:'past_due'}, {subscription_status:null}, {subscription_status:'canceled'},
    {retired_at:'2026-10-26T00:00:00Z'}, {user_id:otherId,email:null}]) {
    await reset(overrides)
    const before = await snapshot()
    check((await call('quote_payments')).success, false, 'eligibility/owner denied')
    check(await snapshot(), before, 'denial changes nothing')
  }
  await reset({subscription_status:'trialing'})
  check((await call('quote_payments')).success, true, 'trialing')
  await reset()
  check((await call('unknown')).success, false, 'allowlist')
  check((await call('quote_payments', null, false, otherId, 'worker@example.test')).success, false, 'cross-tenant')
  await db.query(`insert into company_members values ($1,$2,$3,'worker','active')`, [companyId,otherId,'worker@example.test'])
  check((await call('quote_payments',null,false,otherId,'worker@example.test')).success,false,'worker denied')
  await db.exec(`update company_members set role='owner'`)
  check((await call('quote_payments',null,false,otherId,'worker@example.test')).success,true,'member owner')
  await reset({disabled_addons:['quote_payments','shopping_cart','email_marketing']})
  const hidden = await snapshot()
  check((await call('quote_payments')).success, false, 'explicit unhide required')
  check(await snapshot(), hidden, 'no implicit consent')
  check((await call('quote_payments',null,true)).success,true,'consented unhide')
  const afterSelection = await snapshot()
  check((await call('quote_payments',null,true)).success,false,'exact request retry with stale null expected pick fails')
  check(await snapshot(),afterSelection,'stale exact retry preserves all state')
  check((await snapshot()).company[0].disabled_addons,['shopping_cart','email_marketing'],'selected only')
  check((await snapshot()).company[0].config, {keep:true}, 'config preserved')
  check((await snapshot()).company[0].stripe_customer_id,'synthetic-do-not-change','billing preserved')
  check((await call('email_marketing',null,true)).success,false,'stale concurrent choice rejected')
  check((await call('quote_payments','quote_payments')).success,true,'idempotent same-choice retry')
  check((await call(null,'quote_payments')).success,true,'clear choice')
  check((await snapshot()).company[0].disabled_addons,['shopping_cart','email_marketing'],'clear preserves flags')
  await reset()
  await db.query('insert into addon_subscriptions values ($1,$2,true)',[companyId,'email_marketing'])
  const paid = await snapshot()
  check((await call('email_marketing')).success,false,'paid choice rejected')
  check(await snapshot(),paid,'paid rows and billing untouched')
  await reset()
  check((await call('reservation_calendar')).success,true,'calendar selection')
  const seeded = await snapshot()
  check(seeded.hours.length,0,'no calendar defaults; setup remains separate')
  await call('reservation_calendar','reservation_calendar')
  check(await snapshot(),seeded,'calendar retry unchanged')
  await reset()
  await db.query(`insert into company_availability values ($1,2,1,true,'11:15','14:30',25,10)`,[companyId])
  const hours = (await snapshot()).hours
  await call('reservation_calendar')
  check((await snapshot()).hours,hours,'custom hours completely preserved')
  await reset({disabled_addons:['reservation_calendar','shopping_cart']})
  await db.exec(`create function reject_fixture_hours() returns trigger language plpgsql as $$
    begin raise exception 'synthetic initialization failure'; end $$;
    create trigger reject_fixture_hours before insert on company_availability
    for each row execute function reject_fixture_hours();`)
  check((await call('reservation_calendar',null,true)).success,true,'calendar selection never inserts hours')
  check((await snapshot()).hours,[],'calendar selection with rejecting insert trigger leaves hours empty')
  await db.exec('drop trigger reject_fixture_hours on company_availability')
  for (const role of ['anon','authenticated']) {
    check((await db.query(`select has_function_privilege($1,
      'public.set_addon_visibility_atomic(uuid,text,boolean)','EXECUTE') as allowed`,[role])).rows[0].allowed,false,'visibility server only')
  }
  check((await db.query(`select prosecdef from pg_proc where proname='set_addon_visibility_atomic'`)).rows[0].prosecdef,false,'visibility invoker')
  await reset({disabled_addons:['quote_payments','email_marketing']})
  await db.exec('set role service_role')
  check((await visibility('shopping_cart',true)).success,true,'service visibility hide')
  await call('quote_payments',null,true)
  check((await snapshot()).company[0].disabled_addons,['email_marketing','shopping_cart'],'selection preserves preceding hide')
  await visibility('reservation_calendar',true)
  check((await snapshot()).company[0].disabled_addons,['email_marketing','shopping_cart','reservation_calendar'],'subsequent hide never restores unhidden pick')
  await visibility('email_marketing',false)
  await visibility('reservation_calendar',true)
  check((await snapshot()).company[0].disabled_addons,['shopping_cart','reservation_calendar'],'only selected removed; repeated hide no duplicates')
  await db.exec('reset role')
  const visibilityBefore = await snapshot()
  check((await visibility('unknown',true)).success,false,'visibility allowlist')
  check((await visibility('quote_payments',null)).success,false,'visibility boolean required')
  check(await snapshot(),visibilityBefore,'invalid visibility no changes')
  await reset({retired_at:'2026-10-26T00:00:00Z'})
  const retired = await snapshot()
  check((await visibility('shopping_cart',true)).success,false,'retired visibility denied')
  check(await snapshot(),retired,'retired untouched')

  // Execute the actual server action with provider imports forbidden and RPC backed by SQL above.
  let authorized = true, authFailure = false, rpcFailure = false, malformed = false, rpcError = false, rpcCalls = 0
  let activityFailure = false
  const activityEvents = []
  const forbidden = () => { throw new Error('Forbidden provider/side effect') }
  const stubs = {
    stripe: class { constructor() { forbidden() } },
    '@/lib/supabase/admin': { createAdminClient: () => ({ rpc: async (name,args) => {
      rpcCalls++
      if (rpcFailure) throw new Error('synthetic network failure')
      if (rpcError) return {data:null,error:{message:'synthetic private SQL failure'}}
      if (malformed) return {data:null,error:null}
      if (name === 'set_addon_visibility_atomic') return {data:await visibility(args.p_addon_slug,args.p_hide),error:null}
      return {data:await call(args.p_addon_slug,args.p_expected_pick,args.p_confirm_turn_on,args.p_actor_id,args.p_actor_email),error:null}
    } }) },
    'next/navigation': {redirect:forbidden},
    '@/lib/bookings/ensureDefaultAvailability': {ensureDefaultAvailability:forbidden},
    '@/lib/auth/getAuthUser': {getAuthUser:async () => {
      if (authFailure) throw new Error('synthetic auth failure')
      return {id:actorId,email}
    }},
    '@/lib/dashboard/getCompany': {getCompany:async () => ({id:companyId}),requireOwnerAccess:async () => authorized},
    '@/lib/customerActivity': {recordCustomerActivity:async event => {
      if (activityFailure) throw new Error('synthetic activity failure')
      activityEvents.push(JSON.parse(JSON.stringify(event)))
    }},
    '@/lib/featureAccess': {ALL_ADDONS:slugs.map(slug => ({slug}))},
    '@/lib/billingPlanEvents': {recordBillingPlanEvent:forbidden},
  }
  const module = {exports:{}}
  const source = fs.readFileSync('src/app/dashboard/(app)/more/actions.ts','utf8')
  const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
  vm.runInNewContext(compiled,{module,exports:module.exports,process:{env:{}},require:name => {
    assert.ok(Object.hasOwn(stubs,name),`Unexpected dependency ${name}`)
    return stubs[name]
  }})
  const select = module.exports.switchIncludedAddon
  await reset()
  const options = {expectedIncludedAddonSlug:null,confirmTurnOn:false}
  for (const args of [[companyId,'quote_payments'],[companyId,'quote_payments',{}],
    [companyId,'unknown',options],['','quote_payments',options]]) {
    check((await select(...args)).success,false,'invalid action arguments')
  }
  check(rpcCalls,0,'invalid input never reaches RPC')
  authorized=false
  check((await select(companyId,'quote_payments',options)).success,false,'server owner guard')
  check(rpcCalls,0,'unauthorized never reaches RPC')
  authorized=true; authFailure=true
  check((await select(companyId,'quote_payments',options)).success,false,'auth rejection returns error')
  authFailure=false; rpcFailure=true
  check((await select(companyId,'quote_payments',options)).success,false,'network rejection returns error')
  rpcFailure=false; malformed=true
  check((await select(companyId,'quote_payments',options)).success,false,'malformed RPC returns error')
  malformed=false; rpcError=true
  const failed = await select(companyId,'quote_payments',options)
  check(failed.success,false,'SQL error returns failure')
  check(failed.error.includes('private SQL'),false,'database details not exposed')
  rpcError=false
  check((await select(companyId,'quote_payments',options)).success,true,'actual action plus SQL success; zero providers')
  check(activityEvents,[{eventType:'included_addon_switched',pathname:'/dashboard/more',metadata:{addon_slug:'quote_payments'}}],'existing activity contract preserved')
  check((await select(companyId,'shopping_cart',options)).success,false,'actual action conflict returned')
  check(activityEvents.length,1,'failed selection emits no activity')
  activityFailure=true
  check((await select(companyId,'shopping_cart',{expectedIncludedAddonSlug:'quote_payments'})).success,true,'activity rejection cannot fail committed save')
  check((await snapshot()).company[0].included_addon_slug,'shopping_cart','save survives activity rejection')
  const toggle = module.exports.toggleAddonVisibility
  authorized=false
  const beforeDeniedToggle = rpcCalls
  check((await toggle(companyId,'quote_payments',true)).success,false,'owner visibility guard')
  check(rpcCalls,beforeDeniedToggle,'unauthorized visibility never calls RPC')
  authorized=true
  check((await toggle(companyId,'quote_payments',true)).success,true,'owner visibility action uses RPC; activity failure harmless')
  check((await snapshot()).company[0].disabled_addons,['quote_payments'],'owner toggles one flag')
  // Load actual admin action: guard stays intact; any whole-array table access fails.
  let adminAuthorized = false
  const adminModule = {exports:{}}
  const adminCompiled = ts.transpileModule(fs.readFileSync('src/app/admin/businesses/actions.ts','utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const adminStubs = {
    'next/headers': {cookies:async () => ({get:() => adminAuthorized ? {value:'synthetic-admin-key'} : undefined})},
    'next/navigation': {redirect:forbidden},
    '@supabase/supabase-js': {createClient:() => ({rpc:async (name,args) => {
      check(name,'set_addon_visibility_atomic','admin uses same atomic RPC')
      return {data:await visibility(args.p_addon_slug,args.p_hide),error:null}
    }})},
  }
  vm.runInNewContext(adminCompiled,{module:adminModule,exports:adminModule.exports,process:{env:{ADMIN_KEY:'synthetic-admin-key'}},require:name => {
    assert.ok(Object.hasOwn(adminStubs,name)); return adminStubs[name]
  }})
  await assert.rejects(adminModule.exports.setDisabledAddon(companyId,'email_marketing',true),/Not authorized/); checks++
  adminAuthorized=true
  await adminModule.exports.setDisabledAddon(companyId,'email_marketing',true)
  check((await snapshot()).company[0].disabled_addons,['quote_payments','email_marketing'],'admin hide preserves owner flag')
  await toggle(companyId,'quote_payments',false)
  check((await snapshot()).company[0].disabled_addons,['email_marketing'],'owner unhide preserves admin flag')
  check((await snapshot()).hours,[],'both visibility writers leave hours untouched')
  await reset({retired_at:'2026-10-26T00:00:00Z'})
  await assert.rejects(adminModule.exports.setDisabledAddon(companyId,'email_marketing',true),/Could not save/); checks++
  console.log(`${checks} Pro included-choice checks passed (synthetic Barrio; no live writes/providers).`)
  console.log('Row-lock SQL exercised; real multi-session lock scheduling is not simulated by PGlite.')
} finally { await db.close() }
