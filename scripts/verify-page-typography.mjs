/** Exercise the built UI with fictional API fixtures; never contacts production.
 * Run after npm run build: CHROME_PATH=/path/to/chromium node scripts/verify-page-typography.mjs
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
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
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })

// Actual built page components with fictional, local-only API data. Automatic
// writes are rejected by the fixture server; no account, generation or AI cost.
const paths=process.env.TYPE_PATHS?JSON.parse(process.env.TYPE_PATHS):['/','/dashboard','/dashboard/library','/dashboard/tools','/profile','/profile?view=details','/profile?view=completeness','/profile?view=readiness','/optimize/target','/optimize/setup','/cover-letter','/interview-qa','/mock-interview','/templates','/preparation-pack','/linkedin-optimization','/linkedin-optimization/workspace','/gulf-readiness-score','/gulf-readiness','/forgot-password','/onboarding','/resume-design-lab'];
mkdirSync('artifacts/page-typography',{recursive:true})
const results=[]
try{
 const runtimeErrors=[];const page=await browser.newPage();page.on('pageerror',e=>runtimeErrors.push(e.message));await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith(origin)||r.url().startsWith('data:')?r.continue():r.abort())
 for(const path of paths){
  for(const width of [320,390,768,1440]){
   await page.setViewport({width,height:900})
   await page.goto(origin+path,{waitUntil:'networkidle0'})
   await page.evaluate(()=>document.fonts.ready)
   await page.waitForSelector('h1,h2',{visible:true,timeout:6000})
   assert.equal(await page.evaluate(()=>document.body.innerText.includes('Application error: a client-side exception')),false,`Client error screen ${path}/${width}`)
   assert.deepEqual(runtimeErrors,[],`Client runtime ${path}/${width}`)
   const data=await page.evaluate(()=>{
    const doc='[data-document-preview],#resume-render,.actual-template-orbit-face,[data-typography="document"]'
    const visible=e=>!e.closest(doc)&&e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>({tag:e.tagName,size:getComputedStyle(e).fontSize,weight:getComputedStyle(e).fontWeight}))
    const fields=[...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=hidden]),textarea,select')].filter(visible).map(e=>getComputedStyle(e).fontSize)
    return{actual:location.pathname,headings,fields,overflow:document.documentElement.scrollWidth>innerWidth+1,overflowNodes:[...document.querySelectorAll('main *')].filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(e=>({tag:e.tagName,class:e.getAttribute('class')}))}
   })
   assert.equal(data.overflow,false,`Overflow ${path}/${width}: ${JSON.stringify(data.overflowNodes)}`)
   for(const h of data.headings){const size=h.tag==='H1'?(width<640?26:30):h.tag==='H2'?(width<640?20:22):(width<640?16:18);assert.equal(h.size,size+'px',`${path}/${width} ${h.tag}`);assert.equal(h.weight,h.tag==='H1'?'700':'600',path)}
   for(const f of data.fields)assert.equal(f,'16px',`Input readability ${path}/${width}`)
   if(!data.headings.length)console.log(await page.evaluate(()=>document.body.innerText.slice(0,1200)))
   assert.ok(data.headings.length,`No meaningful rendered page ${path}/${width}`)
   results.push({path,width,actual:data.actual,headings:data.headings.length,fields:data.fields.length,pass:true})
   if(width===390)await page.screenshot({path:'artifacts/page-typography/'+path.replace(/[^a-z0-9]+/gi,'_')+'-390.png',fullPage:true})
  }
  console.log('PASS typography and reflow: '+path)
 }
 console.log('PASS: '+results.length+' built page states; phone/tablet/desktop, headings and readable fields')
}finally{const {writeFileSync}=await import('node:fs');writeFileSync('artifacts/page-typography/results.json',JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r))}
