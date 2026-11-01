/** Real Career Profile UI against fictional local APIs. No live account or external writes. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { tmpdir } from 'node:os'
import puppeteer from 'puppeteer'

const root=process.cwd(), require=createRequire(import.meta.url), dir=mkdtempSync(join(tmpdir(),'gcc-single-profile-'))
const fixture=JSON.parse(readFileSync(root+'/scripts/fixtures/studioFixture.json','utf8')).profile
const output=root+'/artifacts/single-profile-editor'
mkdirSync(output,{recursive:true})
let pageForDebug,browser,server,profile=structuredClone(fixture),scenario='saved',writes=[],failPhoto=false,pending=null,failProfileOnce=false,resumeImportReply=null,holdProfileLookup=false,profileLookupReply=null,pendingDeleteReply=null,failDeleteOnce=false
const errors=[],external=[],checks=[],dialogs=[]
const reviewBefore=fixture.professional_summary.replace('experience','experiance')
const makeReview=()=>({version:1,id:'fixture-review-'+scenario,createdAt:'2026-10-27T10:00:00Z',sourceText:'Fictional resume',changes:[...(scenario==='verify-import'?[{id:'fixture-name-check',field:'full_name',label:'Source spelling',kind:'check',before:'Imported Maya Thomas',after:'Imported Maya Thomas',reason:'Verify source spelling against the original resume.'}]:[]),{id:'fixture-summary-change',field:'professional_summary',label:'Professional summary',kind:'spelling',before:reviewBefore,after:fixture.professional_summary,reason:'Corrected a spelling error without adding candidate facts.',suggested:true,restorable:true}],imported:{roles:fixture.work_experience.length,skills:fixture.skills.length,qualifications:fixture.education.length,certificates:fixture.certifications.length},wordingStatus:'checked'})
const freshDraft=()=>({...structuredClone(fixture),id:undefined,user_id:undefined,full_name:'Imported Maya Thomas',professional_summary:reviewBefore,additional_information:[{label:'Gas plant controls',value:'Configured field instrument loops.',category_name:'Projects'},{label:'Water treatment upgrade',value:'Supported loop checks.',category_name:'Projects'},{label:'English',value:'Working language',level:'Professional',category_name:'Languages'},{label:'Portfolio note',value:'Candidate supplied note.',category_name:'Other information'}],work_experience:fixture.work_experience.map(w=>({...w,id:undefined})),skills:fixture.skills.map(s=>({...s,id:undefined})),education:fixture.education.map(e=>({...e,id:undefined})),certifications:fixture.certifications.map(c=>({...c,id:undefined}))})

async function bundle(){
 writeFileSync(dir+'/entry.jsx',`import React from'react';import{createRoot}from'react-dom/client';import{AppShell}from${JSON.stringify(root+'/components/layout/AppShell.tsx')};import Profile from${JSON.stringify(root+'/app/profile/page.tsx')};createRoot(document.getElementById('root')).render(<AppShell><Profile/></AppShell>);`)
 writeFileSync(dir+'/navigation.js',`import{useSyncExternalStore,useMemo}from'react';const sub=fn=>{addEventListener('popstate',fn);addEventListener('fixture-location',fn);return()=>{removeEventListener('popstate',fn);removeEventListener('fixture-location',fn)}};for(const key of ['pushState','replaceState']){const fn=history[key].bind(history);history[key]=(...a)=>{fn(...a);dispatchEvent(new Event('fixture-location'))}}export function usePathname(){return useSyncExternalStore(sub,()=>location.pathname)}export function useSearchParams(){const search=useSyncExternalStore(sub,()=>location.search);return useMemo(()=>new URLSearchParams(search),[search])}const router={push:u=>{history.pushState(null,'',u)},replace:u=>{history.replaceState(null,'',u)},refresh:()=>location.reload()};export function useRouter(){return router}`)
 writeFileSync(dir+'/link.js',`import React from'react';export default function Link({prefetch,replace,scroll,...props}){return React.createElement('a',props)}`)
 writeFileSync(dir+'/footer.js',`export function AppFooter(){return null}`)
 writeFileSync(dir+'/auth.js',`export async function signOut(){throw new Error('Sign out disabled in fixture')}`)
 writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
 const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
 await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.jsx',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.jsx'],alias:{'@/components/layout/AppFooter':dir+'/footer.js','@/app/auth/actions':dir+'/auth.js','@':root,'next/navigation':dir+'/navigation.js','next/link':dir+'/link.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
}
function serve(){
 const landing=readFileSync(root+'/.next/server/app/index.html','utf8'),fontClass=/<body class="([^"]+)"/.exec(landing)?.[1]||''
 const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(href=>`<link rel="stylesheet" href="${href}">`).join('')
 return createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture'),p=url.pathname
  const send=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body))}
  if(p==='/__scenario'){
   scenario=url.searchParams.get('state')||'saved';holdProfileLookup=false;profileLookupReply=null;profile=['new-import','retry-import','incomplete-import','invalid-import','manual','verify-import','linkedin-import'].includes(scenario)?null:structuredClone(fixture);writes=[];failPhoto=scenario==='photo-error';failProfileOnce=scenario==='retry-import';pending=['new-import','retry-import','existing-import','incomplete-import','invalid-import','verify-import','linkedin-import'].includes(scenario)?{draft:freshDraft(),report:{review:makeReview()}}:null
   if(scenario==='incomplete-import')Object.assign(pending.draft,{full_name:'',email:'',phone:'',whatsapp:'',work_experience:[{company:'Fictional employer',role:'Engineer',start_date:null,end_date:null,description:'Maintained equipment.',highlights:[]}],education:[],skills:[],certifications:[]})
   if(scenario==='invalid-import')pending.draft.email='not-an-email'
   if(scenario==='linkedin-import')pending.draft.linkedin_url='javascript:alert(1)'
   if(scenario==='linkedin-warning')profile.linkedin_url='not a LinkedIn address'
   if(scenario==='missing')profile.email=''
   if(scenario==='with-photo')profile.photo_url='/fixture-photo.png'
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
    writes.push({path:p,method:req.method,body})
    if(['/api/parse/text','/api/parse/upload'].includes(p)&&scenario==='processing-import'){resumeImportReply=send;return}
    if(p==='/api/profile'&&req.method==='PUT'&&failProfileOnce){failProfileOnce=false;return send({error:'Temporary save failure. Please try again.'},503)}
    if(p==='/api/profile'&&req.method==='PUT'&&scenario==='save-conflict')return send({error:'Fictional stale profile conflict. Reload before saving.'},409)
    if(p==='/api/profile'&&req.method==='PUT'){profile={...fixture,...profile,...body,id:fixture.id,updated_at:'2026-10-25T20:00:00Z'};return send({updated_at:profile.updated_at})}
    if(p==='/api/profile/photo'){
     if(failPhoto)return send({error:'Fictional photo upload failed'},500)
     profile.photo_url=req.method==='DELETE'?null:'/fixture-photo.png';return send({photoUrl:profile.photo_url})
    }
    if(p==='/api/profile/pending-draft'&&req.method==='DELETE'){
     if(scenario==='held-discard'){pendingDeleteReply=send;return}
     if(failDeleteOnce){failDeleteOnce=false;return send({error:'Fictional cleanup failure'},503)}
     pending=null;return send({ok:true})
    }
    if(p==='/api/profile/import-review'&&req.method==='DELETE')return send({ok:true})
    return send({error:'External writes disabled'},409)
   }
   if(p==='/api/profile'){if(holdProfileLookup){profileLookupReply=send;return}return profile?send(profile):send({error:'No profile'},404)}
   if(p==='/api/profile/pending-draft')return send({pending})
   if(p==='/api/profile/import-review')return send({review:pending?.report?.review??null})
   if(p==='/api/parse/recreate-status')return send({allowed:true,remaining:3,limit:3,used:0})
   if(p==='/api/packages/career-profile')return send({package:null,summary:null})
   return send({error:'No fixture data'},404)
  }
  if(p==='/fixture-photo.png'){res.writeHead(200,{'Content-Type':'image/png'});return res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGfEAAAAASUVORK5CYII=','base64'))}
  const file=p==='/fixture.js'?dir+'/fixture.js':p.startsWith('/_next/static/')?root+'/.next/'+p.slice(7):null
  if(file&&existsSync(file)){res.writeHead(200,{'Content-Type':{'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'});return res.end(readFileSync(file))}
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});res.end(`<html><head><meta charset="utf-8">${css}</head><body class="${fontClass}"><div id="root"></div><script>window.process={env:{NODE_ENV:"test"}};</script><script src="/fixture.js"></script></body></html>`)
 })
}
try{
 await bundle();server=serve();await new Promise(yes=>server.listen(0,'127.0.0.1',yes));const origin='http://127.0.0.1:'+server.address().port
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await puppeteer.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
 const page=pageForDebug=await browser.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{dialogs.push({type:d.type(),message:d.message()});void d.accept()})
 await page.setRequestInterception(true);page.on('request',r=>{const url=new URL(r.url());if(['data:','blob:'].includes(url.protocol)||url.origin===origin)void r.continue();else{external.push(r.url());void r.abort()}})
 const state=async name=>{await page.evaluate(()=>sessionStorage.clear()).catch(()=>{});await fetch(origin+'/__scenario?state='+name)}
 const go=async path=>{console.log('CHECK '+scenario+' '+path);await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForNetworkIdle({idleTime:100,timeout:5000}).catch(()=>{})}
 const click=async text=>{await page.waitForFunction(t=>[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===t),{},text);await page.evaluate(t=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===t).click(),text)}
 const openContact=async()=>{await page.evaluate(()=>{const nav=document.querySelector('nav[aria-label="Career Profile blocks"]');const disclosure=nav.closest('details');if(disclosure&&!disclosure.open)disclosure.querySelector('summary').click();[...nav.querySelectorAll('button')].find(b=>b.textContent.includes('Personal & Contact Details')).click()});await page.waitForSelector('#f_full_name')}
 const type=async(selector,text)=>{if(!await page.$(selector))await openContact();await page.$eval(selector,(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}))},text)}
 const allWrites=async()=>await(await fetch(origin+'/__writes')).json()
 const canonical=async()=>{await page.waitForFunction(()=>document.querySelector('#profile-editor')||document.querySelector('[data-ui-service="resume-review"]'));if(await page.$('[data-ui-service="resume-review"]')){assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Review does not save before confirmation');await page.$eval('button[aria-label="Edit Professional Summary manually"]',button=>button.click())}await page.waitForFunction(()=>document.querySelector('#profile-editor') && document.querySelector('h1')?.textContent.trim()==='Edit Career Profile');assert.equal(await page.$eval('h1',e=>e.textContent.trim()),'Edit Career Profile');for(const id of ['sec_identity','sec_work_experience','sec_education','sec_skills','sec_additional'])assert.ok(await page.$('#'+id),id+' remains in the one editor');assert.equal(await page.$$eval('main button',bs=>bs.filter(b=>b.textContent.trim()==='Save changes').length),1,'One Save action');assert.equal(await page.$$eval('main button',bs=>bs.filter(b=>b.textContent.trim()==='Cancel').length),1,'One Cancel action')}
 const reflow=async name=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');checks.push(name)}
 const lightContrast=async(name,selectors)=>{
  const measured=await page.evaluate(selectors=>{
   const rgb=value=>{const parts=value.match(/[\d.]+/g)?.map(Number)??[];return parts.length>=3?parts.slice(0,3):[0,0,0]};
   const luminance=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
   const background=el=>{while(el){const value=getComputedStyle(el).backgroundColor;if(value!=='rgba(0, 0, 0, 0)'&&value!=='transparent')return rgb(value);el=el.parentElement}return[255,255,255]};
   const main=document.querySelector('main');
   return {surface:luminance(background(main)),ratios:selectors.map(selector=>{const el=document.querySelector(selector);if(!el)return{selector,missing:true};const a=luminance(rgb(getComputedStyle(el).color)),b=luminance(background(el));return{selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})};
  },selectors);
  assert.ok(measured.surface>.8,name+' uses a light surface');
  for(const item of measured.ratios){assert.ok(!item.missing,name+' has '+item.selector);assert.ok(item.ratio>=4.5,name+' readable contrast for '+item.selector+': '+item.ratio)}
  checks.push(name+' light surfaces and text/control contrast');
 }
 const sharedShell=async name=>{
  const measured=await page.evaluate(()=>{
   const color=el=>getComputedStyle(el).backgroundColor
   const visible=el=>el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0
   const header=document.querySelector('[data-mobile-header]'), nav=document.querySelector('[data-mobile-navigation]'), sidebar=document.querySelector('.studio-sidebar')
   return {header:color(header),nav:visible(nav)?color(nav):null,sidebar:visible(sidebar)?color(sidebar):null,rootSurface:getComputedStyle(document.documentElement).getPropertyValue('--ui-surface-rgb').trim(),contentSurface:getComputedStyle(document.querySelector('main')).getPropertyValue('--ui-surface-rgb').trim(),brandSoft:'rgb('+getComputedStyle(document.documentElement).getPropertyValue('--ui-brand-soft-rgb').trim().split(/\s+/).join(', ')+')'}
  })
  assert.equal(measured.header,'rgb(255, 255, 255)',name+' header uses the shared white surface')
  if(measured.nav)assert.equal(measured.nav,'rgb(255, 255, 255)',name+' mobile navigation uses the shared white surface')
  if(measured.sidebar)assert.ok(['rgb(255, 255, 255)',measured.brandSoft].includes(measured.sidebar),name+' sidebar uses the shared white or pale accent surface')
  assert.equal(measured.contentSurface,measured.rootSurface,name+' content cannot declare a separate theme')
  await lightContrast(name+' shared shell',['[data-mobile-header] a',...(measured.nav?['[data-mobile-navigation] a[aria-current="page"]']:['.studio-sidebar a[aria-current="page"]'])])
  checks.push(name+' header/navigation/content palette consistency')
 }
 const photo=async()=>{const input=await page.$('input[aria-label="Choose profile photo"]');assert.ok(input,'Photo input lives in canonical editor');await input.uploadFile(dir+'/photo.png')}
 writeFileSync(dir+'/photo.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGfEAAAAASUVORK5CYII=','base64'))
 for(const width of [390,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await state('saved');await go('/profile');await page.waitForSelector('.studio-profile-summary')
  assert.equal(await page.$('main input'),null,'Summary is read-only');assert.equal(await page.$$eval('main button',bs=>bs.filter(b=>b.textContent.trim()==='Edit Career Profile').length),1,'One clear entry action');await sharedShell('Saved profile '+width);await reflow('Read-only summary '+width);await page.screenshot({path:output+'/summary-'+width+'.png',fullPage:false})
  await click('Edit Career Profile');await canonical();await reflow('Canonical editor '+width)
  await type('#f_full_name','Maya Unsaved Draft');await photo();assert.equal((await allWrites()).length,0,'Editing and choosing photo must not save')
  await click('Cancel');await page.waitForSelector('.studio-profile-summary');assert.ok(await page.$eval('.studio-profile-identity',el=>el.textContent.includes('Maya Thomas')),'Cancel restores saved identity');assert.equal((await allWrites()).length,0,'Cancel performs no writes')
  await click('Edit Career Profile');await canonical();await openContact();assert.equal(await page.$eval('#f_full_name',e=>e.value),'Maya Thomas','Cancelled draft does not reappear')
  await type('#f_full_name','Maya Saved Draft');await click('Save changes');await page.waitForFunction(()=>document.body.innerText.includes('Maya Saved Draft'))
  await page.waitForFunction(()=>!document.querySelector('#profile-editor'))
  const saves=(await allWrites()).filter(w=>w.path==='/api/profile');assert.equal(saves.length,1,'Single versioned profile write');assert.equal(saves[0].body.full_name,'Maya Saved Draft');assert.ok(saves[0].body.expected_updated_at,'Stale-write protection retained');assert.equal((await allWrites()).some(w=>w.path==='/api/profile/photo'),false,'Cancelled photo is never uploaded')
  checks.push('Cancel and versioned Save '+width)
  await state('saved');await go('/profile?view=settings');await canonical();await reflow('Legacy visibility link '+width)
  await state('missing');await go('/profile?view=completeness');await page.waitForFunction(()=>document.body.innerText.includes('Profile completeness'))
  await page.evaluate(()=>{const bs=[...document.querySelectorAll('main button')];const target=bs.find(b=>/Edit Career Profile/.test(b.textContent))||bs.find(b=>/Email/i.test(b.textContent));if(!target)throw Error('Missing details action missing');target.click()});await canonical();assert.ok((await page.url()).includes('view=details'),'Missing-detail shortcut reaches same editor');checks.push('Completeness shortcut '+width)
  await state('saved');await go('/profile?view=readiness');await page.waitForFunction(()=>document.body.innerText.includes('Gulf Readiness'))
  await page.evaluate(()=>{const target=[...document.querySelectorAll('main button')].find(b=>/Edit Career Profile|Add or confirm/.test(b.textContent));if(!target)throw Error('Readiness update action missing');target.click()});await canonical();checks.push('Readiness shortcut '+width)
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:output+'/editor-'+width+'.png',fullPage:false})
 }
 // A first-time user sees only input choices until explicitly choosing manual entry.
 for(const width of [320,375,390,430,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await state('manual');await go('/profile');await page.waitForSelector('[data-resume-import]');
  assert.equal(new URL(page.url()).pathname,'/profile/import','First-time profile creation starts on dedicated input screen');
  assert.equal(await page.$('#profile-editor'),null,'Input choices have no profile editor underneath');
  assert.equal(await page.$('[data-profile-save-bar]'),null,'Input choices have no Save/status bar');
  assert.equal(await page.$('nav[aria-label="Career Profile blocks"]'),null,'Input choices have no section finder underneath');
  assert.equal(await page.$$eval('main input:not([type="file"]), main textarea',els=>els.length),0,'Unselected intake shows no unrelated typing boxes');
  await sharedShell('Resume input '+width);await reflow('Resume input '+width);await page.screenshot({path:output+'/input-choice-'+width+'.png',fullPage:false});
  await click('Type it myself');await canonical();
  assert.equal(new URL(page.url()).pathname,'/profile','Manual choice opens the one existing profile editor');
  assert.equal(new URL(page.url()).searchParams.get('manual'),'1','Manual intent is explicit and refreshable');
  assert.equal(await page.$('[data-resume-import]'),null,'Manual editor does not mount import choices above its fields');
  assert.equal((await allWrites()).length,0,'Choosing manual input creates no profile or import writes');
  await click('Cancel');await page.waitForSelector('[data-resume-import]');assert.equal(new URL(page.url()).pathname,'/profile/import','Cancelling a first manual profile returns to input choices');assert.equal(await page.$('#profile-editor'),null,'Cancelled manual form is no longer rendered below choices');
  checks.push('First-time input-only page, explicit canonical manual entry and safe cancellation '+width);
 }
 for(const mode of ['upload','paste']){
  await state('saved');await go('/profile?import='+mode);await page.waitForSelector('[data-resume-import]');
  assert.equal(new URL(page.url()).pathname,'/profile/import','Legacy '+mode+' link reaches dedicated intake');
  assert.equal(await page.$('#profile-editor'),null,'Deep-linked '+mode+' intake renders no profile fields');
  assert.ok(await page.$(mode==='paste'?'textarea[placeholder="Paste your resume text (50–20,000 characters)"]':'input[type="file"]'),'Deep-linked '+mode+' choice is opened');
  await click('Cancel import');await canonical();
  checks.push('Legacy '+mode+' import deep link isolates input and returns to canonical editor');
 }
 // Hold the actual import request open: this reproduces the founder's processing/save-bar collision.
 for(const width of [320,375,390,430,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await state('processing-import');await go('/profile?view=details');await canonical();await openContact();
  await type('#f_full_name','Maya Unsaved During Import');await photo();await page.waitForSelector('img[alt="Profile photo preview"]');
  const selectedPhoto=await page.$eval('img[alt="Profile photo preview"]',el=>el.getAttribute('src'));const dialogsBeforeImport=dialogs.length;
  await click('Update from resume');await page.waitForSelector('[data-resume-import]');
  assert.equal(new URL(page.url()).pathname,'/profile/import','Resume import uses the dedicated input route');
  assert.equal(await page.$('#profile-editor'),null,'No profile form is rendered below input choices');
  assert.equal(await page.$('nav[aria-label="Career Profile blocks"]'),null,'The form section finder is absent from intake');
  assert.equal(await page.$('[data-profile-save-bar]'),null,'Input choices do not show an unrelated Save bar');
  await click('Paste text');
  const resumeText='Synthetic candidate resume. Software engineer at Example Company, 2020 to 2025. Built tested applications with real project responsibilities.'
  await page.type('textarea[placeholder="Paste your resume text (50–20,000 characters)"]',resumeText)
  await click('Read this text');await page.waitForSelector('[data-processing-inline]');
  await page.waitForFunction(()=>!document.querySelector('[data-profile-save-bar]'));
  assert.equal(await page.$('[data-profile-save-bar]'),null,'Profile Save/status bar cannot overlap an active import')
  assert.equal(await page.$$eval('main button',bs=>bs.some(b=>b.textContent.trim()==='Save changes')),false,'Unrelated profile Save is absent while importing')
  assert.equal(await page.$('#profile-editor'),null,'Profile facts are absent from the dedicated processing screen')
  assert.equal(await page.$('#f_full_name'),null,'No unrelated typing field is below processing')
  assert.equal(await page.$$eval('[data-processing-state="done"]',els=>els.length),1,'Only selected input is completed')
  assert.equal(await page.$$eval('[data-processing-state="active"]',els=>els.length),1,'One actual backend operation remains active')
  await page.$eval('[data-processing-inline]',el=>el.scrollIntoView({block:'center',behavior:'instant'}));
  await sharedShell('Import processing '+width);await reflow('Import processing '+width)
  assert.ok(await page.$eval('[data-processing-inline]',el=>el.getBoundingClientRect().height<=520),'Inline import wait is compact enough for mobile')
  assert.ok(await page.$eval('[data-processing-steps] li:last-child',el=>{const row=el.getBoundingClientRect(),nav=document.querySelector('[data-mobile-navigation]');const floor=nav&&getComputedStyle(nav).display!=='none'?nav.getBoundingClientRect().top:innerHeight;return row.top>=70&&row.bottom<floor}),'All actual workflow rows remain visible above navigation')
  await page.evaluate(()=>{for(const animation of document.querySelector('[data-processing-inline]').getAnimations({subtree:true})){if(Number.isFinite(animation.effect?.getComputedTiming().endTime)){try{animation.finish()}catch{}}}});await lightContrast('Processing text '+width,['[data-processing-inline] > div > p','[data-processing-state="active"] > span:nth-child(2)','[data-processing-notes] p[aria-hidden="false"]']);await page.screenshot({path:output+'/import-processing-'+width+'.png',fullPage:false})
  await fetch(origin+'/__resolve-import?outcome=error');await page.waitForFunction(()=>document.body.textContent.includes('Fictional parser refusal'));
  assert.equal(await page.$('[data-profile-save-bar]'),null,'Refused parsing remains in the dedicated retry screen')
  assert.equal(await page.$('#profile-editor'),null,'A parsing error does not expose the profile form below intake')
  assert.equal(await page.$eval('textarea[placeholder="Paste your resume text (50–20,000 characters)"]',el=>el.value),resumeText,'Import refusal preserves pasted input')
  assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Processing/refusal never writes profile data')
  await click('Cancel import');await canonical();await openContact();
  assert.equal(await page.$eval('#f_full_name',el=>el.value),'Maya Unsaved During Import','Cancelling a refused import restores prior unsaved editor facts');
  assert.equal(await page.$eval('img[alt="Profile photo preview"]',el=>el.getAttribute('src')),selectedPhoto,'Cancelling import preserves the same staged photo preview');
  assert.equal(dialogs.length,dialogsBeforeImport,'Entering input, processing and cancelling does not discard or ask to discard unsaved text/photo');
  assert.equal((await allWrites()).filter(w=>w.path==='/api/profile/photo').length,0,'Staged photo is never uploaded by intake navigation or refusal');
  await click('Update from resume');await click('Paste text');
  await page.type('textarea[placeholder="Paste your resume text (50–20,000 characters)"]',resumeText);
  await click('Read this text');await page.waitForSelector('[data-processing-inline]');await page.waitForFunction(()=>!document.querySelector('[data-profile-save-bar]'));
  await fetch(origin+'/__resolve-import?outcome=error');await page.waitForFunction(()=>document.body.textContent.includes('Fictional parser refusal'));
  assert.equal(await page.$eval('textarea[placeholder="Paste your resume text (50–20,000 characters)"]',el=>el.value),resumeText,'A repeated failure preserves pasted input for explicit retry');
  await click('Read this text');await page.waitForSelector('[data-processing-inline]');
  await fetch(origin+'/__resolve-import?outcome=success&holdProfile=1');
  await page.waitForFunction(async()=>{const response=await fetch('/__handoff-state');return(await response.json()).pending});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.$('[data-profile-save-bar]'),null,'Save/status remain absent after parsing while the saved-profile handoff is pending')
  assert.ok(await page.$('[data-processing-inline]'),'Import remains visibly busy through the saved-profile lookup')
  assert.equal(await page.$('#profile-editor'),null,'Profile facts stay absent through the saved-profile handoff')
  await fetch(origin+'/__resolve-handoff');await page.waitForFunction(()=>document.body.textContent.includes('You already have a profile'));
  assert.equal(await page.$('[data-processing-inline]'),null,'A successful response ends the processing view')
  assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Successful import still needs the existing add/replace decision')
  await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Keep my profile as it is')).click());await page.waitForSelector('.studio-profile-summary');assert.equal(new URL(page.url()).pathname,'/profile','Keeping the saved profile returns directly to its summary');
  await click('Edit Career Profile');await canonical();await openContact();assert.equal(await page.$eval('#f_full_name',el=>el.value),'Maya Thomas','Explicitly keeping saved profile discards prior unsaved name');assert.equal(await page.$('img[alt="Profile photo preview"]'),null,'Explicitly keeping saved profile clears the staged photo');
  checks.push('Focused input/processing, preserved retry/cancel state and protected review handoff '+width)
 }
 await page.setViewport({width:390,height:900,deviceScaleFactor:1});await state('processing-import');await go('/profile?view=details');await canonical();
 await click('Update from resume');await click('Upload resume');
 // Transport fixture only: actual PDF/DOCX parsing is covered by the separate intake browser suite.
 writeFileSync(dir+'/synthetic-resume.pdf','%PDF-1.4\nSynthetic local transport fixture\n%%EOF')
 await (await page.$('input[type="file"][accept=".pdf,.doc,.docx"]')).uploadFile(dir+'/synthetic-resume.pdf');
 await page.waitForSelector('[data-processing-inline]');await page.waitForFunction(()=>!document.querySelector('[data-profile-save-bar]'));
 await fetch(origin+'/__resolve-import?outcome=error');await page.waitForFunction(()=>document.body.textContent.includes('Try the selected file again'));
 assert.equal(await page.$('[data-profile-save-bar]'),null,'Refused file import stays in focused input/retry screen')
 assert.equal(await page.$('#profile-editor'),null,'No form fields appear below the file retry')
 await click('Try the selected file again');await page.waitForSelector('[data-processing-inline]');await page.waitForFunction(()=>!document.querySelector('[data-profile-save-bar]'));
 await fetch(origin+'/__resolve-import?outcome=success');await page.waitForFunction(()=>document.body.textContent.includes('You already have a profile'));
 assert.equal((await allWrites()).filter(w=>w.path==='/api/parse/upload').length,2,'File retry reuses the selected buffered upload only after explicit action')
 assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'File transport never implicitly saves profile facts')
 await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Keep my profile as it is')).click());await page.waitForSelector('.studio-profile-summary');
 checks.push('Upload wait hides Save and explicit selected-file retry restores the same handoff')
 await state('held-discard');await go('/profile/review');
 await page.waitForFunction(()=>document.body.textContent.includes('You already have a profile'));
 await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Keep my profile as it is')).click());
 await page.waitForFunction(async()=> (await (await fetch('/__discard-state')).json()).waiting);
 assert.equal(new URL(page.url()).pathname,'/profile/review','Navigation waits for persisted reading cleanup');
 assert.ok(await page.$$eval('main button',buttons=>buttons.length===3&&buttons.every(b=>b.disabled)),'Decision controls pause during deletion');
 assert.ok(await page.$('main [role="status"]'),'Cleanup waiting state is visible');
 await fetch(origin+'/__resolve-discard');await page.waitForSelector('.studio-profile-summary');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.studio-profile-summary');
 assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Discard never writes saved profile');
 checks.push('Keep profile waits for held persisted cleanup and stays discarded after reload');
 await state('failed-discard');await go('/profile/review');
 await page.waitForFunction(()=>document.body.textContent.includes('You already have a profile'));
 await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Keep my profile as it is')).click());
 await page.waitForSelector('main [role="alert"]');
 assert.equal(new URL(page.url()).pathname,'/profile/review','Failed cleanup retains retryable choice');
 assert.ok(await page.$$eval('main button',buttons=>buttons.every(b=>!b.disabled)),'Choices recover after deletion failure');
 await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Keep my profile as it is')).click());await page.waitForSelector('.studio-profile-summary');
 assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Failed discard/retry never writes saved facts');
 checks.push('Keep profile cleanup failure preserves decision and permits explicit retry');
 await state('new-import');await go('/profile/review');await page.waitForSelector('[data-ui-service="resume-review"]');
 assert.equal((await allWrites()).length,0,'New review page never creates profile on load');
 await page.waitForSelector('#career-diagnostic-title');
 assert.ok(await page.$eval('#career-diagnostic-title',el=>el.parentElement.textContent.includes('Not yet user-verified')),'Extracted facts are not labelled verified');
 assert.ok(await page.$$eval('progress',els=>els.some(el=>el.getAttribute('aria-label')?.includes('recorded fields'))),'Coverage shows actual captured/applicable field counts');
 await page.evaluate(()=>{const label=[...document.querySelectorAll('label')].find(el=>el.textContent.startsWith('Profession focus'));const select=label.querySelector('select');select.value='healthcare';select.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.evaluate(()=>{const label=[...document.querySelectorAll('label')].find(el=>el.textContent.startsWith('Career stage / work context'));const select=label.querySelector('select');select.value='graduate';select.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.waitForFunction(()=>document.body.textContent.includes('Paid employment is not required.'));
 await page.evaluate(()=>{const details=[...document.querySelectorAll('details')].find(el=>el.querySelector('summary')?.textContent==='Original source text and extracted fields');details.open=true});
 assert.ok(await page.$eval('main',el=>el.textContent.includes('Fictional resume')&&el.textContent.includes('Initial structured extraction')),'Source text is distinguished from the structured extraction');

 assert.equal(await page.$$eval('[id^="review-section-"]',els=>els.length),16,'All supported sections remain reachable');
 assert.equal(await page.$$eval('[id^="review-content-"]',els=>els.length),0,'Diagnostic precedes guided review');
 assert.ok(await page.$eval('main',el=>el.textContent.includes('No analysis score was provided')),'Missing analysis is not invented');
 assert.equal(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Save confirmed data')),false,'Save stays hidden until final verification');
 const reviewAction=async(id,text)=>page.evaluate((id,text)=>{const section=document.getElementById('review-section-'+id).closest('section');const button=[...section.querySelectorAll('button')].find(button=>button.textContent.trim()===text);if(!button)throw Error('Missing review action '+id+' '+text);button.click()},id,text)
 const openReviewSection=async id=>{await page.evaluate(id=>{const nav=document.querySelector('nav[aria-label="Resume review sections"]');const button=[...nav.querySelectorAll('button')].find(button=>button.textContent.includes(document.getElementById('review-section-'+id).textContent));if(!button)throw Error('Missing section navigation '+id);button.click()},id);await page.waitForSelector('#review-content-'+id)}
 const finalVerification=async()=>{if(!await page.$('#resume-final-preview-title')){await click('Continue to improvement summary');await page.waitForSelector('#improvement-summary-title');await click('Verify final Career Profile');await page.waitForSelector('#resume-final-preview-title')}}
 await click('Review and Improve My Career Profile');await page.waitForSelector('#guided-field-title');
 assert.equal(await page.$$eval('[id^="review-content-"]',els=>els.length),0,'A factual issue takes priority over optional wording');
 assert.ok(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Confirm this is my current role')),'Unknown end-date confirmation explicitly names the current-role decision');
 assert.equal(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='I verified this value')),false,'Generic verification cannot silently mean current employment');
 await click('Correct this field');await page.waitForSelector('#profile-editor');
 assert.ok(await page.$eval('#sec_work_experience',el=>el.textContent.includes('Larsen')),'Field correction opens the canonical structured employment controls');
 for(const width of [320,375,390,430]){await page.setViewport({width,height:900,deviceScaleFactor:1});await openContact();await lightContrast('Imported canonical editor '+width,['main h1','#f_full_name','#f_email']);await reflow('Imported canonical editor '+width)}

 await click('Back to Resume Review');await page.waitForSelector('#guided-field-title');
 let deferred=0;
 while(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Review later'))){assert.ok(deferred++<20,'Finite factual issue queue');await click('Review later');await new Promise(resolve=>setTimeout(resolve,30))}
 assert.ok(deferred>0,'Explicitly defer the unknown current-role fact without inventing a date');
 await page.waitForSelector('#review-content-sec_identity');
 assert.ok(await page.$eval('main',el=>el.textContent.includes('remain unresolved')),'Deferred facts remain unresolved rather than verified');
 assert.equal(await page.$$eval('[id^="review-content-"]',els=>els.length),1,'Guided review opens exactly one section');
 await openReviewSection('sec_skills');await reviewAction('sec_skills','Confirm current details');await page.waitForFunction(()=>!document.querySelector('#review-content-sec_skills'));
 assert.ok(await page.$eval('#review-section-sec_skills',el=>el.closest('section').textContent.includes('Reviewed')),'Confirmed section collapses with completion state');
 const completedColor=await page.$eval('#review-section-sec_skills',el=>getComputedStyle(el.closest('section').querySelector('[role="status"]')).color);assert.equal(completedColor,'rgb(21, 112, 65)','Reviewed state uses semantic green');
 await reviewAction('sec_skills','Reopen');await page.waitForSelector('#review-content-sec_skills');
 assert.equal(await page.$$eval('[id^="review-content-"]',els=>els.length),1,'Reopening a section closes the other section');
 await reviewAction('sec_skills','Back');await page.waitForSelector('#review-content-sec_work_experience');
 await openReviewSection('training');await reviewAction('training','Skip for now');await page.waitForFunction(()=>!document.querySelector('#review-content-training'));
 assert.ok(await page.$eval('#review-section-training',el=>el.closest('section').textContent.includes('Skipped for now')),'Skipped section is distinct from verified content');
 const skippedColor=await page.$eval('#review-section-training',el=>getComputedStyle(el.closest('section').querySelector('[role="status"]')).color);assert.equal(skippedColor,'rgb(138, 81, 0)','Skipped state uses semantic amber');
 await openReviewSection('training');
 assert.ok(await page.$eval('#review-content-training',el=>el.textContent.includes('Not found in the extracted details.')),'Skipping never invents optional training');
 await openReviewSection('sec_summary');await reviewAction('sec_summary','Accept suggestion');
 await page.waitForFunction(()=>document.querySelector('#review-content-sec_summary')?.textContent.includes('Suggestion selected.'));
 assert.ok(await page.$('#review-content-sec_summary'),'Accepting writing does not confirm all section facts or advance review');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-ui-service="resume-review"]');
 await page.waitForSelector('[data-ui-service="resume-review"]');
 await page.waitForSelector('#review-content-sec_summary');
 assert.equal(await page.$$eval('label',els=>els.find(el=>el.textContent.startsWith('Career stage / work context')).querySelector('select').value),'graduate','Review context survives refresh for the matching import');
 assert.equal(await page.$eval('#review-content-sec_summary h4 + p',el=>el.textContent),reviewBefore,'Original extracted summary stays immutable after acceptance and refresh');
 assert.ok(await page.$eval('#review-content-sec_summary',el=>el.textContent.includes('Your selected content')),'Accepted text survives refresh separately from original');
 await finalVerification();
 assert.equal(await page.$$eval('button',bs=>bs.find(b=>b.textContent.trim()==='Save confirmed data').disabled),true,'Recovery requires fresh final confirmation');
 assert.ok(await page.$eval('#resume-final-preview-title',el=>el.parentElement.textContent.includes('Gas plant controls')&&el.parentElement.textContent.includes('Water treatment upgrade')&&el.parentElement.textContent.includes('Professional')),'Final preview retains multiple projects and stated language proficiency');
 await openReviewSection('sec_summary');await reviewAction('sec_summary','Keep original');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-ui-service="resume-review"]');
 await openReviewSection('sec_summary');
 assert.equal(await page.$eval('#review-content-sec_summary h4 + p',el=>el.textContent),reviewBefore,'Kept original survives refresh');
 await reviewAction('sec_summary','Accept suggestion');
 assert.equal((await allWrites()).length,0,'Confirm, skip, accept, original and refresh perform no server writes');
 checks.push('Diagnostic-first review, one section, back/next, explicit confirmation, safe skip and recovered selections');
 for(const width of [320,375,390,430,1440]){await page.setViewport({width,height:900,deviceScaleFactor:1});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await reflow('Career diagnostic and guided review '+width);await sharedShell('Career report '+width);await lightContrast('Career report '+width,['main h1','#career-diagnostic-title','#career-diagnostic-title + p','nav[aria-label="Resume review sections"] button','main button.ui-button.bg-teal']);await page.screenshot({path:output+'/resume-review-'+width+'.png',fullPage:false})}
 await page.$eval('button[aria-label="Edit Professional Summary manually"]',button=>button.click());await canonical();
 await page.$eval('#f_professional_summary',el=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'User reviewed summary with only real career details.');el.dispatchEvent(new Event('input',{bubbles:true}))});
 await click('Back to Resume Review');await page.waitForSelector('[data-ui-service="resume-review"]');
 await openReviewSection('sec_summary');
 assert.ok(await page.$eval('main',el=>el.textContent.includes('User reviewed summary with only real career details.')),'Manual selection returns to review');
 assert.equal((await allWrites()).length,0,'Manual editing remains local before final Save');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-ui-service="resume-review"]');
 await openReviewSection('sec_summary');
 assert.ok(await page.$eval('#review-content-sec_summary',el=>el.textContent.includes('User reviewed summary with only real career details.')),'Manual edits survive refresh');
 assert.equal(await page.$eval('#review-content-sec_summary h4 + p',el=>el.textContent),reviewBefore,'Manual edit cannot overwrite original extracted content');
 assert.equal(await page.$$eval('#review-content-sec_summary button',bs=>bs.find(b=>b.textContent.trim()==='Accept suggestion').disabled),true,'Stale suggestion cannot overwrite manual text');
 checks.push('Manual review recovery retains immutable source and refuses stale suggestions');
 await finalVerification();
 assert.ok(await page.$eval('#improvement-summary-title',el=>el.parentElement.textContent.includes('Sections edited')&&el.parentElement.textContent.includes('Validation findings resolved')),'Before/after summary reports actual edits and condition-based findings');
 assert.ok(await page.$eval('#resume-final-preview-title',el=>el.parentElement.textContent.includes('User reviewed summary with only real career details.')),'Final preview shows the selected manual content');
 await page.click('input[type="checkbox"]');await click('Save confirmed data');
 await page.waitForFunction(()=>document.querySelector('.studio-profile-summary') || document.querySelector('section h2')?.textContent==='Some details still need attention' || [...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Skip and save'));
 if(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Skip and save')))await click('Skip and save');
 await page.waitForSelector('.studio-profile-summary');assert.equal(new URL(page.url()).pathname,'/dashboard','Successful confirmation targets the existing dashboard route (fixture keeps Profile mounted)');
 const confirmedWrites=(await allWrites()).filter(w=>w.path==='/api/profile');assert.equal(confirmedWrites.length,1,'Only one existing profile PUT');assert.equal(confirmedWrites[0].body.professional_summary,'User reviewed summary with only real career details.');
 checks.push('Final verified selection uses existing save and redirects to dashboard');
 await state('retry-import');await go('/profile/review');await page.waitForSelector('[data-ui-service="resume-review"]');
 await finalVerification();
 await page.click('input[type="checkbox"]');await click('Save confirmed data');
 if(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Skip and save')))await click('Skip and save');
 await page.waitForFunction(()=>document.body.textContent.includes('Temporary save failure. Please try again.'));
 assert.ok(await page.$('[data-ui-service="resume-review"]') || await page.$('#profile-editor'),'Failed save keeps the same review/editor open');
 assert.ok(await page.evaluate(()=>sessionStorage.getItem('career_profile_review_recovery_v1')),'Failed save keeps recovery checkpoint');
 if(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Skip and save')))await click('Skip and save');else await click('Save confirmed data');
 await page.waitForSelector('.studio-profile-summary');
 assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,2,'Retry uses same existing save endpoint');
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('career_profile_review_recovery_v1')),null,'Successful retry clears recovery');
 checks.push('Failed review save retains content and retries successfully');
 await state('verify-import');await go('/profile/review');await page.waitForSelector('[data-ui-service="resume-review"]');
 await click('Review and Improve My Career Profile');await page.waitForSelector('#guided-field-title');
 assert.equal(await page.$eval('#guided-field-title',el=>el.textContent),'Your name','Source-name warning is prioritized for factual review');
 await click('I verified this value');
 await page.waitForFunction(()=>document.querySelector('#guided-field-title')?.textContent!=='Your name');
 while(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Review later'))){await click('Review later');await new Promise(resolve=>setTimeout(resolve,30))}
 assert.equal(await page.$('#guided-field-title'),null,'Verified name and explicitly deferred remaining issues leave no active field question');
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('[data-ui-service="resume-review"]');
 await page.waitForSelector('#review-content-sec_identity');
 assert.equal(await page.$('#guided-field-title'),null,'Matching-import factual verification survives refresh');
 assert.ok(await page.evaluate(()=>sessionStorage.getItem('career_profile_review_recovery_v1:fields')),'Value-bound field confirmation retains a digest checkpoint');
 await page.$eval('button[aria-label="Edit Personal Information manually"]',button=>button.click());await page.waitForSelector('#profile-editor');
 await openContact();await type('#f_full_name','Changed Candidate Spelling');
 await click('Back to Resume Review');await page.waitForSelector('#guided-field-title');
 assert.equal(await page.$eval('#guided-field-title',el=>el.textContent),'Your name','Changing a verified fact invalidates its earlier confirmation');
 assert.equal((await allWrites()).length,0,'Confirming and changing a field never implicitly saves the profile');
 checks.push('Source-warning confirmation persists as digest and changed facts require verification again');
 await state('manual');await go('/profile');await page.waitForSelector('[data-resume-import]');await click('Type it myself');await canonical();
 await type('#f_full_name','Manual Example Candidate');await type('#f_email','manual.candidate@example.com');
 await click('Save changes');await page.waitForSelector('[data-ui-service="resume-review"]');
 assert.equal((await allWrites()).length,0,'Manual first-profile entry enters review before any write');
 assert.equal(new URL(page.url()).pathname,'/profile/review','Manual entry joins the same diagnostic/review journey');
 await finalVerification();
 assert.ok(await page.$eval('main',el=>el.textContent.includes('keep this tab open')||el.textContent.includes('Keep this tab open')),'Manual entry honestly explains its tab recovery limitation');
 assert.ok(await page.$eval('#resume-final-preview-title',el=>el.parentElement.textContent.includes('Manual Example Candidate')&&el.parentElement.textContent.includes('manual.candidate@example.com')),'Manual facts appear in final structured verification');
 await page.click('input[type="checkbox"]');await click('Save confirmed data');
 await page.waitForFunction(()=>document.querySelector('.studio-profile-summary')||[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Skip and save'));
 if(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Skip and save')))await click('Skip and save');
 await page.waitForSelector('.studio-profile-summary');
 assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,1,'Manual review saves once through the existing profile route');
 assert.equal(new URL(page.url()).pathname,'/dashboard','Manual confirmed profile redirects to the existing dashboard route');
 checks.push('Manual first-profile entry shares diagnostic, final verification and explicit save');
 await state('existing-import');await go('/profile');await page.waitForFunction(()=>document.body.innerText.includes('You already have a profile'));assert.equal((await allWrites()).length,0,'Returning-user import never overwrites before a choice');await page.evaluate(()=>[...document.querySelectorAll('main button')].find(b=>b.textContent.includes('Replace my profile')).click());await canonical();await page.evaluate(()=>{const nav=document.querySelector('nav[aria-label="Career Profile blocks"]');const disclosure=nav.closest('details');if(disclosure&&!disclosure.open)disclosure.querySelector('summary').click();[...nav.querySelectorAll('button')].find(b=>b.textContent.includes('Personal & Contact Details')).click()});await page.waitForSelector('#f_full_name');assert.equal(await page.$eval('#f_full_name',e=>e.value),'Imported Maya Thomas');await click('Cancel');await page.waitForSelector('.studio-profile-summary');assert.ok(await page.$eval('.studio-profile-identity',e=>e.textContent.includes('Maya Thomas')),'Cancelling replacement preserves saved profile');assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Cancelled replacement never writes profile');checks.push('Returning-user import protection and cancellation');
 await state('new-import');await go('/profile');await canonical();await page.evaluate(()=>{const nav=document.querySelector('nav[aria-label="Career Profile blocks"]');const disclosure=nav.closest('details');if(disclosure&&!disclosure.open)disclosure.querySelector('summary').click();[...nav.querySelectorAll('button')].find(b=>b.textContent.includes('Personal & Contact Details')).click()});await page.waitForSelector('#f_full_name');assert.equal(await page.$eval('#f_full_name',e=>e.value),'Imported Maya Thomas');assert.equal(await page.$('[id^="review-field-"]'),null,'No second imported-data editor');assert.equal((await allWrites()).length,0,'Imported facts are not automatically saved')
 const reviewLabel='I reviewed the details read from my resume. Missing information can be completed later.'
 await page.waitForFunction(label=>[...document.querySelectorAll('label')].some(l=>l.textContent.includes(label)),{},reviewLabel)
 assert.equal(await page.$$eval('main button',bs=>bs.find(b=>b.textContent.trim()==='Save changes').disabled),true,'Import acknowledgement required before Save')
 await page.evaluate(label=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes(label)).querySelector('input').click(),reviewLabel)
 await click('Save changes');await page.waitForFunction(()=>!document.querySelector('#profile-editor')||document.querySelector('#review-issues-title'));if(await page.$('#review-issues-title')){assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Import warning precedes any profile write');await click('Skip and save');await page.waitForFunction(()=>!document.querySelector('#profile-editor'))}assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,1);checks.push('Imported draft uses same acknowledged editor')
 for(const reviewWidth of [390,1440]){await page.setViewport({width:reviewWidth,height:900,deviceScaleFactor:1});
 await state('incomplete-import');await go('/profile');await canonical();await page.evaluate(label=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes(label)).querySelector('input').click(),reviewLabel);await click('Save changes');await page.waitForSelector('#review-issues-title');assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Incomplete import requires explicit skip');await page.waitForFunction(()=>{const panel=document.querySelector('[aria-labelledby="review-issues-title"]'),bar=document.querySelector('[data-profile-save-bar]');const active=document.activeElement;const rect=active?.getBoundingClientRect();return !!active?.closest('[data-guided-validation="attention"]')&&rect.top>=72&&rect.bottom<innerHeight-150});await reflow('Deferred import warning '+reviewWidth);await page.screenshot({path:output+'/import-warning-'+reviewWidth+'.png',fullPage:false});await click('Skip and save');await page.waitForFunction(()=>!document.querySelector('#profile-editor'));const incomplete=(await allWrites()).find(w=>w.path==='/api/profile').body;assert.equal(incomplete.full_name,'');assert.equal(incomplete.email,'');assert.ok(!incomplete.work_experience[0].start_date);assert.equal(incomplete.work_experience[0].end_date_unconfirmed,true,'Skipping unknown dates must not invent current employment');checks.push('Incomplete facts explicitly deferred without invention');
 await state('invalid-import');await go('/profile');await canonical();await page.evaluate(label=>[...document.querySelectorAll('label')].find(l=>l.textContent.includes(label)).querySelector('input').click(),reviewLabel);await click('Save changes');await page.waitForSelector('#review-issues-title');assert.equal(await page.$$eval('main button',bs=>bs.find(b=>b.textContent.trim()==='Skip and save').disabled),true,'Malformed supplied email cannot be deferred');assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Malformed values are never written');await page.waitForFunction(()=>document.activeElement?.id==='f_email');await page.waitForFunction(()=>getComputedStyle(document.querySelector('#sec_identity')).borderTopColor==='rgb(180, 35, 50)');assert.equal(await page.$eval('#sec_identity',el=>getComputedStyle(el).borderTopColor),'rgb(180, 35, 50)','Focused invalid field has a visible red boundary around its owning block');await page.$eval('#f_email',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'qa.fixed@example.com');el.dispatchEvent(new Event('input',{bubbles:true}))});await page.waitForFunction(()=>document.querySelector('#sec_identity')?.dataset.guidedValidation==='resolved');checks.push('Invalid field focuses red block and correction turns it green '+reviewWidth);}
 for(const warningWidth of [390,1440]){
  await page.setViewport({width:warningWidth,height:900,deviceScaleFactor:1});await state('linkedin-warning');await go('/profile?view=details');await canonical();await openContact();
  assert.equal(await page.$eval('#f_linkedin_url',el=>el.value),'not a LinkedIn address','Malformed optional LinkedIn is retained as supplied');
  await page.$eval('#f_linkedin_url',el=>{let disclosure=el.closest('details');while(disclosure){if(!disclosure.open)disclosure.querySelector('summary').click();disclosure=disclosure.parentElement?.closest('details')}});
  await page.waitForSelector('[data-linkedin-warning]',{visible:true});
  assert.equal(await page.$eval('#f_linkedin_url',el=>el.getAttribute('aria-invalid')),'true','Malformed optional LinkedIn is visibly marked');
  assert.equal(await page.$eval('#f_linkedin_url',el=>el.getAttribute('aria-describedby')),'linkedin-format-warning','LinkedIn warning is associated with its field');
  assert.ok(await page.$eval('[data-linkedin-warning]',el=>/still save|save your profile/i.test(el.textContent)),'Optional warning explicitly says saving is allowed');
  assert.equal(await page.$eval('[data-linkedin-warning]',el=>getComputedStyle(el).color),'rgb(180, 35, 50)','Optional LinkedIn warning uses readable semantic red');
  if(warningWidth===390){
   await type('#f_linkedin_url','linkedin.com/in/synthetic-candidate');
   await page.waitForFunction(()=>!document.querySelector('[data-linkedin-warning]')&&!document.querySelector('#f_linkedin_url').hasAttribute('aria-invalid')&&document.querySelector('#sec_identity').dataset.guidedValidation==='resolved');
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#sec_identity')).borderTopColor==='rgb(21, 112, 65)');
   assert.equal((await allWrites()).filter(w=>w.path==='/api/profile').length,0,'Correcting optional LinkedIn remains local until explicit Save');
   await type('#f_linkedin_url','not a LinkedIn address');await page.waitForSelector('[data-linkedin-warning]',{visible:true});
   await page.waitForFunction(()=>document.querySelector('#sec_identity').dataset.guidedValidation==='attention');
   checks.push('LinkedIn correction clears warning and aria error, resolves green, and recheck restores red without autosave');
  }
  assert.equal(await page.$$eval('a[href^="javascript:"],a[href^="data:"]',links=>links.length),0,'Malformed stored links are never executable anchors');
  await type('#f_full_name','Maya LinkedIn Warning');await click('Save changes');await page.waitForSelector('.studio-profile-summary');
  const write=(await allWrites()).find(w=>w.path==='/api/profile');assert.ok(write,'Optional LinkedIn warning does not prevent existing-profile Save');assert.equal(write.body.linkedin_url,'not a LinkedIn address','Save preserves malformed optional address without silent correction');
  checks.push('Optional LinkedIn warning permits ordinary save and preserves exact value '+warningWidth);
 }
 await state('linkedin-import');await go('/profile/review');await page.waitForSelector('[data-ui-service="resume-review"]');
 assert.ok(await page.$eval('main',el=>el.textContent.includes('LinkedIn')),'Imported optional LinkedIn finding remains visible');
 assert.equal(await page.$$eval('a[href^="javascript:"],a[href^="data:"]',links=>links.length),0,'Imported unsafe-looking text is not an active link');
 await finalVerification();await page.click('input[type="checkbox"]');await click('Save confirmed data');
 await page.waitForFunction(()=>document.querySelector('.studio-profile-summary')||[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Skip and save'));
 if(await page.$$eval('button',bs=>bs.some(b=>b.textContent.trim()==='Skip and save'))){assert.equal(await page.$$eval('button',bs=>bs.find(b=>b.textContent.trim()==='Skip and save').disabled),false,'Optional LinkedIn warning does not make review Save invalid');await click('Skip and save')}
 await page.waitForSelector('.studio-profile-summary');
 assert.equal((await allWrites()).find(w=>w.path==='/api/profile').body.linkedin_url,'javascript:alert(1)','Imported malformed optional LinkedIn can be explicitly saved unchanged');
 assert.equal(await page.$$eval('a[href^="javascript:"],a[href^="data:"]',links=>links.length),0,'Saved warning text remains non-executable in the profile');
 checks.push('Imported optional LinkedIn remains visible and saves unchanged through final confirmation');
 await state('saved');await go('/profile?view=details');await canonical();await photo();assert.equal((await allWrites()).length,0,'Photo waits for Save');await click('Save changes');await page.waitForFunction(()=>!document.querySelector('#profile-editor'))
 const photoWrites=await allWrites();assert.deepEqual(photoWrites.filter(w=>['/api/profile','/api/profile/photo'].includes(w.path)).map(w=>w.path),['/api/profile','/api/profile/photo'],'Profile validates/saves before deferred photo upload');checks.push('Deferred photo commit')
 await state('with-photo');await go('/profile?view=details');await canonical();await click('Remove photo');assert.equal((await allWrites()).length,0,'Removing photo waits for Save');await click('Cancel');await page.waitForSelector('.studio-profile-summary');assert.ok(await page.$('main img[alt="Your profile photo"]'),'Cancelled removal keeps photo');await click('Edit Career Profile');await canonical();await click('Remove photo');await click('Save changes');await page.waitForFunction(()=>!document.querySelector('#profile-editor'));assert.deepEqual((await allWrites()).filter(w=>['/api/profile','/api/profile/photo'].includes(w.path)).map(w=>[w.path,w.method]),[['/api/profile','PUT'],['/api/profile/photo','DELETE']],'Photo deletion happens only on Save');checks.push('Deferred photo removal and cancellation');
 await state('photo-error');await go('/profile?view=details');await canonical();await type('#f_full_name','Maya Details Survive');await photo();await click('Save changes');await page.waitForFunction(()=>/photo.*fail|photo.*could not|photo.*try again/i.test(document.body.innerText));assert.equal((await(await fetch(origin+'/__profile')).json()).full_name,'Maya Details Survive','Photo failure must not undo saved details');checks.push('Photo failure preserves details')
 await state('save-conflict');await go('/profile?view=details');await canonical();await type('#f_full_name','Maya Conflicting Draft');await photo();await click('Save changes');await page.waitForFunction(()=>document.body.innerText.includes('Fictional stale profile conflict'));await canonical();assert.equal(await page.$eval('#f_full_name',e=>e.value),'Maya Conflicting Draft','Failed save keeps editable draft');assert.equal((await allWrites()).filter(w=>w.path==='/api/profile/photo').length,0,'Profile conflict prevents photo mutation');checks.push('Conflict retains draft and prevents photo upload');
 assert.deepEqual(errors,[],'No application runtime errors');assert.deepEqual(external,[],'No external requests')
 writeFileSync(output+'/results.json',JSON.stringify({checks,errors,external},null,2));console.log(`PASS single Career Profile editor: ${checks.length} responsive/functional checks; explicit versioned save, cancel, review acknowledgement and deferred photos; no external requests`)
}catch(error){console.error('Runtime errors:',errors);if(pageForDebug){console.error('Page text:',await pageForDebug.evaluate(()=>document.body.innerText).catch(()=>''));await pageForDebug.screenshot({path:output+'/failure.png',fullPage:false}).catch(()=>{})}throw error}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes))}rmSync(dir,{recursive:true,force:true})}
