/** Approved V3 presentation QA; compiled actual page/components with read-only anonymous API fixtures. */
import './verify-landing-v3-story.mjs'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),out='artifacts/premium-landing-v3';mkdirSync(out,{recursive:true})
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
async function focusDemoAction(text){await pageRef.$$eval('#interview button',(es,text)=>{const e=es.find(e=>e.textContent.includes(text));e.scrollIntoView({block:'center',behavior:'instant'});e.focus({preventScroll:true})},text);await pageRef.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
let pageRef;
const results={source:'Compiled actual landing; read-only anonymous fixture APIs, not authenticated service verification',viewports:[],errors:[],failures:[]};let browser
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']});const page=await browser.newPage();pageRef=page;page.on('pageerror',e=>results.errors.push(e.message));await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)||r.url().startsWith('data:')?r.continue():r.abort())
 for(const width of [320,360,390,430,768,1024,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready)
  await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length===10)
  await page.$eval('#markets',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForSelector('#markets-title');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
  // Lazy images must enter view and finish decoding before asserting their health.
  await page.evaluate(async()=>{for(const image of document.images){image.scrollIntoView({behavior:'instant'});try{await image.decode()}catch{}}scrollTo({top:0,behavior:'instant'})})
  assert.ok(await page.$('meta[property="og:image"]'), 'Homepage needs explicit social image');
  assert.equal(await page.$eval('meta[name="twitter:card"]', e=>e.content), 'summary_large_image');
  assert.ok(await page.$$eval('a[href="/templates"]', es=>es.every(e=>e.textContent.includes('sign-in required'))), 'Protected templates must disclose sign-in');
  await page.$eval('[data-job-package]',e=>e.scrollIntoView({behavior:'instant'}));
  for(const label of ['Cover Letter','Interview Q&A','Optimized Resume']){
    await page.$$eval('[data-job-package] button',(es,label)=>es.find(e=>e.textContent===label).click(),label);
    assert.ok(await page.$eval('#package-preview',e=>e.textContent.includes('Instrumentation Commissioning Engineer')),'Same target role');
    assert.ok(await page.$eval('#package-preview',e=>e.textContent.includes('Your Career Profile remains unchanged.')));
  }
  const state=await page.evaluate(()=>{
   const h=document.querySelector('#hero-title'),s=getComputedStyle(h);const images=[...document.images].filter(i=>i.getBoundingClientRect().width>0)
   const navigation=performance.getEntriesByType("navigation")[0]; const resources=performance.getEntriesByType("resource");
   return{navigation:{domContentLoadedMs:navigation.domContentLoadedEventEnd,loadMs:navigation.loadEventEnd,resourceCount:resources.length,transferBytes:resources.reduce((n,r)=>n+r.transferSize,0)},width:innerWidth,height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,hero:{font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,box:h.getBoundingClientRect().toJSON()},orbitCount:document.querySelectorAll('.actual-template-orbit-face').length,flags:document.querySelectorAll('img[src*="/flags/"]').length,industryTiles:document.querySelectorAll('[data-industry]').length,brokenImages:images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})),invalidAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(v=>v.length>1&&!document.getElementById(v.slice(1))),selectFonts:[...document.querySelectorAll('select')].map(e=>getComputedStyle(e).fontSize)}
  });results.viewports.push(state)
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>scrollY===0);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(width===1440) assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('#industries').getBoundingClientRect().top-document.querySelector('#markets').getBoundingClientRect().top)<2),'Approved desktop industries and globe share a row');
  if(width===1440)assert.ok(await page.$$eval('[data-uds=globe-country]',es=>es.every(e=>e.getBoundingClientRect().height<=88)),'Globe country labels must not wrap character by character');
  await page.screenshot({path:`${out}/landing-${width}.png`,fullPage:true})
  for(const id of ['hero-title','how-it-works','services','templates','interview','industries','markets','about','plans','faq']){const e=await page.$('#'+id);if(e){await e.screenshot({path:`${out}/${id}-${width}.png`}).catch(()=>{})}}
  assert.ok(state.scrollWidth<=width+1,`Overflow at${width}`);assert.equal(state.orbitCount,10);assert.equal(state.flags,6);assert.equal(state.industryTiles,6);assert.deepEqual(state.brokenImages,[]);assert.deepEqual(state.invalidAnchors,[]);assert.ok(state.selectFonts.every(x=>parseFloat(x)>=16))
  if(width<1180){await page.$eval('summary[aria-label="Open section menu"]',e=>e.click());assert.equal(await page.$eval('header details',e=>e.open),true);await page.focus('summary[aria-label="Open section menu"]');await page.keyboard.press('Escape');assert.equal(await page.$eval('header details',e=>e.open),false);assert.equal(await page.$eval('summary[aria-label="Open section menu"]',e=>document.activeElement===e),true);await page.$eval('summary[aria-label="Open section menu"]',e=>e.click());await page.$eval('header details a[href="#templates"]',e=>e.click());assert.equal(await page.$eval('header details',e=>e.open),false)}
  await page.$eval('#services details>summary',e=>e.click());for(const href of ['/gulf-readiness-score','/templates','/optimize/target','/cover-letter','/interview-qa','/mock-interview','/dashboard/library','/linkedin-optimization','/naukrigulf-optimization','/settings','/signup','/login','/tools'])assert.ok(state.links.some(l=>l.href===href),`Destination missing ${href}`)
  await page.$eval('#faq details>summary',e=>e.click());assert.equal(await page.$eval('#faq details',e=>e.open),true)
  await page.$eval('#interview',e=>e.scrollIntoView({behavior:'instant'}));await page.$eval('#interview details>summary',e=>e.click());await page.select('#interview select','british-woman');assert.ok(await page.$eval('#interview',e=>e.textContent.includes('Emma')))
  await focusDemoAction('Review this answer');const actionBefore=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top);await page.keyboard.press('Enter');assert.ok(await page.evaluate(y=>Math.abs(document.activeElement.getBoundingClientRect().top-y)<2,actionBefore),'Stage control must remain visibly stable');assert.ok(await page.evaluate(()=>document.activeElement?.textContent.includes('See repeat-session progress')),'Stage control retains keyboard focus');assert.ok(await page.$eval('#interview',e=>e.textContent.includes('What needs correction')));if([390,1440].includes(width))await (await page.$('#interview')).screenshot({path:`${out}/feedback-${width}.png`})
  await focusDemoAction('See repeat-session progress');const progressBefore=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top);await page.keyboard.press('Enter');assert.ok(await page.evaluate(y=>Math.abs(document.activeElement.getBoundingClientRect().top-y)<2,progressBefore),'Progress control remains visible');assert.ok(await page.$eval('#interview',e=>e.textContent.includes('Practice. Review. Prepare. Repeat.')))
  await focusDemoAction('Return to practice');const returnBefore=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top);await page.keyboard.press('Enter');assert.ok(await page.evaluate(y=>Math.abs(document.activeElement.getBoundingClientRect().top-y)<2,returnBefore),'Return control remains visible');
  await page.$$eval('#interview button',es=>es.find(e=>e.textContent.includes('Pause demo')).click());assert.equal(await page.$eval('#interview [data-motion]',e=>e.dataset.motion),'static');
  assert.deepEqual(await page.$$eval('#interview tbody td',es=>es.map(e=>Number(e.textContent))),[46,61,74]);
  await page.$eval('[data-uds=globe-country]',e=>e.click());assert.equal(await page.$eval('[data-uds=globe-country]',e=>e.getAttribute('aria-pressed')),'true')
  console.log(`PASS V3 ${width}px: actual imagery, no overflow, all destinations, menu/focus, interview stages, globe`)
 }
 for(const width of [390,1440]) {
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);await page.setViewport({width,height:width===390?844:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});
  await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));
  await page.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length===10);
  await page.$eval('#markets',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForSelector('#markets-title');
  await page.$eval('#interview',e=>e.scrollIntoView({behavior:'instant'}));
  await page.$$eval('#employers button',es=>es[0].click());
  await page.$$eval('#interview button',es=>es.find(e=>e.textContent.includes('Pause demo')).click());
  assert.equal(await page.$eval('#interview [data-motion]',e=>e.dataset.motion),'static');
  await page.evaluate(async()=>{for(const image of document.images){image.scrollIntoView({behavior:'instant'});try{await image.decode()}catch{}}scrollTo({top:0,behavior:'instant'})});await page.waitForFunction(()=>scrollY===0);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:`${out}/presentation-${width}.png`,fullPage:true});
 }
 // Large-text responsiveness is separate from the visual reference screenshots.
 await page.setViewport({width:390,height:900});await page.goto(origin,{waitUntil:'networkidle0'});await page.addStyleTag({content:'html{font-size:200%}'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200%text horizontal overflow');await page.screenshot({path:`${out}/text-200-390.png`,fullPage:true});results.largeText={width:390,pass:true}
 assert.deepEqual(results.errors,[]);results.pass=true
}catch(e){results.failures.push(e.stack);throw e}finally{writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await browser?.close();server.close()}
