/** Premium rollout acceptance against actual built pages, with anonymous browser
 * interactions and original fixture outputs. Static interception deliberately
 * isolates UI/calculation regressions from production accounts and services.
 * Run after npm run build: CHROME_PATH=<chrome> node scripts/verify-premium-rollout.mjs
 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,extname,join} from 'node:path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const origin='https://premium-rollout.test',output=resolve('artifacts/premium-rollout')
const widths=[320,360,390,430,768,1024,1440]
const inventory=JSON.parse(readFileSync('lib/free-tools/inventory.json','utf8'))
const fixtures=JSON.parse(readFileSync('lib/free-tools/browser-fixtures.json','utf8'))
const registry=readFileSync('lib/free-tools/registry.ts','utf8')
const match=registry.match(/ACTIVE_IDS\s*:\s*number\[\]\s*=\s*\[([^\]]*)\]/)
assert.ok(match,'Explicit publication allowlist exists')
const active=new Set(match[1].split(',').map(value=>value.trim()).filter(Boolean).map(Number))
const fixtureById=new Map(fixtures.map(fixture=>[fixture.id,fixture]))
const toolPaths=new Set(inventory.map(tool=>`/tools/${tool.slug}`))
const representative=new Set([21,23,29,30,41,44,50])
const report={staticPages:0,routeLayouts:[],activeInteractions:[],screenshots:[],errors:[],unexpectedRequests:[],activeIds:[...active],limits:[
 'Built HTML and assets served by interception; production HTTP routing, deployment protection and real guest/member sessions are not certified.',
 'All enabled tools use original calculation fixtures at seven widths. Planned routes are availability pages, not calculation-certified tools.',
 'Copy/print are browser API spies. Real clipboard permission, OS print preview, screen-reader experience and full WCAG compliance are not certified.',
 'No Lighthouse, field Core Web Vitals or INP measurements are performed by this script. Synthetic member CTA coverage is supplied separately by verify-free-tools-ui.mjs.'
]}
mkdirSync(output,{recursive:true})
const mime={'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
const executablePath=process.env.CHROME_PATH||(existsSync('/tmp/gcc-chromium149')?'/tmp/gcc-chromium149':await chromium.executablePath())
const browser=await puppeteer.launch({executablePath,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']})
function luminance(color){const channels=color.match(/[\d.]+/g)?.slice(0,3).map(Number);assert.equal(channels?.length,3,`Computed RGB: ${color}`);const [r,g,b]=channels.map(value=>{const v=value/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*r+.7152*g+.0722*b}
function contrast(first,second){const a=luminance(first),b=luminance(second);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
try{
 const page=await browser.newPage()
 page.on('pageerror',error=>report.errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text())})
 await page.evaluateOnNewDocument(()=>{
  window.__rolloutEvents=[];window.__rolloutPrint=0;window.__rolloutCopied=''
  window.print=()=>{window.__rolloutPrint++}
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__rolloutCopied=text}}})
  window.addEventListener('gcc-free-tool',event=>window.__rolloutEvents.push(event.detail))
 })
 await page.setRequestInterception(true)
 page.on('request',async request=>{
  try{
   const url=new URL(request.url()),path=url.pathname
   if(url.protocol==='data:'||url.protocol==='blob:')return request.continue()
   if(url.origin!==origin){report.unexpectedRequests.push(`${request.method()} ${url.origin}${path}`);return request.abort('blockedbyclient')}
   if(path.startsWith('/_next/static/')){
    const file=resolve('.next/static',decodeURIComponent(path.slice('/_next/static/'.length)))
    assert.ok(file.startsWith(resolve('.next/static')+'/'))
    return request.respond({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:readFileSync(file)})
   }
   if(path==='/tools'||toolPaths.has(path)){
    const html=resolve(`.next/server/app${path}.html`),rsc=url.searchParams.has('_rsc')
    return request.respond({status:200,contentType:rsc?'text/x-component':'text/html',body:readFileSync(rsc?html.replace(/\.html$/,'.rsc'):html)})
   }
   if(path==='/favicon.svg')return request.respond({status:200,contentType:'image/svg+xml',body:readFileSync('public/favicon.svg')})
   if(request.headers()['next-router-prefetch']==='1'&&['/','/dashboard','/login','/signup','/optimize/target','/mock-interview'].includes(path))return request.respond({status:204,body:''})
   report.unexpectedRequests.push(`${request.method()} ${path}`);return request.abort('blockedbyclient')
  }catch(error){report.errors.push(`Intercept: ${error.message}`);if(!request.isInterceptResolutionHandled())await request.abort()}
 })
 async function visit(tool,width){await page.setViewport({width,height:1000});await page.goto(origin+`/tools/${tool.slug}`,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);await page.waitForSelector('main[data-tool-design="v1"]')}
 async function screenshot(name){const file=join(output,name);await page.screenshot({path:file,fullPage:false});report.screenshots.push(file)}
 async function geometry(tool,width,state){
  const data=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth>innerWidth,
   unlabeled:[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>el.id||el.tagName),
   shortControls:[...document.querySelectorAll('button,input:not([type="checkbox"]):not([type="hidden"]),select,textarea')].filter(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height<44).map(el=>el.id||el.textContent),
   cta:document.querySelectorAll('section[aria-label="Optional career preparation"]').length,
   main:document.querySelectorAll('main[data-tool-design="v1"]').length,
   h1:document.querySelectorAll('h1').length,
   result:document.querySelector('[aria-label="Your result"]')?.textContent??null,
  }))
  assert.equal(data.overflow,false,`${tool.id} ${width}px ${state} overflow`)
  assert.deepEqual(data.unlabeled,[],`${tool.id} ${width}px ${state} labeled fields`)
  assert.deepEqual(data.shortControls,[],`${tool.id} ${width}px ${state} touch controls`)
  assert.equal(data.cta,1,`${tool.id} one optional CTA`);assert.equal(data.main,1,`${tool.id} one shared page main`);assert.equal(data.h1,1,`${tool.id} one H1`)
  return data
 }
 async function setField(selector,value){
  const tag=await page.$eval(selector,el=>el.tagName)
  if(tag==='SELECT')await page.select(selector,String(value))
  else await page.$eval(selector,(el,next)=>{const prototype=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(el,next);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))},String(value))
 }
 async function clickButton(id,text){await page.$$eval(`[data-free-tool="${id}"] button`,(buttons,label)=>{const button=buttons.find(el=>el.textContent.includes(label));if(!button)throw Error(`Missing button: ${label}`);button.click()},text)}
 // Every reserved page must preserve publication/SEO and share one presentation,
 // including unavailable employment tools that must not invent a calculation.
 await page.setJavaScriptEnabled(false)
 const titles=new Set(),descriptions=new Set()
 for(const tool of inventory){
  for(const width of [320,1440]){
   await visit(tool,width)
   await geometry(tool,width,'initial')
   if(active.has(tool.id)){assert.ok(await page.$(`[data-free-tool="${tool.id}"]`),`${tool.id} public runner`);assert.ok(await page.$('[aria-label="Result preview"]'),`${tool.id} clear result empty state`)}
   else{assert.equal(await page.$('[data-free-tool]'),null,`${tool.id} no unverified runner`);assert.match(await page.$eval('main',el=>el.textContent),/unavailable|not available/i,`${tool.id} availability explained`)}
   report.routeLayouts.push({id:tool.id,width,active:active.has(tool.id)})
  }
  const seo=await page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content??'',heading:document.querySelector('h1')?.textContent,schema:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(el=>JSON.parse(el.textContent)),links:[...document.querySelectorAll('a[href^="/tools/"]')].map(el=>el.getAttribute('href'))}))
  assert.equal(seo.heading,tool.name);assert.equal(new URL(seo.canonical).pathname,`/tools/${tool.slug}`)
  assert.ok(!titles.has(seo.title),`${tool.id} unique title`);titles.add(seo.title)
  assert.ok(seo.description&&!descriptions.has(seo.description),`${tool.id} unique description`);descriptions.add(seo.description)
  assert.equal(seo.robots.includes('noindex'),!active.has(tool.id),`${tool.id} unchanged publication`)
  assert.ok(seo.schema.some(item=>item['@type']==='BreadcrumbList'))
  if(active.has(tool.id))assert.ok(seo.schema.some(item=>item['@type']==='WebApplication'))
  for(const href of seo.links)assert.ok(toolPaths.has(href),`${tool.id} valid related tool target`)
  report.staticPages++
 }
 await page.setJavaScriptEnabled(true)
 for(const tool of inventory.filter(item=>active.has(item.id))){
  const fixture=fixtureById.get(tool.id);assert.ok(fixture,`${tool.id} original fixture exists`)
  for(const width of widths){
   await visit(tool,width)
   for(const[key,value]of Object.entries(fixture.values??{}))await setField(`#tool-${key}`,value)
   if([29,49].includes(tool.id)){
    const checks=await page.$$(`[data-free-tool="${tool.id}"] input[type="checkbox"]`)
    assert.equal(checks.length,tool.id===29?8:4)
    for(const input of checks.slice(0,tool.id===49?2:8))await input.click()
    await clickButton(tool.id,'Review checklist')
   }else if(tool.id===30){
    await page.$eval('input[type="file"]',el=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(1000000)],'sample-resume.pdf',{type:'application/pdf'}));el.files=data.files;el.dispatchEvent(new Event('change',{bubbles:true}))})
    await page.click(`[data-free-tool="${tool.id}"] button[type="submit"]`)
   }else await page.click(`[data-free-tool="${tool.id}"] button[type="submit"]`)
   await page.waitForSelector('[aria-label="Your result"]')
   const data=await geometry(tool,width,'result')
   for(const expected of Array.isArray(fixture.expected)?fixture.expected:[fixture.expected])assert.ok(data.result.includes(String(expected)),`${tool.id} ${width}px original output ${expected}`)
   const heading=await page.$eval('[aria-label="Your result"] h2',el=>getComputedStyle(el).fontSize)
   assert.ok(parseFloat(heading)>=16&&parseFloat(heading)<=20,`${tool.id} result panel heading restrained`)
   // Primary submit may follow secondary checklist editing controls. Inspect the
   // actual teal action instead of assuming DOM order establishes importance.
   const tealActions=await page.$$eval(`[data-free-tool="${tool.id}"] button`,els=>els.map(el=>({text:getComputedStyle(el).color,background:getComputedStyle(el).backgroundColor})).filter(style=>style.background==='rgb(8, 126, 154)'))
   assert.ok(tealActions.length,`${tool.id} primary action discoverable`)
   for(const action of tealActions)assert.ok(contrast(action.text,action.background)>=4.5,`${tool.id} action text contrast`)
   if(representative.has(tool.id)&&[390,1440].includes(width))await screenshot(`tool-${tool.id}-result-${width}.png`)
   await clickButton(tool.id,'Copy result');await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('Result copied.'))
   assert.ok(await page.evaluate(()=>window.__rolloutCopied.length>0),`${tool.id} copy produces displayed content`)
   await clickButton(tool.id,'Print / Save PDF');assert.equal(await page.evaluate(()=>window.__rolloutPrint),1,`${tool.id} print action`)
   if([29,49].includes(tool.id))await page.click('input[type="checkbox"]')
   else if(tool.id===30)await setField('input[type="number"]','3')
   else await setField(`#tool-${Object.keys(fixture.values)[0]}`,'')
   await page.waitForFunction(()=>!document.querySelector('[aria-label="Your result"]'))
   await clickButton(tool.id,'Reset');assert.equal(await page.$('[aria-label="Your result"]'),null,`${tool.id} reset clears result`)
   if([29,49].includes(tool.id))assert.equal(await page.$$eval('input[type="checkbox"]:checked',els=>els.length),0)
   if(tool.id===30)assert.equal(await page.$eval('input[type="file"]',el=>el.files.length),0)
   assert.ok(await page.evaluate(()=>window.__rolloutEvents.every(event=>Object.keys(event).sort().join(',')==='event,slug')),`${tool.id} input-free telemetry`)
   report.activeInteractions.push({id:tool.id,width,fixture:true,copy:true,print:true,staleResultCleared:true,reset:true,privateEvents:true})
  }
 }
 for(const id of [1,11])for(const width of [390,1440]){const tool=inventory.find(item=>item.id===id);await visit(tool,width);await screenshot(`tool-${id}-availability-${width}.png`)}
 for(const id of [21,29,30,41,50]){
  const tool=inventory.find(item=>item.id===id);await visit(tool,320)
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${id} 200% text reflow`)
 }
 assert.deepEqual(report.errors,[],'No console/script/hydration errors')
 assert.deepEqual(report.unexpectedRequests,[],'No unexpected API or external calls')
 writeFileSync(join(output,'qa-summary.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify({staticPages:report.staticPages,routeLayouts:report.routeLayouts.length,activeInteractions:report.activeInteractions.length,activeTools:active.size,widths,screenshots:report.screenshots,errors:report.errors,unexpectedRequests:report.unexpectedRequests,limits:report.limits},null,2))
}finally{await browser.close()}
