/** Exercise the built UI with fictional API fixtures; never contacts production.
 * Run after npm run build: CHROME_PATH=/path/to/chromium node scripts/verify-readable-ui.mjs
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
let scenario = 'new'
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/api/')) {
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
      data = { pending: false }
    }
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
    return
  }
  const pathname = (url.pathname === '/_next/image' ? url.searchParams.get('url') : url.pathname) ?? ''
  const relative = pathname.startsWith('/_next/static/') ? `.next/${pathname.slice(7)}`
    : pathname === '/' ? '.next/server/app/index.html'
      : pathname === '/dashboard' ? '.next/server/app/dashboard.html'
        : `public${pathname}`
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
mkdirSync('artifacts/readable-ui', { recursive: true })
try {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', req => req.url().startsWith(origin) || req.url().startsWith('data:') ? req.continue() : req.abort())
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const width of [320, 390, 768, 1366, 1440]) {
    await page.setViewport({ width, height: width < 768 ? 844 : 900 })
    for (const state of ['new', 'saved', 'error']) {
      scenario = state
      await page.goto(`${origin}/dashboard`, { waitUntil: 'networkidle0' })
      const primary = '[aria-label="Your progress and next step"]'
      await page.waitForFunction((selector, state) => {
        const text = document.querySelector(selector)?.textContent ?? ''
        return text.includes(state === 'new' ? 'Start with your CV' : state === 'saved' ? 'target job' : 'could not be loaded')
      }, {}, primary, state)
      const dimensions = await page.evaluate(selector => {
        const next = document.querySelector(selector)
        const scores = document.querySelector('[aria-labelledby="scores-heading"]')
        const reports = [...document.querySelectorAll('details')].find(e => e.textContent.includes('Your progress reports'))
        return { width: document.documentElement.scrollWidth, nextTop: next.getBoundingClientRect().top,
          scoresTop: scores.getBoundingClientRect().top, reportsOpen: reports.open,
          links: [...next.querySelectorAll('a')].map(e => ({ href: e.getAttribute('href'), bottom: e.getBoundingClientRect().bottom })) }
      }, primary)
      assert.ok(dimensions.width <= width + 1, `Dashboard overflow at ${width}/${state}`)
      assert.ok(dimensions.nextTop < dimensions.scoresTop, 'Next action precedes reports and scores')
      assert.equal(dimensions.reportsOpen, false, 'Detailed reports are available without crowding the first screen')
      if (state === 'new') {
        assert.ok(dimensions.links.some(e => e.href === '/profile?import=upload' && e.bottom < 700), 'First action must be visible without scrolling')
        for (const href of ['/profile?import=upload', '/profile?import=paste', '/profile']) assert.ok(dimensions.links.some(e => e.href === href), `Missing entry path ${href}`)
      }
      await page.screenshot({ path: `artifacts/readable-ui/dashboard-${width}-${state}.png`, fullPage: false })
      if (width < 768) {
        const trigger = await page.$('button[aria-label="More services"]')
        assert.ok(trigger, 'All services must be reachable from the bottom bar')
        await trigger.click()
        await page.waitForSelector('[role="dialog"]')
        const hrefs = await page.$$eval('[role="dialog"] a', links => links.map(link => link.getAttribute('href')))
        for (const href of ['/dashboard', '/profile', '/dashboard/library', '/templates', '/optimize/target', '/cover-letter', '/interview-qa', '/mock-interview', '/linkedin-optimization', '/settings']) assert.ok(hrefs.includes(href), `Service missing from More: ${href}`)
        await page.keyboard.press('Tab')
        assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), 'Focus stays inside the menu')
        // Tab repeatedly to exercise wrap-around rather than only initial focus.
        for (let i = 0; i < 15; i++) await page.keyboard.press('Tab')
        assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), 'Tab wraps inside the menu')
        await page.keyboard.press('Escape')
        await page.waitForSelector('[role="dialog"]', { hidden: true })
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'More services')
      }
      await page.$eval('details summary', element => element.click())
      assert.ok(await page.$eval('details', element => element.open), 'Progress reports expand')
    }
    await page.goto(origin, { waitUntil: 'networkidle0' })
    assert.ok(await page.$('#services'), 'Landing explains services before the detailed walkthrough')
    if (width < 1280) {
      await page.click('summary[aria-label="Open section menu"]')
      await page.click('header details a[href="#services"]')
      assert.equal(await page.$eval('header details', element => element.open), false, 'Section selection closes the navigation menu')
    }
    assert.ok(await page.$('#journey details'), 'Detailed application demo remains available')
    await page.$eval('#journey summary', element => element.click())
    assert.ok(await page.$eval('#journey details', element => element.open), 'Application demo expands')
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: `artifacts/readable-ui/landing-${width}.png`, fullPage: false })
  }
  assert.deepEqual(errors, [], `Client runtime errors: ${errors.join('; ')}`)
  console.log('PASS: built landing/dashboard at 320–1440px; new, saved and failure states; next action above the fold; all services in More; keyboard focus/escape; expandable reports and demo.')
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
