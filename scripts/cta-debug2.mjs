import puppeteer from 'puppeteer'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'

const root = process.cwd()
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.jpg': 'image/jpeg' }
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  const pathname = url.pathname
  console.log('[server] request:', pathname)
  const builtPage = '.next/server/app' + (pathname === '/' ? '/index' : pathname) + '.html'
  console.log('[server] builtPage:', builtPage, 'exists:', existsSync(builtPage))
  const relative = pathname.startsWith('/_next/static/') ? `.next/${pathname.slice(7)}` : existsSync(builtPage) ? builtPage : `public${pathname}`
  console.log('[server] relative:', relative)
  const file = resolve(root, relative)
  console.log('[server] file:', file, 'startsWithRoot:', file.startsWith(`${root}/`), 'exists:', existsSync(file))
  if (!file.startsWith(`${root}/`) || !existsSync(file)) { console.log('[server] 404'); res.writeHead(404); res.end(); return }
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
await page.evaluate(() => { const b = document.querySelector('#sec_identity > h2 > button'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click() })
const found = await page.waitForSelector('.ui-choice-button', { visible: true, timeout: 6000 }).then(() => 'FOUND').catch(() => 'NOT_FOUND')
console.log('ui-choice-button:', found)
await browser.close(); server.close(); process.exit(0)