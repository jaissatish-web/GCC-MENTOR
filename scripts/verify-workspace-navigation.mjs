/** Real React screens with isolated, synthetic API replies and production CSS.
 * Run after build: CHROME_PATH=/path/to/chromium node scripts/verify-interview-ui.mjs
 * No production account, AI, storage or microphone calls.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'

const root = resolve('.'), dir = mkdtempSync(join(tmpdir(), 'gcc-interview-ui-'))
const require = createRequire(root + '/package.json')
const fixture = spawnSync(process.execPath, ['-r', 'sucrase/register', '-e', `require('./scripts/resolve-paths'); const {attempt}=require('./scripts/verify-interview-progress'); const {interviewProgress}=require('./lib/interviewProgress'); const {makeTemplateFixture}=require('./scripts/fixtures/templateFixture'); const runs=Array.from({length:12},(_,i)=>({...attempt(i+1,i===0?50:i===1?65:60),opening_note:'Practice interview',target_job_title:'Engineer',target_company:null,target_country:'uae',current_index:5,questions:Array.from({length:5},(_,j)=>({id:'q-'+j,question:'Explain a technical example.',focus:'Technical',answer:'Saved answer',feedback:'Saved feedback',score:7}))}));runs.forEach(r=>{r.final_report.executive_summary='Use specific evidence and connect your experience to the question. '.repeat(8);r.final_report.priority_focus='Answer the question with a structured, evidence-based response. '.repeat(8)}); console.log(JSON.stringify({runs,profile:makeTemplateFixture().profile,progress:interviewProgress(runs)}));`], { encoding: 'utf8' })
assert.equal(fixture.status, 0, fixture.stderr)
const { runs, profile, progress } = JSON.parse(fixture.stdout.trim().split('\n').at(-1))
const pkg = { id: 'resume-a', name: 'Engineering CV', target_job_title: 'Engineer', target_country: 'uae', tier: null, has_resume: true, is_paid: true, optimized_content: { summary: 'Saved CV' }, status: 'saved', optimization_level: 'high', mock_interview_runs: runs, cover_letters: [], interview_questions: null, skills_order: [], field_visibility_snapshot: {} }
const otherPkg = { ...pkg, id: 'resume-b', name: 'Other CV', target_job_title: 'Project Engineer', mock_interview_runs: [runs[0]] }
writeFileSync(dir + '/entry.mjs', `import React from 'react';import {createRoot} from 'react-dom/client';import Dashboard from ${JSON.stringify(root+'/app/dashboard/page.tsx')};import {AppShell} from ${JSON.stringify(root+'/components/layout/AppShell.tsx')};createRoot(document.getElementById('root')).render(React.createElement(AppShell,null,React.createElement(Dashboard)));`)
writeFileSync(dir+'/footer.js',`export function AppFooter(){return null}`)
writeFileSync(dir+'/auth.js',`export async function signOut(){throw new Error('Sign out must not be submitted during visual QA')}`)
writeFileSync(dir + '/navigation.js', `export function useSearchParams(){return new URLSearchParams(location.search)}export function usePathname(){return location.pathname}export function useRouter(){return{replace:u=>location.assign(u),push:u=>location.assign(u),refresh:()=>location.reload()}}`)
writeFileSync(dir + '/link.js', `import React from 'react';export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}`)
writeFileSync(dir + '/image.js', `import React from 'react';export default function Image({fill,priority,sizes,...p}){return React.createElement('img',{...p,style:fill?{position:'absolute',height:'100%',width:'100%',inset:0,...p.style}:p.style})}`)
writeFileSync(dir + '/loader.cjs', `module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
// Exercise current CSS-module screens in the isolated fixture as well.
writeFileSync(dir + '/css-loader.cjs', `module.exports=source=>{const classes=Object.fromEntries([...source.matchAll(new RegExp('[.]([A-Za-z_][A-Za-z0-9_-]*)','g'))].map(m=>[m[1],m[1]]));return 'const style=document.createElement("style");style.textContent='+JSON.stringify(source)+';document.head.appendChild(style);export default '+JSON.stringify(classes)}`)
const webpack = require('next/dist/compiled/webpack/webpack'); webpack.init()
await new Promise((yes, no) => webpack.webpack({ mode: 'development', devtool: false, entry: dir + '/entry.mjs', output: { path: dir, filename: 'fixture.js' }, resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs'], alias: { '@/components/layout/AppFooter':dir+'/footer.js', '@/app/auth/actions': dir+'/auth.js', '@': root, 'next/navigation': dir + '/navigation.js', 'next/link': dir + '/link.js', 'next/image': dir + '/image.js' }, modules: [root + '/node_modules', 'node_modules'] }, module: { rules: [{test:/\.module\.css$/,use:dir+'/css-loader.cjs'}, { test: /\.tsx?$/, exclude: /node_modules/, use: dir + '/loader.cjs' }] } }, (e, s) => e || s.hasErrors() ? no(e || Error(s.toString({ errors: true }))) : yes()))
const landing = readFileSync('.next/server/app/index.html', 'utf8')
const bodyClass = landing.match(/<body class="([^"]+)"/)[1]
const css = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m => m[1]))].map(p => readFileSync(p.replace('/_next/', '.next/'), 'utf8')).join('\n')
assert.ok(process.env.CHROME_PATH, 'Set CHROME_PATH')
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
try {
  const page = await browser.newPage(), errors = [], writes = []
  let voiceRecording = false, scenario = 'saved'
  page.on('pageerror', e => errors.push(e.message))
  await page.setRequestInterception(true)
  page.on('request', async r => {
    try {
      const u = new URL(r.url()), json = (body, status = 200) => r.respond({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (u.origin !== 'https://interview.test') return r.abort()
      if (u.pathname.startsWith('/_next/static/media/')) return r.respond({status:200,contentType:'font/woff2',body:readFileSync(root+u.pathname.replace('/_next/','/.next/'))})
      if (!u.pathname.startsWith('/api/') && !u.pathname.startsWith('/interviewers/') && u.pathname !== '/fixture.js') return r.respond({ status: 200, contentType: 'text/html', body: `<html><head><meta charset="utf-8"><style>${css}</style></head><body class="${bodyClass} app-type"><div id="root"></div><script src="/fixture.js"></script></body></html>` })
      if (u.pathname === '/fixture.js') return r.respond({ status: 200, contentType: 'application/javascript', body: readFileSync(dir + '/fixture.js') })
      if (u.pathname.startsWith('/interviewers/')) return r.respond({ status: 200, contentType: 'image/webp', body: readFileSync(root + '/public' + u.pathname) })
      if (r.method() !== 'GET') writes.push(u.pathname)
      if (u.pathname.endsWith('/voice') && voiceRecording) return json({status:'recording',answers:[{question_id:'q-0',saved_at:'2026-10-16T07:00:00Z'}]})
      if (u.pathname.endsWith('/voice')) return json({status:'completed',answers:runs[0].questions.map(q=>({question_id:q.id,saved_at:'2026-10-01',transcript:'Saved answer',feedback:{score:7,feedback:'Saved feedback',better_answer:'Use a specific example.',follow_up:'What did you learn?',grammar:[]}}))})
      if (u.pathname === '/api/packages/career-profile') return json({ package: null, summary: null })
      if (u.pathname === '/api/packages') return scenario === 'saved' ? json({ packages: [pkg, otherPkg], total: 2, next_cursor: null }) : scenario === 'new' ? json({packages:[],total:0,next_cursor:null}) : json({error:'Fixture failed load'},500)
      if (u.pathname === '/api/packages/resume-b') return json({ package: otherPkg })
      if (u.pathname === '/api/packages/resume-a') return json({ package: pkg })
      if (u.pathname === '/api/mock-interview/voice-capabilities') return json({ enabled: true })
      if (u.pathname === '/api/mock-interview/progress') return json({ attempts: 12, progress: [{ packageId: pkg.id, progress }] })
      if (u.pathname === '/api/profile') return scenario === 'saved' ? json({...profile,photo_url:null}) : json({error:'Fixture profile unavailable'},scenario === 'new' ? 404 : 500)
      if (u.pathname === '/api/profile/pending-draft') return json({ pending: null })
      if (u.pathname === '/api/dashboard/overview') return json({ resume_count: 1, optimized_resume_count: 1, profile_resume_count: 0, target_job_count: 1, cover_letter_count: 0, qa_set_count: 0, mock_interview_count: 12, mock_completed_count: 12, mock_in_progress_count: 0, average_mock_score: 60, resumes_with_letter: 0, resumes_with_qa: 0, resumes_with_mock: 1, stages: {} })
      return json({}, 404)
    } catch (e) { errors.push(e.message); await r.abort().catch(() => {}) }
  })
  mkdirSync('docs/desktop-redesign',{recursive:true})
  const required=['/dashboard','/dashboard/library','/optimize/target','/templates','/cover-letter','/interview-qa','/mock-interview','/linkedin-optimization','/naukrigulf-optimization','/profile','/settings','/settings?tab=delete']
  for(const width of [360,390,430,768,1024,1366,1440]){
    await page.setViewport({width,height:900})
    await page.goto('https://interview.test/dashboard',{waitUntil:'networkidle0'})
    await page.waitForFunction(()=>document.body.textContent.includes('Engineer'))
    await page.evaluate(()=>document.fonts.ready)
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Dashboard overflow ${width}`)
    const title=await page.$eval('h1',el=>({size:getComputedStyle(el).fontSize,internal:!!el.closest('.internal-ui')}))
    assert.equal(title.size,width>=768?'26px':'22px')
    await page.screenshot({path:`docs/desktop-redesign/dashboard-${width}.webp`,type:'webp',fullPage:true})
    await page.click('[data-mobile-header] button[aria-label="All services"]')
    await page.waitForSelector('[role="dialog"]')
    assert.equal(await page.$eval('body',el=>el.style.overflow),'hidden')
    const hrefs=await page.$$eval('[role="dialog"] a',els=>els.map(el=>el.getAttribute('href')))
    required.forEach(href=>assert.ok(hrefs.includes(href),`Missing ${href}`))
    assert.equal(await page.$$eval('[role="dialog"] form button',els=>els.filter(el=>el.textContent.includes('Sign out')).length),1)
    await page.screenshot({path:`docs/desktop-redesign/services-${width}.webp`,type:'webp'})
    if(width===390){await page.$eval('[role="dialog"] form button',el=>el.scrollIntoView({block:'end'}));await page.screenshot({path:'docs/desktop-redesign/services-account-390.webp',type:'webp'})}
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close menu')
    await page.keyboard.down('Shift'); await page.keyboard.press('Tab'); await page.keyboard.up('Shift')
    assert.ok(await page.evaluate(()=>document.activeElement?.textContent.includes('Sign out')))
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close menu')
    await page.keyboard.press('Escape')
    assert.equal(await page.$('[role="dialog"]'),null)
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'All services')
    await page.click('[data-mobile-header] button[aria-label="All services"]')
    await page.click('[role="dialog"] button[aria-label="Close menu"]')
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'All services')
    await page.click('[data-mobile-header] button[aria-label="All services"]')
    await page.click('[role="dialog"] a[href="/settings?tab=delete"]')
    await page.waitForFunction(()=>location.pathname==='/settings'&&location.search==='?tab=delete')
    assert.equal(writes.length,0,'Navigation must never execute account actions')
    console.log(`PASS dashboard and services drawer ${width}px`)
  }
  for(scenario of ['new','error']){
    for(const width of [360,1440]){
      await page.setViewport({width,height:900})
      await page.goto('https://interview.test/dashboard',{waitUntil:'networkidle0'})
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
      assert.equal(await page.$$eval('.studio-readiness progress',els=>els.every(el=>!el.hasAttribute('value') && el.getAttribute('aria-valuetext')==='Unavailable')),true,'Unavailable scores must not look like real zeroes')
      if(scenario==='new') assert.ok(await page.$('.studio-continue a[href="/profile?import=upload"]'),'Missing profile has one clear primary creation action')
      await page.screenshot({path:`docs/desktop-redesign/dashboard-${scenario}-${width}.webp`,type:'webp',fullPage:true})
    }
  }
  scenario='saved'
  await page.setViewport({width:360,height:568})
  await page.goto('https://interview.test/dashboard',{waitUntil:'networkidle0'})
  await page.evaluate(()=>document.documentElement.style.fontSize='200%')
  await page.click('[data-mobile-header] button[aria-label="All services"]')
  await page.$eval('[role="dialog"] form button',el=>el.scrollIntoView({block:'center'}))
  assert.ok(await page.$eval('[role="dialog"] form button',el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}))
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
  await page.screenshot({path:'docs/desktop-redesign/services-enlarged.webp',type:'webp'})
  assert.deepEqual(errors,[])
  assert.deepEqual(writes,[])
  console.log('PASS enlarged text, keyboard focus, account navigation, zero writes')
} finally {await browser.close();rmSync(dir,{recursive:true,force:true})}
