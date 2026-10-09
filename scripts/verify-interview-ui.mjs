/** Real React screens with isolated, synthetic API replies and production CSS.
 * Run after build: CHROME_PATH=/path/to/chromium node scripts/verify-interview-ui.mjs
 * No production account, AI, storage or microphone calls.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
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
writeFileSync(dir + '/entry.mjs', `import React from 'react';import {createRoot} from 'react-dom/client';import Mock from ${JSON.stringify(root + '/app/mock-interview/page.tsx')};import Dashboard from ${JSON.stringify(root + '/app/dashboard/page.tsx')};import {ResultsOverview} from ${JSON.stringify(root + '/components/package/ResultsOverview.tsx')};const fixturePkg=${JSON.stringify(pkg)};import {Interviewer} from ${JSON.stringify(root + '/components/mock-interview/Interviewer.tsx')};const q=new URLSearchParams(location.search);const screen=q.get('screen');createRoot(document.getElementById('root')).render(screen==='workspace'?React.createElement(ResultsOverview,{pkg:fixturePkg,document:null,onScored:()=>{}}):screen==='host'?React.createElement('div',{style:{height:'70vh'}},React.createElement(Interviewer,{interviewerId:q.get('host'),recording:false})):screen==='dashboard'?React.createElement(Dashboard):React.createElement(Mock));`)
writeFileSync(dir + '/navigation.js', `export function useSearchParams(){return new URLSearchParams(location.search)}export function usePathname(){return location.pathname}export function useRouter(){return{replace:u=>location.assign(u),push:u=>location.assign(u),refresh:()=>location.reload()}}`)
writeFileSync(dir + '/link.js', `import React from 'react';export default function Link({prefetch,replace,scroll,...p}){return React.createElement('a',p)}`)
writeFileSync(dir + '/image.js', `import React from 'react';export default function Image({fill,priority,sizes,...p}){return React.createElement('img',{...p,style:fill?{position:'absolute',height:'100%',width:'100%',inset:0,...p.style}:p.style})}`)
writeFileSync(dir + '/loader.cjs', `module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
const webpack = require('next/dist/compiled/webpack/webpack'); webpack.init()
await new Promise((yes, no) => webpack.webpack({ mode: 'development', devtool: false, entry: dir + '/entry.mjs', output: { path: dir, filename: 'fixture.js' }, resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs'], alias: { '@': root, 'next/navigation': dir + '/navigation.js', 'next/link': dir + '/link.js', 'next/image': dir + '/image.js' }, modules: [root + '/node_modules', 'node_modules'] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: dir + '/loader.cjs' }] } }, (e, s) => e || s.hasErrors() ? no(e || Error(s.toString({ errors: true }))) : yes()))
const landing = readFileSync('.next/server/app/index.html', 'utf8')
const bodyClass = landing.match(/<body class="([^"]+)"/)[1]
const css = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m => m[1]))].map(p => readFileSync(p.replace('/_next/', '.next/'), 'utf8')).join('\n')
assert.ok(process.env.CHROME_PATH, 'Set CHROME_PATH')
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
try {
  const page = await browser.newPage(), errors = [], writes = []
  page.on('pageerror', e => errors.push(e.message))
  await page.setRequestInterception(true)
  page.on('request', async r => {
    try {
      const u = new URL(r.url()), json = (body, status = 200) => r.respond({ status, contentType: 'application/json', body: JSON.stringify(body) })
      if (u.origin !== 'https://interview.test') return r.abort()
      if (u.pathname.startsWith('/_next/static/media/')) return r.respond({status:200,contentType:'font/woff2',body:readFileSync(root+u.pathname.replace('/_next/','/.next/'))})
      if (!u.pathname.startsWith('/api/') && !u.pathname.startsWith('/interviewers/') && u.pathname !== '/fixture.js') return r.respond({ status: 200, contentType: 'text/html', body: `<html><head><meta charset="utf-8"><style>${css}</style></head><body class="${bodyClass}"><div id="root"></div><script src="/fixture.js"></script></body></html>` })
      if (u.pathname === '/fixture.js') return r.respond({ status: 200, contentType: 'application/javascript', body: readFileSync(dir + '/fixture.js') })
      if (u.pathname.startsWith('/interviewers/')) return r.respond({ status: 200, contentType: 'image/webp', body: readFileSync(root + '/public' + u.pathname) })
      if (r.method() !== 'GET' && u.pathname.includes('/mock-interview/')) writes.push(u.pathname)
      if (u.pathname.endsWith('/voice')) return json({status:'completed',answers:runs[0].questions.map(q=>({question_id:q.id,saved_at:'2026-10-01',transcript:'Saved answer',feedback:{score:7,feedback:'Saved feedback',better_answer:'Use a specific example.',follow_up:'What did you learn?',grammar:[]}}))})
      if (u.pathname === '/api/packages/career-profile') return json({ package: null, summary: null })
      if (u.pathname === '/api/packages') return json({ packages: [pkg, otherPkg], total: 2, next_cursor: null })
      if (u.pathname === '/api/packages/resume-b') return json({ package: otherPkg })
      if (u.pathname === '/api/packages/resume-a') return json({ package: pkg })
      if (u.pathname === '/api/mock-interview/voice-capabilities') return json({ enabled: true })
      if (u.pathname === '/api/mock-interview/progress') return json({ attempts: 12, progress: [{ packageId: pkg.id, progress }] })
      if (u.pathname === '/api/profile') return json(profile)
      if (u.pathname === '/api/profile/pending-draft') return json({ pending: null })
      if (u.pathname === '/api/dashboard/overview') return json({ resume_count: 1, optimized_resume_count: 1, profile_resume_count: 0, target_job_count: 1, cover_letter_count: 0, qa_set_count: 0, mock_interview_count: 12, mock_completed_count: 12, mock_in_progress_count: 0, average_mock_score: 60, resumes_with_letter: 0, resumes_with_qa: 0, resumes_with_mock: 1, stages: {} })
      return json({}, 404)
    } catch (e) { errors.push(e.message); await r.abort().catch(() => {}) }
  })
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await page.setViewport({ width, height: 844 })
    await page.goto('https://interview.test/mock-interview?package=resume-a', { waitUntil: 'networkidle0' })
    await page.waitForSelector('[aria-label="Interview progress report"]')
    assert.equal(await page.$$eval('[aria-label="Saved mock interviews"] > ul > li', els => els.length), 12)
    assert.equal(await page.$$eval('#interview-report', els => els.length), 0, 'Hub contains no individual report')
    assert.equal(await page.$$eval('[aria-label="Explore interview scores"] button', els => els.length), 12)
    await page.click('[aria-label="Explore Technical knowledge"]')
    assert.equal(await page.$eval('[aria-label="Compare score area"]',el=>el.value),'technical_score')
    await page.$$eval('button',els=>els.find(el=>el.textContent.includes('Choose my next practice')).click())
    assert.ok(await page.$eval('details.group',el=>el.open))
    await page.click('[aria-label="Explore interview scores"] button')
    assert.ok(await page.$eval('[aria-label="Interview progress report"] [role="status"]', el=>el.textContent.includes('Mock interview 1')))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
    if(process.env.INTERVIEW_SCREENSHOT && width===390) await (await page.$('[aria-label="Interview progress report"]')).screenshot({path:process.env.INTERVIEW_SCREENSHOT.replace('.png','-chart.png')})
    await page.click('a[href="/mock-interview?package=resume-a&run=attempt-2"]')
    await page.waitForSelector('[aria-label="Result cards"]')
    assert.equal(await page.$$eval('[aria-label="Result cards"] > button', els => els.length), 8)
    assert.equal(await page.$$eval('[aria-label="Saved mock interviews"]', els => els.length), 0)
    if(process.env.INTERVIEW_SCREENSHOT && width===390) await page.screenshot({path:process.env.INTERVIEW_SCREENSHOT.replace('.png','-cards.png'),fullPage:true})
    await page.$$eval('[aria-label="Result cards"] button', els=>els.find(el=>el.textContent.includes('Your assessment')).click())
    await page.waitForFunction(()=>document.body.textContent.includes('Work on this first'))
    const layout = await page.evaluate(() => {
      const text=[...document.querySelectorAll('p')].find(p=>p.textContent.startsWith('Answer the question with a structured'));
      const rect=text.getBoundingClientRect(), style=getComputedStyle(text);
      return {scroll:document.documentElement.scrollWidth,x:rect.x,size:style.fontSize,weight:style.fontWeight,text:text.textContent}
    })
    assert.ok(layout.scroll <= width + 1, JSON.stringify({width,layout}))
    assert.equal(layout.text, runs[1].final_report.priority_focus)
    if(width<640){assert.ok(layout.x<=30,JSON.stringify(layout));assert.equal(layout.size,'15px');assert.equal(layout.weight,'400')}
    if(process.env.INTERVIEW_SCREENSHOT && width===390) await page.screenshot({path:process.env.INTERVIEW_SCREENSHOT,fullPage:true})
    await page.$$eval('button', els=>els.find(el=>el.textContent==='Back to result cards').click())
    await page.$$eval('[aria-label="Result cards"] button', els=>els.find(el=>el.textContent.includes('Your answers')).click())
    await page.waitForSelector('[aria-label="Question cards"] button')
    assert.equal(await page.$$eval('[aria-label="Question cards"] button',els=>els.length),5)
    await page.click('[aria-label="Question cards"] button')
    await page.waitForSelector('[aria-label="Answer detail"]')
    await page.$$eval('[aria-label="Answer sections"] button',els=>els.find(el=>el.textContent==='Coach feedback').click())
    assert.ok(await page.$eval('[aria-label="Answer detail"]',el=>el.textContent.includes('Saved feedback')))
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    await page.$$eval('button',els=>els.find(el=>el.textContent==='All question cards').click())
    await page.$$eval('button',els=>els.find(el=>el.textContent==='Back to result cards').click())
    await page.$$eval('[aria-label="Result cards"] button',els=>els.find(el=>el.textContent.includes('Your practice plan')).click())
    await page.click('[aria-label="Your improvement plan"] summary')
    assert.ok(await page.$eval('[aria-label="Your improvement plan"] details',el=>el.open&&el.textContent.includes('Practise a specific example.')))
    if(width<400){await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
    await page.goto('https://interview.test/?screen=dashboard', { waitUntil: 'networkidle0' })
    await page.waitForSelector('[aria-label="Interview progress report"]')
    assert.ok(await page.$eval('[aria-label="Your interview practice"]', el=>el.textContent.includes('12 saved interviews')))
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    await page.goto('https://interview.test/?screen=workspace',{waitUntil:'networkidle0'})
    await page.waitForSelector('[aria-label="Interview progress report"]')
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
    assert.equal(await page.$eval('.practice-chart-line',el=>getComputedStyle(el).animationName),'none')
    await page.emulateMediaFeatures([])
    for (const host of ['british-woman', 'british-man', 'south-asian-woman', 'south-asian-man', 'arab-woman', 'arab-man']) {
      await page.goto(`https://interview.test/?screen=host&host=${host}`, { waitUntil: 'networkidle0' })
      const image = await page.$eval('img', el => ({ fit: getComputedStyle(el).objectFit, position: getComputedStyle(el).objectPosition, animation: getComputedStyle(el).animationName, transform: getComputedStyle(el).transform, loaded: el.complete && el.naturalWidth > 0, src: el.getAttribute('src') }))
      assert.deepEqual(image, { fit: 'contain', position: '50% 50%', animation: 'none', transform: 'none', loaded: true, src: `/interviewers/${host}.webp` })
    }
  }
  await page.setViewport({width:390,height:844})
  await page.goto('https://interview.test/mock-interview?package=resume-a', {waitUntil:'networkidle0'})
  await page.select('select', 'resume-b')
  await page.waitForFunction(()=>location.search.includes('package=resume-b')&&!location.search.includes('run='))
  await page.waitForSelector('[aria-label="Saved mock interviews"]')
  assert.equal(await page.$$eval('[aria-label="Saved mock interviews"] > ul > li',els=>els.length),1)
  await page.goto('https://interview.test/mock-interview?package=resume-a&run=deleted', { waitUntil: 'networkidle0' })
  assert.ok(await page.$eval('[role="alert"]', el => el.textContent.includes('no longer available')))
  assert.equal(await page.$$eval('#interview-report', els => els.length), 0, 'Missing run must not open a different report')
  assert.deepEqual(writes, [], "Browsing results never starts AI review")
  assert.deepEqual(errors, [])
  console.log('PASS: card hub, 12-point interactive charts, eight result categories, question explorer and answer tabs, original saved text, dashboard and resume overview, skill-to-chart controls, next-practice setup, reduced motion, six widths, six uncropped hosts, no AI writes/overflow/runtime errors')
} finally { await browser.close(); rmSync(dir, { recursive: true, force: true }) }
