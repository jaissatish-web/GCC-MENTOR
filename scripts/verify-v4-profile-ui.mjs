/** V4 real canonical profile page against fictional local APIs. No live account, database or AI calls. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import puppeteer from 'puppeteer'

const root=process.cwd(), require=createRequire(import.meta.url), dir=mkdtempSync(join(tmpdir(),'gcc-v4-profile-'))
const fixture=JSON.parse(readFileSync(root+'/scripts/fixtures/studioFixture.json','utf8')).profile
Object.assign(fixture,{full_name:'Nina Sample',email:'nina.sample@example.com',phone:'+971501234567',whatsapp:null,linkedin_url:null,current_employer:'Example Care Services',current_project:null,target_job_title:'Operations Coordinator',professional_summary:'Operations coordinator supporting healthcare and hospitality teams with accurate records and service coordination.',date_of_birth:null,passport_validity_date:null,driving_license_validity_date:null,has_driving_license:null,current_location:'Dubai, UAE'})
fixture.work_experience=[{...fixture.work_experience[0],company:'Example Care Services',role:'Operations Coordinator',start_date:'2021',start_date_precision:'year',end_date:'2023-06',end_date_precision:'month',end_date_unconfirmed:false,description:'Coordinated appointment schedules and maintained service records.',highlights:['Documented weekly handovers.'],location:'Dubai, UAE'},{...fixture.work_experience[1],company:'Example Hospitality',role:'Reception Coordinator',start_date:'2018-02-12',start_date_precision:'day',end_date:'2020-12-07',end_date_precision:'day',end_date_unconfirmed:false,description:'Maintained visitor and reception records.',highlights:['Prepared service handovers.'],location:'Abu Dhabi, UAE'}]
fixture.skills=fixture.skills.slice(0,3).map((skill,index)=>({...skill,name:['Service coordination','Records management','Scheduling'][index]}))
fixture.certifications=[{...fixture.certifications[0],name:'Service Coordination Training',issuer:'Example Learning',issue_date:'2019',issue_date_precision:'year',expiry_date:'2025-06-17',expiry_date_precision:'day'}]
fixture.education=fixture.education.map(entry=>({...entry,degree:'Bachelor of Business Administration',institution:'Example University',field_of_study:'Business Administration'}));fixture.additional_information=[]
const output=root+'/artifacts/v4-profile-integration'
mkdirSync(output,{recursive:true})
let pageForDebug,browser,server,profile=structuredClone(fixture),scenario='saved',profileWritten=false,writes=[],failPhoto=false,pending=null,failProfileOnce=false,resumeImportReply=null,holdProfileLookup=false,profileLookupReply=null,pendingDeleteReply=null,failDeleteOnce=false
const errors=[],external=[],checks=[],dialogs=[]
const reviewBefore=fixture.professional_summary.replace('experience','experiance')
const makeReview=()=>({version:1,id:'fixture-review-'+scenario,createdAt:'2026-10-27T10:00:00Z',sourceText:'Nina Sample\nOperations Coordinator at Example Care Services\n2021 to June 2023\nService coordination and records management.',changes:[...(scenario==='verify-import'?[{id:'fixture-name-check',field:'full_name',label:'Source spelling',kind:'check',before:'Imported Maya Thomas',after:'Imported Maya Thomas',reason:'Verify source spelling against the original resume.'}]:[]),{id:'fixture-summary-change',field:'professional_summary',label:'Professional summary',kind:'spelling',before:reviewBefore,after:fixture.professional_summary,reason:'Corrected a spelling error without adding candidate facts.',suggested:true,restorable:true}],imported:{roles:fixture.work_experience.length,skills:fixture.skills.length,qualifications:fixture.education.length,certificates:fixture.certifications.length},wordingStatus:'checked'})
const freshDraft=()=>({...structuredClone(fixture),id:undefined,user_id:undefined,full_name:'Nina Sample',professional_summary:reviewBefore,additional_information:[{label:'English',value:'Working language',level:'Professional',category_name:'Languages'}],work_experience:fixture.work_experience.map(w=>({...w,id:undefined})),skills:fixture.skills.map(s=>({...s,id:undefined})),education:fixture.education.map(e=>({...e,id:undefined})),certifications:fixture.certifications.map(c=>({...c,id:undefined}))})

async function bundle(){
 writeFileSync(dir+'/entry.jsx',`import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from${JSON.stringify(root+'/components/layout/AppShell.tsx')};import Profile from${JSON.stringify(root+'/app/profile/page.tsx')};createRoot(document.getElementById('root')).render(<AppShell><Profile/></AppShell>);`)
 writeFileSync(dir+'/navigation.js',`import{useSyncExternalStore,useMemo}from'react';const sub=fn=>{addEventListener('popstate',fn);addEventListener('fixture-location',fn);return()=>{removeEventListener('popstate',fn);removeEventListener('fixture-location',fn)}};for(const key of ['pushState','replaceState']){const fn=history[key].bind(history);history[key]=(...a)=>{fn(...a);dispatchEvent(new Event('fixture-location'))}}export function usePathname(){return useSyncExternalStore(sub,()=>location.pathname)}export function useSearchParams(){const search=useSyncExternalStore(sub,()=>location.search);return useMemo(()=>new URLSearchParams(search),[search])}const router={push:u=>{history.pushState(null,'',u)},replace:u=>{history.replaceState(null,'',u)},refresh:()=>location.reload()};export function useRouter(){return router}`)
 writeFileSync(dir+'/link.js',`import React from'react';export default function Link({prefetch,replace,scroll,...props}){return React.createElement('a',props)}`)
 writeFileSync(dir+'/footer.js',`export function AppFooter(){return null}`)
 writeFileSync(dir+'/auth.js',`export async function signOut(){throw new Error('Sign out disabled in fixture')}`)
 writeFileSync(dir+'/css.cjs',`module.exports=function(source){const names=[...new Set([...source.matchAll(/\\.([a-zA-Z_][\\w-]*)/g)].map(match=>match[1]))];const mapping=Object.fromEntries(names.map(name=>[name,'fixture_v4_'+name]));const css=source.replace(/\\.([a-zA-Z_][\\w-]*)/g,(_,name)=>'.'+mapping[name]);return 'const css='+JSON.stringify(css)+';if(typeof document!==\"undefined\"){const style=document.createElement(\"style\");style.textContent=css;document.head.appendChild(style)};module.exports='+JSON.stringify(mapping)};`)
 writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
 const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
 await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.jsx',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.jsx'],alias:{'@/components/layout/AppFooter':dir+'/footer.js','@/app/auth/actions':dir+'/auth.js','@':root,'next/navigation':dir+'/navigation.js','next/link':dir+'/link.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'},{test:/\.css$/,use:dir+'/css.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
}
function serve(){
 const landing=readFileSync(root+'/.next/server/app/index.html','utf8'),fontClass=/<body class="([^"]+)"/.exec(landing)?.[1]||''
 const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(href=>`<link rel="stylesheet" href="${href}">`).join('')
 return createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture'),p=url.pathname
  const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
  if(p==='/__scenario'){
   scenario=url.searchParams.get('state')||'saved';profileWritten=false;holdProfileLookup=false;profileLookupReply=null;profile=['new-import','retry-import','incomplete-import','invalid-import','manual','verify-import','linkedin-import','save-conflict','refetch-failure','cleanup-failure'].includes(scenario)?null:structuredClone(fixture);writes=[];failPhoto=scenario==='photo-error';failProfileOnce=scenario==='retry-import';pending=['new-import','retry-import','existing-import','incomplete-import','invalid-import','verify-import','linkedin-import','save-conflict','refetch-failure','cleanup-failure'].includes(scenario)?{draft:freshDraft(),report:{review:makeReview()}}:null
   if(scenario==='incomplete-import')Object.assign(pending.draft,{full_name:'',email:'',phone:'',whatsapp:'',work_experience:[{company:'Fictional employer',role:'Engineer',start_date:null,end_date:null,description:'Maintained equipment.',highlights:[]}],education:[],skills:[],certifications:[]})
   if(scenario==='existing-import'){pending.draft.full_name='Nina From New Resume';pending.draft.work_experience[1].description='Newly supplied reception responsibilities.'}
   if(scenario==='invalid-import')pending.draft.email='not-an-email'
   if(scenario==='linkedin-import')pending.draft.linkedin_url='javascript:alert(1)'
   if(scenario==='linkedin-warning')profile.linkedin_url='not a LinkedIn address'
   if(scenario==='missing')profile.email=''
   if(scenario==='with-photo')profile.photo_url='/fixture-photo.png'
   if(scenario==='long-identity')Object.assign(profile,{full_name:'Maya Alexandra Thomas Engineering and Commissioning Professional',target_job_title:'Senior Instrumentation and Control Commissioning Engineer',current_location:'Ras Al Khair Industrial City, Eastern Province, Saudi Arabia'})
   if(['held-discard','failed-discard'].includes(scenario))pending={draft:freshDraft(),report:{review:makeReview()}}
   pendingDeleteReply=null;failDeleteOnce=scenario==='failed-discard'
   return send({scenario})
  }
  if(p==='/__discard-state')return send({waiting:!!pendingDeleteReply})
  if(p==='/__resolve-discard'){
   assert.ok(pendingDeleteReply,'A pending-reading deletion must be waiting')
   pending=null;const respond=pendingDeleteReply;pendingDeleteReply=null;respond({ok:true});return send({resolved:true})
  }
  if(p==='/__resolve-import'){
   assert.ok(resumeImportReply,'A synthetic import request must be pending before resolution')
   const respond=resumeImportReply;resumeImportReply=null
   if(url.searchParams.get('outcome')==='success'){holdProfileLookup=url.searchParams.get('holdProfile')==='1';const imported={draft:freshDraft(),report:{review:makeReview(),warnings:[]}};pending=imported;respond(imported)}
   else respond({error:'Fictional parser refusal. Your selected text is retained.'},422)
   return send({resolved:true})
  }
  if(p==='/__handoff-state')return send({pending:!!profileLookupReply})
  if(p==='/__resolve-handoff'){
   assert.ok(profileLookupReply,'A synthetic saved-profile lookup must be waiting')
   const respond=profileLookupReply;profileLookupReply=null;holdProfileLookup=false;respond(profile)
   return send({resolved:true})
  }
  if(p==='/__writes')return send(writes)
  if(p==='/__profile')return send(profile)
  if(p.startsWith('/api/')){
   if(req.method!=='GET'){
    const chunks=[];for await(const chunk of req)chunks.push(chunk)
    const raw=Buffer.concat(chunks).toString();let body={};try{body=JSON.parse(raw)}catch{}
    writes.push({path:p,method:req.method,body,...(p==='/api/profile/photo'?{croppedJpeg:raw.includes('Content-Type: image/jpeg')}: {})})
    if(['/api/parse/text','/api/parse/upload'].includes(p)&&scenario==='processing-import'){resumeImportReply=send;return}
    if(p==='/api/profile'&&req.method==='PUT'&&failProfileOnce){failProfileOnce=false;return send({error:'Temporary save failure. Please try again.'},503)}
    if(p==='/api/profile'&&req.method==='PUT'&&scenario==='save-conflict')return send({error:'Fictional stale profile conflict. Reload before saving.'},409)
    if(p==='/api/profile'&&req.method==='PUT'){profileWritten=true;profile={...fixture,...profile,...body,id:fixture.id,updated_at:'2026-10-25T20:00:00Z'};return send({updated_at:profile.updated_at})}
    if(p==='/api/profile/photo'){
     if(failPhoto)return send({error:'Fictional photo upload failed'},500)
     profile.photo_url=req.method==='DELETE'?null:'/fixture-photo.png';return send({photoUrl:profile.photo_url})
    }
    if(p==='/api/profile/pending-draft'&&req.method==='DELETE'){
     if(scenario==='cleanup-failure')return send({error:'Fictional pending-reading cleanup failure'},503)
     if(scenario==='held-discard'){pendingDeleteReply=send;return}
     if(failDeleteOnce){failDeleteOnce=false;return send({error:'Fictional cleanup failure'},503)}
     pending=null;return send({ok:true})
    }
    if(p==='/api/profile/import-review'&&req.method==='DELETE')return send({ok:true})
    return send({error:'External writes disabled'},409)
   }
   if(p==='/api/profile'){if(scenario==='refetch-failure'&&profileWritten)return send({error:'Fictional post-save refetch failure'},503);if(holdProfileLookup){profileLookupReply=send;return}return profile?send(profile):send({error:'No profile'},404)}
   if(p==='/api/profile/pending-draft')return send({pending})
   if(p==='/api/profile/import-review')return send({review:pending?.report?.review??null})
   if(p==='/api/parse/recreate-status')return send({allowed:true,remaining:3,limit:3,used:0})
   if(p==='/api/packages/career-profile')return send({package:null,summary:null})
   return send({error:'No fixture data'},404)
  }
  if(p==='/fixture-photo.png'){res.writeHead(200,{'Content-Type':'image/png'});return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGfEAAAAASUVORK5CYII=','base64'))}
  const file=p==='/fixture.js'?dir+'/fixture.js':p.startsWith('/_next/static/')?root+'/.next/'+p.slice(7):null
  if(file&&existsSync(file)){res.writeHead(200,{'Content-Type':{'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'});return res.end(readFileSync(file))}
  const blockedStorage=url.searchParams.has('blockReviewStorage')?`for(const method of ['getItem','setItem','removeItem']){const native=Storage.prototype[method];Storage.prototype[method]=function(key,...args){if(String(key).startsWith('career_profile_review_recovery_v1'))throw new DOMException('Fictional blocked review storage','SecurityError');return native.call(this,key,...args)}}`:''
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="${fontClass}"><div id="root"></div><script>window.process={env:{NODE_ENV:"test"}};${blockedStorage}</script><script src="/fixture.js"></script></body></html>`)
 })
}try{
 await bundle();server=serve();await new Promise(yes=>server.listen(0,'127.0.0.1',yes));const origin='http://127.0.0.1:'+server.address().port
 const chromium=(await import('@sparticuz/chromium')).default;const executablePath=process.env.CHROME_PATH||await chromium.executablePath()
 browser=await puppeteer.launch({executablePath,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
 const page=pageForDebug=await browser.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});void dialog.accept()})
 await page.setRequestInterception(true);page.on('request',request=>{const url=new URL(request.url());if(['data:','blob:'].includes(url.protocol)||url.origin===origin)void request.continue();else{external.push(request.url());void request.abort()}})
 const state=async name=>{await page.evaluate(()=>sessionStorage.clear()).catch(()=>{});await fetch(origin+'/__scenario?state='+name)}
 const go=async(path='/profile/review')=>{console.log('CHECK '+scenario+' '+path);await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-profile-review-v4]')}
 const visibleButton=async text=>{await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()===text&&button.getClientRects().length),{},text);return page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text&&button.getClientRects().length),text)}
 const click=async text=>{const button=await visibleButton(text);await button.asElement().click();await button.dispose()}
 const allWrites=async()=>await(await fetch(origin+'/__writes')).json()
 const section=async text=>{await page.evaluate(text=>{const button=[...document.querySelectorAll('nav[aria-label="Review sections"] button')].find(button=>button.textContent.toLowerCase().includes(text.toLowerCase()));if(!button)throw Error('Missing section '+text);button.click()},text)}
 const set=async(selector,value)=>{await page.waitForSelector(selector);await page.$eval(selector,(element,value)=>{let details=element.closest('details');while(details){details.open=true;details=details.parentElement?.closest('details')}const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}))},value)}
 const expandWork=async()=>{await section('Work');await page.waitForSelector('#sec_work_experience');await page.evaluate(()=>{const button=document.querySelector('#sec_work_experience h3 button');if(button?.getAttribute('aria-expanded')==='false')button.click()});await page.waitForSelector('input[id^="f_work_start_"]',{visible:true})}
 const firstStart='input[id^="f_work_start_"]'
 const save=async()=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));if(!await page.$eval('#v4-profile-confirm',input=>input.checked))await page.click('#v4-profile-confirm');await page.waitForFunction(()=>document.querySelector('#v4-profile-confirm')?.checked);await click('Save Career Profile')}
 const snap=async name=>{const path=output+'/'+name+'.png';await page.screenshot({path,fullPage:false});checks.push({check:'screenshot',name,width:await page.evaluate(()=>innerWidth),path})}
 for(const width of [320,390,768,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await state('new-import');await go();await page.waitForSelector('#f_full_name')
  assert.equal(await page.$eval('#f_full_name',input=>input.value),'Nina Sample','extraction opens editable canonical facts without an extra review route')
  assert.equal(await page.$$eval('input#v4-profile-confirm',inputs=>inputs.length),1,'exactly one final acknowledgement')
  assert.equal(await page.$$eval('button',buttons=>buttons.filter(button=>button.textContent.trim()==='Save Career Profile'&&button.getClientRects().length).length),1,'exactly one final save action')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow at '+width)
  await snap('review-'+width)
  await expandWork();assert.equal(await page.$eval(firstStart,input=>input.value),'2021','year-only extraction is not January')
  await snap('employment-'+width)
  await click('Compare with source');await page.waitForSelector('#v4-source-panel');assert.ok(await page.$eval('#v4-source-panel',panel=>panel.textContent.includes('Originally extracted details')),'extracted baseline is not mislabeled original PDF')
  assert.equal(await page.$eval('#v4-source-panel',panel=>panel.getAttribute('role')),width<1100?'dialog':'complementary')
  if(width===390){await page.waitForFunction(()=>document.activeElement?.id==='v4-source-panel');await page.keyboard.down('Shift');await page.keyboard.press('Tab');await page.keyboard.up('Shift');assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),'Reattach original file to compare','mobile source focus wraps backwards');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close source comparison');writeFileSync(dir+'/reference.txt','Different synthetic reference source. It must not replace extracted facts.');const chooser=page.waitForFileChooser();await click('Reattach original file to compare');await(await chooser).accept([dir+'/reference.txt']);await page.waitForFunction(()=>document.querySelector('#v4-source-title')?.textContent==='Reference file');assert.equal(await page.$eval('#f_full_name',input=>input.value),'Nina Sample','reattached reference never changes facts');await snap('reference-source-390')}
  await snap('source-'+width);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#v4-source-panel'))
  assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),'Compare with source','source Escape returns focus')
  assert.equal((await allWrites()).length,0,'section/source navigation never writes')
  await page.$eval('#v4-profile-confirm',input=>input.scrollIntoView({block:'center'}));await snap('confirmation-'+width)
  checks.push({check:'exact-width canonical review/source/save reflow',width})
 }
 await page.setViewport({width:390,height:844,deviceScaleFactor:1});await state('new-import');await go();await expandWork()
 await set('input[id^="f_work_role_"]','Operations Coordinator revised');await page.click('button[aria-label="Undo changes to Operations Coordinator revised"]');await page.waitForFunction(()=>document.querySelector('input[id^="f_work_role_"]')?.value==='Operations Coordinator')
 await page.click('button[aria-label="Move Operations Coordinator down"]');await page.waitForFunction(()=>document.querySelector('#sec_work_experience h3 button')?.textContent.includes('Reception Coordinator'));await page.click('button[aria-label="Move Operations Coordinator up"]');await page.waitForFunction(()=>document.querySelector('#sec_work_experience h3 button')?.textContent.includes('Operations Coordinator'))
 await page.click('button[aria-label="Remove Operations Coordinator"]');await page.waitForFunction(()=>document.querySelectorAll('#sec_work_experience h3 button').length===1);await click('Undo last removal');await page.waitForFunction(()=>document.querySelectorAll('#sec_work_experience h3 button').length===2)
 assert.equal((await allWrites()).length,0,'row undo/move/remove/restore never write before Save');checks.push({check:'repeatable row edit undo, keyboard-targetable move, remove/restore, stable local record state'})
 await expandWork()
 await click('Save Career Profile');assert.equal((await allWrites()).filter(write=>write.path==='/api/profile').length,0,'unacknowledged save cannot write');assert.equal(await page.evaluate(()=>document.activeElement?.id),'v4-profile-confirm')
 await page.click('#v4-profile-confirm');await set(firstStart,'2021-07-17');await page.waitForFunction(()=>!document.querySelector('#v4-profile-confirm').checked)
 assert.equal(await page.$eval(firstStart,input=>input.value),'2021-07-17','full day remains editable')
 await save();await page.waitForSelector('[data-profile-review-saved]');await snap('saved-390')
 const body=(await allWrites()).find(write=>write.path==='/api/profile').body
 assert.equal(body.work_experience[0].start_date,'2021-07-17');assert.equal(body.work_experience[0].start_date_precision,'day');assert.equal(body.work_experience[0].end_date,'2023-06');assert.equal(body.work_experience[0].end_date_precision,'month');assert.equal(body.certifications[0].issue_date,'2019');assert.equal(body.certifications[0].issue_date_precision,'year');assert.equal(body.certifications[0].expiry_date,'2025-06-17');assert.equal(body.certifications[0].expiry_date_precision,'day')
 assert.equal((await allWrites()).filter(write=>write.path==='/api/profile').length,1,'one atomic profile request')
 await click('Edit Career Profile');await page.waitForSelector('#profile-editor');await page.evaluate(()=>{const button=[...document.querySelectorAll('nav button')].find(button=>button.textContent.includes('Work Experience')||button.textContent.includes('Work experience'));button?.click()});await page.evaluate(()=>document.querySelector('#sec_work_experience h3 button[aria-expanded="false"]')?.click());await page.waitForSelector(firstStart,{visible:true});assert.equal(await page.$eval(firstStart,input=>input.value),'2021-07-17','saved/refetched precision reloads unchanged')
 checks.push({check:'canonical edit acknowledgement reset, explicit save/refetch, year/month/day roundtrip'})
 await state('new-import');await go();await set('#f_full_name','Nina Locally Corrected');await page.click('#v4-profile-confirm');await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-profile-review-v4]');await page.waitForFunction(()=>document.querySelector('#f_full_name')?.value==='Nina Locally Corrected')
 assert.equal(await page.$eval('#v4-profile-confirm',input=>input.checked),false,'restoration resets acknowledgement');assert.equal((await allWrites()).length,0,'same-tab recovery never reruns extraction or writes')
 checks.push({check:'same-tab corrected draft recovery and acknowledgement reset'})
 await state('invalid-import');await go();await page.waitForSelector('#f_email');await page.waitForFunction(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Save Career Profile')?.disabled)
 const correction=await page.evaluateHandle(()=>[...document.querySelectorAll('a,button')].find(element=>/Correct.*invalid/i.test(element.textContent)));assert.ok(correction.asElement(),'invalid disabled save has a focusable correction action');await correction.asElement().click();await page.waitForFunction(()=>document.activeElement?.id==='f_email');assert.equal((await allWrites()).length,0)
 await set('#f_email','nina.corrected@example.com');await page.waitForFunction(()=>![...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Save Career Profile')?.disabled);await save();await page.waitForSelector('[data-profile-review-saved]');checks.push({check:'invalid supplied value disabled save, focusable correction, local repair and save'})
 for(const name of ['retry-import','save-conflict','refetch-failure']){
  await state(name);await go();await set('#f_full_name','Nina Failure Draft');await save()
  const expected=name==='retry-import'?'Temporary save failure':name==='save-conflict'?'Fictional stale profile conflict':'saved'
  await page.waitForFunction(text=>document.body.innerText.toLowerCase().includes(text.toLowerCase()),{},expected)
  assert.equal(await page.$('[data-profile-review-saved]'),null,name+' never claims ordinary success')
  if(name!=='refetch-failure')assert.equal(await page.$eval('#f_full_name',input=>input.value),'Nina Failure Draft',name+' retains corrections')
  if(name==='retry-import'){await click('Save Career Profile');await page.waitForSelector('[data-profile-review-saved]');assert.equal((await allWrites()).filter(write=>write.path==='/api/profile').length,2,'failed save retries same explicit request')}
  checks.push({check:'truthful '+name})
 }
 await state('cleanup-failure');await go();await save();await page.waitForFunction(()=>/saved/i.test(document.body.innerText)&&/reading|cleanup/i.test(document.body.innerText));assert.equal((await(await fetch(origin+'/__profile')).json()).full_name,'Nina Sample','cleanup failure does not erase successful profile save');assert.ok(await page.evaluate(()=>/could not|failed|again|remain/i.test(document.body.innerText)),'cleanup failure remains visible and actionable');checks.push({check:'post-save pending-reading cleanup failure is honest and factual save retained'})
 await state('new-import');await go('/profile/review?blockReviewStorage=1');await page.waitForFunction(()=>/keep this tab open/i.test(document.body.textContent));await set('#f_full_name','Nina Storage Unavailable');assert.equal((await allWrites()).length,0,'blocked checkpoint storage never causes auto-save');await save();await page.waitForSelector('[data-profile-review-saved]');checks.push({check:'blocked session recovery warns honestly and explicit save still works'})
 await state('existing-import');await page.goto(origin+'/profile/review',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>[...document.querySelectorAll('button span')].some(span=>span.textContent.trim()==='Add it to my profile'));await page.evaluate(()=>[...document.querySelectorAll('button span')].find(span=>span.textContent.trim()==='Add it to my profile').closest('button').click());await page.waitForSelector('[data-profile-review-v4]');await page.waitForSelector('#f_full_name')
 assert.equal(await page.$eval('#f_full_name',input=>input.value),'Nina Sample','Add keeps saved scalar facts')
 await page.evaluate(()=>document.querySelector('#v4-proposed-updates details').open=true)
 const chooseName=async()=>{const handle=await page.evaluateHandle(()=>[...document.querySelectorAll('label')].find(label=>label.textContent.includes('Use resume value for Full name'))?.querySelector('input'));assert.ok(handle.asElement());await handle.asElement().click();await handle.dispose()}
 assert.ok(await page.evaluate(()=>[...document.querySelectorAll('#v4-proposed-updates input[type=checkbox]')].every(input=>input.disabled)),'Add cannot overwrite saved fields')
 await page.click('input[name="v4-import-mode"]:nth-of-type(1)').catch(()=>{})
 await page.evaluate(()=>document.querySelectorAll('input[name="v4-import-mode"]')[1].click());await chooseName();await page.waitForFunction(()=>document.querySelector('#f_full_name')?.value==='Nina From New Resume')
 await page.evaluate(()=>document.querySelectorAll('input[name="v4-import-mode"]')[0].click());await page.waitForFunction(()=>document.querySelector('#f_full_name')?.value==='Nina Sample')
 await page.evaluate(()=>document.querySelectorAll('input[name="v4-import-mode"]')[1].click());await chooseName();await click('Keep saved role');await section('Work');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
 assert.equal((await allWrites()).length,0,'explicit mode/update/ambiguity choices remain unsaved')
 await page.reload({waitUntil:'domcontentloaded'});await click('Continue unsaved review');await page.waitForSelector('[data-profile-review-v4]');await section('Personal');await page.waitForFunction(()=>document.querySelector('#f_full_name')?.value==='Nina From New Resume')
 assert.equal(await page.$eval('#v4-profile-confirm',input=>input.checked),false);assert.equal(await page.evaluate(()=>document.querySelectorAll('input[name="v4-import-mode"]')[1].checked),true,'restored explicit update mode')
 assert.ok(await page.evaluate(()=>document.body.textContent.includes('Saved role kept; incoming entry not added.')),'restored ambiguity choice')
 await set('#f_current_location','Manually corrected location');await page.evaluate(()=>document.querySelectorAll('input[name="v4-import-mode"]')[0].click());await page.waitForFunction(()=>document.querySelector('#f_full_name')?.value==='Nina Sample');assert.equal(await page.$eval('#f_current_location',input=>input.value),'Manually corrected location','switching Add only clears staged overwrite facts, preserving unrelated manual correction')
 checks.push({check:'existing profile Add/update isolation, explicit repeated-role choice, reload mode/choices and manual-edit preservation'})
 await state('incomplete-import');await go();await save();await page.waitForSelector('[data-profile-review-saved]');const incomplete=(await allWrites()).find(write=>write.path==='/api/profile').body;assert.equal(incomplete.full_name,'');assert.equal(incomplete.email,'');assert.ok(!incomplete.work_experience[0].start_date);assert.equal(incomplete.work_experience[0].end_date_unconfirmed,true,'saving an incomplete timeline cannot invent current employment');checks.push({check:'incomplete permitted facts save explicitly without inventing dates/current status'})
 await state('linkedin-import');await go();await save();await page.waitForSelector('[data-profile-review-saved]');assert.equal((await allWrites()).find(write=>write.path==='/api/profile').body.linkedin_url,'javascript:alert(1)');assert.equal(await page.$$eval('a[href^="javascript:"],a[href^="data:"]',links=>links.length),0,'optional advisory never becomes executable markup');checks.push({check:'optional LinkedIn advisory remains supplied text and does not block save'})
 await state('manual');await page.goto(origin+'/profile/import',{waitUntil:'domcontentloaded'});await page.waitForSelector('[data-resume-import]');await click('Type it myself');await page.waitForSelector('#profile-editor');await page.evaluate(()=>{const nav=document.querySelector('nav[aria-label="Career Profile blocks"]');nav.closest('details').open=true;[...nav.querySelectorAll('button')].find(button=>button.textContent.includes('Personal & Contact')).click()});await page.waitForSelector('#f_full_name');await set('#f_full_name','Nina Manual Entry');await click('Save changes');await page.waitForSelector('[data-profile-review-v4]');assert.equal((await allWrites()).filter(write=>write.path==='/api/profile').length,0,'manual entry joins review before the factual write');assert.ok(await page.evaluate(()=>document.querySelector('[aria-label="Career Profile stages"]').textContent.includes('Manual entry')),'manual path does not claim an AI extraction');await save();await page.waitForSelector('[data-profile-review-saved]');checks.push({check:'manual input joins the canonical V4 acknowledgement/save without invented extraction'})
 assert.deepEqual(errors,[],'no application runtime errors');assert.deepEqual(external,[],'no external requests')
 writeFileSync(output+'/results.json',JSON.stringify({checks,errors,external,limitations:['Synthetic APIs verify browser orchestration; real Postgres atomic behavior is covered separately.','No real assistive-technology audit, physical virtual-keyboard test or production-authenticated operation.']},null,2))
 console.log('PASS V4 real profile page: '+checks.length+' responsive/functional checks; canonical inline editing, source/focus/no-write, single acknowledgement, precision payload/refetch/recovery/errors with synthetic APIs only')
}catch(error){console.error('Runtime errors:',errors);if(pageForDebug){console.error('Page text:',await pageForDebug.evaluate(()=>document.body.innerText).catch(()=>''));await pageForDebug.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{})}throw error}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes))}rmSync(dir,{recursive:true,force:true})}
