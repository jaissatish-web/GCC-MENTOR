/** Approved V2 presentation QA; compiled actual page/components with read-only anonymous API fixtures. */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,existsSync,mkdirSync,statSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),out='artifacts/employer-marquee';mkdirSync(out,{recursive:true})
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
const results={viewports:[],errors:[]}; let browser
try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']})
 const page=await browser.newPage();await page.evaluateOnNewDocument(()=>{window.marqueeLayoutShift=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput&&e.sources?.some(s=>s.node?.closest?.('#employers')))window.marqueeLayoutShift+=e.value}).observe({type:'layout-shift',buffered:true})});page.on('pageerror',e=>results.errors.push(e.message))
 for(const width of [320,360,390,430,599,768,1024,1440]) {
  await page.setViewport({width,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready)
  await page.waitForSelector('#employers button'); await page.$eval('#employers',e=>scrollTo({top:e.offsetTop-90,behavior:'instant'}))
  const state=await page.evaluate(()=>{
   const root=document.querySelector('#employers');const tracks=[...root.querySelectorAll('[data-direction]>div')];const lists=[...root.querySelectorAll('ul:not([aria-hidden])')];
   const direction=tracks.map(t=>{const a=t.getAnimations()[0];a.pause();a.currentTime=1000;const x1=new DOMMatrix(getComputedStyle(t).transform).m41;a.currentTime=2000;const x2=new DOMMatrix(getComputedStyle(t).transform).m41;const group=t.querySelector('ul').getBoundingClientRect().width;const track=t.getBoundingClientRect().width;a.currentTime=0;a.play();return{x1,x2,group,track}})
   return {logoLayoutShift:window.marqueeLayoutShift,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,direction,rowLabels:lists.map(list=>list.getAttribute('aria-label')), sourceTileCounts:lists.map(list=>list.querySelectorAll('li:not([aria-hidden])').length),broken:[...root.querySelectorAll('img')].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.alt),disclaimer:root.lastElementChild.textContent,resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('/landing/employers/')).map(r=>({name:r.name,bytes:r.encodedBodySize})),section:root.getBoundingClientRect().toJSON()}
  })
  async function checkPhoneTiles() {
   const dimensions = await page.evaluate(() => {
    const country = document.querySelector('[aria-label="GCC career destinations"] li').getBoundingClientRect();
    return [...document.querySelectorAll('#employers ul:not([aria-hidden]) li')].every(tile => {
     const box = tile.getBoundingClientRect();
     return Math.abs(box.width - country.width) < 1 && Math.abs(box.height - country.height) < 1;
    });
   });
   assert.equal(dimensions, true, `Employer tiles match country tiles at ${width}px`);
  }
  if (width < 600) await checkPhoneTiles();
  assert.ok(state.scrollWidth<=width+1);assert.deepEqual(state.rowLabels,['Engineering and construction employers','GCC career destinations','Energy and industrial employers']);assert.deepEqual(state.sourceTileCounts,[11,6,10]);assert.equal(state.logoLayoutShift,0);assert.deepEqual(state.broken,[]);assert.deepEqual(state.direction.map(d=>Math.sign(d.x2-d.x1)),[1,-1,1]);assert.ok(state.direction.every(d=>d.group>=width))
  for (const name of ['mcdermott.svg', 'maaden.svg', 'larsen-toubro.svg']) {
   const background = await page.$eval(`#employers img[src$="/${name}"]`, image => getComputedStyle(image.closest('li')).backgroundColor)
   assert.equal(background, 'rgb(24, 40, 61)', `White employer logo ${name} needs its navy tile at ${width}px`)
  }
  for(const d of state.direction)assert.ok(Math.abs(d.track-2*d.group)<.5,'Seamless equal groups')
  await page.hover('#employers [data-direction="left"]');assert.equal(await page.$eval('#employers [data-direction="left"]>div',e=>getComputedStyle(e).animationPlayState),'paused');await page.mouse.move(0,0)
  await page.focus('#employers button');await page.keyboard.press('Enter');assert.equal(await page.$eval('#employers button',e=>e.getAttribute('aria-pressed')),'true');assert.ok(await page.$$eval('#employers [data-direction]>div',es=>es.every(e=>getComputedStyle(e).animationPlayState==='paused')))
  await page.$eval('#employers',e=>scrollTo({top:e.offsetTop-90,behavior:'instant'}));await page.screenshot({path:`${out}/context-${width}.png`});await (await page.$('#employers')).screenshot({path:`${out}/section-${width}.png`})
  await page.focus('#employers button');await page.keyboard.press('Enter');assert.equal(await page.$eval('#employers button',e=>e.getAttribute('aria-pressed')),'false')
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);state.reduced=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,animated:document.querySelector('#employers').getAnimations({subtree:true}).length,duplicates:[...document.querySelectorAll('#employers ul[aria-hidden], #employers [data-repeat]')].every(e=>getComputedStyle(e).display==='none'),control:getComputedStyle(document.querySelector('#employers button')).display,visible:[...document.querySelectorAll('#employers ul:not([aria-hidden]) li:not([aria-hidden])')].every(e=>{const b=e.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth+1&&b.height>0})}))
  assert.deepEqual(state.reduced,{overflow:false,animated:0,duplicates:true,control:'none',visible:true});if(width<600)await checkPhoneTiles();await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);results.viewports.push(state);console.log(`PASS marquee ${width}px: three ordered rows, seamless motion, hover/keyboard pause, images, reduced motion, overflow`)
 }
 assert.deepEqual(results.errors,[]);results.pass=true
} finally {writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await browser?.close();server.close()}
