/** Approved V2 presentation QA; compiled actual page/components with read-only anonymous API fixtures. */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),out='artifacts/premium-landing-v2';mkdirSync(out,{recursive:true})
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'}
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost')
 if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({user:null,profile:null,packages:[],summary:null}));return}
 const p=u.pathname==='/_next/image'?u.searchParams.get('url'):u.pathname
 const file=resolve(root,p==='/'?'.next/server/app/index.html':p.startsWith('/_next/static/')?'.next/'+p.slice(7):'public'+p)
 if(!file.startsWith(root+'/')||!existsSync(file)||!statSync(file).isFile()){res.statusCode=404;res.end();return}
 res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(readFileSync(file))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=process.env.QA_URL??`http://127.0.0.1:${server.address().port}`
const outDepth='artifacts/orbit-depth';mkdirSync(outDepth,{recursive:true});let browser;const results=[]
try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 for(const width of [320,390,768,1024,1440,1920]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.$eval('[data-uds=visual]',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForFunction(()=>document.querySelectorAll('[aria-roledescription=carousel] button[data-front]').length===10)
  await page.evaluate(()=>document.fonts.ready)
  const layers=await page.$eval('[data-uds=visual]',e=>{const rear=getComputedStyle(e,'::before'),front=getComputedStyle(e,'::after');return {isolation:getComputedStyle(e).isolation,rear:{z:rear.zIndex,clip:rear.clipPath,pointer:rear.pointerEvents,box:rear.inset},front:{z:front.zIndex,clip:front.clipPath,pointer:front.pointerEvents,box:front.inset},carouselZ:getComputedStyle(e.children[1]).zIndex,faces:e.querySelectorAll('.actual-template-orbit-face').length}})
  assert.equal(layers.isolation,'isolate');assert.equal(layers.rear.z,'0');assert.equal(layers.carouselZ,'1');assert.equal(layers.front.z,'2');assert.equal(layers.rear.clip,'inset(0px 0px 50%)');assert.equal(layers.front.clip,'inset(50% 0px 0px)');assert.equal(layers.front.pointer,'none');assert.equal(layers.rear.pointer,'none');assert.equal(layers.rear.box,layers.front.box)
  const geometry = await page.$eval('[aria-roledescription=carousel]', carousel => {
   const box = carousel.getBoundingClientRect()
   const buttons = [...carousel.querySelectorAll('button[data-front]')]
   const selected = carousel.querySelector('[data-orbit-centre]')
   const cards = buttons.map(card => card.getBoundingClientRect())
   const viewport = document.documentElement.clientWidth
   return {
    viewport, left: box.left, right: viewport - box.right,
    horizontalOverflow: document.documentElement.scrollWidth > viewport,
    cardCount: cards.length,
    selectedAboveCards: buttons.every(card => card === selected || Number(card.style.zIndex) < Number(selected.style.zIndex)),
    clippedCards: cards.filter(card => card.left < box.left - 1 || card.right > box.right + 1 ||
      card.top < box.top - 1 || card.bottom > box.bottom + 1).map(card => ({
        top: card.top - box.top, bottom: box.bottom - card.bottom, left: card.left - box.left, right: box.right - card.right,
      })),
    cardCoverage: (Math.max(...cards.map(card => card.right)) - Math.min(...cards.map(card => card.left))) / box.width,
   }
  })
  const stageWidth = width >= 1024 ? width / 2 : width >= 768 ? Math.min(width - 48, 720) : width
  const gutter = (width - stageWidth) / 2
  assert.ok(Math.abs(geometry.left - gutter) < 1 && Math.abs(geometry.right - gutter) < 1, JSON.stringify(geometry))
  assert.equal(geometry.horizontalOverflow, false, `Page overflows at ${width}px`)
  assert.equal(geometry.cardCount, 10)
  assert.equal(geometry.selectedAboveCards, true)
  assert.deepEqual(geometry.clippedCards, [])
  assert.ok(geometry.cardCoverage >= (width < 768 ? 0.9 : 0.84), JSON.stringify(geometry))
  if (width !== 390 && width !== 1440) {
   results.push({width,layers,geometry})
   console.log('PASS orbit layout', width)
   continue
  }
  // Full section keeps the decorative plane and the actual live documents together.
  await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));await page.screenshot({path:`${outDepth}/orbit-${width}.png`,fullPage:false});await (await page.$('#templates')).screenshot({path:`${outDepth}/orbit-section-${width}.png`})
  const before=await page.$eval('[data-orbit-centre=true]',e=>e.getAttribute('aria-label'));await page.focus('[aria-roledescription=carousel] button[data-orbit-centre=true]');await page.keyboard.press('ArrowRight');await page.waitForFunction(label=>document.querySelector('[data-orbit-centre=true]').getAttribute('aria-label')!==label,{},before)
  await page.click('[data-orbit-centre=true]');await page.waitForSelector('dialog[open]');assert.equal(await page.$eval('dialog',e=>e.parentElement===document.body),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'))
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));const transform=await page.$eval('[aria-roledescription=carousel] button',e=>e.style.transform);await page.waitForFunction(t=>document.querySelector('[aria-roledescription=carousel] button').style.transform!==t,{},transform);await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);results.push({width,layers,geometry,keyboardSelection:true,readerOpenEscape:true,animationMovement:true,overlayInterceptsInput:false});console.log('PASS orbit depth',width)
 }
 assert.deepEqual(errors,[])
} finally {writeFileSync(`${outDepth}/results.json`,JSON.stringify(results,null,2));await browser?.close();server.close()}
