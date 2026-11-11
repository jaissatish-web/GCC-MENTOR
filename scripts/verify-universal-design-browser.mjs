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
const results = [], failures = [], runtimeErrors = [], blockedExternal = []
let originalServer
async function exercise(kind, width, callback) {
  try { await callback() } catch (error) {
    const failure = { kind, width, message:error.message, stack:error.stack }
    failures.push(failure);results.push({...failure,pass:false});console.error(`FAIL ${kind} ${width}px: ${error.message}`)
  }
}
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
// Font loading and the existing FittedPage ResizeObserver need several frames.
// Require exact stability before either sample; never round or discard geometry.
async function stableDocuments(frame) {
  await frame.evaluate(() => document.fonts.ready)
  let previous = '', consecutive = 0
  for (let attempt=0;attempt<80;attempt++) {
    const snapshot = await documentSnapshot(frame)
    const serialized = JSON.stringify(snapshot)
    consecutive = serialized === previous ? consecutive + 1 : 0
    if (consecutive >= 4) return snapshot
    previous = serialized
    await new Promise(resolve => setTimeout(resolve,75))
  }
  throw new Error('Resume preview geometry did not settle before comparison; no theme-equivalence result is available')
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
  for (const width of [360,390,430,768,1024,1440]) await exercise('landing',width,async () => {
    await page.setViewport({width,height:900,deviceScaleFactor:1})
    await page.goto(origin + '/', {waitUntil:'networkidle0'})
    await page.evaluate(() => document.fonts.ready)
    await page.waitForSelector('[data-uds="hero-title"]',{visible:true})
    await page.waitForFunction(() => document.querySelectorAll('.actual-template-orbit-face').length >= 3)
    await page.$eval('#markets', element => element.scrollIntoView())
    await page.waitForSelector('#markets-title', {visible:true})
    await page.evaluate(() => scrollTo(0,0))
    const state = await page.evaluate(() => {
      const style = value => getComputedStyle(document.querySelector(`[data-uds="${value}"]`))
      return {overflow:document.documentElement.scrollWidth > innerWidth+1,hero:style('hero-title').fontSize,cardRadius:style('card').borderRadius,cardPadding:style('card').paddingTop,buttonHeight:style('button-secondary').minHeight,primaryHeight:style('button-primary').minHeight,section:style('section').paddingTop,orbitCount:document.querySelectorAll('.actual-template-orbit-face').length,globe:!!document.querySelector('#markets-title')}
    })
    const device = width<768 ? 'mobile' : width<1024 ? 'tablet' : 'desktop'
    await page.screenshot({path:`${output}/landing-${width}.png`,fullPage:true})
    results.push({kind:'landing-measurements',width,...state})
    assert.equal(state.overflow,false,`Landing overflow at${width}`)
    assert.equal(state.hero,DEFAULT_THEME[device].heroSize+'px',`Hero role at${width}`)
    assert.equal(state.cardRadius,DEFAULT_THEME[device].cardRadius+'px')
    assert.equal(state.cardPadding,DEFAULT_THEME[device].cardPadding+'px')
    assert.equal(state.buttonHeight,DEFAULT_THEME[device].buttonHeight+'px')
    assert.equal(state.primaryHeight,DEFAULT_THEME[device].primaryHeight+'px')
    assert.equal(state.section,DEFAULT_THEME[device].landingGap+'px')
    assert.ok(state.globe && state.orbitCount>=3,'Preserved landing experiences')
    results.push({kind:'landing',width,...state,pass:true})
  })
  const prepareFrame = async width => {
    await page.setViewport({width,height:900,deviceScaleFactor:1})
    await page.goto(origin + '/__design-qa',{waitUntil:'networkidle0'})
    const iframe = await page.$('iframe'), frame = await iframe.contentFrame()
    await frame.waitForSelector('[data-uds="hero-title"]',{visible:true})
    await frame.waitForFunction(() => document.querySelectorAll('.actual-template-orbit-face').length>=3)
    await frame.evaluate(() => document.fonts.ready)
    await sendTheme(page,frame,DEFAULT_THEME)
    return frame
  }
  const modifiedTheme = () => {
    const theme = JSON.parse(JSON.stringify(DEFAULT_THEME))
    theme.colors.brand='#5946A3'
    theme.mobile.heroSize=40
    theme.desktop.landingGap=112
    theme.fontFamily='arial'
    for (const device of ['mobile','tablet','desktop']) { theme[device].cardRadius=20;theme[device].cardPadding=28;theme[device].buttonHeight=56;theme[device].primaryHeight=58 }
    return theme
  }
  // Settings evidence is independent from the strict mounted-document stability gate.
  for (const width of [390,1440]) await exercise('settings',width,async () => {
    const frame = await prepareFrame(width), theme = modifiedTheme()
    await sendTheme(page,frame,theme)
    const state = await frame.evaluate(() => {
      const s = role => getComputedStyle(document.querySelector(`[data-uds="${role}"]`))
      return {brand:s('button-primary').backgroundColor,hero:s('hero-title').fontSize,radius:s('card').borderRadius,padding:s('card').paddingTop,section:s('section').paddingTop,height:s('button-secondary').minHeight,overflow:document.documentElement.scrollWidth>innerWidth+1}
    })
    // Persist every measured setting and screenshot before assertions, even when a setting fails.
    const checks = {
      primaryColor:state.brand==='rgb(89, 70, 163)',
      mobileHeading:state.hero===(width<768 ? 40 : DEFAULT_THEME.desktop.heroSize)+'px',
      cardRadius:state.radius==='20px',
      cardPadding:state.padding==='28px',
      desktopSpacing:state.section===(width>=1024 ? 112 : DEFAULT_THEME.mobile.landingGap)+'px',
      buttonHeight:state.height==='56px',
      noOverflow:state.overflow===false,
    }
    results.push({kind:'settings-measurements',width,...state,checks,pass:Object.values(checks).every(Boolean)})
    await page.screenshot({path:`${output}/settings-modified-${width}.png`,fullPage:true})
    for (const [role,label] of [['hero','hero'],['card','card'],['section','section']]) {
      const element=await frame.$(`[data-uds="${role}"]`)
      if(element)await element.screenshot({path:`${output}/settings-${label}-${width}.png`})
    }
    assert.ok(Object.values(checks).every(Boolean),`Independent setting failures at${width}: ${JSON.stringify(checks)}`)
  })
  // Use fresh frames; setting screenshots and scrolling cannot contaminate the baseline.
  for (const width of [390,1440]) await exercise('mounted-resumes',width,async () => {
    const frame = await prepareFrame(width)
    const before = await stableDocuments(frame), beforeHashes = await documentPixels(frame,'default',width)
    assert.deepEqual(await stableDocuments(frame),before,`Baseline resume drift without any theme change at${width}`)
    await sendTheme(page,frame,modifiedTheme())
    assert.deepEqual(await stableDocuments(frame),before,`Mounted resume styling/geometry changed at${width}`)
    assert.deepEqual(await documentPixels(frame,'modified',width),beforeHashes,`Resume pixels changed at${width}`)
    results.push({kind:'mounted-resumes',width,resumeCount:before.length,pixelHashes:beforeHashes,pass:true})
  })
  // Exact original-main built assets are a separate diagnostic, never a substitute
  // for the unchanged strict current-build document-equivalence assertions above.
  const originalBuild = resolve(process.env.QA_ORIGINAL_BUILD ?? `${output}/original-build`)
  const originalIndex = existsSync(originalBuild+'/server/app/index.html') ? originalBuild+'/server/app/index.html' : originalBuild+'/index.html'
  if (existsSync(originalIndex)) {
    originalServer=createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost')
      if(url.pathname.startsWith('/api/')) {res.writeHead(req.method==='GET'?200:409,{'Content-Type':'application/json'});res.end(JSON.stringify(req.method==='GET'?{user:null,profile:null,packages:[],summary:null}:{error:'Read-only fictional fixture'}));return}
      const path=url.pathname==='/_next/image'?url.searchParams.get('url')??'':url.pathname
      const file=path==='/'?originalIndex:path.startsWith('/_next/static/')?resolve(originalBuild,path.slice(7)):resolve(root,'public','.'+path)
      if((!file.startsWith(originalBuild+'/')&&!file.startsWith(root+'/public/'))||!existsSync(file)){res.writeHead(404);res.end();return}
      res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(readFileSync(file))
    })
    await new Promise(resolve=>originalServer.listen(0,'127.0.0.1',resolve))
    const originalOrigin=`http://127.0.0.1:${originalServer.address().port}`
    const originalPage=await browser.newPage()
    await originalPage.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
    originalPage.on('pageerror',error=>runtimeErrors.push(`original-main: ${error.message}`))
    await originalPage.setRequestInterception(true)
    originalPage.on('request',request=>request.url().startsWith(originalOrigin+'/')||request.url().startsWith('data:')?request.continue():request.abort())
    for(const width of [390,1440]) await exercise('original-main-orbit-diagnostic',width,async()=>{
      await originalPage.setViewport({width,height:900,deviceScaleFactor:1})
      await originalPage.goto(originalOrigin+'/',{waitUntil:'networkidle0'})
      await originalPage.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length>=3)
      await originalPage.evaluate(()=>document.fonts.ready)
      const first=await documentSnapshot(originalPage),entry={kind:'original-main-orbit-diagnostic',diagnosticOnly:true,width,sourceRef:process.env.TYPE_BASE_REF??null,indexSha256:hash(readFileSync(originalIndex)),first}
      try {
        const stable=await stableDocuments(originalPage),second=await stableDocuments(originalPage)
        entry.stable=stable;entry.second=second;entry.exactlyEqual=JSON.stringify(stable)===JSON.stringify(second)
        assert.deepEqual(second,stable,`Original-main orbit drift without a theme mutation at${width}`)
        entry.pass=true
      } catch(error) {entry.pass=false;entry.error=error.message;entry.final=await documentSnapshot(originalPage)}
      finally {results.push(entry);writeFileSync(`${output}/original-orbit-${width}.json`,JSON.stringify(entry,null,2));await originalPage.screenshot({path:`${output}/original-orbit-${width}.png`,fullPage:true})}
    })
    await originalPage.close()
  } else results.push({kind:'original-main-orbit-diagnostic',status:'not-run',reason:'No exact original build supplied; no claim about pre-existing drift'})
  if (failures.length) throw new AggregateError(failures.map(failure=>new Error(`${failure.kind} ${failure.width}px: ${failure.message}`)),'Universal design browser verification has blocking failures; independent evidence retained')
  assert.deepEqual(runtimeErrors,[],'Unexpected client runtime errors')
  console.log('PASS: six landing widths, independent six-setting evidence and strict mounted document style/pixel isolation. Original-main drift evidence is reported separately; authenticated admin persistence remains outside this fixture.')
} finally {
  writeFileSync(`${output}/results.json`,JSON.stringify({results,failures,runtimeErrors,blockedExternal:[...new Set(blockedExternal)]},null,2))
  await browser?.close()
  if(originalServer) await new Promise(r=>originalServer.close(r))
  await new Promise(r => server.close(r))
}
