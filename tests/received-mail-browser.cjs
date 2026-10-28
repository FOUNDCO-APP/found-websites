const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict')
const ts = require('typescript'), React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const { chromium } = require(process.env.FOUND_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..'), out = path.join(root, '.billing-audits/received-preview')
assert.equal(fs.realpathSync(process.cwd()), fs.realpathSync(root), 'Run this harness from its managed worktree root')
const sourceHashes = {}
function recordSource(file) { const full = path.join(root, file); sourceHashes[file] = { path: full, sha256: require('crypto').createHash('sha256').update(fs.readFileSync(full)).digest('hex') } }
fs.mkdirSync(out,{recursive:true})
let actions = 0, network = 0, checks = 0
const check = (value, label) => { assert.ok(value, label); checks++ }
function load(file) {
  recordSource(file)
  const m = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'), { fileName:file, compilerOptions:{ module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022 } }).outputText
  const localRequire = id => {
    if (id === 'react' || id === 'react/jsx-runtime') return require(id)
    if (id === 'next/link') return { __esModule:true,default:({children,...props})=>React.createElement('a',props,children) }
    if (id === 'next/navigation') return {useRouter:()=>({refresh:()=>{throw Error('Refresh not invoked during static fixture')}})}
    if (id === './actions') return new Proxy({}, { get:()=>async()=>{actions++;throw Error('Fixture actions blocked')} })
    throw Error(`Unexpected runtime dependency: ${id}`)
  }
  vm.runInNewContext(code,{module:m,exports:m.exports,require:localRequire,crypto:require('crypto').webcrypto})
  return m.exports.default
}
const Inbox=load('src/app/admin/emails/received/InboxWorkspace.tsx'), Conversation=load('src/app/admin/emails/received/Conversation.tsx'), Navigation=load('src/app/admin/emails/MailNavigation.tsx')
const id='12345678-1234-4234-8234-123456789abc'
const message={id,provider_email_id:id,from_address:'owner@example.invalid',from_name:'Example Owner',reply_to_address:'office@example.invalid',to_addresses:['hello@foundco.app'],subject:'A question about my website and photos',body_text:'Hi Shawn,\n\nCould you help me choose photos for the website?\n\nLiteral untrusted content: <img src="https://tracker.invalid/pixel"> <script>alert(1)</script>\n\nThanks,\nExample Owner',message_id:'<fixture@example.invalid>',in_reply_to:null,reference_ids:[],attachments:[{id:'attachment-fixture',filename:'project-photos.zip',content_type:'application/zip',size:2048,quarantined:true}],folder:'inbox',spam_reasons:[],hard_blocked:false,authentication:{spf:'pass',dkim:'pass',dmarc:'pass'},reply_warnings:['Reply-To differs from the sender.'],read_at:null,processing_state:'ready',received_at:'2026-10-28T16:30:00Z',last_error:null}
const reply={id:'22345678-1234-4234-8234-123456789abc',parent_id:id,body_text:'Hi Example Owner,\n\nI can help you review the photos.\n\nShawn',to_address:'office@example.invalid',from_address:'hello@foundco.app',subject:'Re: '+message.subject,status:'draft',created_at:message.received_at,updated_at:message.received_at}
const target={to:reply.to_address,from:reply.from_address,warnings:['Reply-To differs from the sender. Confirm the exact recipient.']}
const css=['admin.css','v2.css','refined.css'].map(f=>{const file=path.join('src/app/admin',f);recordSource(file);return fs.readFileSync(path.join(root,file),'utf8')}).join('\n')
function markup(mode, enlarged) {
  const spam=mode==='spam', blocked=mode==='blocked', error=mode==='error'
  const body=mode==='inbox'||spam||error ? React.createElement(Inbox,{data:{rows:error?[]:[{...message,folder:spam?'spam':'inbox',spam_reasons:spam?['Sender rule']:[]}],total:error?null:1,error:error?'Fixture unavailable':null},folder:spam?'spam':'inbox',page:1}) : React.createElement(Conversation,{data:{message:{...message,hard_blocked:blocked,folder:blocked?'spam':'inbox',spam_reasons:blocked?['Failed authentication']:[]},replies:[mode==='recorded-send'?{...reply,id:'32345678-1234-4234-8234-123456789abc',status:'accepted'}:reply],error:null},replyTarget:target,draftId:'32345678-1234-4234-8234-123456789abc',receivingEnabled:mode!=='disabled',sendEnabled:false})
  const html=renderToStaticMarkup(React.createElement('div',{className:'hq-page'},React.createElement('header',{className:'hq-header'},React.createElement('div',null,React.createElement('p',{className:'hq-eyebrow'},'Found HQ'),React.createElement('h1',{className:'hq-title'},'Emails'))),React.createElement(Navigation,{active:'received'}),body))
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}html{font-size:${enlarged?32:16}px}body{margin:0;font-family:Arial,sans-serif}${css}${enlarged?'button,input,textarea,select{font:inherit!important}':''}</style></head><body><div class="found-hq-root"><main class="found-hq-main">${html}</main></div></body></html>`
}
async function verifyDisabledPages() {
 let dbReads=0, denied=false
 for(const file of ['src/app/admin/emails/received/page.tsx','src/app/admin/emails/received/[id]/page.tsx']) {
  recordSource(file)
  const m={exports:{}}
  const code=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText
  const mock={__esModule:true,default:()=>null,requireAdmin:async()=>{if(denied)throw Error('Not authorized')},getAdminClient:()=>{dbReads++;throw Error('Forbidden database')},getReceivedMail:()=>{throw Error('Forbidden loader')},getReceivedMessage:()=>{throw Error('Forbidden loader')},getManualReplyTarget:()=>{throw Error('Forbidden target')},randomUUID:()=>{throw Error('Forbidden UUID')}}
  vm.runInNewContext(code,{module:m,exports:m.exports,process:{env:{}},require:id=>id==='react/jsx-runtime'?require(id):mock})
  const html=renderToStaticMarkup(await m.exports.default({searchParams:Promise.resolve({}),params:Promise.resolve({id})}))
  check(html.includes('Receiving is not enabled yet.'),'disabled page states receiving unavailable')
  denied=true
  await assert.rejects(()=>m.exports.default({}),/Not authorized/);checks++
  denied=false
 }
 check(dbReads===0,'disabled pages create no database client')
}
;(async()=>{
 await verifyDisabledPages()
 const browser=await chromium.launch({headless:true,...(process.env.FOUND_BROWSER_EXECUTABLE ? {executablePath:process.env.FOUND_BROWSER_EXECUTABLE} : {})})
 try {
  for(const config of [{name:'mobile-320',width:320,height:700},{name:'mobile-390',width:390,height:844},{name:'desktop',width:1440,height:1000},{name:'enlarged-320',width:320,height:480,enlarged:true}]) {
   const page=await browser.newPage({viewport:{width:config.width,height:config.height}})
   await page.route('**/*',route=>{network++;return route.abort()})
   for(const mode of ['inbox','conversation','spam','blocked','error','disabled','recorded-send']) {
    await page.setContent(markup(mode,config.enlarged))
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)
    if(!fits) console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('*')).filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,text:e.textContent?.slice(0,90),width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(-15)))
    check(fits,`${config.name}/${mode} fits width`)
    check(await page.getByRole('navigation',{name:'Mail',exact:true}).count()===1,'single Received/Sent nav')
    if(mode==='conversation'||mode==='blocked') {
      check(await page.locator('img,iframe,object').count()===0,'no remote HTML/media')
      check(await page.getByRole('button',{name:'Send reply',exact:true}).isDisabled(),'send disabled')
      check(await page.locator('input[name="expectedVersion"]').inputValue()===reply.updated_at,'review version preserved')
      check(await page.locator('input[name="expectedTo"]').inputValue()===reply.to_address,'persisted recipient preserved')
      check(await page.locator('form').filter({has:page.locator('textarea[name="body"]')}).locator('input[name="replyId"]').inputValue()==='32345678-1234-4234-8234-123456789abc','stable draft ID rendered in composer')
      check(await page.getByText(/Quarantined/).count()===1,'quarantined metadata')
      check(await page.getByRole('button',{name:'Mark read',exact:true}).count()===1,'explicit mark read')
      await page.getByText('Sender rules',{exact:true}).click()
      check(await page.getByRole('button',{name:'Clear sender rule',exact:true}).isVisible(),'recoverable sender rule controls')
      await page.getByLabel('Reply text').fill('Unsaved synthetic reply, no action invoked.')
      check(await page.getByLabel('Reply text').inputValue()==='Unsaved synthetic reply, no action invoked.','plain text editable')
    }
    if(mode==='error') check(await page.getByRole('alert').count()===1,'error is explicit')
    if(mode==='spam') check(await page.getByText(/Spam stays separate/).count()===1,'Spam separated')
    if(mode==='disabled') {check(await page.getByRole('region',{name:'Receiving disabled'}).count()===1,'disabled notice');check(await page.getByRole('button').count()===0,'disabled view has no actions')}
    if(mode==='recorded-send') {check(await page.getByRole('button',{name:'Save draft',exact:true}).isDisabled(),'recorded send cannot be edited');check(await page.getByText('This draft has a recorded send. Reload before starting a new reply.',{exact:true}).count()===1,'recorded send requires explicit reload')}
    await page.screenshot({path:path.join(out,`${config.name}-${mode}.png`),fullPage:true})
   }
   await page.close()
  }
  check(actions===0,'no actions invoked');check(network===0,'no network requests')
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({sourceRoot:root,sourceHashes,checks,actions,network,screenshots:28,limitations:['Static server render of actual components; no hydration or server action integration','Synthetic metadata only; no DB or providers','Unread polling and authentication not exercised','No delivery, DNS or persistence verification']},null,2))
  console.log(`${checks} browser assertions passed; 28 screenshots; ${actions} actions; ${network} network requests. Output: ${out}`)
 } finally {await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1})
