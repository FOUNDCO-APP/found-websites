import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import * as runtime from 'react/jsx-runtime'

let reads=0,denied=false,exists=true,checks=0
const id='00000000-0000-4000-8000-000000000001'
const environment={}
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const module={exports:{}}
const Shell=()=>null, Compose=()=>null
const mocks={
  '../../lib':{requireAdmin:async()=>{if(denied)throw Error('Not authorized')},getAdminClient:()=>{reads++;return {fixture:true}}},
  '@/lib/admin/mailStore':{getComposeDraft:async(admin,draftId)=>{assert.equal(admin.fixture,true);assert.equal(draftId,id);return {draft:exists?{id,status:'draft'}:null,error:null}}},
  '@/lib/mailSafety':{FOUND_MAIL_ADDRESSES:['hello@foundco.app','support@foundco.app','shawn@foundco.app']},
  'node:crypto':{randomUUID:()=>id},
  '../MailNavigation':{default:Shell},'./ComposeWorkspace':{default:Compose},
}
const file='src/app/admin/emails/compose/page.tsx'
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,process:{env:environment},require:name=>name==='react/jsx-runtime'?runtime:mocks[name]??(()=>{throw Error('Unexpected dependency '+name)})()})
const Page=module.exports.default
function props(element){if(!element||typeof element!=='object')return null;if(element.type===Compose)return element.props;for(const child of Array.isArray(element.props?.children)?element.props.children:[element.props?.children]){const found=props(child);if(found)return found}return null}
denied=true
await assert.rejects(()=>Page({searchParams:Promise.resolve({draft:id})}),/Not authorized/);checks++
check(reads,0,'denied admin creates no DB client')
denied=false
let result=props(await Page({searchParams:Promise.resolve({draft:id})}))
check(reads,0,'disabled Compose performs no DB read')
check(result.enabled,false,'disabled drafting explicit')
check(result.sendEnabled,false,'disabled sending explicit')
environment.FOUND_INBOUND_ENABLED='true'
result=props(await Page({searchParams:Promise.resolve({draft:'../../other'})}))
check(reads,0,'invalid draft ID never reaches DB')
check(!!result.error,true,'invalid draft fails closed')
result=props(await Page({searchParams:Promise.resolve({})}))
check(reads,0,'new unsaved Compose needs no DB call')
check(result.draftId,id,'new draft has stable server-generated UUID')
result=props(await Page({searchParams:Promise.resolve({draft:id})}))
check(reads,1,'persisted draft read through authenticated loader')
check(result.draft.id,id,'only requested draft shown')
check(result.approvedFromAddresses.join(','),'hello@foundco.app,support@foundco.app,shawn@foundco.app','only backend-approved aliases passed')
check(result.sendEnabled,false,'sending remains disabled without second feature flag')
environment.FOUND_MAIL_SEND_ENABLED='true'
result=props(await Page({searchParams:Promise.resolve({draft:id})}))
check(result.sendEnabled,true,'both flags enable Send UI')
exists=false
result=props(await Page({searchParams:Promise.resolve({draft:id})}))
check(!!result.error,true,'missing persisted draft is not silently treated as new')
console.log(`${checks} Compose page boundary checks passed; synthetic admin/store only, no database or network calls.`)
