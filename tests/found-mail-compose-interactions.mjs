// Actual hydrated frontend; synthetic actions only. Never loads server actions or providers.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://fixture.invalid/admin/emails/compose' })
for (const key of ['window','document','HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLFormElement','HTMLButtonElement','Event','SubmitEvent','FormData','MutationObserver','navigator']) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] })
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const React = await import('react')
const { act } = React
const runtime = await import('react/jsx-runtime')
const { hydrateRoot } = await import('react-dom/client')
const { renderToString } = await import('react-dom/server')
let checks=0, saves=0, sends=0, refreshes=0, root, currentElement, latestForm, finishSend
const check = (a,b,label) => { assert.deepEqual(a,b,label);checks++ }
const id='00000000-0000-4000-8000-000000000002', version='2026-10-28T13:00:00Z'
let savedDraft=null, aliasData=null
const actions={
  async saveComposeDraft(form) {
    saves++; latestForm=form
    savedDraft={id:form.get('draftId'),to_address:form.get('to'),from_address:form.get('from'),subject:form.get('subject'),body_text:form.get('body'),status:'draft',updated_at:version,last_error:null}
    return {success:true,draftId:id,replyId:id,state:'draft',message:'Draft saved.'}
  },
  async sendComposeDraft(form) {sends++;latestForm=form;return new Promise(resolve=>{finishSend=resolve})},
  async saveReplyDraft(form) {saves++;latestForm=form;if(aliasData)aliasData={...aliasData,replies:[{id,status:'draft',body_text:form.get('body'),to_address:aliasData.message.from_address,from_address:form.get('from'),subject:'Re: '+aliasData.message.subject,updated_at:version,last_error:null}]};return {success:true,replyId:id,state:'draft'}},
  async sendManualReply(form) {sends++;latestForm=form;return new Promise(resolve=>{finishSend=resolve})},
  ...Object.fromEntries(['markMailRead','moveMail','setSenderRule','retryMailRetrieval'].map(name=>[name,async()=>({success:true})])),
}
const router={replace(){},refresh(){refreshes++;root.render(currentElement())}}
function load(file) {
  const module={exports:{}}
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,window,document,Event:window.Event,crypto:globalThis.crypto,require:name=>{
    if(name==='react')return React
    if(name==='react/jsx-runtime')return runtime
    if(name==='next/navigation')return {useRouter:()=>router}
    if(name.endsWith('/actions')||name==='./actions')return actions
    throw Error('Unexpected runtime import '+name)
  }})
  return module.exports.default
}
const Compose=load('src/app/admin/emails/compose/ComposeWorkspace.tsx')
const Conversation=load('src/app/admin/emails/received/Conversation.tsx')
const container=document.getElementById('root')
async function mount(element) {
  currentElement=element
  container.innerHTML=renderToString(element())
  await act(async()=>{root=hydrateRoot(container,element())})
}
async function unmount(){await act(async()=>root.unmount());container.innerHTML=''}
async function change(selector,value) {
  const field=container.querySelector(selector)
  await act(async()=>{
    const proto=field.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:field.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto,'value').set.call(field,value)
    field.dispatchEvent(new window.Event(field.tagName==='SELECT'?'change':'input',{bubbles:true}))
  })
}
const button=text=>[...container.querySelectorAll('button')].find(el=>el.textContent===text)
async function submit(control){await act(async()=>{control.form.dispatchEvent(new window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:control}));await new Promise(resolve=>setTimeout(resolve,5))})}
const aliases=['hello@foundco.app','support@foundco.app','shawn@foundco.app']
await mount(()=>React.createElement(Compose,{draftId:id,draft:savedDraft,approvedFromAddresses:aliases,enabled:true,sendEnabled:true}))
check(button('Save draft').disabled,true,'blank compose cannot save')
check(container.querySelector('select[name="from"]').value,'','From requires explicit choice')
check([...container.querySelectorAll('select[name="from"] option')].slice(1).map(x=>x.value),aliases,'only approved From aliases')
await change('input[name="to"]','recipient@example.invalid')
await change('select[name="from"]','shawn@foundco.app')
await change('input[name="subject"]','A synthetic question')
await change('textarea[name="body"]','Literal <img src="https://tracker.invalid/pixel"> text')
check(button('Save draft').disabled,false,'valid edited compose can save')
await submit(button('Save draft'))
check(saves,1,'save action called once');check(sends,0,'Save never sends')
check(latestForm.get('draftId'),id,'stable draft UUID submitted')
check(latestForm.get('from'),'shawn@foundco.app','explicit approved From submitted')
check(refreshes,1,'save refreshes persisted review')
check(container.querySelector('textarea').value,savedDraft.body_text,'typed text preserved after refresh')
check(container.querySelectorAll('img').length,0,'plaintext review never creates remote image')
check(!!button('Send email'),true,'separate explicit Send appears for persisted draft')
await change('input[name="subject"]','Unsaved subject')
check(button('Send email').disabled,true,'unsaved edits block sending old draft')
await change('input[name="subject"]','A synthetic question')
check(button('Send email').disabled,false,'matching persisted review may be sent explicitly')
await submit(button('Send email'))
check(sends,1,'only explicit send action called')
for(const [key,value] of Object.entries({draftId:id,expectedTo:savedDraft.to_address,expectedFrom:savedDraft.from_address,expectedSubject:savedDraft.subject,expectedVersion:version})) check(latestForm.get(key),value,'immutable review field '+key)
check(button('Sending...').disabled,true,'pending Send disabled')
await act(async()=>{finishSend({success:false,state:'unconfirmed',error:'Unconfirmed. Do not resend.'});await new Promise(resolve=>setTimeout(resolve,5))})
check(container.textContent.includes('Do not resend.'),true,'uncertain send result visible')
check(button('Send email').disabled,true,'uncertain send cannot be resubmitted')
check(button('Save draft').disabled,true,'uncertain send cannot mutate draft')
await unmount()
await mount(()=>React.createElement(Compose,{draftId:id,draft:{...savedDraft,status:'accepted'},approvedFromAddresses:aliases,enabled:true,sendEnabled:true}))
check(button('Save draft').disabled,true,'accepted draft cannot be edited')
check(!!button('Send email'),false,'accepted draft has no new send action')
await unmount()
await mount(()=>React.createElement(Compose,{draftId:id,draft:savedDraft,approvedFromAddresses:aliases,enabled:false,sendEnabled:false}))
check(button('Save draft').disabled,true,'disabled drafting blocks Save')
check(button('Send email').disabled,true,'disabled sending blocks Send')
check(container.textContent.includes('Email sending is not enabled yet.'),true,'disabled state honest')
await unmount()

const message={id:'00000000-0000-4000-8000-000000000001',from_address:'sender@example.invalid',from_name:'Example sender',reply_to_address:null,to_addresses:['hello@foundco.app','support@foundco.app'],subject:'Multi-alias question',body_text:'Hello',processing_state:'ready',folder:'inbox',read_at:null,spam_reasons:[],hard_blocked:false,attachments:[],last_error:null}
const multi={to:message.from_address,from:null,fromOptions:message.to_addresses,requiresFromChoice:true,warnings:[]}
aliasData={message,replies:[],error:null}
await mount(()=>React.createElement(Conversation,{data:aliasData,replyTarget:multi,receivingEnabled:true,sendEnabled:true,draftId:id,initialDraft:'My reply'}))
check(container.querySelector('select[name="from"]').value,'','multiple known aliases require explicit choice')
check(button('Save draft').disabled,true,'ambiguous From blocks save')
await change('select[name="from"]','support@foundco.app')
check(button('Save draft').disabled,false,'selected addressed alias allows draft')
await submit(button('Save draft'))
check(latestForm.get('from'),'support@foundco.app','reply action gets explicit addressed From')
check(!!button('Send reply'),true,'saved multi-alias reply exposes separate explicit Send')
await submit(button('Send reply'))
check(latestForm.get('expectedFrom'),'support@foundco.app','multi-alias Send preserves persisted From')
check(latestForm.get('expectedVersion'),version,'multi-alias Send preserves persisted version')
await act(async()=>{aliasData={...aliasData,replies:aliasData.replies.map(reply=>({...reply,status:'accepted'}))};finishSend({success:true,state:'accepted',message:'Accepted by provider; not proof of delivery.'});await new Promise(resolve=>setTimeout(resolve,5))})
check(button('Save draft').disabled,true,'sent multi-alias draft cannot be edited')
check(!!button('Send reply'),false,'accepted multi-alias draft cannot be sent twice')
await unmount()
const unique={...multi,from:'support@foundco.app',fromOptions:['support@foundco.app'],requiresFromChoice:false}
await mount(()=>React.createElement(Conversation,{data:{message:{...message,to_addresses:['support@foundco.app']},replies:[],error:null},replyTarget:unique,receivingEnabled:true,sendEnabled:true,draftId:id,initialDraft:'My reply'}))
check(container.querySelector('input[name="from"]').value,'support@foundco.app','unique addressed alias defaults correctly')
check(container.querySelectorAll('select[name="from"]').length,0,'unique alias needs no extra choice')
await unmount()
await mount(()=>React.createElement(Conversation,{data:{message:{...message,to_addresses:['unknown@foundco.app'],spam_reasons:['Sent to an unsupported Found address'],hard_blocked:true},replies:[],error:null},replyTarget:{to:null,from:null,fromOptions:[],warnings:[]},receivingEnabled:true,sendEnabled:true,draftId:id,initialDraft:'My reply'}))
check(container.textContent.includes('Unknown catch-all recipient.'),true,'unknown catch-all clearly labeled after rescue')
check(button('Save draft').disabled,true,'rescue does not create sending identity')
check(container.querySelectorAll('select[name="from"]').length,0,'unknown address is never a sender option')
await unmount()
for (const folder of ['spam','inbox']) {
  await mount(()=>React.createElement(Conversation,{data:{message:{...message,folder,to_addresses:['unknown@foundco.app'],spam_reasons:['Sent to an unsupported Found address'],hard_blocked:false},replies:[],error:null},replyTarget:{to:message.from_address,from:null,fromOptions:aliases,requiresFromChoice:true,warnings:[]},receivingEnabled:true,sendEnabled:true,draftId:id,initialDraft:'My reply'}))
  check(button('Save draft').disabled,true,'unknown recipient requires explicit approved From in '+folder)
  check([...container.querySelectorAll('select[name="from"] option')].some(option=>option.value==='unknown@foundco.app'),false,'unknown recipient never becomes sender')
  await change('select[name="from"]','shawn@foundco.app')
  check(button('Save draft').disabled,folder==='spam','approved sender allows draft only after rescue')
  await unmount()
}
dom.window.close()
console.log(`${checks} hydrated Compose/alias checks passed; synthetic actions only, no DB, provider or network calls.`)
