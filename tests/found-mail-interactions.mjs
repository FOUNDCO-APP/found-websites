// Actual React client components hydrated locally; synthetic actions, no network.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import React, {act} from 'react'
import {renderToString} from 'react-dom/server'
import {hydrateRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://example.invalid/admin/emails/received/fixture'})
for(const key of ['window','document','HTMLElement','HTMLInputElement','HTMLFormElement','HTMLButtonElement','Event','SubmitEvent','FormData','MutationObserver'])globalThis[key]=dom.window[key]
globalThis.IS_REACT_ACT_ENVIRONMENT=true
let checks=0,root,refreshes=0,saves=0,sends=0,resolveSend
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++}
const message={id:'00000000-0000-4000-8000-000000000001',from_address:'sender@example.test',from_name:'Synthetic sender',reply_to_address:null,to_addresses:['hello@foundco.app'],subject:'Synthetic inquiry',body_text:'<img src="https://tracker.invalid/pixel">Plain text only',processing_state:'ready',folder:'inbox',read_at:null,spam_reasons:[],hard_blocked:false,attachments:[],reply_warnings:[],last_error:null}
let data={message,replies:[],error:null},lastForm
const draftId='00000000-0000-4000-8000-000000000002'
const actions={
 async saveReplyDraft(form){saves++;lastForm=form;data={...data,replies:[{id:draftId,status:'draft',body_text:form.get('body'),to_address:message.from_address,from_address:'hello@foundco.app',subject:'Re: Synthetic inquiry',updated_at:'2026-10-28T13:00:00Z'}]};return {success:true,replyId:draftId,message:'Draft saved. Review it before sending.'}},
 async sendManualReply(form){sends++;lastForm=form;return new Promise(resolve=>{resolveSend=resolve})},
 ...Object.fromEntries(['markMailRead','moveMail','setSenderRule','retryMailRetrieval'].map(name=>[name,async()=>({success:true,message:'Saved.'})]))
}
// JSX's automatic runtime passes props, unlike React.createElement.
const runtime=await import('react/jsx-runtime')
function loadComponent(file){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,window,document,crypto:globalThis.crypto,fetch:(...args)=>globalThis.fetch(...args),AbortController,require:name=>{
 if(name==='react')return React
 if(name==='react/jsx-runtime')return runtime
 if(name==='next/navigation')return {useRouter:()=>({refresh(){refreshes++;root.render(element())}})}
 if(name==='./actions')return actions
 throw Error('Unexpected import '+name)
 }});return module.exports.default}
const Conversation=loadComponent('src/app/admin/emails/received/Conversation.tsx')
const element=()=>React.createElement(Conversation,{data,replyTarget:{to:message.from_address,from:'hello@foundco.app',warnings:[]},receivingEnabled:true,sendEnabled:true,draftId})
const container=document.getElementById('root')
container.innerHTML=renderToString(element())
await act(async()=>{root=hydrateRoot(container,element())})
check(container.querySelectorAll('img').length,0,'plain text never creates remote images')
check(container.textContent.includes('<img src='),true,'HTML source remains text')
const textarea=container.querySelector('textarea')
await act(async()=>{Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set.call(textarea,'My reviewed reply');textarea.dispatchEvent(new window.Event('input',{bubbles:true}));textarea.dispatchEvent(new window.Event('change',{bubbles:true}))})
// React change-event support differs under JSDOM; submit the real form field.
textarea.value='My reviewed reply'
await act(async()=>{textarea.form.dispatchEvent(new window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:textarea.form.querySelector('button')}));await new Promise(r=>setTimeout(r,5))})
check(saves,1,'Save calls only draft action')
check(sends,0,'Save never sends')
check(lastForm.get('replyId'),draftId,'stable intent ID survives hydration')
check(refreshes,1,'saved draft refreshes persisted review')
check(container.textContent.includes('My reviewed reply'),true,'persisted draft shown for review')
let sendButton=[...container.querySelectorAll('button')].find(button=>button.textContent==='Send reply')
check(!!sendButton,true,'separate Send control appears only for saved draft')
await act(async()=>{sendButton.form.dispatchEvent(new window.SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:sendButton}));await new Promise(r=>setTimeout(r,5))})
check(sends,1,'explicit Send invokes reply action once')
check(lastForm.get('expectedTo'),message.from_address,'reviewed recipient submitted')
check(lastForm.get('expectedFrom'),'hello@foundco.app','reviewed approved From submitted')
check(lastForm.get('expectedVersion'),'2026-10-28T13:00:00Z','reviewed version submitted')
check(sendButton.disabled,true,'pending send control disabled')
await act(async()=>{resolveSend({success:false,state:'unconfirmed',error:'Send status unconfirmed. Do not resend.'});await new Promise(r=>setTimeout(r,5))})
check(container.textContent.includes('Do not resend.'),true,'uncertain result visible')
check(sendButton.disabled,true,'uncertain result does not offer blind resend')
await act(async()=>root.unmount())

// Actual polling component: one in-app count, no external notifications.
let requests=0,mode='count'
globalThis.fetch=async(url,options)=>{requests++;check(url,'/api/admin/mail-unread','same-origin count route');check(options.cache,'no-store','count not cached');return {ok:mode!=='error',json:async()=>({count:3,error:null})}}
const MailUnread=loadComponent('src/app/admin/emails/received/MailUnread.tsx')
Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'})
const unread=React.createElement(MailUnread)
container.innerHTML=renderToString(unread)
await act(async()=>{root=hydrateRoot(container,unread);await new Promise(r=>setTimeout(r,5))})
check(container.textContent,'3','in-app unread count displayed')
mode='error'
await act(async()=>{window.dispatchEvent(new window.Event('found:mail-updated'));await new Promise(r=>setTimeout(r,5))})
check(container.textContent,'','unavailable count never becomes false zero')
const before=requests
Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'})
await act(async()=>{document.dispatchEvent(new window.Event('visibilitychange'));await new Promise(r=>setTimeout(r,5))})
check(requests,before,'hidden tab does not poll')
await act(async()=>root.unmount())
dom.window.close()
console.log(`${checks} hydrated React mail interaction checks passed; synthetic actions and count endpoint, no provider or live operations.`)
