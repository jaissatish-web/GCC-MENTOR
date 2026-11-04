import puppeteer from 'puppeteer'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'

const root = process.cwd()
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg' }
const overview = { score: 85, scoreSummary: { profile: 90, resume: 85, linkedin: 80, naukrigulf: 75, interview: 70 } }
const profile = { email: 'test@example.com', status: 'active', phoneVerified: true, whatsappVerified: false, whatsappNumber: null, whatsappDial: null, fullName: 'Demo Candidate', headline: 'Engineer', role: 'Senior Engineer', skills: 'React, Node.js', experienceYears: 5, location: 'Dubai', availability: 'Immediate', preferredCountries: ['SA', 'AE'], savedJobs: [], savedCvs: [], cvCount: 2, linkedinUrl: null, linkedinSyncedAt: null, linkedinPending: false, linkedinError: null }
let scenario = 'active'
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const pathname = url.pathname
  console.log('[server] request:', pathname)
  if (pathname.startsWith('/api/')) {
    console.log('[server] API request:', pathname)
    if (pathname === '/api/packages/career-profile') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ summary: null, package: null })); return }
    if (req.method !== 'GET') { res.writeHead(409, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'Read-only typography fixture' })); return }
    if (pathname === '/api/ats-scan/session') { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'No saved scan in this fictional fixture' })); return }
    let status = 200
    let data = {}
    if (pathname === '/api/profile') {
      status = scenario === 'error' ? 500 : scenario === 'new' ? 404 : 200
      data = status === 200 ? profile : { error: 'Fixture response' }
    } else if (pathname === '/api/packages') {
      data = { packages: [], total: 0, nextCursor: null }
    } else if (pathname === '/api/dashboard/overview') {
      data = overview
    } else if (pathname === '/api/mock-interview/progress') {
      data = { progress: 0, total: 0 }
    } else {
      console.log('[server] UNMOCKED API:', pathname)
    }
    res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); return
  }
  const builtPage = '.next/server/app' + (pathname === '/' ? '/index' : pathname) + '.html'
  console.log('[server] builtPage:', builtPage, 'exists:', require('fs').existsSync(builtPage))
  const relative = pathname.startsWith('/_next/static/') ? `.next/${pathname.slice(7)}` : require('fs').existsSync(builtPage) ? builtPage : `public${pathname}`
  console.log('[server] relative:', relative)
  const file = require('path').resolve(root, relative)
  const rootNorm = root.replace(/\\/g, '/')
  const fileNorm = file.replace(/\\/g, '/')
  console.log('[server] fileNorm:', fileNorm, 'startsWith:', fileNorm.startsWith(rootNorm), 'exists:', require('fs').existsSync(file))
  if (!fileNorm.startsWith(rootNorm) || !require('fs').existsSync(file)) { console.log('[server] 404'); res.writeHead(404); res.end(); return }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg' }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' })
  res.end(readFileSync(file))
})
await new Promise(r => server.listen(0, '127.0.0.1', r))
const origin = `http://127.0.0.1:${server.address().port}`
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
const page = await browser.newPage()
page.on('console', m => { if (['error','warning'].includes(m.type())) console.log('[console.' + m.type() + ']', m.text().slice(0, 300)) })
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 300)))
page.on('requestfailed', r => console.log('[requestfailed]', r.url().slice(0, 120), r.failure()?.errorText))
await page.setViewport({ width: 390, height: 844 })
await page.goto('http://127.0.0.1:' + server.address().port + '/profile?view=details', { waitUntil: 'networkidle0', timeout: 30000 })
console.log('[test] page loaded')
await page.evaluate(() => { const b = document.querySelector('#sec_identity > h2 > button'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click() })
console.log('[test] clicked expander')
try {
  await page.waitForSelector('.ui-choice-button', { visible: true, timeout: 6000 })
  console.log('[test] ui-choice-button: FOUND')
} catch (e) {
  console.log('[test] ui-choice-button: NOT_FOUND -', e.message)
}
await browser.close(); server.close(); process.exit(0)