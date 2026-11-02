/** Real built /dashboard with fictional local API replies. No production access or writes.
 * MODE=before BUILD_ROOT=/captured/.next CHROME_PATH=/chrome node scripts/verify-dashboard-v3.mjs
 * Run default after a production build. Source, calculations and shell remain real.
 */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),build=resolve(process.env.BUILD_ROOT||'.next'),mode=process.env.MODE||'after',out=`artifacts/dashboard-v3-${mode}${process.env.FUNCTIONAL_ONLY?'-functional':''}`
mkdirSync(out,{recursive:true})
const initial=JSON.parse(readFileSync('scripts/fixtures/studioFixture.json','utf8'))
const profile={...initial.profile,full_name:'Maya Anjali Thomas',target_job_title:'Senior Instrumentation & Control Engineer',current_location:'Dubai, United Arab Emirates'}
const baseTime=Date.parse('2026-11-02T09:00:00Z')
const makePkg=(id,title,company)=>({...initial.pkg,id,name:title,target_job_title:title,target_company:company,mock_in_progress:false,cover_letter_count:1,qa_question_count:20,mock_completed_run_id:'run-reviewed',application_deadline:id==='resume-a'?'2026-11-09':null,interview_date:id==='resume-b'?'2026-11-04T10:30:00Z':null})
const packages=[makePkg('resume-a','Senior Instrumentation & Control Engineer','Fictional Gulf Energy Company'),makePkg('resume-b','Commissioning Team Lead','Fictional Industrial Projects')]
const overview={...initial.overview,resume_count:12,cover_letter_count:8,qa_set_count:6,mock_interview_count:5,mock_in_progress_count:0,stages:{saved:3,applied:2,shortlisted:3,interview:2,visa_processing:1,offer:1}}
const metrics=(score,delta)=>[
 ['overall_score','Overall',score],['technical_score','Technical knowledge',score-2],['role_fit_score','Role fit',score+3],['gulf_readiness_score','Gulf readiness',score+1],['answer_structure_score','Answer structure',score-4]
].map(([key,label,value])=>({key,label,score:value,previous:value-4,delta:4,fromFirst:delta}))
const progress={attempts:5,progress:[{packageId:'resume-a',progress:{selectedId:'run-reviewed',generatedAt:'2026-11-01T10:00:00Z',attemptNumber:3,totalAttempts:3,mode:'mixed',difficulty:'standard',questionCount:10,previousNumber:2,comparableCount:3,timeline:[],metrics:metrics(78,12),nextSteps:[]}},{packageId:'resume-b',progress:{selectedId:'run-other',generatedAt:'2026-11-01T11:00:00Z',attemptNumber:2,totalAttempts:2,mode:'technical',difficulty:'standard',questionCount:5,previousNumber:null,comparableCount:1,timeline:[],metrics:metrics(64,null),nextSteps:[]}}]}
let scenario='saved',writes=[],requests=[],held=[]
const server=createServer(async(req,res)=>{
 const u=new URL(req.url,'http://fixture'),p=u.pathname
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
 if(p.startsWith('/api/')){
  requests.push(p)
  if(req.method!=='GET'){writes.push({path:p,method:req.method});return send({error:'Read-only dashboard fixture'},409)}
  if(scenario==='loading'){held.push(res);return}
  const failed=scenario==='error'
  if(p==='/api/profile')return failed?send({error:'Fixture profile unavailable'},500):scenario==='new'?send({error:'No profile'},404):send(scenario==='long'?{...profile,full_name:'Dr. Maya Anjali Thomas Nair Al-Hassan',target_job_title:'Senior Instrumentation, Automation and Functional Safety Commissioning Engineering Manager',current_location:'Dubai International Financial Centre, United Arab Emirates',visa_status:'Employment residence permit — renewal review in progress',notice_period:'Available after completing the current project handover'}:scenario==='photo'?{...profile,photo_url:'/interviewers/south-asian-woman.webp'}:scenario==='thin'?{...profile,professional_summary:'',work_experience:[],education:[],skills:[]}:scenario==='missing'?{...profile,passport_validity_date:null,visa_status:null,notice_period:null}:profile)
  if(p==='/api/profile/pending-draft')return send({pending:scenario==='pending'?{draft:{full_name:'Pending fictional reading'}}:null})
  if(p==='/api/packages')return failed?send({error:'Fixture packages unavailable'},500):send({packages:['new','empty'].includes(scenario)?[]:packages.map((v,i)=>['ongoing','pending'].includes(scenario)&&i===0?{...v,mock_in_progress:true}:scenario==='long'?{...v,target_job_title:'Senior Instrumentation and Functional Safety Commissioning Engineering Manager',target_company:'Fictional International Industrial Engineering and Energy Projects Company'}:v),total:['new','empty'].includes(scenario)?0:2,next_cursor:null})
  if(p==='/api/dashboard/overview')return failed?send({error:'Fixture totals unavailable'},500):send(['new','empty'].includes(scenario)?{...overview,resume_count:0,cover_letter_count:0,qa_set_count:0,mock_interview_count:0,stages:{saved:0,applied:0,shortlisted:0,interview:0,visa_processing:0,offer:0}}:overview)
  if(p==='/api/mock-interview/progress')return failed?send({error:'Fixture interview unavailable'},500):send(['new','empty','missing'].includes(scenario)?{attempts:0,progress:[]}:progress)
  if(p==='/api/packages/resume-a')return send({package:{...packages[0],mock_interview_runs:[{id:'run-active',status:'in_progress',generated_at:'2026-11-02T08:00:00Z',input_mode:'text',questions:Array.from({length:10},(_,i)=>({id:'q-'+i,answer:i<3?'Saved fictional answer':''}))}]}})
  if(p==='/api/packages/career-profile')return send({package:null,summary:null})
  return send({},404)
 }
 const name=p.startsWith('/_next/static/')?resolve(build,p.slice(7)):p==='/_next/image'?resolve(root,'public'+(u.searchParams.get('url')||'')):p.startsWith('/interviewers/')?resolve(root,'public'+p):resolve(build,'server/app/dashboard.html')
 if(!existsSync(name)){res.writeHead(404);return res.end()}
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'}
 res.writeHead(200,{'Content-Type':mime[extname(name)]||'application/octet-stream','Cache-Control':'no-store'});res.end(readFileSync(name))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const origin=`http://127.0.0.1:${server.address().port}`
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
const results=[],errors=[],external=[]
try{
 const page=await browser.newPage();const desktopAgent=await browser.userAgent();await page.setRequestInterception(true)
 page.on('request',r=>{if(r.url().startsWith(origin)||r.url().startsWith('data:'))r.continue();else{external.push(r.url());r.abort()}})
 page.on('pageerror',e=>errors.push(e.message))
 await page.emulateTimezone('Asia/Riyadh')
 await page.evaluateOnNewDocument(base=>{const NativeDate=Date;class FixedDate extends NativeDate{constructor(...args){super(...(args.length?args:[base]))}static now(){return base}}window.Date=FixedDate},baseTime)
 const go=async(state,width,enlarged=false)=>{
  held.forEach(r=>{if(!r.writableEnded){r.writeHead(503,{'Content-Type':'application/json'});r.end(JSON.stringify({error:'Controlled loading fixture released'}))}});held=[];await page.goto('about:blank',{waitUntil:'domcontentloaded'});scenario=state;requests=[]
  await page.setUserAgent(width<768?'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36':desktopAgent)
  await page.setViewport({width,height:900,deviceScaleFactor:1,isMobile:width<768,hasTouch:width<768})
  await page.goto(origin+'/dashboard',{waitUntil:'domcontentloaded'})
  await page.evaluate(()=>document.fonts.ready)
  if(enlarged)await page.evaluate(()=>document.documentElement.style.fontSize='32px')
  await page.waitForSelector('.studio-home')
  if(state!=='loading')await page.waitForFunction(()=>!document.querySelector('main header[aria-busy="true"]')&&![...document.querySelectorAll('main [role=status]')].some(e=>e.textContent.includes('Loading')),{timeout:8000})
  if(state==='new'){await page.waitForSelector('[role=dialog]');await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:`${out}/new-dialog-${width}.png`,fullPage:true});await page.click('[aria-label="Close first resume guidance"]')}
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a=>a.finished.catch(()=>{}))))
 }
 const measure=async(state,width,enlarged=false)=>{
  const m=await page.evaluate(()=>{
   const main=document.querySelector('.studio-home'),visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0
   const doc='[data-document-preview],#resume-render,[data-typography=document]'
   const elements=[...main.querySelectorAll('h1,h2,h3,p,dt,dd,a,button,label,select,span,strong')].filter(e=>visible(e)&&!e.closest(doc))
   const clipped=elements.filter(e=>!e.children.length&&e.scrollWidth>e.clientWidth+2&&e.clientWidth>0).map(e=>({tag:e.tagName,text:e.textContent.slice(0,70),class:e.className,scroll:e.scrollWidth,width:e.clientWidth}))
   const badBounds=elements.filter(e=>{const r=e.getBoundingClientRect();return r.left< -1||r.right>innerWidth+1}).map(e=>({tag:e.tagName,text:e.textContent.slice(0,50),right:e.getBoundingClientRect().right}))
   const textRanges=[];const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const n=walker.currentNode,e=n.parentElement;if(!n.textContent.trim()||!visible(e)||e.closest('style,script,.sr-only,[aria-hidden=true]'))continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width>2&&r.height>2)textRanges.push({text:n.textContent.trim().slice(0,45),rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom}})}const overlaps=[];for(let i=0;i<textRanges.length;i++)for(let j=i+1;j<textRanges.length;j++){const a=textRanges[i],b=textRanges[j];if(Math.min(a.rect.right,b.rect.right)-Math.max(a.rect.left,b.rect.left)>1&&Math.min(a.rect.bottom,b.rect.bottom)-Math.max(a.rect.top,b.rect.top)>1)overlaps.push([a.text,b.text])}
   const sections=[...main.querySelectorAll('[data-dashboard-section]')].map(e=>({id:e.dataset.dashboardSection,y:e.getBoundingClientRect().top+scrollY,height:e.getBoundingClientRect().height}))
   const links=[...main.querySelectorAll('a')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href'),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width}))
   return {overflow:document.documentElement.scrollWidth>innerWidth+1,height:main.getBoundingClientRect().height,nameSize:getComputedStyle(main.querySelector('h1')).fontSize,profileHeight:main.querySelector('header').getBoundingClientRect().height,text:main.innerText,sections,links,clipped,badBounds,overlaps,progress:[...main.querySelectorAll('progress')].map(e=>({label:e.getAttribute('aria-label'),value:e.getAttribute('value'),max:e.max})),bottomPadding:getComputedStyle(main).paddingBottom}
  })
  const issue=[]
  if(m.overflow)issue.push('horizontal overflow')
  if(mode==='after'){
   if(m.clipped.length)issue.push('clipped leaf text '+JSON.stringify(m.clipped))
   if(m.overlaps.length)issue.push('text overlaps '+JSON.stringify(m.overlaps.slice(0,12)))
   if(m.badBounds.length)issue.push('out of viewport text '+JSON.stringify(m.badBounds))
   const expected=['profile','readiness','next-action','activity','quick-actions','interview','events','pipeline','documents','guide']
   if(JSON.stringify(m.sections.map(s=>s.id))!==JSON.stringify(expected))issue.push('missing/wrong DOM sections '+m.sections.map(s=>s.id).join(','))
   if(!enlarged&&state==='saved'&&!(parseFloat(m.nameSize)>=18&&parseFloat(m.nameSize)<=20))issue.push('candidate name size '+m.nameSize)
   for(const l of m.links.filter(l=>l.width>0&&l.height>0))if(l.height<43)issue.push('small touch link '+l.text+' '+l.height)
  }
  results.push({state,width,enlarged,...m,issues:issue});if(issue.length)console.error(`FAIL ${state}/${width}/${enlarged}: ${issue.join('; ')}`)
 }
 const widths=process.env.FUNCTIONAL_ONLY?[]:process.env.TYPE_WIDTHS?JSON.parse(process.env.TYPE_WIDTHS):[320,360,375,390,430,768,1024,1440]
 for(const width of widths){await go('saved',width);await measure('saved',width);await page.screenshot({path:`${out}/saved-${width}.png`,fullPage:true});if(mode!=='before'||[390,1440].includes(width)){const h=await page.$eval('.studio-home',e=>e.getBoundingClientRect().height);for(const[pos,y]of[['top',0],['middle',Math.max(0,h/2-450)],['bottom',h]]){await page.evaluate(y=>scrollTo({top:y,left:0,behavior:"instant"}),y);await page.screenshot({path:`${out}/saved-${width}-${pos}.png`,fullPage:false})}}console.log(`PASS ${mode} saved ${width}`)}
 if(mode!=='before'){
  for(const width of widths){await go('long',width);await measure('long',width);await page.screenshot({path:`${out}/long-${width}.png`,fullPage:true});await go('long',width,true);await measure('long',width,true);await page.screenshot({path:`${out}/long-${width}-200pct.png`,fullPage:true});console.log('PASS long/enlarged '+width)}
  for(const state of (process.env.FUNCTIONAL_ONLY?[]:['empty','new','missing','thin','photo','pending','ongoing','error','loading']))for(const width of [320,390,1440]){await go(state,width);await measure(state,width);await page.screenshot({path:`${out}/${state}-${width}.png`,fullPage:true});if(state==='pending'){assert.ok((await page.$eval('.studio-continue',e=>e.textContent)).includes('Review'),'pending reading wins');assert.equal(await page.$eval('.studio-continue a.ui-button',e=>e.getAttribute('href')),'/profile')}if(state==='ongoing'){await page.waitForFunction(()=>document.querySelector('.studio-continue')?.textContent.includes('3 of 10'));assert.match(await page.$eval('.studio-continue a.ui-button',e=>e.href),/run=run-active/)}console.log('PASS state '+state+'/'+width)}
  await go('error',390);scenario='saved';await page.$eval('[data-dashboard-section=activity] button',e=>e.click());await page.waitForFunction(()=>document.querySelector('[data-dashboard-section=activity]')?.textContent.includes('12'));
  await go('saved',390)
  const counters=await page.$$eval('[data-dashboard-section=activity] a',es=>es.filter(e=>e.querySelector('strong')).map(e=>e.querySelector('strong').textContent.trim()));assert.deepEqual(counters,['12','8','6','5'],'real saved activity totals')
  const readiness=await page.$$eval('[data-dashboard-section=readiness] progress',es=>es.map(e=>Number(e.getAttribute('value'))));assert.deepEqual(readiness,[100,100],'two independent real readiness results')
  const readinessLinks=await page.$$eval('[data-dashboard-section=readiness] a',es=>es.map(e=>e.getAttribute('href')));assert.ok(readinessLinks.includes('/profile?view=completeness'));assert.ok(readinessLinks.includes('/profile?view=readiness'))
  const pipeline=await page.$eval('[data-dashboard-section=pipeline]',e=>e.textContent);for(const label of ['Applied','Shortlisted','Interview','Visa','Offer'])assert.ok(pipeline.includes(label))
  const times=await page.$$eval('[data-dashboard-section=events] time',es=>es.map(e=>({datetime:e.getAttribute('datetime'),text:e.textContent})));assert.ok(times.some(t=>t.datetime==='2026-11-04T10:30:00Z'&&t.text.includes('13:30')),'existing interview timezone formatting');assert.ok(times.some(t=>t.datetime==='2026-11-09'),'existing civil-date deadline')
  assert.ok(await page.$('select'),'multiple resume histories selectable')
  const options=await page.$$eval('select option',es=>es.map(e=>e.value));assert.deepEqual(options,['resume-a','resume-b'])
  await page.select('select','resume-b');await page.waitForFunction(()=>document.querySelector('[aria-label="My interview performance"]')?.textContent.includes('64'))
  const perf=await page.$eval('[aria-label="My interview performance"]',e=>e.textContent);assert.ok(perf.includes('baseline'));assert.ok(!perf.includes('+12'),'unrelated resume trend never mixed');assert.deepEqual(await page.$$eval('[data-dashboard-section=interview] progress',es=>es.map(e=>Number(e.getAttribute('value')))),[62,67,65,60],'selected resume metrics remain separate')
  const report=await page.$$eval('a',es=>es.find(e=>/report/i.test(e.textContent)&&e.href.includes('run-other'))?.href);assert.ok(report?.includes('package=resume-b'))
  const actionLinks=await page.$$eval('[data-dashboard-section=quick-actions] a',es=>es.map(e=>e.getAttribute('href')));assert.deepEqual(actionLinks,['/optimize/target','/dashboard/library','/profile?view=details','/mock-interview'])
  await page.click('.journey-guide-trigger');await page.waitForSelector('[role=dialog]');await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:`${out}/guide-390.png`,fullPage:true});await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[role=dialog]')&&document.activeElement?.classList.contains('journey-guide-trigger'));assert.ok(await page.evaluate(()=>document.activeElement?.classList.contains('journey-guide-trigger')),'guide restores focus')
 }
 assert.deepEqual(errors,[],'runtime errors');assert.deepEqual(external,[],'external requests');assert.deepEqual(writes,[],'unexpected API mutations');assert.deepEqual(results.filter(r=>r.issues.length).map(r=>({state:r.state,width:r.width,enlarged:r.enlarged,issues:r.issues})),[],'all responsive dashboard states')
 console.log(`PASS dashboard ${mode}: ${results.length} full dashboard states; no production access, external requests or writes`)
}finally{held.forEach(r=>r.destroy());writeFileSync(out+'/results.json',JSON.stringify({mode,results,errors,external,writes},null,2));await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
