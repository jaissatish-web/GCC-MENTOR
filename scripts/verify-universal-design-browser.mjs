/** Built landing pilot QA. Synthetic local server only; no production account/API.
 * Run after npm run build:
 * CHROME_PATH=/path/to/chromium node scripts/verify-universal-design-browser.mjs
 * Requires the repository's existing puppeteer-core and sucrase/register tooling.
 * This is not the pre-change resume/PDF regression gate; see verification docs.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import puppeteer from 'puppeteer-core'
const require = createRequire(import.meta.url)
require('sucrase/register')
const { DEFAULT_THEME } = require('../lib/design-system/theme.ts')
const root = process.cwd(), output = 'artifacts/universal-design-v1'
assert.ok(existsSync('.next/server/app/index.html'), 'Run npm run build first.')
mkdirSync(output, { recursive: true })
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.woff2':'font/woff2' }
const server = createServer((req,res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/__design-qa') {
    res.writeHead(200, {'Content-Type':'text/html'})
    res.end('<!doctype html><html><head><style>html,body{margin:0}iframe{display:block;border:0;width:100vw;height:100vh}</style></head><body><iframe title="Landing design preview" src="/?designPreview=1"></iframe></body></html>')
    return
  }
  if (url.pathname.startsWith('/api/')) {
    res.writeHead(req.method === 'GET' ? 200 : 409, {'Content-Type':'application/json'})
    res.end(JSON.stringify(req.method === 'GET' ? {user:null,profile:null,packages:[],summary:null} : {error:'Read-only fictional fixture'})); return
  }
  const path = url.pathname === '/_next/image' ? url.searchParams.get('url') ?? '' : url.pathname
  const relative = path.startsWith('/_next/static/') ? '.next/' + path.slice(7) : path === '/' ? '.next/server/app/index.html' : 'public' + path
  const file = resolve(root, relative)
  if (!file.startsWith(root + '/') || !existsSync(file)) { res.writeHead(404); res.end(); return }
  res.writeHead(200, {'Content-Type':mime[extname(file)] ?? 'application/octet-stream'}); res.end(readFileSync(file))
})
await new Promise(r => server.listen(0,'127.0.0.1',r))
const origin = `http://127.0.0.1:${server.address().port}`
let browser
const results = [], runtimeErrors = [], blockedExternal = []
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
async function documentSnapshot(frame) {
  return frame.evaluate(() => [...document.querySelectorAll('.actual-template-orbit-face')].map(root => {
    const tree = [root,...root.querySelectorAll('*')].filter(e => !['SCRIPT','STYLE'].includes(e.tagName))
    return tree.map(e => {
      const s = getComputedStyle(e)
      return { tag:e.tagName,text:e.children.length ? '' : e.textContent, font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,color:s.color,background:s.backgroundColor,border:s.border,margin:s.margin,padding:s.padding,width:s.width,height:s.height,zoom:s.zoom,position:s.position,top:s.top,left:s.left,display:s.display }
    })
  }))
}
// Render a clone of the actual mounted document in a stable screenshot location.
// This removes orbit-position/whole-page movement from the pixel comparison;
// actual mounted document computed styles and geometry are compared separately.
async function documentPixels(frame, phase, width) {
  const count = await frame.evaluate(() => document.querySelectorAll('.actual-template-orbit-face').length)
  const hashes = []
  for (let index=0;index<count;index++) {
    await frame.evaluate(index => {
      const source = document.querySelectorAll('.actual-template-orbit-face')[index]
      const clone = source.cloneNode(true)
      clone.setAttribute('data-qa-document-clone','')
      Object.assign(clone.style,{position:'fixed',left:'0px',top:'0px',margin:'0',transform:'none',zIndex:'2147483647',opacity:'1'})
      document.querySelector('[data-universal-theme]').append(clone)
    },index)
    const clone = await frame.$('[data-qa-document-clone]')
    try {
      const bytes = await clone.screenshot({path:`${output}/orbit-${index}-${width}-${phase}.png`})
      hashes.push(hash(bytes))
    } finally { await frame.evaluate(() => document.querySelector('[data-qa-document-clone]')?.remove()) }
  }
  return hashes
}
async function sendTheme(page, frame, theme) {
  await page.evaluate(theme => document.querySelector('iframe').contentWindow.postMessage({type:'gcc-design-preview',theme}, location.origin),theme)
  await frame.waitForFunction(brand => document.querySelector('[data-universal-theme]').style.getPropertyValue('--uds-brand').trim().toUpperCase() === brand.toUpperCase(),{},theme.colors.brand)
  await frame.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}
try {
  browser = await puppeteer.launch({ executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process'] })
  const page = await browser.newPage()
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
  page.on('pageerror',e => runtimeErrors.push(e.message))
  await page.setRequestInterception(true)
  page.on('request',request => {
    if (request.url().startsWith(origin + '/') || request.url().startsWith('data:')) request.continue()
    else { blockedExternal.push(new URL(request.url()).origin); request.abort() }
  })
  for (const width of [360,390,430,768,1024,1440]) {
    await page.setViewport({width,height:900,deviceScaleFactor:1})
    await page.goto(origin + '/', {waitUntil:'networkidle0'})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForSelector('[data-uds="hero-title"]',{visible:true})
    await page.waitForFunction(() => document.querySelectorAll('.actual-template-orbit-face').length >= 3)
    const state = await page.evaluate(() => {
      const style = value => getComputedStyle(document.querySelector(`[data-uds="${value}"]`))
      return {overflow:document.documentElement.scrollWidth > innerWidth+1,hero:style('hero-title').fontSize,cardRadius:style('card').borderRadius,cardPadding:style('card').paddingTop,buttonHeight:style('button-secondary').minHeight,primaryHeight:style('button-primary').minHeight,section:style('section').paddingTop,orbitCount:document.querySelectorAll('.actual-template-orbit-face').length,globe:!!document.querySelector('#markets')}
    })
    const device = width<768 ? 'mobile' : width<1024 ? 'tablet' : 'desktop'
    assert.equal(state.overflow,false,`Landing overflow at${width}`)
    assert.equal(state.hero,DEFAULT_THEME[device].heroSize+'px',`Hero role at${width}`)
    assert.equal(state.cardRadius,DEFAULT_THEME[device].cardRadius+'px')
    assert.equal(state.cardPadding,DEFAULT_THEME[device].cardPadding+'px')
    assert.equal(state.buttonHeight,DEFAULT_THEME[device].buttonHeight+'px')
    assert.equal(state.primaryHeight,DEFAULT_THEME[device].primaryHeight+'px')
    assert.equal(state.section,DEFAULT_THEME[device].landingGap+'px')
    assert.ok(state.globe && state.orbitCount>=3,'Preserved landing experiences')
    await page.screenshot({path:`${output}/landing-${width}.png`,fullPage:true})
    results.push({kind:'landing',width,...state,pass:true})
  }
  for (const width of [390,1440]) {
    await page.setViewport({width,height:900,deviceScaleFactor:1})
    await page.goto(origin + '/__design-qa',{waitUntil:'networkidle0'})
    const iframe = await page.$('iframe'), frame = await iframe.contentFrame()
    await frame.waitForSelector('[data-uds="hero-title"]',{visible:true})
    await frame.waitForFunction(() => document.querySelectorAll('.actual-template-orbit-face').length>=3)
    await frame.evaluate(() => document.fonts.ready)
    await sendTheme(page,frame,DEFAULT_THEME)
    const before = await documentSnapshot(frame), beforeHashes = await documentPixels(frame,'default',width)
    const theme = JSON.parse(JSON.stringify(DEFAULT_THEME))
    theme.colors.brand='#5946A3'
    theme.mobile.heroSize=40
    theme.desktop.landingGap=112
    theme.fontFamily='arial'
    for (const device of ['mobile','tablet','desktop']) { theme[device].cardRadius=20;theme[device].cardPadding=28;theme[device].buttonHeight=56;theme[device].primaryHeight=58 }
    await sendTheme(page,frame,theme)
    const state = await frame.evaluate(() => {
      const s = role => getComputedStyle(document.querySelector(`[data-uds="${role}"]`))
      return {brand:s('button-primary').backgroundColor,hero:s('hero-title').fontSize,radius:s('card').borderRadius,padding:s('card').paddingTop,section:s('section').paddingTop,height:s('button-secondary').minHeight,overflow:document.documentElement.scrollWidth>innerWidth+1}
    })
    assert.equal(state.brand,'rgb(89, 70, 163)')
    assert.equal(state.hero,(width<768 ? 40 : DEFAULT_THEME.desktop.heroSize)+'px')
    assert.equal(state.radius,'20px'); assert.equal(state.padding,'28px'); assert.equal(state.height,'56px')
    assert.equal(state.section,(width>=1024 ? 112 : DEFAULT_THEME.mobile.landingGap)+'px')
    assert.equal(state.overflow,false,`Modified setting overflow at${width}`)
    assert.deepEqual(await documentSnapshot(frame),before,`Mounted resume styling/geometry changed at${width}`)
    assert.deepEqual(await documentPixels(frame,'modified',width),beforeHashes,`Resume pixels changed at${width}`)
    results.push({kind:'settings-and-mounted-resumes',width,...state,resumeCount:before.length,pixelHashes:beforeHashes,pass:true})
  }
  assert.deepEqual(runtimeErrors,[],'Unexpected client runtime errors')
  console.log('PASS: six landing widths, six setting changes, and mounted document style/pixel isolation. This does not certify pre-change PDF/preview equivalence or authenticated admin persistence.')
} finally {
  writeFileSync(`${output}/results.json`,JSON.stringify({results,runtimeErrors,blockedExternal:[...new Set(blockedExternal)]},null,2))
  await browser?.close()
  await new Promise(r => server.close(r))
}
