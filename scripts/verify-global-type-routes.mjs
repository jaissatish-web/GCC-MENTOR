/** Exercise the built UI with fictional API fixtures; never contacts production.
 * Run after npm run build: CHROME_PATH=/path/to/chromium node scripts/verify-global-type-routes.mjs
 * MODE=before records baseline; TYPE_PATHS/TYPE_WIDTHS select coverage.
 * RUNTIME_START=1 uses a local production server for public auth/legal views.
 * No authentication form is submitted; no production API is contacted.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import puppeteer from 'puppeteer-core'

const root = process.cwd()
assert.ok(existsSync('.next/server/app/dashboard.html'), 'Run npm run build first.')
const profile = {
  id: 'ui-fixture', user_id: 'ui-fixture', full_name: 'Demo Candidate',
  phone: '+910000000000', email: 'demo@example.com', currently_in_gulf: false,
  current_location: 'India', readiness_score: 80, target_job_title: 'Engineer',
  target_country: 'saudi_arabia', target_industry: 'Engineering',
  work_experience: [], education: [], certifications: [], skills: [],
  additional_information: [], field_visibility: {},
}
const overview = {
  resume_count: 0, profile_resume_count: 0, optimized_resume_count: 0,
  target_job_count: 0, draft_resume_count: 0, cover_letter_count: 0, qa_set_count: 0,
  mock_interview_count: 0, mock_completed_count: 0, mock_in_progress_count: 0,
  average_mock_score: null, resumes_with_letter: 0, resumes_with_qa: 0, resumes_with_mock: 0,
  stages: { saved: 0, applied: 0, shortlisted: 0, interview: 0, offer: 0, rejected: 0 },
}
let scenario = 'saved'
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
    if(url.pathname==='/api/packages/career-profile'){res.writeHead(200, {'Content-Type':'application/json'});res.end(JSON.stringify({summary:null,package:null}));return}
    if (req.method !== 'GET') { res.writeHead(409, {'Content-Type':'application/json'}); res.end(JSON.stringify({error:'Read-only typography fixture'})); return }
    if(url.pathname==='/api/ats-scan/session'){res.writeHead(404, {'Content-Type':'application/json'});res.end(JSON.stringify({error:'No saved scan in this fictional fixture'}));return}
    let status = 200
    let data = {}
    if (url.pathname === '/api/profile') {
      status = scenario === 'error' ? 500 : scenario === 'new' ? 404 : 200
      data = status === 200 ? profile : { error: 'Fixture response' }
    } else if (url.pathname === '/api/packages') {
      data = { packages: [], total: 0, nextCursor: null }
    } else if (url.pathname === '/api/dashboard/overview') {
      data = overview
    } else if (url.pathname === '/api/mock-interview/progress') {
      data = { attempts: 0, progress: [] }
    } else if (url.pathname === '/api/profile/pending-draft') {
      data = { pending: false, draft: null }
    }
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
    return
  }
  const pathname = (url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname) ?? ''
  const builtPage = '.next/server/app' + (pathname === '/' ? '/index' : pathname) + '.html'
  const relative = pathname.startsWith('/_next/static/') ? `.next/${pathname.slice(7)}`
    : existsSync(builtPage) ? builtPage : `public${pathname}`
  const file = resolve(root, relative)
  if (!file.startsWith(`${root}/`) || !existsSync(file)) {
    res.writeHead(404); res.end(); return
  }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
// Keep runtime server and browser in the same process network namespace.
mkdirSync('artifacts',{recursive:true})
let runtimeChild=null
if(process.env.RUNTIME_START){
 runtimeChild=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{cwd:root,env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SUPABASE_URL:'https://ci-placeholder.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:'ci-placeholder-anon-key'},stdio:['ignore','pipe','pipe']})
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{runtimeChild.kill();reject(new Error('Runtime server did not become ready'))},20000);runtimeChild.stdout.on('data',data=>{if(String(data).includes('Ready')){clearTimeout(timer);resolve()}});runtimeChild.stderr.on('data',data=>writeFileSync('artifacts/global-type-runtime-server.log',data,{flag:'a'}));runtimeChild.once('exit',code=>{clearTimeout(timer);reject(new Error('Runtime server exited '+code))})})
 process.env.RUNTIME_ORIGIN='http://127.0.0.1:3100'
}
const origin = process.env.RUNTIME_ORIGIN || `http://127.0.0.1:${server.address().port}`
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })

// Built client routes with fictional, local-only responses. Server-authenticated
// admin and server-rendered auth/legal routes are explicitly unverified here.
const mode=process.env.MODE||'after'
const target=`artifacts/global-type-${mode}${process.env.RUNTIME_ORIGIN?'-runtime':''}`
mkdirSync(target,{recursive:true})
const paths=process.env.TYPE_PATHS?JSON.parse(process.env.TYPE_PATHS):['/','/dashboard','/dashboard/library','/dashboard/tools','/profile','/profile?view=details','/profile?view=completeness','/profile?view=readiness','/profile/import','/profile/review','/optimize/target','/optimize/setup','/cover-letter','/interview-qa','/mock-interview','/templates','/preparation-pack','/linkedin-optimization','/linkedin-optimization/workspace','/naukrigulf-optimization','/naukrigulf-optimization/workspace','/gulf-readiness-score','/gulf-readiness','/forgot-password','/onboarding','/settings','/payments','/ats-scan']
const results=[]
const failures=[]
const unverified=['Live authenticated persistence and AI results',process.env.RUNTIME_ORIGIN?'Admin/account content behind sign-in remains unverified':'Server-rendered admin/auth/legal routes (no static HTML)']
try {
 const page=await browser.newPage()
 await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith(origin)||r.url().startsWith('data:')||(process.env.RUNTIME_ORIGIN&&/^http:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0):3100\//.test(r.url()))?r.continue():r.abort())
 for(const path of paths){if(!process.env.RUNTIME_ORIGIN&&path==='/payments'){unverified.push('/payments redirects to server-rendered /settings?tab=payments');continue}if(!process.env.RUNTIME_ORIGIN&&!existsSync('.next/server/app'+(path.split('?')[0]==='/'?'/index':path.split('?')[0])+'.html')){unverified.push(path+' (requires server-rendered auth/data)');continue}for(const width of (process.env.TYPE_WIDTHS?JSON.parse(process.env.TYPE_WIDTHS):[360,375,390,430,1440])){
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError)
  await page.setViewport({width,height:900})
  await page.goto(origin+path,{waitUntil:process.env.RUNTIME_ORIGIN?'domcontentloaded':'networkidle0'});if(process.env.RUNTIME_ORIGIN)await page.waitForSelector('h1,h2',{visible:true,timeout:10000})
  await page.evaluate(()=>document.fonts.ready)
  const data=await page.evaluate(()=>{
   const boundary='[data-document-preview],#resume-render,.actual-template-orbit-face,[data-typography="document"]'
   const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0
   const rem=parseFloat(getComputedStyle(document.documentElement).fontSize)
   const expectedSize=(e,s)=>{
    const role=e.tagName==='H1'?'title':e.tagName==='H2'?'section':'card-title'
    const semantic=s.getPropertyValue('--ui-'+e.tagName.toLowerCase()+'-size').trim()||s.getPropertyValue('--ui-'+role+'-size').trim()
    return semantic.endsWith('rem')?parseFloat(semantic)*rem:semantic.endsWith('px')?parseFloat(semantic):null
   }
   const rgb=value=>{const n=value.match(/[\d.]+/g)?.map(Number);return n&&n.length>=3?n:null}
   const luminance=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0)
   const contrastFor=e=>{
    const style=getComputedStyle(e),fg=rgb(style.color)
    if(!fg)return null
    let bg=[255,255,255],node=e,unknown=false
    while(node){const s=getComputedStyle(node);if(s.backgroundImage!=='none'||parseFloat(s.opacity)<1){unknown=true;break}const c=rgb(s.backgroundColor);if(c&&(c.length<4||c[3]===1)){bg=c;break}if(c&&c[3]>0){unknown=true;break}node=node.parentElement}
    if(unknown)return null
    const alpha=fg.length>3?fg[3]:1,blended=fg.slice(0,3).map((v,i)=>v*alpha+bg[i]*(1-alpha))
    const a=luminance(blended),b=luminance(bg)
    return {ratio:Math.round((Math.max(a,b)+.05)/(Math.min(a,b)+.05)*100)/100,background:bg.slice(0,3),minimum:parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseInt(style.fontWeight)>=700)?3:4.5}
   }
   const text=[...document.querySelectorAll('h1,h2,h3,p,label,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select,button')].filter(e=>!e.closest(boundary)&&visible(e)).map(e=>{const s=getComputedStyle(e);return {tag:e.tagName,text:e.textContent.slice(0,90),class:e.className,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,font:s.fontFamily,color:s.color,expected:/^H[123]$/.test(e.tagName)?expectedSize(e,s):null,contrast:contrastFor(e)}})
   const docs=[...document.querySelectorAll(boundary)].filter(visible).map(e=>({class:e.className,font:getComputedStyle(e).fontFamily,size:getComputedStyle(e).fontSize,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))
   return{actual:location.pathname,title:document.title,text,docs,overflow:document.documentElement.scrollWidth>innerWidth+1,overflowNodes:[...document.querySelectorAll('main *')].filter(e=>!e.closest(boundary)&&visible(e)&&e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,class:e.className,text:e.textContent.slice(0,70)})),excerpt:document.body.innerText.slice(0,220)}
  })
  const issues=[]
  if(data.overflow)issues.push('horizontal overflow')
  if(errors.length)issues.push('runtime: '+errors.join(';'))
  if(!data.text.some(e=>/^H[123]$/.test(e.tag)))issues.push('no rendered heading / route unavailable')
  if(mode!=='before'){
   for(const field of data.text.filter(e=>['INPUT','TEXTAREA','SELECT'].includes(e.tag))){if(parseFloat(field.size)<16)issues.push('small input '+field.size)}
   for(const h of data.text.filter(e=>/^H[123]$/.test(e.tag))){if(!h.font.includes('Inter'))issues.push('heading not Inter: '+h.text);if(h.expected!==null&&Math.abs(parseFloat(h.size)-h.expected)>.05)issues.push('heading scale '+h.text+' expected '+h.expected+' actual '+h.size);if(h.weight!==(h.tag==='H1'?'700':'600'))issues.push('heading weight '+h.text+' '+h.weight)}
  }
  let state='rendered';if(data.text.some(t=>/^This page isn.t here/.test(t.text))){state='unverified-not-found';unverified.push(path+' rendered not-found screen; requested content unavailable with placeholder data')}if(process.env.RUNTIME_ORIGIN&&data.actual==='/login'&&!path.startsWith('/login')){state='unverified-auth-wall';unverified.push(path+' rendered sign-in wall, not authenticated content')}const record={path,width,...data,state,errors,issues};results.push(record)
  if(issues.length)failures.push({path,width,issues,nodes:data.overflowNodes})
  if([390,1440].includes(width))await page.screenshot({path:target+'/'+(path==='/'?'landing':path.replace(/[^a-z0-9]+/gi,'_'))+'-'+width+'.png',fullPage:true})
  // Open a real rendered local component's guide/FAQ, then capture its actual state.
  if(path==='/dashboard'&&width===390&&await page.$('.journey-guide-trigger')){
   await page.evaluate(()=>[...document.querySelectorAll('.journey-guide-trigger')].find(e=>e.getBoundingClientRect().width>0)?.click())
   await page.waitForSelector('[role=dialog]',{visible:true});await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a=>a.finished.catch(()=>{}))));await page.screenshot({path:target+'/how-it-works-390.png',fullPage:false})
  }
  page.off('pageerror',onError)
 } console.log(mode+': rendered '+path)}
 // Existing service's real error presentation, only fixture API response changes.
 if(!process.env.RUNTIME_ORIGIN){scenario='error'
 await page.setViewport({width:390,height:900})
 await page.goto(origin+'/profile',{waitUntil:'networkidle0'})
 await page.screenshot({path:target+'/profile-api-error-390.png',fullPage:true})}
 console.log(JSON.stringify({mode,states:results.length,requestedContentStates:results.filter(r=>r.state==='rendered').length,failures,contrastWarnings:results.flatMap(r=>r.text.filter(t=>t.contrast&&t.contrast.ratio<t.contrast.minimum).map(t=>({path:r.path,width:r.width,text:t.text,ratio:t.contrast.ratio,background:t.contrast.background}))).slice(0,50)},null,2))
} finally {
 writeFileSync(target+'/results.json',JSON.stringify({mode,results,failures,unverified:[...new Set(unverified)]},null,2))
 await browser.close();await new Promise(r=>server.close(r));runtimeChild?.kill()
}
if(mode!=='before')assert.equal(failures.length,0,JSON.stringify(failures))
