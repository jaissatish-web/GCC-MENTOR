/** Real service components + synthetic responses. No production data, AI or microphone. */
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import puppeteer from 'puppeteer-core'
const root=resolve('.'), dir=mkdtempSync(join(tmpdir(),'gcc-preparation-')), require=createRequire(root+'/package.json')
const letter={id:'letter-a',generated_at:'2026-10-15T09:00:00Z',target_job_title:'Commissioning Engineer',target_company:'Example Employer',tone:'professional',full_text:'Dear Hiring Manager,\n\nI bring practical commissioning experience.\n\nKind regards,\nDemo Candidate'}
const question={id:'question-a',category:'technical',difficulty:'standard',question:'How do you verify a commissioning loop?',answer:'I review the procedure and verify the signal path.',why_asked:'To understand your method.',resume_basis:'Commissioning experience',follow_up:'How do you document the result?',tags:[]}
const set={id:'set-a',generated_at:'2026-10-15T09:00:00Z',target_job_title:'Commissioning Engineer',target_company:'Example Employer',question_count:1,source:'optimized_resume',questions:[question]}
const pkg={id:'resume-a',name:'Commissioning Engineer',target_job_title:'Commissioning Engineer',target_company:'Example Employer',target_country:'uae',tier:null,has_resume:true,is_paid:true,optimized_content:{summary:'Practical commissioning experience'},status:'saved',optimization_level:'high',mock_interview_runs:[],cover_letters:[letter,{...letter,id:'letter-b',generated_at:'2026-10-14T09:00:00Z'}],interview_questions:set,interview_question_sets:[set],skills_order:[],field_visibility_snapshot:{}}
writeFileSync(dir+'/entry.mjs',`import React from 'react';import {createRoot} from 'react-dom/client';import Password from ${JSON.stringify(root+'/app/auth/update-password/page.tsx')};import Cover from ${JSON.stringify(root+'/app/cover-letter/page.tsx')};import Qa from ${JSON.stringify(root+'/app/interview-qa/page.tsx')};import Generate from ${JSON.stringify(root+'/app/optimize/generate/[packageId]/page.tsx')};import {AuthForm} from ${JSON.stringify(root+'/components/auth/AuthForm.tsx')};import {DocumentOrbit} from ${JSON.stringify(root+'/components/landing-v3/DocumentOrbit.tsx')};import {VoiceInterview} from ${JSON.stringify(root+'/components/mock-interview/VoiceInterview.tsx')};const p=Promise.resolve({packageId:'resume-a'});const run={id:'run-a',input_mode:'voice',interviewer_id:'british-woman',questions:[{id:'question-a',focus:'Technical',question:'Explain how you verify a signal path and document the result during commissioning.'}]};const s=new URLSearchParams(location.search).get('screen');createRoot(document.getElementById('root')).render(React.createElement(React.Suspense,null,s==='password'?React.createElement(Password):s==='letter'?React.createElement(Cover):s==='qa'?React.createElement(Qa):s==='signup'?React.createElement(AuthForm,{mode:'signup',action:async()=>({})}):s==='orbit'?React.createElement(DocumentOrbit):s==='voice'?React.createElement('div',{style:{height:'90vh',display:'flex'}},React.createElement(VoiceInterview,{packageId:'resume-a',run,onUpdated:()=>{},room:true})):React.createElement(Generate,{params:p})));`)
writeFileSync(dir+'/supabase.js',`export function createClient(){return{auth:{getUser:async()=>({data:{user:{id:'fictional-typography-user'}}})}}}`)
writeFileSync(dir+'/navigation.js',`export function useSearchParams(){return new URLSearchParams(location.search)}export function useRouter(){return{replace:u=>{window.fixtureNavigation=u},push:u=>{window.fixtureNavigation=u}}}`)
writeFileSync(dir+'/link.js',`import React from 'react';export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}`)
writeFileSync(dir+'/image.js',`import React from 'react';export default function Image({fill,priority,sizes,...p}){return React.createElement('img',{...p,style:fill?{position:'absolute',height:'100%',width:'100%',inset:0,...p.style}:p.style})}`)
writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.mjs',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.mjs'],alias:{'@/lib/supabase/client':dir+'/supabase.js','@':root,'next/navigation':dir+'/navigation.js','next/link':dir+'/link.js','next/image':dir+'/image.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
const landing=readFileSync('.next/server/app/index.html','utf8'),bodyClass=landing.match(/<body class="([^"]+)"/)[1]
const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(p=>readFileSync(p.replace('/_next/','.next/'),'utf8')).join('\n')
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
const errors=[],writes=[];let analysisRequest,buildRequest,empty=false
try{
 const page=await browser.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});await page.setRequestInterception(true)
 page.on('request',async r=>{try{
  const u=new URL(r.url()),json=(body,status=200)=>r.respond({status,contentType:'application/json',body:JSON.stringify(body)})
  if(u.origin!=='https://preparation.test')return r.abort()
  if(u.pathname.startsWith('/_next/static/media/'))return r.respond({status:200,contentType:'font/woff2',body:readFileSync(root+u.pathname.replace('/_next/','/.next/'))})
  if(u.pathname==='/fixture.js')return r.respond({status:200,contentType:'application/javascript',body:readFileSync(dir+'/fixture.js')})
  if(u.pathname.startsWith('/interviewers/'))return r.respond({status:200,contentType:'image/webp',body:readFileSync(root+'/public'+u.pathname)})
  if(!u.pathname.startsWith('/api/'))return r.respond({status:200,contentType:'text/html',body:`<html><head><meta charset="utf-8"><style>${css}</style></head><body class="${bodyClass} app-type"><div id="root"></div><script src="/fixture.js"></script></body></html>`})
  if(u.pathname==='/api/optimize'){if(JSON.parse(r.postData()).analyzeOnly)analysisRequest=r;else buildRequest=r;return}
  if(r.method()!=='GET')writes.push(u.pathname)
  if(u.pathname==='/api/packages/career-profile')return json({package:null,summary:null})
  if(u.pathname==='/api/packages')return json({packages:[pkg],total:1,next_cursor:null})
  if(u.pathname==='/api/packages/resume-a')return json({package:empty?{...pkg,cover_letters:[],interview_questions:null,interview_question_sets:[]}:pkg})
  if(u.pathname.endsWith('/voice'))return json({status:'recording',answers:[]})
  if(r.method()==='PATCH'&&u.pathname.endsWith('/cover-letter/letter-a'))return json({letter:{...letter,full_text:JSON.parse(r.postData()).fullText||JSON.parse(r.postData()).full_text,edited_at:'2026-10-18T04:00:00Z'}})
  return json({},404)
 }catch(e){errors.push(e.message);await r.abort().catch(()=>{})}})
 mkdirSync('artifacts/preparation-experience',{recursive:true})
 const goto=screen=>page.goto('https://preparation.test/?package=resume-a&screen='+screen,{waitUntil:'networkidle0'})
 for(const width of [320,390,768,1440]){
  await page.setViewport({width,height:844})
  await goto('letter');await page.waitForSelector('[aria-label="Saved cover letters"]')
  assert.equal(await page.$eval('main > details',e=>e.open),false,'Create another stays collapsed')
  assert.equal(await page.$$eval('[aria-label="Saved cover letters"] > details',es=>es.filter(e=>e.open).length),1,'Only latest letter opens')
  assert.ok(await page.$eval('[aria-label="Saved cover letters"]',e=>Boolean(e.compareDocumentPosition(document.querySelector('main > details'))&Node.DOCUMENT_POSITION_FOLLOWING)))
  if(width===390)await page.screenshot({path:'artifacts/preparation-experience/letters-390.png',fullPage:true})
  await page.click('main > details > summary');assert.equal(await page.$eval('main > details',e=>e.open),true)
  if(width===390){
   await page.$$eval('button',es=>es.find(e=>e.textContent==='Edit letter').click())
   await page.type('[aria-label="Cover letter text (editable)"]',' Additional real experience.')
   await page.$$eval('button',es=>es.find(e=>e.textContent==='Save changes').click())
   await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(e=>e.textContent==='Saved'))
   await page.$$eval('button',es=>es.find(e=>e.textContent==='Write cover letter').click())
   await page.waitForSelector('main > details [role="alert"]')
   assert.equal(await page.$eval('main > details',e=>e.open),true,'Generation failure must stay visible')
  }
  await goto('qa');await page.waitForSelector('[aria-label="Saved interview Q&A"]')
  assert.equal(await page.$eval('main > details',e=>e.open),false)
  await page.$$eval('button',es=>es.find(e=>e.textContent.includes('Show sample answer')).click())
  assert.ok(await page.$eval('[aria-label="Sample answer for question 1"]',e=>e.textContent.includes('signal path')))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Q&A overflow at ${width}`)
  if(width===390)await page.screenshot({path:'artifacts/preparation-experience/qa-390.png',fullPage:true})
  await goto('voice');await page.waitForSelector('[aria-label="Recorded voice interview"] h3')
  const question=await page.$eval('[aria-label="Recorded voice interview"]',e=>[...e.querySelectorAll('h3')].find(e=>e.textContent.startsWith('Explain')).getBoundingClientRect().toJSON())
  assert.ok(question.width>(width<768?width-65:(width*.5)),`Question must lead at ${width}`)
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Voice overflow at ${width}`)
  if(width===390)await page.screenshot({path:'artifacts/preparation-experience/voice-390.png',fullPage:true})
  await goto('signup');assert.equal(await page.$eval('a[href="/#privacy"]',e=>e.target),'_blank')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Signup overflow at ${width}`)
  await goto('password');await page.waitForSelector('input[name=confirm]')
  assert.equal(await page.$eval('h1',e=>getComputedStyle(e).fontSize),width<768?'24px':'22px')
  for(const size of await page.$$eval('input',es=>es.map(e=>getComputedStyle(e).fontSize)))assert.equal(size,'16px')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Password overflow at ${width}`)
  if(width===390)await page.screenshot({path:'artifacts/preparation-experience/password-390.png',fullPage:true})
 }
 empty=true;await goto('letter');await page.waitForSelector('main > details');assert.equal(await page.$eval('main > details',e=>e.open),true,'First-time setup opens');empty=false
 await page.setViewport({width:390,height:844});analysisRequest=null;buildRequest=null
 await page.goto('https://preparation.test/?screen=generate',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('[aria-label="Optimization stages"] [aria-current="step"]')?.textContent.includes('Reviewing'))
 if(!analysisRequest)await page.waitForRequest(r=>r.url().endsWith('/api/optimize')&&JSON.parse(r.postData()).analyzeOnly)
 assert.ok(analysisRequest);assert.equal(buildRequest,null)
 await analysisRequest.respond({status:200,contentType:'application/json',body:'{}'})
 await page.waitForFunction(()=>document.querySelector('[aria-label="Optimization stages"] [aria-current="step"]')?.textContent.includes('Building'))
 if(!buildRequest)await page.waitForRequest(r=>r.url().endsWith('/api/optimize')&&!JSON.parse(r.postData()).analyzeOnly)
 assert.ok(buildRequest);await page.screenshot({path:'artifacts/preparation-experience/progress-390.png',fullPage:true})
 await buildRequest.respond({status:504,contentType:'application/json',body:'{}'})
 await page.waitForSelector('[role="alert"]');assert.ok(await page.$eval('body',e=>e.textContent.includes('saved job details remain')))
 analysisRequest=null;buildRequest=null
 await page.$$eval('button',es=>es.find(e=>e.textContent==='Try again').click());await page.waitForFunction(()=>document.querySelector('[aria-label="Optimization stages"] [aria-current="step"]')?.textContent.includes('Reviewing'))
 if(!analysisRequest)await page.waitForRequest(r=>r.url().endsWith('/api/optimize')&&JSON.parse(r.postData()).analyzeOnly)
 await analysisRequest.respond({status:500,contentType:'application/json',body:'{}'});await page.waitForFunction(()=>document.querySelector('[aria-label="Optimization stages"] [aria-current="step"]')?.textContent.includes('Building'))
 assert.ok(await page.$eval('[aria-label="Optimization stages"]',e=>e.textContent.includes('Continuing')),'Failed analysis never claims completion')
 if(!buildRequest)await page.waitForRequest(r=>r.url().endsWith('/api/optimize')&&!JSON.parse(r.postData()).analyzeOnly)
 await buildRequest.respond({status:200,contentType:'application/json',body:'{"autoApplied":false}'})
 await page.waitForFunction(()=>window.fixtureNavigation==='/optimize/preview/resume-a')
 await page.emulateMediaFeatures([]);await goto('orbit');await page.waitForSelector('[data-orbit-centre="true"]')
 const orbitTransform=await page.$eval('[aria-label="Resume template collection"] button',e=>e.style.transform)
 await page.waitForFunction(previous=>document.querySelector('[aria-label="Resume template collection"] button')?.style.transform!==previous,{},orbitTransform)
 assert.equal(await page.$$eval('button[aria-label="Previous template"],button[aria-label="Next template"]',es=>es.length),0,'Keep the approved rotating-only showcase')
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await goto('orbit');await page.waitForSelector('[data-orbit-centre="true"]')
 await page.click('[data-orbit-centre="true"]');await page.waitForSelector('dialog[open]')
 assert.deepEqual(writes.filter(p=>p!=='/api/packages/career-profile'),['/api/packages/resume-a/cover-letter/letter-a','/api/packages/resume-a/cover-letter'],'Only explicit save and synthetic generation failure may write')
 assert.deepEqual(errors,[])
 console.log('PASS: saved-first services, first-use setup, question-led room, signup privacy, actual progress, timeout/retry, result routing and automatic template rotation and tap preview; 320/390/768/1440px.')
}finally{await browser.close();rmSync(dir,{recursive:true,force:true})}
