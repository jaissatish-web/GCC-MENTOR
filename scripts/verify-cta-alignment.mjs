/** CTA alignment regression with the actual built profile and fictional local APIs.
 * Run after npm run build: CHROME_PATH=/path/to/chromium npm run test:cta
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


mkdirSync('artifacts/cta-alignment',{recursive:true})
try {
 const page=await browser.newPage();await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith(origin)||r.url().startsWith('data:')?r.continue():r.abort())
 for(const width of [320,390,768,1440]) {
  await page.setViewport({width,height:844});await page.goto(origin+'/profile?view=details',{waitUntil:'networkidle0'})
  await page.evaluate(()=>{const b=document.querySelector('#sec_identity > h2 > button');if(b&&b.getAttribute('aria-expanded')!=='true')b.click()})
  await page.waitForSelector('.ui-choice-button',{visible:true,timeout:4000})
  const group=()=>page.evaluate(()=>{const nodes=[...document.querySelectorAll('.ui-choice-button')];return nodes.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {x:r.x,width:r.width,height:r.height,align:s.textAlign,border:s.borderStyle,background:s.backgroundColor,edge:s.borderColor,pressed:e.getAttribute('aria-pressed')}})})
  const typeRoles=await page.evaluate(()=>({label:getComputedStyle(document.querySelector('#whatsapp-choice-label')).fontSize,phone:getComputedStyle(document.querySelector('label[for="f_phone_number"]')).fontSize,hint:getComputedStyle(document.querySelector('.field-hint')).fontSize,helper:getComputedStyle(document.querySelector('.internal-ui')).getPropertyValue('--ui-helper-size').trim()}))
  assert.equal(typeRoles.label,typeRoles.phone,'Paragraph and label field headings must match')
  let before=await group();assert.equal(before.length,3)
  assert.ok(before.every(b=>b.width===before[0].width&&b.x===before[0].x&&b.height>=46&&b.height===before[0].height&&b.align==='left'&&b.border==='solid'),JSON.stringify(before))
  assert.ok(before.every(b=>b.pressed==='false'),'Empty saved number must not imply a declaration')
  await page.click('.ui-choice-button:nth-child(1)');assert.equal((await group())[0].pressed,'true')
  await page.waitForFunction(()=>{const buttons=document.querySelectorAll('.ui-choice-button');return getComputedStyle(buttons[0]).borderColor!==getComputedStyle(buttons[1]).borderColor})
  assert.notEqual((await group())[0].edge,before[0].edge,'Selection has a distinct border')
  await page.click('.ui-choice-button:nth-child(2)');await page.waitForSelector('#f_whatsapp_number',{visible:true});assert.equal((await group())[1].pressed,'true')
  await page.select('#f_whatsapp_dial','+966');assert.equal(await page.$eval('#f_whatsapp_dial',e=>e.value),'+966')
  assert.equal(await page.$eval('#f_whatsapp_dial',e=>e.options[e.selectedIndex].textContent.includes('Saudi')),true)
  assert.equal(await page.$eval('#f_whatsapp_dial',e=>e.parentElement.querySelector('.phone-code-value').textContent),'+966')
  await page.click('.ui-choice-button:nth-child(3)');assert.equal((await group())[2].pressed,'true')
  await page.select('#f_phone_dial','+966')
  await page.$eval('.ui-choice-group',e=>e.scrollIntoView({block:'center'}))
  await page.evaluate(()=>Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().iterations)).map(a=>a.finished.catch(()=>{}))))
  await page.screenshot({path:'artifacts/cta-alignment/profile-'+width+'.png'})
  if(width===320) {
   await page.evaluate(()=>document.documentElement.style.fontSize='32px');
   const enlarged=await group();assert.ok(enlarged.every(b=>b.width===enlarged[0].width&&b.height>=46));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
   await (await page.$('.ui-choice-group')).screenshot({path:'artifacts/cta-alignment/profile-320-enlarged.png'})
  }
  console.log('PASS actual profile WhatsApp selections and phone menu '+width)
 }
} finally {await browser.close();await new Promise(r=>server.close(r))}
