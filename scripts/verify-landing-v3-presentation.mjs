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
 for(const width of [320,360,375,390,430,768,1024,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready)
  await page.$eval('#templates',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length===10)
  await page.$eval('#markets',e=>e.scrollIntoView({behavior:'instant'}));await page.waitForSelector('#markets-title');await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
  // Lazy images must enter view and finish decoding before asserting their health.
  await page.evaluate(async()=>{for(const image of [...document.images].filter(image=>image.getBoundingClientRect().width>0)){image.scrollIntoView({behavior:'instant'});try{await image.decode()}catch{}}scrollTo({top:0,behavior:'instant'})})
  const order=await page.evaluate(()=>['employers','challenges','solutions','services'].map(id=>document.getElementById(id).getBoundingClientRect().top+scrollY));
  assert.ok(order.every((top,i)=>i===0||top>order[i-1]),'Approved visual section sequence');
  assert.equal(await page.$eval('#challenges',e=>!!e.closest('details')),false);
  assert.equal(await page.$$eval('[data-concern-choice]',es=>es.filter(e=>e.getBoundingClientRect().height>0).length),4,'Every concern visible');
  assert.equal(await page.$eval('[data-concern-choice="fit"]',e=>e.getAttribute('aria-pressed')),'true','Default third concern matches selected mock');
  const focusCopy={applications:'Prepare for one vacancy.',experience:'Make your actual work visible.',fit:'Understand your fit before you tailor.',interview:'Explain the work you know.'};
  for(const [key,heading] of Object.entries(focusCopy)){
    await page.$eval(`[data-concern-choice="${key}"]`,e=>{e.scrollIntoView({block:"center",behavior:"instant"});e.focus({preventScroll:true})});
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    const before=await page.$eval(`[data-concern-choice="${key}"]`,e=>e.getBoundingClientRect().top);
    await page.keyboard.press(key==='interview'?'Space':'Enter');
    assert.equal(await page.$eval(`[data-concern-choice="${key}"]`,e=>e.getAttribute('aria-pressed')),'true');
    assert.equal(await page.$$eval('[data-concern-choice][aria-pressed="true"]',es=>es.length),1);
    assert.equal(await page.$eval('#preparation-response-title',e=>e.textContent),heading);
    assert.ok(await page.$eval('#preparation-response',e=>e.textContent.includes('Illustrative example, not a real assessment')));
    const focusState=await page.$eval(`[data-concern-choice="${key}"]`,(e,before)=>({focused:document.activeElement===e,before,after:e.getBoundingClientRect().top}),before);
    assert.ok(focusState.focused&&Math.abs(focusState.after-focusState.before)<2,`Selection retains focus and position: ${width}/${key} ${JSON.stringify(focusState)}`);
  }
  await page.click('[data-concern-choice="fit"]');
  assert.deepEqual(
    await page.$$eval('[aria-label="Sample job requirements"] li > span:last-child', nodes =>
      nodes.map(node => node.textContent)),
    ['Confirmed','Evidence needed','Qualification gap'],
    'The illustrative dashboard keeps evidence and qualification gaps distinct'
  );
  assert.equal(await page.$eval('#preparation-example-note', e => e.textContent), 'Illustrative example, not a real assessment.');
  assert.ok(await page.$eval('#preparation-response', e => !/\d+%/.test(e.textContent)), 'No numerical match score in the demonstration');
  assert.equal(await page.$$eval('#challenges button[data-concern-choice] img', images =>
    new Set(images.filter(image => image.complete && image.naturalWidth > 0).map(image => image.currentSrc)).size), 4);
  assert.ok(await page.$$eval('#challenges button[data-concern-choice]', (buttons, desktop) =>
    buttons.every(button => {
      const problem = button.children[0].getBoundingClientRect();
      const solution = button.children[2].getBoundingClientRect();
      return desktop ? problem.right < solution.left : problem.bottom <= solution.top;
    }), width >= 768), 'Problem and solution stay in the intended reading order');
  if(width < 768) {
    const typography = await page.$eval('#challenges', section => {
      const size = selector => getComputedStyle(section.querySelector(selector)).fontSize;
      return ['h2', '#preparation-response-title', 'button span[id^="concern-"]', '#preparation-response h3 + p', '#preparation-example-note'].map(size);
    });
    assert.deepEqual(typography, ['19px','19px','15px','14px','12px']);
  }
  if([375,390,430,768,1440].includes(width)){
    await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});
    const clip=await page.$eval('#challenges',e=>{const r=e.getBoundingClientRect();return{x:0,y:r.top+scrollY,width:innerWidth,height:r.height}});
    await page.screenshot({path:`${out}/candidate-story-${width}.png`,clip});
  }
  assert.ok(await page.$('meta[property="og:image"]'), 'Homepage needs explicit social image');
  assert.equal(await page.$eval('meta[name="twitter:card"]', e=>e.content), 'summary_large_image');
  assert.ok(await page.$$eval('a[href="/templates"]', es=>es.every(e=>e.textContent.includes('sign-in required'))), 'Protected templates must disclose sign-in');
  assert.equal(await page.$('#how-it-works'), null, 'Removed journey stays absent');
  assert.equal(await page.$('[data-job-package]'), null, 'Removed tabbed package preview stays absent');
  assert.ok(await page.$$eval('a[href="#services"]', es=>es.some(e=>e.textContent.includes('See how it works'))), 'Explanation links reach the remaining profile-to-packages section');
  assert.equal(await page.$$eval('#services [data-profile-field]',es=>es.length),5,'All profile categories shown');
  const samplePackages = await page.$$('#services [data-career-package]');
  assert.equal(samplePackages.length, 3, 'Three roles reuse the same profile');
  const expectedServices = ['ATS Job Match', 'Optimized Resume', 'Cover Letter', 'Interview Q&A', 'Mock Interview'];
  const expectedRoles = ['Senior Mechanical Engineer', 'Mechanical Commissioning Engineer', 'Mechanical Maintenance Engineer'];
  for (const [index, job] of samplePackages.entries()) {
    const packageState = await job.evaluate(element => {
      const arrow = element.querySelector('svg').getBoundingClientRect();
      const card = element.querySelector('article').getBoundingClientRect();
      return {
        role: element.querySelector('h3').textContent,
        labels: Array.from(element.querySelectorAll('button'), button => button.getAttribute('aria-label')),
        visible: Array.from(element.querySelectorAll('button')).every(button => button.offsetHeight >= 44),
        connected: Math.abs(card.left - arrow.right) <= 2 && arrow.top > card.top && arrow.bottom < card.bottom,
        reduced: element.querySelector('article').getAnimations().length === 0,
      };
    });
    assert.deepEqual(packageState, { role: expectedRoles[index], labels: expectedServices, visible: true, connected: true, reduced: true });
  }
  const ats = await samplePackages[0].$('button');
  await ats.focus();
  await page.keyboard.press('Enter');
  const detailId = await ats.evaluate(button => button.getAttribute('aria-controls'));
  assert.ok(await page.evaluate(id => document.getElementById(id).textContent.includes('genuine gaps'), detailId));
  assert.equal(await samplePackages[1].$$('button[aria-expanded=true]').then(buttons => buttons.length), 0);
  await page.keyboard.press('Escape');
  assert.ok(await ats.evaluate(button => button === document.activeElement && button.getAttribute('aria-expanded') === 'false'));
  if ([375, 390, 430].includes(width)) {
    const mock = await samplePackages[2].$('button[aria-label="Mock Interview"]');
    await mock.evaluate(button => button.scrollIntoView({ block: "center", behavior: "instant" }));
    await mock.tap();
    assert.equal(await mock.evaluate(button => button.getAttribute('aria-expanded')), 'true');
    await mock.evaluate(button => button.scrollIntoView({ block: "center", behavior: "instant" }));
    await mock.tap();
    assert.equal(await mock.evaluate(button => button.getAttribute('aria-expanded')), 'false');
  }
  const founder=await page.$eval('#about img',i=>({src:i.getAttribute('src'),width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,natural:i.naturalWidth}));
  // naturalWidth is density-corrected for Next's width-descriptor srcset;
  // the fixture serves original bytes, so it is not the source file width.
  assert.ok(founder.src.includes('founder-satish.webp')&&founder.width<=184&&founder.width>=104&&founder.width===founder.height&&founder.natural>=founder.width,`Authentic founder photo at supported responsive size: ${JSON.stringify(founder)}`);
  assert.ok(await page.$$eval('#interview ol li',es=>es.every(e=>{const t=e.firstChild;const start=t.textContent.indexOf('responsibility');if(start<0)return true;const r=document.createRange();r.setStart(t,start);r.setEnd(t,start+'responsibility'.length);return r.getClientRects().length===1})), 'Answer framework words must remain readable without mid-word wrapping');
  const state=await page.evaluate(()=>{
   const h=document.querySelector('#hero-title'),s=getComputedStyle(h);const images=[...document.images].filter(i=>i.getBoundingClientRect().width>0)
   const navigation=performance.getEntriesByType("navigation")[0]; const resources=performance.getEntriesByType("resource");
   return{navigation:{domContentLoadedMs:navigation.domContentLoadedEventEnd,loadMs:navigation.loadEventEnd,resourceCount:resources.length,transferBytes:resources.reduce((n,r)=>n+r.transferSize,0)},width:innerWidth,height:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,hero:{font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,box:h.getBoundingClientRect().toJSON()},orbitCount:document.querySelectorAll('.actual-template-orbit-face').length,flags:document.querySelectorAll('img[src*="/flags/"]').length,industryTiles:document.querySelectorAll('[data-industry]').length,brokenImages:images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),links:[...document.querySelectorAll('a[href]')].map(a=>({text:a.textContent.trim(),href:a.getAttribute('href')})),invalidAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.getAttribute('href')).filter(v=>v.length>1&&!document.getElementById(v.slice(1))),selectFonts:[...document.querySelectorAll('select')].map(e=>getComputedStyle(e).fontSize)}
  });results.viewports.push(state)
  // Move focus out of the deep package card before screenshot positioning.
  // Native focus scrolling can otherwise compete with scrollTo in Chromium.
  await page.$eval('header a', e=>e.focus({preventScroll:true}));
  await page.keyboard.press('Control+Home');
  await page.waitForFunction(()=>scrollY===0).catch(async error=>{
    console.error('Screenshot positioning', await page.evaluate(()=>({width:innerWidth,scrollY,focused:document.activeElement?.outerHTML,scrollBehavior:getComputedStyle(document.documentElement).scrollBehavior})));
    throw error;
  });
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(width===1440) assert.ok(await page.evaluate(()=>Math.abs(document.querySelector('#industries').getBoundingClientRect().top-document.querySelector('#markets').getBoundingClientRect().top)<2),'Approved desktop industries and globe share a row');
  if(width===1440)assert.ok(await page.$$eval('[data-uds=globe-country]',es=>es.every(e=>e.getBoundingClientRect().height<=88)),'Globe country labels must not wrap character by character');
  await page.screenshot({path:`${out}/landing-${width}.png`,fullPage:true})
  for(const id of ['hero-title','how-it-works','services','templates','interview','industries','markets','about','plans','faq']){const e=await page.$('#'+id);if(e){const clip=await e.evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height}});await page.screenshot({path:`${out}/${id}-${width}.png`,clip,captureBeyondViewport:true})}}
  assert.ok(state.scrollWidth<=width+1,`Overflow at${width}`);assert.equal(state.orbitCount,10);assert.equal(state.flags,6);assert.equal(state.industryTiles,6);assert.deepEqual(state.brokenImages,[]);assert.deepEqual(state.invalidAnchors,[]);assert.ok(state.selectFonts.every(x=>parseFloat(x)>=16))
  if(width<1180){await page.$eval('summary[aria-label="Open section menu"]',e=>e.click());assert.equal(await page.$eval('header details',e=>e.open),true);await page.focus('summary[aria-label="Open section menu"]');await page.keyboard.press('Escape');assert.equal(await page.$eval('header details',e=>e.open),false);assert.equal(await page.$eval('summary[aria-label="Open section menu"]',e=>document.activeElement===e),true);await page.$eval('summary[aria-label="Open section menu"]',e=>e.click());await page.$eval('header details a[href="#templates"]',e=>e.click());assert.equal(await page.$eval('header details',e=>e.open),false)}
  await page.$eval('#services details>summary',e=>e.click());for(const href of ['/gulf-readiness-score','/templates','/optimize/target','/cover-letter','/interview-qa','/mock-interview','/dashboard/library','/linkedin-optimization','/naukrigulf-optimization','/settings','/signup','/login','/tools'])assert.ok(state.links.some(l=>l.href===href),`Destination missing ${href}`)
  await page.$eval('#faq details>summary',e=>e.click());assert.equal(await page.$eval('#faq details',e=>e.open),true)
  await page.$eval('#interview',e=>e.scrollIntoView({behavior:'instant'}));await page.$eval('#interview details>summary',e=>e.click());await page.select('#interview select','british-woman');assert.ok(await page.$eval('#interview',e=>e.textContent.includes('Emma')))
  await focusDemoAction('Review this answer');const actionBefore=await page.evaluate(()=>document.activeElement.getBoundingClientRect().top);await page.keyboard.press('Enter');assert.ok(await page.evaluate(y=>Math.abs(document.activeElement.getBoundingClientRect().top-y)<2,actionBefore),'Stage control must remain visibly stable');assert.ok(await page.evaluate(()=>document.activeElement?.textContent.includes('See repeat-session progress')),'Stage control retains keyboard focus');assert.ok(await page.$eval('#interview',e=>e.textContent.includes('Review each question and answer')));if([390,1440].includes(width))await (await page.$('#interview')).screenshot({path:`${out}/feedback-${width}.png`})
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
  await page.evaluate(async()=>{for(const image of [...document.images].filter(image=>image.getBoundingClientRect().width>0)){image.scrollIntoView({behavior:'instant'});try{await image.decode()}catch{}}scrollTo({top:0,behavior:'instant'})});await page.waitForFunction(()=>scrollY===0);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:`${out}/presentation-${width}.png`,fullPage:true});
 }
 // Enlarge actual computed text, because UDS sizes are fixed pixel values.
 for(const textWidth of [320,390]){
 await page.setViewport({width:textWidth,height:900});await page.goto(origin,{waitUntil:'networkidle0'});
 await page.click('[data-concern-choice=interview]');
 const enlarged=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#challenges h2,#challenges h3,#challenges p,#challenges strong,#challenges span,#challenges small,#challenges a,#services h2,#services h3,#services p,#services strong,#services li span,#templates h2,#templates h3,#templates p,#templates button,#templates .paper strong,#interview h2,#interview h3,#interview h4,#interview p,#interview ol li,#interview button,#about h2,#about h3,#about p,#about span,#about a')];
   const before=nodes.map(e=>parseFloat(getComputedStyle(e).fontSize));
   nodes.forEach((e,i)=>e.style.setProperty('font-size',`${before[i]*2}px`,'important'));
   return nodes.every((e,i)=>Math.abs(parseFloat(getComputedStyle(e).fontSize)-before[i]*2)<.1);
 });
 assert.ok(enlarged,'New story text must actually double');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Actual 200% story text must not overflow');
 assert.ok(await page.$$eval('#challenges h3,#challenges p,#solutions h2,#solutions p,#services h3,#services p,#templates h2,#templates h3,#templates p,#about h2,#about h3,#about p',es=>es.filter(e=>e.getBoundingClientRect().width>1).every(e=>e.scrollWidth<=e.clientWidth+1)),'No visible story text clipping');
 await page.screenshot({path:`${out}/candidate-text-200-${textWidth}.png`,fullPage:true});
 }
 // Large-text responsiveness is separate from the visual reference screenshots.
 await page.setViewport({width:390,height:900});await page.goto(origin,{waitUntil:'networkidle0'});await page.addStyleTag({content:'html{font-size:200%}'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200%text horizontal overflow');await page.screenshot({path:`${out}/text-200-390.png`,fullPage:true});results.largeText={width:390,pass:true}
 // ---- Founder spec 2026-11-20: the landing-only token contract, palette, type scale, geometry
 // and the CSS-generated metadata separator, measured on the real built page at phone and
 // desktop. This restyle is presentation-only: every value below is fixed by the design
 // authority (docs/12_DESIGN_SYSTEM.md, "Landing presentation"), so the guard asserts the
 // spec rather than whatever the stylesheet happens to declare today. Class names stay free.
 const LANDING_TOKENS={
  '--lp-canvas':'#ffffff','--lp-surface-muted':'#f8fafc','--lp-tint':'#e7f3f0','--lp-line':'#e2e8f0',
  '--lp-accent':'#087f76','--lp-accent-hover':'#066b63','--lp-ink':'#18283d','--lp-body-text':'#475569',
  '--lp-status-confirmed':'#065f46','--lp-status-missing':'#b47b2b','--lp-status-gap':'#475569',
  '--lp-h1-weight':'600','--lp-h1-line':'1.25','--lp-h2-weight':'600','--lp-h2-line':'1.3',
  '--lp-h3-weight':'600','--lp-body-line':'1.55','--lp-meta-size':'0.75rem','--lp-meta-weight':'500',
  '--lp-btn-weight':'600','--lp-btn-line':'1.4','--lp-nav-weight':'500','--lp-nav-line':'1.4',
  '--lp-content-max':'1360px','--lp-nav-height':'64px','--lp-radius':'6px',
 }
 for(const width of [390,1440]){
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
  await page.setViewport({width,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready)
  const spec=await page.evaluate(({names,literals})=>{
   const root=document.querySelector('#main-content'),landing=document.querySelector('[data-website-ui]'),style=(element,pseudo)=>getComputedStyle(element,pseudo)
   const token=name=>style(root).getPropertyValue(name).trim().toLowerCase().replace(/\s+/g,'')
   const family=element=>style(element).fontFamily.split(',')[0].replaceAll('_',' ').replaceAll('"','').trim()
   const services=document.querySelector('#services'),title=document.querySelector('#services-title'),lead=document.querySelector('#services-title + p')
   const helper=document.querySelector('[data-uds="helper"]'),band=document.querySelector('[data-uds="final"]'),cta=band.querySelector('[data-uds="button-primary"]')
   const footer=document.querySelector('footer'),inner=document.querySelector('[data-uds="inner"]'),navInner=document.querySelector('header > div')
   const fontVar=name=>{let element=root;while(element){const value=style(element).getPropertyValue(name).trim();if(value)return value;element=element.parentElement}return ''}
   const separators=[...landing.querySelectorAll('*')].filter(element=>['::before','::after'].some(pseudo=>(style(element,pseudo).content??'').includes('·'))).length
   let literalInterpunct=null;const walker=document.createTreeWalker(landing,NodeFilter.SHOW_TEXT)
   while(walker.nextNode())if(walker.currentNode.nodeValue.includes('·')){literalInterpunct=walker.currentNode.nodeValue.trim().slice(0,60);break}
   return{tokens:Object.fromEntries(names.map(name=>[name,token(name)])),
    fonts:{inter:fontVar('--font-inter')},
    ground:style(document.querySelector('[data-website-ui]')).backgroundColor,
    services:{background:style(services).backgroundColor,paddingTop:style(services).paddingTop,borderBottomWidth:style(services).borderBottomWidth,borderBottomColor:style(services).borderBottomColor},
    sectionBackgrounds:[...new Set([...document.querySelectorAll('main section')].map(section=>style(section).backgroundColor))],
    title:{color:style(title).color,weight:style(title).fontWeight,size:parseFloat(style(title).fontSize),line:parseFloat(style(title).lineHeight)/parseFloat(style(title).fontSize),family:family(title)},
    lead:{color:style(lead).color,size:parseFloat(style(lead).fontSize),line:parseFloat(style(lead).lineHeight)/parseFloat(style(lead).fontSize),family:family(lead)},
    helper:{color:style(helper).color,size:parseFloat(style(helper).fontSize),background:style(helper).backgroundColor,borderWidth:style(helper).borderTopWidth,surface:(()=>{const section=helper.closest('section');return section?style(section).backgroundColor:'rgba(0, 0, 0, 0)'})()},
    h3:[...services.querySelectorAll('h3')].map(element=>({size:parseFloat(style(element).fontSize),weight:style(element).fontWeight})),
    band:{background:style(band).backgroundColor},cta:{background:style(cta).backgroundColor,radius:style(cta).borderRadius},
    footer:{background:style(footer).backgroundColor,color:style(footer).color,borderTopColor:style(footer).borderTopColor,borderTopWidth:style(footer).borderTopWidth},
    container:{width:inner.getBoundingClientRect().width,clientWidth:document.documentElement.clientWidth},
    nav:{position:style(document.querySelector('header')).position,height:navInner.getBoundingClientRect().height,minHeight:style(navInner).minHeight},
    numerals:{family:family(document.querySelector('#interview table')),variant:style(document.querySelector('#interview table')).fontVariantNumeric},
    separators,literalInterpunct,literals,facesLoaded:[...document.fonts].filter(face=>face.status==='loaded').map(face=>face.family)}
  },{names:[...Object.keys(LANDING_TOKENS),'--lp-h2-size','--lp-h3-size','--lp-body-size','--lp-gutter','--lp-section-pad'],literals:LANDING_TOKENS})
  results.landingSpec??=[];results.landingSpec.push({width,...spec})
  for(const [name,expected] of Object.entries(spec.literals))assert.equal(spec.tokens[name],expected,`Landing token contract ${name} at ${width}px`)
  assert.equal(spec.tokens['--lp-h2-size'],width>=1024?'1.625rem':'1.1875rem',`--lp-h2-size at ${width}px`)
  assert.equal(spec.tokens['--lp-h3-size'],width>=1024?'1.125rem':'0.9375rem',`--lp-h3-size at ${width}px`)
  assert.equal(spec.tokens['--lp-body-size'],width>=1024?'1rem':'0.875rem',`--lp-body-size at ${width}px`)
  assert.equal(spec.tokens['--lp-gutter'],width>=1024?'40px':'24px',`--lp-gutter at ${width}px`)
  assert.equal(spec.tokens['--lp-section-pad'],width>=1024?'96px':'64px',`--lp-section-pad at ${width}px`)
  for(const [name,value] of Object.entries(spec.fonts))assert.ok(value,`Landing font variable for ${name} must resolve on the landing wrapper`)
  assert.equal(spec.ground,'rgb(255, 255, 255)',`Landing canvas must be #FFFFFF at ${width}px: ${spec.ground}`)
  assert.equal(spec.services.background,'rgb(255, 255, 255)',`Working sections must be the white surface at ${width}px: ${spec.services.background}`)
  assert.ok(spec.sectionBackgrounds.every(color=>['rgb(248, 250, 252)','rgb(255, 255, 255)','rgba(0, 0, 0, 0)'].includes(color) /* transparent = inherits the landing canvas ground */),`Landing sections may only use white or slate: ${JSON.stringify(spec.sectionBackgrounds)}`)
  assert.ok(spec.sectionBackgrounds.includes('rgb(248, 250, 252)')&&spec.sectionBackgrounds.includes('rgb(255, 255, 255)'),`The canvas/white alternation must still be present: ${JSON.stringify(spec.sectionBackgrounds)}`)
  assert.equal(spec.services.paddingTop,width>=1024?'96px':'64px',`Section rhythm must be 64-96px (--lp-section-pad) at ${width}px: ${spec.services.paddingTop}`)
  assert.equal(spec.services.borderBottomWidth,'1px',`Section hairline must be 1px at ${width}px`)
  assert.equal(spec.services.borderBottomColor,'rgb(226, 232, 240)',`Section hairline must be #E2E8F0 at ${width}px: ${spec.services.borderBottomColor}`)
  assert.equal(spec.title.color,'rgb(24, 40, 61)',`Section headings must use the #18283D ink at ${width}px: ${spec.title.color}`)
  assert.equal(spec.title.weight,'600',`h2 weight must be 600 at ${width}px`)
  assert.equal(spec.title.size,width>=1024?26:19,`h2 must stay in the 19-26px band at ${width}px: ${spec.title.size}`)
  assert.ok(spec.facesLoaded.includes(spec.title.family)&&/inter/i.test(spec.title.family),`h2 must paint a LOADED landing face at ${width}px (Inter): ${spec.title.family}`)
  assert.ok(Math.abs(spec.title.line-1.3)<.02,`h2 line height must be 1.3 at ${width}px: ${spec.title.line}`)
  assert.equal(spec.lead.color,'rgb(71, 85, 105)',`Body copy must be #475569 at ${width}px: ${spec.lead.color}`)
  assert.equal(spec.lead.size,width>=1024?16:14,`Body copy must be 14-16px at ${width}px: ${spec.lead.size}`)
  assert.ok(Math.abs(spec.lead.line-1.55)<.02,`Body line height must be 1.55 at ${width}px: ${spec.lead.line}`)
  assert.ok(spec.facesLoaded.includes(spec.lead.family)&&spec.lead.family===spec.title.family,`Body copy must paint the loaded body face, shared with the heading, at ${width}px: ${spec.lead.family}`)
  assert.equal(spec.helper.color,'rgb(71, 85, 105)',`Metadata must use the approved secondary text at ${width}px (surface ${spec.helper.surface}): ${spec.helper.color}`)
  assert.equal(spec.helper.size,12,`Metadata must be 12px at ${width}px: ${spec.helper.size}`)
  assert.equal(spec.helper.background,'rgba(0, 0, 0, 0)',`Metadata must be unboxed at ${width}px`)
  assert.equal(spec.helper.borderWidth,'0px',`Metadata must be unboxed at ${width}px`)
  assert.ok(spec.h3.length>=2,'The services section must still render its card headings')
  for(const heading of spec.h3){assert.ok(heading.size===(width>=1024?18:15),`h3 must stay in the 15-18px band at ${width}px: ${heading.size}`);assert.equal(heading.weight,'600',`h3 weight must be 600 at ${width}px`)}
  assert.equal(spec.band.background,'rgb(248, 250, 252)',`Closing band must use the alternate background at ${width}px: ${spec.band.background}`)
  assert.equal(spec.cta.background,'rgb(8, 127, 118)',`The closing CTA uses the approved teal at ${width}px: ${spec.cta.background}`)
  assert.equal(spec.cta.radius,'6px',`Controls must use the 6px radius at ${width}px: ${spec.cta.radius}`)
  assert.equal(spec.footer.background,'rgb(248, 250, 252)',`Footer must use the alternate background at ${width}px: ${spec.footer.background}`)
  assert.equal(spec.footer.color,'rgb(71, 85, 105)',`Footer body copy must be #475569 at ${width}px: ${spec.footer.color}`)
  assert.equal(spec.footer.borderTopColor,'rgb(226, 232, 240)',`Footer hairline must be #E2E8F0 at ${width}px: ${spec.footer.borderTopColor}`)
  assert.equal(spec.footer.borderTopWidth,'1px',`Footer hairline must be 1px at ${width}px`)
  const gutter=width>=1024?40:24,expectedContainer=Math.min(1360,spec.container.clientWidth-gutter*2)
  assert.ok(Math.abs(spec.container.width-expectedContainer)<1.5,`Landing container must be min(1360px, 100% - 2x${gutter}px) at ${width}px: ${spec.container.width} vs ${expectedContainer}`)
  assert.equal(spec.nav.position,'sticky',`Landing nav must stay sticky at ${width}px`)
  assert.equal(spec.nav.minHeight,'64px',`Landing nav must reserve 64px at ${width}px`)
  if(width===1440)assert.equal(Math.round(spec.nav.height),64,`Desktop nav must be one 64px row: ${spec.nav.height}`)
  assert.ok(spec.numerals.family===spec.title.family,`Numerals must use Inter too: ${spec.numerals.family}`)
  assert.ok(spec.numerals.variant.includes('tabular-nums'),`Numerals must be tabular: ${spec.numerals.variant}`)
  assert.ok(spec.separators>0,`The metadata separator must be CSS-generated at ${width}px`)
  assert.equal(spec.literalInterpunct,null,`No literal interpunct may appear in the landing DOM (found ${JSON.stringify(spec.literalInterpunct)})`)
  console.log(`PASS spec ${width}px: white/slate/navy/teal palette, pinned token contract, 19-26px h2, 12px unboxed metadata, 1360px container, 64px nav, 6px controls, CSS-generated separator`)
 }
 // The founder fixed the focus ring at #087F76; assert it on the first keyboard stop.
 await page.setViewport({width:1440,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 await page.keyboard.press('Tab')
 const focusRing=await page.evaluate(()=>{const element=document.activeElement,style=getComputedStyle(element);return{tag:element.tagName,outlineColor:style.outlineColor,outlineWidth:style.outlineWidth,outlineStyle:style.outlineStyle}})
 assert.equal(focusRing.outlineStyle,'solid',`Keyboard focus must draw the landing focus ring: ${JSON.stringify(focusRing)}`)
 assert.equal(focusRing.outlineColor,'rgb(8, 127, 118)',`Focus-visible ring must be #087F76: ${JSON.stringify(focusRing)}`)
 assert.ok(parseFloat(focusRing.outlineWidth)>=2,`Focus-visible ring must be at least 2px: ${JSON.stringify(focusRing)}`)
 assert.deepEqual(results.errors,[]);results.pass=true
}catch(e){results.failures.push(e.stack);throw e}finally{writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));await browser?.close();server.close()}
