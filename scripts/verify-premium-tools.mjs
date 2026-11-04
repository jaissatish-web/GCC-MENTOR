/** Built-page browser regression for the two premium design references.
 * Uses the same static asset interception as verify-free-tools-pages.mjs.
 * Does not certify HTTP routing, live sessions, field CWV or production.
 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,extname,join} from 'node:path'
import puppeteer from 'puppeteer-core'

const origin='https://premium-tools.test'
const output=resolve('docs/design-system-v1/evidence')
mkdirSync(output,{recursive:true})
const mime={'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
const widths=[320,360,390,430,768,1024,1440]
const report={widths,layouts:[],interactions:[],screenshots:[],browserErrors:[],unexpectedRequests:[],limits:['Built HTML and local assets are served by request interception, not a production HTTP server.','Guest calculator interactions only; member auth/session persistence is not certified.','This script does not measure Lighthouse, field Core Web Vitals, screen-reader experience, or all WCAG criteria.']}
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'/tmp/gcc-chromium149',headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']})
try{
 const page=await browser.newPage()
 page.on('pageerror',error=>report.browserErrors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')report.browserErrors.push(message.text())})
 await page.evaluateOnNewDocument(()=>{
  window.__premiumEvents=[];window.__printCalls=0
  window.print=()=>{window.__printCalls++}
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedResult=text}}})
  window.addEventListener('gcc-free-tool',event=>window.__premiumEvents.push(event.detail))
 })
 await page.setRequestInterception(true)
 page.on('request',async request=>{
  try{
   const url=new URL(request.url()),path=url.pathname
   if(url.protocol==='data:'||url.protocol==='blob:')return request.continue()
   if(url.origin!==origin){report.unexpectedRequests.push(`${request.method()} ${url.origin}${path}`);return request.abort('blockedbyclient')}
   if(path.startsWith('/_next/static/')){
    const file=resolve('.next/static',decodeURIComponent(path.slice('/_next/static/'.length)))
    assert.ok(file.startsWith(resolve('.next/static')+'/'),'Asset stays inside build output')
    return request.respond({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:readFileSync(file)})
   }
   if(path==='/tools'||path.startsWith('/tools/')){
    const html=resolve(`.next/server/app${path}.html`)
    if(existsSync(html)){
     const file=url.searchParams.has('_rsc')?html.replace(/\.html$/,'.rsc'):html
     return request.respond({status:200,contentType:url.searchParams.has('_rsc')?'text/x-component':'text/html',body:readFileSync(file)})
    }
   }
   if(path==='/favicon.svg')return request.respond({status:200,contentType:'image/svg+xml',body:readFileSync('public/favicon.svg')})
   if(request.headers()['next-router-prefetch']==='1'&&['/','/dashboard','/login','/signup','/optimize/target','/mock-interview'].includes(path))return request.respond({status:204,body:''})
   report.unexpectedRequests.push(`${request.method()} ${path}`)
   return request.abort('blockedbyclient')
  }catch(error){report.browserErrors.push(`Intercept: ${error.message}`);if(!request.isInterceptResolutionHandled())await request.abort()}
 })
 async function visit(path,width){
  await page.setViewport({width,height:950})
  await page.goto(origin+path,{waitUntil:'networkidle0'})
  await page.evaluate(()=>document.fonts.ready)
  await page.waitForSelector('[data-tool-design="v1"]')
 }
 async function screenshot(name,fullPage=false){
  const path=join(output,name)
  await page.screenshot({path,fullPage})
  report.screenshots.push(path)
 }
 async function layout(path,width){
  const measured=await page.evaluate(()=>{
   const h1=document.querySelector('h1'),heading=getComputedStyle(h1)
   const unlabeled=[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(element=>!element.labels?.length&&!element.getAttribute('aria-label')&&!element.getAttribute('aria-labelledby')).map(element=>element.id||element.tagName)
   const buttons=[...document.querySelectorAll('button,input,select,textarea')].filter(element=>element.getBoundingClientRect().width>0)
   return {overflow:document.documentElement.scrollWidth>innerWidth,unlabeled,h1Count:document.querySelectorAll('h1').length,h1Size:parseFloat(heading.fontSize),h1Color:heading.color,font:heading.fontFamily,shortControls:buttons.filter(element=>element.getBoundingClientRect().height<44).map(element=>element.id||element.textContent),ctaCount:document.querySelectorAll('section[aria-label="Optional career preparation"]').length}
  })
  assert.equal(measured.overflow,false,`${path} ${width}px no horizontal overflow`)
  assert.deepEqual(measured.unlabeled,[],`${path} ${width}px labeled inputs`)
  assert.deepEqual(measured.shortControls,[],`${path} ${width}px comfortable controls`)
  assert.equal(measured.h1Count,1,`${path} one H1`)
  assert.equal(measured.h1Size,width<768?30:36,`${path} responsive central title token`)
  assert.equal(measured.h1Color,'rgb(18, 59, 93)',`${path} navy heading`)
  assert.match(measured.font,/inter/i,`${path} Inter typography`)
  assert.equal(measured.ctaCount,1,`${path} one optional signup CTA`)
  report.layouts.push({path,width,...measured})
 }
 async function fill(selector,value){
  await page.$eval(selector,(element,next)=>{
   const prototype=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype
   Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,next)
   element.dispatchEvent(new Event('input',{bubbles:true}))
   element.dispatchEvent(new Event('change',{bubbles:true}))
  },value)
 }
 async function button(text){
  await page.$$eval('[data-free-tool="41"] button',(buttons,label)=>{
   const target=buttons.find(element=>element.textContent.includes(label))
   if(!target)throw Error(`Missing button: ${label}`)
   target.click()
  },text)
 }
 async function result(expected){
  await page.waitForSelector('[aria-label="Your result"]')
  assert.ok(await page.$eval('[aria-label="Your result"]',(element,text)=>element.textContent.includes(text),expected),expected)
 }
 for(const width of widths){
  await visit('/tools',width)
  await layout('/tools',width)
  assert.equal(await page.$$eval('[aria-label="Browse free tools"] a[href^="/tools/"]',links=>links.length),50,'All reserved tools discoverable')
  const card=await page.$eval('[aria-label="Browse free tools"] h3',element=>({size:parseFloat(getComputedStyle(element).fontSize),color:getComputedStyle(element).color}))
  assert.equal(card.size,width<768?17:18,'Directory names use card type role')
  assert.equal(card.color,'rgb(18, 59, 93)','Directory names use navy')
  if([390,1440].includes(width))await screenshot(`after-hub-${width}.png`)
  if(width<600){
   await page.click('summary[aria-label="Navigation menu"]')
   assert.equal(await page.$eval('summary[aria-label="Navigation menu"]',element=>element.parentElement.open),true,'Mobile menu opens')
   assert.equal(await page.$eval('[aria-label="Mobile free tools navigation"]',element=>element.getBoundingClientRect().width>0),true,'Mobile links visible')
   if(width===390)await screenshot('after-mobile-menu-390.png')
   await page.focus('summary[aria-label="Navigation menu"]');await page.keyboard.press('Enter')
   assert.equal(await page.$eval('summary[aria-label="Navigation menu"]',element=>element.parentElement.open),false,'Keyboard toggles native menu')
  }
  await visit('/tools/working-days-calculator',width)
  await layout('/tools/working-days-calculator',width)
  assert.ok(await page.$('[aria-label="Result preview"]'),'Empty result has a useful placeholder')
  const action=await page.$eval('button[type="submit"]',element=>getComputedStyle(element).backgroundColor)
  assert.equal(action,'rgb(8, 126, 154)','Primary action uses teal')
  if([390,1440].includes(width))await screenshot(`after-calculator-empty-${width}.png`)
  await button('Calculate working days')
  await page.waitForSelector('#tool-error')
  await page.waitForFunction(()=>document.activeElement?.id==='tool-error')
  assert.equal(await page.$('[aria-label="Your result"]'),null,'Invalid inputs do not show a result')
  await fill('#tool-start','2026-06-07');await fill('#tool-end','2026-06-01')
  await button('Calculate working days')
  await page.waitForFunction(()=>document.querySelector('#tool-error')?.textContent.includes('end')||document.querySelector('#tool-error')?.textContent.includes('End'))
  assert.equal(await page.$('[aria-label="Your result"]'),null,'Reversed dates do not show a result')
  await fill('#tool-start','2026-06-01');await fill('#tool-end','2026-06-07')
  await fill('#tool-weekends','0,6');await fill('#tool-holidays','')
  await button('Calculate working days');await result('5 working days')
  await fill('#tool-holidays','2026-06-01')
  await page.waitForFunction(()=>!document.querySelector('[aria-label="Your result"]'))
  await button('Calculate working days');await result('4 working days')
  assert.equal(await page.$('#tool-error'),null,'Success clears validation errors')
  const stat=await page.$eval('[aria-label="Your result"] .type-stat',element=>parseFloat(getComputedStyle(element).fontSize))
  assert.equal(stat,width<768?32:36,'Result uses statistic typography')
  if([390,1440].includes(width))await screenshot(`after-calculator-result-${width}.png`,true)
  await button('Copy result');await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('Result copied.'))
  assert.match(await page.evaluate(()=>window.__copiedResult),/4 working days/,'Copy contains displayed result')
  await button('Print / Save PDF');assert.equal(await page.evaluate(()=>window.__printCalls),1,'Print action invokes browser print')
  await button('Reset');await page.waitForFunction(()=>!document.querySelector('[aria-label="Your result"]'))
  assert.equal(await page.$eval('#tool-start',element=>element.value),'','Reset restores inputs')
  assert.ok(await page.$('[aria-label="Result preview"]'),'Reset restores empty state')
  assert.ok(await page.evaluate(()=>window.__premiumEvents.every(event=>Object.keys(event).sort().join(',')==='event,slug')),'Events contain no tool inputs')
  report.interactions.push({width,empty:true,validation:true,reversedDates:true,expectedFiveDays:true,holidayExclusion:true,staleResultCleared:true,copy:true,print:true,reset:true,privateEvents:true})
 }
 // Search, category, country and clear states are checked after hydration.
 await visit('/tools',390)
 await page.type('#tool-search','resume word counter')
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('1 tool shown'))
 assert.equal(await page.$$eval('[aria-label="Browse free tools"] a[href^="/tools/"]',links=>links.length),1,'Search filters to one tool')
 await fill('#tool-search','nonexistent-tool-xyz')
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('0 tools shown'))
 assert.ok(await page.$('button'),'No-match state supplies clear action')
 await page.$$eval('button',buttons=>buttons.find(element=>element.textContent==='Clear filters').click())
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('50 tools shown'))
 await page.select('#tool-category','Resume')
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('10 tools shown'))
 await page.select('#tool-category','All categories');await page.select('#tool-country','Saudi Arabia')
 await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('10 tools shown'))
 const employmentLinks=await page.$$eval('[aria-label="Browse free tools"] a[href^="/tools/"]',links=>links.length)
 assert.equal(employmentLinks,10,'Country filter preserves employment coverage pages')
 for(const path of ['/tools','/tools/working-days-calculator']){
  await visit(path,320)
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${path} 200% text reflow`)
  await screenshot(`after-${path==='/tools'?'hub':'calculator'}-320-text-200.png`,true)
 }
 await page.setViewport({width:390,height:950})
 await page.goto(origin+'/tools/resume-word-counter',{waitUntil:'networkidle0'})
 assert.equal(await page.$('[data-tool-design="v1"]'),null,'Unapproved detail page has not migrated')
 assert.deepEqual(report.unexpectedRequests,[],'No unexpected API or external requests')
 assert.deepEqual(report.browserErrors,[],'No console, script or hydration errors')
 writeFileSync(join(output,'reference-qa.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({layouts:report.layouts.length,widths,interactions:report.interactions.length,screenshots:report.screenshots,errors:report.browserErrors,unexpectedRequests:report.unexpectedRequests,limits:report.limits},null,2))
}finally{await browser.close()}
