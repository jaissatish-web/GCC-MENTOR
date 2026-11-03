/** Verify actual Next build output without opening a listening socket.
 * Static HTML/head checks cover all 50 reserved routes; interaction coverage only
 * covers enabled IDs with supplied browser fixtures. This is not a production
 * HTTP/authentication or Lighthouse certification.
 */
import assert from 'node:assert/strict'
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve,extname,join} from 'node:path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const root=process.cwd(),origin='https://free-tools.test'
const inventory=JSON.parse(readFileSync('lib/free-tools/inventory.json','utf8'))
const registry=readFileSync('lib/free-tools/registry.ts','utf8')
const activeMatch=registry.match(/ACTIVE_IDS\s*:\s*number\[\]\s*=\s*\[([^\]]*)\]/)
assert.ok(activeMatch,'Read explicit publication allowlist')
const active=new Set(activeMatch[1].split(',').map(s=>s.trim()).filter(Boolean).map(Number))
const requested=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',').map(Number)
const splitIdIndex=process.argv.indexOf('--ids')
const only=requested??(splitIdIndex>=0?process.argv[splitIdIndex+1].split(',').map(Number):null)
const selected=inventory.filter(t=>active.has(t.id)&&(!only||only.includes(t.id)))
const fixturesPath='lib/free-tools/browser-fixtures.json'
const fixtures=existsSync(fixturesPath)?JSON.parse(readFileSync(fixturesPath,'utf8')):[]
const output=resolve('artifacts/free-tools/pages');mkdirSync(output,{recursive:true})
const mime={'.js':'application/javascript','.css':'text/css','.woff2':'font/woff2','.woff':'font/woff','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'}
const htmlFor=path=>path==='/tools'?resolve('.next/server/app/tools.html'):resolve(`.next/server/app${path}.html`)
const toolPaths=new Set(inventory.map(t=>`/tools/${t.slug}`))
const report={staticPages:0,hydratedPages:0,interactions:[],screenshots:[],activeIds:[...active],missingFixtures:[],limits:['Built HTML/static assets served through request interception; real production HTTP routing, real signed-in sessions, Vercel deployment and Lighthouse are not certified.','Contrast ratios and Lighthouse are not measured by this script; accessible names, overflow and representative 200% text reflow are checked.','Unknown-slug notFound is checked in source only, not an HTTP 404 assertion.']}
let browser
try{
 const executablePath=process.env.CHROME_PATH||(existsSync('/tmp/gcc-chromium149')?'/tmp/gcc-chromium149':await chromium.executablePath())
 browser=await puppeteer.launch({executablePath,headless:true,pipe:true,args:process.env.CHROME_PATH?['--no-sandbox','--disable-setuid-sandbox']:chromium.args})
 async function pageFor(hydrate){
  const page=await browser.newPage();if(!hydrate)await page.setJavaScriptEnabled(false)
  const errors=[],unexpected=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  await page.setRequestInterception(true)
  page.on('request',async req=>{
   try{
    const u=new URL(req.url()),p=u.pathname
    if(u.protocol==='data:'||u.protocol==='blob:')return req.continue()
    if(u.origin!==origin){unexpected.push(`${req.method()} ${u.origin}${p}`);return req.abort('blockedbyclient')}
    if(p.startsWith('/_next/static/')){const file=resolve('.next/static',decodeURIComponent(p.slice('/_next/static/'.length)));assert.ok(file.startsWith(resolve('.next/static')+'/'));return req.respond({status:200,contentType:mime[extname(file)]??'application/octet-stream',body:readFileSync(file)})}
    if(p==='/tools'||toolPaths.has(p)){
     if(u.searchParams.has('_rsc')){const f=htmlFor(p).replace(/\.html$/,'.rsc');return req.respond({status:200,contentType:'text/x-component',body:readFileSync(f)})}
     return req.respond({status:200,contentType:'text/html',body:readFileSync(htmlFor(p))})
    }
    if(p==='/tools/opengraph-image')return req.respond({status:200,contentType:'image/png',body:readFileSync('.next/server/app/tools/opengraph-image.body')})
    // Existing Next Link prefetch is navigation, not a tool API call; do not follow protected destinations.
    if(req.headers()['next-router-prefetch']==='1'&&['/','/dashboard','/login','/signup','/optimize/target','/mock-interview'].includes(p))return req.respond({status:204,body:''})
    if(p==='/favicon.svg')return req.respond({status:200,contentType:'image/svg+xml',body:readFileSync('public/favicon.svg')})
    unexpected.push(`${req.method()} ${p}`);return req.abort('blockedbyclient')
   }catch(e){errors.push(`Intercept: ${e.message}`);if(!req.isInterceptResolutionHandled())await req.abort()}
  })
  return{page,errors,unexpected}
 }
 const stat=await pageFor(false),titles=new Set(),descriptions=new Set()
 for(const tool of inventory){
  const path=`/tools/${tool.slug}`
  await stat.page.goto(origin+path,{waitUntil:'load'})
  const data=await stat.page.evaluate(()=>({title:document.title,description:document.querySelector('meta[name="description"]')?.content,canonical:document.querySelector('link[rel="canonical"]')?.href,robots:document.querySelector('meta[name="robots"]')?.content??'',h1:document.querySelector('h1')?.textContent,schema:[...document.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>JSON.parse(s.textContent)),text:document.body.textContent,links:[...document.querySelectorAll('a[href^="/tools/"]')].map(a=>a.getAttribute('href'))}))
  assert.equal(new URL(data.canonical).pathname,path,`${tool.id} canonical`)
  assert.ok(!titles.has(data.title),`${tool.id} unique title`);titles.add(data.title)
  assert.ok(data.description&&!descriptions.has(data.description),`${tool.id} unique description`);descriptions.add(data.description)
  assert.equal(data.h1,tool.name)
  assert.equal(data.robots.includes('noindex'),!active.has(tool.id),`${tool.id} publication robots match build`)
  assert.ok(data.schema.some(s=>s['@type']==='BreadcrumbList'))
  if(active.has(tool.id)){assert.ok(data.schema.some(s=>s['@type']==='WebApplication'));for(const heading of ['How it works','Worked example','Common mistakes','Important limitations','Frequently asked questions'])assert.ok(data.text.includes(heading),`${tool.id} ${heading}`)}
  for(const href of data.links)assert.ok(toolPaths.has(href),`${tool.id} related target ${href}`)
  report.staticPages++
 }
 await stat.page.goto(origin+'/tools',{waitUntil:'load'})
 const directoryLinks=await stat.page.$$eval('a[href^="/tools/"]',as=>as.map(a=>a.getAttribute('href')))
 for(const path of toolPaths)assert.ok(directoryLinks.includes(path),`SSR directory contains ${path}`)
 const sitemap=readFileSync('.next/server/app/sitemap.xml.body','utf8')
 for(const t of inventory)assert.equal(sitemap.includes(`/tools/${t.slug}</loc>`),active.has(t.id),`${t.id} sitemap publication`)
 assert.ok(readFileSync('app/tools/[slug]/page.tsx','utf8').includes('notFound()'),'Unknown slug source calls notFound')
 assert.deepEqual(stat.errors,[]);assert.deepEqual(stat.unexpected,[]);await stat.page.close()
 const run=await pageFor(true)
 await run.page.evaluateOnNewDocument(()=>{window.__freeToolEvents=[];window.__printCalls=0;window.print=()=>{window.__printCalls++};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedResult=text}}});window.addEventListener('gcc-free-tool',e=>window.__freeToolEvents.push(e.detail))})
 for(const width of [360,1440]){
  await run.page.setViewport({width,height:950});await run.page.goto(origin+'/tools',{waitUntil:'networkidle0'});await run.page.evaluate(()=>document.fonts.ready)
  assert.equal(await run.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Directory ${width}px overflow`)
  await run.page.type('#tool-search','resume word counter')
  await run.page.waitForFunction(()=>document.querySelectorAll('[aria-label="Browse free tools"] a[href="/tools/resume-word-counter"]').length===1&&document.querySelector('[role="status"]')?.textContent.includes('1 tool shown'))
  assert.equal(await run.page.$$eval('[aria-label="Browse free tools"] a[href^="/tools/"]',as=>as.length),1,'Hydrated directory search filters cards')
 }
 await run.page.setViewport({width:390,height:950});await run.page.goto(origin+'/tools',{waitUntil:'networkidle0'});await run.page.screenshot({path:join(output,'directory-390.png'),fullPage:true});report.screenshots.push(join(output,'directory-390.png'))
 for(const t of selected){
  for(const width of [360,1440]){
   await run.page.setViewport({width,height:950});await run.page.goto(origin+`/tools/${t.slug}`,{waitUntil:'networkidle0'});await run.page.evaluate(()=>document.fonts.ready)
   await run.page.waitForSelector(`[data-free-tool="${t.id}"]`)
   assert.equal(await run.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${t.id} ${width}px overflow`)
   const unlabeled=await run.page.$$eval('input:not([type="hidden"]),select,textarea',els=>els.filter(el=>!el.labels?.length&&!el.getAttribute('aria-label')&&!el.getAttribute('aria-labelledby')).map(el=>el.id||el.tagName))
   assert.deepEqual(unlabeled,[],`${t.id} labeled controls`)
   const fixture=Array.isArray(fixtures)?fixtures.find(f=>f.id===t.id):fixtures[t.id]
   if(fixture){
    for(const[key,value]of Object.entries(fixture.values??{})){
     const selector=`#tool-${key}`;await run.page.waitForSelector(selector)
     const tag=await run.page.$eval(selector,el=>el.tagName)
     if(tag==='SELECT')await run.page.select(selector,String(value))
     else await run.page.$eval(selector,(el,val)=>{const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))},String(value))
    }
    if(t.id===29){
     const checks=await run.page.$$(`[data-free-tool="${t.id}"] input[type="checkbox"]`);assert.equal(checks.length,8);for(const check of checks)await check.click()
     await run.page.$$eval(`[data-free-tool="${t.id}"] button`,buttons=>buttons.find(b=>b.textContent==='Review checklist').click())
    }else if(t.id===30){
     await run.page.$eval('input[type="file"]',el=>{const data=new DataTransfer();data.items.add(new File([new Uint8Array(1000000)],'sample-resume.pdf',{type:'application/pdf'}));el.files=data.files;el.dispatchEvent(new Event('change',{bubbles:true}))})
     await run.page.click(`[data-free-tool="${t.id}"] button[type="submit"]`)
    }else await run.page.click(`[data-free-tool="${t.id}"] button[type="submit"]`)
    await run.page.waitForSelector('[aria-label="Your result"]')
    const result=await run.page.$eval('[aria-label="Your result"]',el=>el.textContent)
    for(const expected of Array.isArray(fixture.expected)?fixture.expected:[fixture.expected])if(expected!==undefined)assert.ok(result.includes(String(expected)),`${t.id} expected result ${expected}: ${result}`)
    await run.page.$$eval('[aria-label="Your result"] button',buttons=>buttons.find(b=>b.textContent.includes('Copy result')).click())
    await run.page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent.includes('Result copied.'))
    assert.ok(await run.page.evaluate(()=>window.__copiedResult?.length>0),'Copy uses displayed result')
    await run.page.$$eval('[aria-label="Your result"] button',buttons=>buttons.find(b=>b.textContent.includes('Print / Save PDF')).click())
    assert.equal(await run.page.evaluate(()=>window.__printCalls),1,'Print invokes browser print once')
    if(t.id===selected[0]?.id&&width===360){
     await run.page.evaluate(()=>{document.documentElement.style.fontSize='200%'})
     assert.equal(await run.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Representative 200% text reflow')
     const path=join(output,`${t.id}-text-200-percent.png`);await run.page.screenshot({path,fullPage:true});report.screenshots.push(path)
     await run.page.evaluate(()=>{document.documentElement.style.fontSize=''})
    }
    const eventPayloads=await run.page.evaluate(()=>window.__freeToolEvents)
    assert.ok(eventPayloads.every(e=>Object.keys(e).sort().join(',')==='event,slug'),'Telemetry contains event and slug only')
    if(t.id===29)await run.page.click('input[type="checkbox"]')
    else if(t.id===30)await run.page.$eval('input[type="number"]',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'3');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))})
    else{
     const key=Object.keys(fixture.values)[0],selector=`#tool-${key}`
     await run.page.$eval(selector,el=>{const proto=el instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,'');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))})
    }
    await run.page.waitForFunction(()=>!document.querySelector('[aria-label="Your result"]'))
    await run.page.$$eval(`[data-free-tool="${t.id}"] button`,buttons=>buttons.find(b=>b.textContent.includes('Reset')).click())
    assert.equal(await run.page.$('[aria-label="Your result"]'),null,'Reset clears result')
    if(t.id===29)assert.equal(await run.page.$$eval('input[type="checkbox"]:checked',els=>els.length),0)
    if(t.id===30)assert.equal(await run.page.$eval('input[type="file"]',el=>el.files.length),0)
    report.interactions.push({id:t.id,width,copy:true,print:true,staleResultCleared:true,reset:true,privateEvents:true})
   }else if(!report.missingFixtures.includes(t.id))report.missingFixtures.push(t.id)
   report.hydratedPages++
  }
  if([21,23,41,50].includes(t.id)||t.id===selected[0]?.id){await run.page.setViewport({width:390,height:950});const path=join(output,`${t.id}-${t.slug}-390.png`);await run.page.screenshot({path,fullPage:true});report.screenshots.push(path)}
 }
 assert.deepEqual(run.unexpected,[],'No unexpected external/API requests')
 assert.deepEqual(run.errors,[],'No browser console or hydration errors')
 await run.page.close()
 writeFileSync(join(output,'qa-summary.json'),JSON.stringify(report,null,2))
 console.log(JSON.stringify(report,null,2))
 if(report.missingFixtures.length)console.log('LIMIT: enabled tools without interaction fixtures were layout checked only; not calculation-certified.')
}finally{await browser?.close()}
