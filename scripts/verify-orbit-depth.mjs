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
 for(const width of [390,1440]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.$eval('[data-uds=visual]',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length===10)
  await page.evaluate(()=>document.fonts.ready)
  const layers=await page.$eval('[data-uds=visual]',e=>{const rear=getComputedStyle(e,'::before'),front=getComputedStyle(e,'::after');return {isolation:getComputedStyle(e).isolation,rear:{z:rear.zIndex,clip:rear.clipPath,pointer:rear.pointerEvents,box:rear.inset},front:{z:front.zIndex,clip:front.clipPath,pointer:front.pointerEvents,box:front.inset},carouselZ:getComputedStyle(e.children[1]).zIndex,faces:e.querySelectorAll('.actual-template-orbit-face').length}})
  assert.equal(layers.isolation,'isolate');assert.equal(layers.rear.z,'0');assert.equal(layers.carouselZ,'1');assert.equal(layers.front.z,'2');assert.equal(layers.rear.clip,'inset(0px 0px 50%)');assert.equal(layers.front.clip,'inset(50% 0px 0px)');assert.equal(layers.front.pointer,'none');assert.equal(layers.rear.pointer,'none');assert.equal(layers.rear.box,layers.front.box)
  // Full section keeps the decorative plane and the actual live documents together.
  await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));await page.screenshot({path:`${outDepth}/orbit-${width}.png`,fullPage:false});await (await page.$('#templates')).screenshot({path:`${outDepth}/orbit-section-${width}.png`})
  const before=await page.$eval('[data-orbit-centre=true]',e=>e.getAttribute('aria-label'));await page.focus('[aria-roledescription=carousel] button[data-orbit-centre=true]');await page.keyboard.press('ArrowRight');await page.waitForFunction(label=>document.querySelector('[data-orbit-centre=true]').getAttribute('aria-label')!==label,{},before)
  await page.click('[data-orbit-centre=true]');await page.waitForSelector('dialog[open]');assert.equal(await page.$eval('dialog',e=>e.parentElement===document.body),true);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'))
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));const transform=await page.$eval('[aria-roledescription=carousel] button',e=>e.style.transform);await page.waitForFunction(t=>document.querySelector('[aria-roledescription=carousel] button').style.transform!==t,{},transform);await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);results.push({width,layers,keyboardSelection:true,readerOpenEscape:true,animationMovement:true,overlayInterceptsInput:false});console.log('PASS orbit depth',width)
 }
 assert.deepEqual(errors,[])
} finally {writeFileSync(`${outDepth}/results.json`,JSON.stringify(results,null,2));await browser?.close();server.close()}
