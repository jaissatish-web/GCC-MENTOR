/**
 * Rendered appearance equivalence for a CSS-only cleanup.
 * Before rebuilding: CHROME_PATH=... node scripts/verify-css-cleanup.mjs --capture /scratch/baseline
 * After rebuilding: CHROME_PATH=... node scripts/verify-css-cleanup.mjs --compare /scratch/baseline
 * Captures real production pages against fictional local APIs. Replays identical DOM with
 * the old/new compiled CSS, preserving each route's stylesheet order. Never calls live services.
 */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,mkdirSync,existsSync,statSync,rmSync} from 'node:fs'
import {resolve,join,basename,extname} from 'node:path'
import {createHash} from 'node:crypto'
import puppeteer from 'puppeteer-core'

const root=process.cwd(),mode=process.argv[2],baseline=resolve(process.argv[3]||'/tmp/gcc-css-baseline')
assert.ok(['--capture','--compare'].includes(mode),'Use --capture baseline-directory before rebuilding, then --compare baseline-directory')
const output=resolve(process.env.CSS_CLEANUP_OUTPUT||'artifacts/css-cleanup'),widths=[320,390,768,1440]
mkdirSync(output,{recursive:true});mkdirSync(baseline,{recursive:true})
const initial=JSON.parse(readFileSync('scripts/fixtures/studioFixture.json','utf8'))
const specs=[
 {name:'landing',path:'/',ready:'h1'},
 {name:'readiness',path:'/gulf-readiness-score',ready:'h1'},
 {name:'dashboard',path:'/dashboard',ready:'.studio-home'},
 {name:'profile-summary',path:'/profile',ready:'.studio-profile-summary'},
 {name:'profile-editor',path:'/profile?view=details',ready:'#profile-editor'},
 {name:'profile-import',path:'/profile?view=details',ready:'[aria-label="Resume import review"]',state:'import'},
]
const freeze='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}html{scrollbar-width:none}'
const routespec=spec=>new URL(spec.path,'http://fixture').pathname
const htmlFile=spec=>join(root,'.next/server/app',routespec(spec)==='/'?'index.html':routespec(spec)+'.html')
const stylesheetPaths=html=>[...new Set([...html.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m=>m[1]))]
const inlineFonts=css=>css.replace(/url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g,(_,url)=>`url("data:font/woff2;base64,${readFileSync(join(root,'.next/static/media',basename(url))).toString('base64')}")`)
const sha=data=>createHash('sha256').update(data).digest('hex')
function cssFor(spec){const html=readFileSync(htmlFile(spec),'utf8'),files=stylesheetPaths(html);assert.ok(files.length,spec.name+' has production stylesheets');return{files,css:inlineFonts(files.map(file=>readFileSync(join(root,file.replace('/_next/','.next/')),'utf8')).join('\n'))}}
let state='saved'
function createFixtureServer(){return createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture'),p=url.pathname
 const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
 if(p.startsWith('/api/')){
  if(req.method!=='GET')return send({error:'Read-only appearance fixture'},409)
  if(p==='/api/profile')return state==='import'?send({error:'No saved profile'},404):send(initial.profile)
  if(p==='/api/profile/pending-draft')return send({pending:state==='import'?{draft:{...initial.profile,full_name:'Imported Maya Thomas'},report:null}:null})
  if(p==='/api/profile/import-review')return send({review:null})
  if(p==='/api/dashboard/overview')return send(initial.overview)
  if(p==='/api/packages/career-profile')return send({package:null,summary:null})
  if(p==='/api/packages/studio-resume')return send({package:initial.pkg})
  if(p==='/api/packages')return send({packages:[initial.pkg],total:1,next_cursor:null})
  if(p==='/api/mock-interview/progress')return send({attempts:2,progress:[]})
  if(p==='/api/mock-interview/voice-capabilities')return send({enabled:false})
  return send({},404)
 }
 const file=p.startsWith('/_next/static/')?join(root,'.next',p.slice(7)):existsSync(join(root,'public',p))&&statSync(join(root,'public',p)).isFile()?join(root,'public',p):join(root,'.next/server/app',p==='/'?'index.html':p+'.html')
 if(existsSync(file)){res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream'});return res.end(readFileSync(file))}
 res.writeHead(404);res.end('Not found')
})}
let server,browser
const runtimeErrors=[],external=[],results=[],moduleAudit=[]
try{
 assert.ok(process.env.CHROME_PATH,'Set CHROME_PATH to a local Chromium executable')
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
 if(mode==='--capture'){
  server=createFixtureServer();await new Promise(yes=>server.listen(0,'127.0.0.1',yes));const origin='http://127.0.0.1:'+server.address().port
  const page=await browser.newPage();page.on('pageerror',e=>runtimeErrors.push(e.message));await page.setRequestInterception(true)
  page.on('request',r=>{const url=new URL(r.url());if(['data:','blob:'].includes(url.protocol)||url.origin===origin)void r.continue();else{external.push(r.url());void r.abort()}})
  const manifest={createdAt:new Date().toISOString(),specs:[],widths,errors:runtimeErrors,blockedExternal:external}
  for(const spec of specs){
   state=spec.state||'saved';await page.setViewport({width:1440,height:1000,deviceScaleFactor:1});console.log('CAPTURE '+spec.name)
   await page.goto(origin+spec.path,{waitUntil:'domcontentloaded'});await page.waitForSelector(spec.ready,{timeout:15000});await page.waitForNetworkIdle({idleTime:150,timeout:3000}).catch(()=>{})
   await page.addStyleTag({content:freeze});await page.evaluate(()=>document.fonts.ready)
   // Capture existing expanded core inputs plus additional/import findings states.
   if(spec.name==='profile-editor')await page.evaluate(()=>{for(const el of document.querySelectorAll('details'))el.open=true;for(const button of document.querySelectorAll('[aria-controls][aria-expanded="false"]')){if(button.closest('main'))button.click()}})
   const dom=await page.evaluate(()=>{const body=document.body.cloneNode(true);for(const node of body.querySelectorAll('script,link[rel=stylesheet]'))node.remove();for(const node of body.querySelectorAll('input')){if(node.type!=='file')node.setAttribute('value',node.value);if(node.checked)node.setAttribute('checked','')}return body.outerHTML})
   const compiled=cssFor(spec);writeFileSync(join(baseline,spec.name+'.html'),dom);writeFileSync(join(baseline,spec.name+'.css'),compiled.css)
   const assets=[...new Set([...dom.matchAll(/(?:src|href)="(\/[^"#?]+\.(?:png|jpe?g|webp|svg))"/g)].map(m=>m[1]))];const assetMap={};for(const asset of assets){const local=join(root,'public',asset);if(existsSync(local))assetMap[asset]='data:'+({'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'}[extname(asset)])+';base64,'+readFileSync(local).toString('base64')}
   manifest.specs.push({...spec,files:compiled.files,domSha:sha(dom),cssSha:sha(compiled.css),assets:assetMap})
  }
  writeFileSync(join(baseline,'manifest.json'),JSON.stringify(manifest,null,2));assert.deepEqual(runtimeErrors,[],'Baseline app runtime errors');console.log('PASS captured '+manifest.specs.length+' real production DOM/CSS fixtures in '+baseline)
 }else{
  const manifest=JSON.parse(readFileSync(join(baseline,'manifest.json'),'utf8'));assert.deepEqual(manifest.errors,[],'Baseline capture must be healthy')
  const page=await browser.newPage();await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('data:')?void r.continue():void r.abort())
  const computed=async()=>await page.evaluate(()=>[...document.body.querySelectorAll('*')].filter(el=>!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map((el,index)=>{const s=getComputedStyle(el),r=el.getBoundingClientRect(),properties=Object.fromEntries([...s].filter(p=>!p.startsWith('--')).map(p=>[p,s.getPropertyValue(p)]));const pseudo=which=>{const p=getComputedStyle(el,which);return Object.fromEntries(['content','display','font-family','font-size','font-weight','color','background-color','border','width','height','position','inset','transform','opacity'].map(k=>[k,p.getPropertyValue(k)]))};return{index,tag:el.tagName,className:typeof el.className==='string'?el.className:'',rect:[r.x,r.y,r.width,r.height].map(x=>Math.round(x*1000)/1000),properties,before:pseudo('::before'),after:pseudo('::after')}}))
  for(const spec of manifest.specs){
   const dom=readFileSync(join(baseline,spec.name+'.html'),'utf8').replace(/(?:src|href)="(\/[^"#?]+\.(?:png|jpe?g|webp|svg))"/g,(whole,asset)=>spec.assets[asset]?whole.replace(asset,spec.assets[asset]):whole)
   const oldCss=readFileSync(join(baseline,spec.name+'.css'),'utf8'),current=process.env.CSS_CLEANUP_SELF_CHECK==='1'?{css:oldCss,files:spec.files}:cssFor(spec)
   const moduleClasses=[...new Set([...dom.matchAll(/class="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/)).filter(c=>c.includes('__')&&!c.startsWith('__')&&oldCss.includes('.'+c)))];moduleAudit.push({fixture:spec.name,usedModuleClasses:moduleClasses.length,missingCurrentSelectors:moduleClasses.filter(c=>!current.css.includes('.'+c))});
   for(const width of widths)for(const sample of ['default','hover-focus','enlarged-text']){
    console.log('COMPARE '+spec.name+' '+width+' '+sample);await page.setViewport({width,height:1000,deviceScaleFactor:1})
    const render=async css=>{await page.setContent(`<html><head><meta charset="utf-8"><style>${css}</style><style>${freeze}</style></head>${dom}</html>`,{waitUntil:'domcontentloaded'});await page.evaluate(async()=>{document.documentElement.style.removeProperty('font-size');document.activeElement?.blur?.();await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));window.scrollTo({left:0,top:0,behavior:'instant'})});await page.mouse.move(0,0);if(sample==='enlarged-text')await page.evaluate(()=>{document.documentElement.style.setProperty('font-size','200%','important');window.scrollTo({left:0,top:0,behavior:'instant'})});if(sample==='hover-focus'){await page.keyboard.press('Tab');await page.evaluate(()=>{const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};const field=[...document.querySelectorAll('main input:not([type=hidden]):not([type=file]),main textarea,main button')].find(visible);field?.focus({preventScroll:true});const action=[...document.querySelectorAll('button.ui-button,a.ui-button,main button,header button')].find(visible);action?.setAttribute('data-equivalence-hover','true')});if(await page.$('[data-equivalence-hover]'))await page.hover('[data-equivalence-hover]')}return await computed()}
    const before=await render(oldCss),beforeImage=await page.screenshot({fullPage:false});const after=await render(current.css),afterImage=await page.screenshot({fullPage:false})
    const differences=[];for(let i=0;i<before.length;i++){if(JSON.stringify(before[i])!==JSON.stringify(after[i]))differences.push({index:i,before:before[i],after:after[i]})}
    const equalPixels=Buffer.from(beforeImage).equals(Buffer.from(afterImage));const result={fixture:spec.name,width,sample,elements:before.length,computedEqual:differences.length===0,pixelEqual:equalPixels,oldCssBytes:Buffer.byteLength(oldCss),newCssBytes:Buffer.byteLength(current.css),oldFiles:spec.files,newFiles:current.files};results.push(result)
    if(width===390||width===1440||differences.length||!equalPixels){writeFileSync(join(output,`${spec.name}-${width}-${sample}-before.png`),beforeImage);writeFileSync(join(output,`${spec.name}-${width}-${sample}-after.png`),afterImage)}
    const differenceFile=join(output,`${spec.name}-${width}-${sample}-differences.json`);if(differences.length)writeFileSync(differenceFile,JSON.stringify(differences,null,2));else rmSync(differenceFile,{force:true})
   }
  }
  writeFileSync(join(output,'results.json'),JSON.stringify({baseline,selfCheck:process.env.CSS_CLEANUP_SELF_CHECK==='1',moduleAudit,results},null,2));assert.ok(moduleAudit.every(r=>r.missingCurrentSelectors.length===0),'Used CSS module selectors disappeared or hashes changed; inspect results.moduleAudit');assert.ok(results.every(r=>r.computedEqual),'Computed style/geometry drift; inspect artifacts/css-cleanup/*-differences.json');assert.ok(results.every(r=>r.pixelEqual),'Paint drift; inspect paired screenshots');console.log((process.env.CSS_CLEANUP_SELF_CHECK==='1'?'PASS baseline replay self-check: ':'PASS CSS cleanup equivalence: ')+results.length+' real-page/viewport comparisons, exact computed styles/geometry and screenshot bytes')
 }
}finally{if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes))}}
