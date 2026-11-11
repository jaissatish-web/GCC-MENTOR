/** Read-only audit of the real built landing page. No account, API mutation or DOM/style injection.
 * CHROME_PATH=/path/chrome QA_PHASE=before QA_BUILD=.next-before node scripts/audit-css-cascade.mjs
 * QA_BUILD is a compiled Next output directory; public/ comes from QA_ROOT (default cwd).
 * QA_URL optionally audits an already-running local page instead of the built-page server.
 * --self-test runs specificity/cascade comparator checks without Chromium.
 */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, extname, relative, sep } from 'node:path'
import selectorParser from 'postcss-selector-parser'
import postcss from 'postcss'
import puppeteer from 'puppeteer-core'

const add = (a,b) => a.map((v,i)=>v+b[i])
const compare = (a,b) => { for(let i=0;i<a.length;i++) if(a[i]!==b[i])return a[i]-b[i];return 0 }
const maximum = vectors => vectors.reduce((best,v)=>compare(v,best)>0?v:best,[0,0,0])
export function specificity(selector) {
  const ast=selectorParser().astSync(selector)
  function walk(nodes) {
    let result=[0,0,0]
    for(const node of nodes) {
      if(node.type==='id') result=add(result,[1,0,0])
      else if(node.type==='class'||node.type==='attribute') result=add(result,[0,1,0])
      else if(node.type==='tag') result=add(result,[0,0,1])
      else if(node.type==='pseudo') {
        const name=node.value.toLowerCase()
        if(name===':where') continue
        if([':is',':not',':has',':matches','-webkit-any',':-webkit-any'].includes(name)) result=add(result,maximum((node.nodes??[]).map(part=>walk(part.nodes??[]))))
        else if(name===':nth-child'||name===':nth-last-child') {
          result=add(result,[0,1,0])
          const text=node.toString(),of=text.match(/\bof\s+([\s\S]*)\)$/i)
          if(of) result=add(result,specificity(of[1]))
        }
        else if(name.startsWith('::')||[':before',':after',':first-line',':first-letter'].includes(name)) result=add(result,[0,0,1])
        else result=add(result,[0,1,0])
      }
    }
    return result
  }
  return maximum(ast.nodes.map(node=>walk(node.nodes)))
}
const rank = (a,b) => Number(a.important)-Number(b.important)||Number(a.inline)-Number(b.inline)||compare(a.specificity,b.specificity)||a.order-b.order||a.declarationOrder-b.declarationOrder
function selfTest() {
  for(const [selector,expected] of [[':where(#id).x',[0,1,0]],['body :is(h1,h1[class])',[0,1,2]],['.a:not(:where(#x))',[0,1,0]],['.a:has(#x,.b)',[1,1,0]],['#a,.b',[1,0,0]],['li:nth-child(2n of .x,#y)',[1,1,1]],['.a::before',[0,1,1]]])assert.deepEqual(specificity(selector),expected,selector)
  const base={important:false,inline:false,specificity:[0,1,0],order:0,declarationOrder:0}
  assert.ok(rank({...base,important:true},{...base,inline:true,specificity:[1,0,0]})>0)
  assert.ok(rank({...base,inline:true},{...base,specificity:[10,0,0]})>0)
  assert.ok(rank({...base,order:2},{...base,order:1})>0)
  console.log('PASS cascade audit specificity (:where/:is/:not/:has/nth-of), importance, inline and source order')
}
if(process.argv.includes('--self-test')) {selfTest();process.exit(0)}

const root=resolve(process.env.QA_ROOT??process.cwd()),build=resolve(root,process.env.QA_BUILD??'.next')
const phase=(process.env.QA_PHASE??'after').replace(/[^a-z0-9_-]/gi,'-'),out=resolve(root,'artifacts/cascade-audit',phase)
mkdirSync(out,{recursive:true})
const properties=['font-family','font-size','font-weight','font-style','line-height','letter-spacing','color','background-color','border-radius','border-top-width','border-top-color','box-shadow','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-bottom','width','max-width','height','min-height','gap','display','position','overflow-x','transform','zoom','--ui-font','--uds-font','--ui-body-size','--uds-body-size','--ui-brand-rgb','--uds-brand-rgb']
const targets={
  kicker:'[data-uds="hero"] [data-uds="kicker"]',
  select:'select',
  hero:'#hero-title',
  title:'#hero-title span',
  h2:'#services h2',
  h3:'#services [data-uds="card"] h3',
  paragraph:'[data-uds="hero"] p',
  primaryButton:'[data-uds="hero"] [data-uds="button-primary"]',
  secondaryButton:'[data-uds="hero"] [data-uds="button-secondary"]',
  card:'[data-uds="card"]',
  nav:'nav[aria-label="Page sections"] a',
  orbitUi:'[data-uds="visual"]',
}
const protectedSelector='[data-document-preview],#resume-render,.actual-template-orbit-face,[data-typography="document"]'
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json','.map':'application/json'}
let server,browser
const report={schemaVersion:1,phase,createdAt:new Date().toISOString(),root,build,buildId:existsSync(build+'/BUILD_ID')?readFileSync(build+'/BUILD_ID','utf8').trim():null,readOnly:true,limitations:['Computed styles are browser truth; winningDeclaredRule is a bounded author-cascade diagnostic, not a replacement for browser DevTools.','Layer/scope/container/import ambiguity, active animation/transition and shorthand-with-variable ambiguity are explicitly unresolved.','No DOM, stylesheet, document-renderer or theme mutation is performed. Screenshots retain live animation state.'],sourceInventoryNote:'Inventory records QA_ROOT source at audit time. When QA_BUILD points to an older artifact, this inventory is not proof of its original source; generated CDP ranges remain authoritative for that build.',sourceInventory:[],viewports:[]}
try {
  let origin=process.env.QA_URL
  if(!origin) {
    assert.ok(existsSync(build+'/server/app/index.html'),'QA_BUILD must contain a completed production build')
    server=createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost')
      if(url.pathname.startsWith('/api/')) {res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:null,profile:null,packages:[],summary:null}));return}
      const path=url.pathname==='/_next/image'?url.searchParams.get('url')??'':url.pathname
      const file=path.startsWith('/_next/static/')?resolve(build,path.slice(7)):path==='/'?resolve(build,'server/app/index.html'):resolve(root,'public','.'+path)
      const allowed=file.startsWith(build+sep)||file.startsWith(resolve(root,'public')+sep)
      if(!allowed||!existsSync(file)||!statSync(file).isFile()){res.writeHead(404);res.end();return}
      res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream'});res.end(readFileSync(file))
    })
    await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://127.0.0.1:${server.address().port}`
  }
  const scanFiles=dir=>existsSync(dir)?readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?scanFiles(resolve(dir,entry.name)):entry.name.endsWith('.css')?[resolve(dir,entry.name)]:[]):[]
  for(const file of [...scanFiles(resolve(root,'app')),...scanFiles(resolve(root,'components/landing-v3')),...scanFiles(resolve(root,'components/landing-premium')),...scanFiles(resolve(root,'components/design-system'))]) {
    const source=readFileSync(file,'utf8'),rules=[];let important=0,declarations=0
    postcss.parse(source,{from:file}).walkRules(rule=>{const props=[];rule.walkDecls(d=>{declarations++;if(d.important)important++;props.push({property:d.prop,value:d.value,important:!!d.important})});rules.push({selector:rule.selector,line:rule.source?.start?.line,declarations:props})})
    report.sourceInventory.push({file:relative(root,file),sha256:createHash('sha256').update(source).digest('hex'),important,declarations,rules})
  }
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage']})
  for(const width of [390,1440]) {
    const page=await browser.newPage(),errors=[],failedRequests=[]
    page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText}))
    await page.setViewport({width,height:1000,deviceScaleFactor:1})
    await page.goto(origin,{waitUntil:'networkidle0',timeout:60000});await page.evaluate(()=>document.fonts.ready)
    await page.waitForSelector('#hero-title',{timeout:15000})
    // Trigger ordinary lazy intersection loading; never alter element styles or renderers.
    await page.$eval('#templates',element=>element.scrollIntoView({block:'center'}))
    await page.waitForFunction(()=>document.querySelector('.actual-template-orbit-face'),{timeout:20000})
    await page.evaluate(()=>window.scrollTo(0,0))
    const session=await page.createCDPSession(),sheets=new Map()
    session.on('CSS.styleSheetAdded',({header})=>sheets.set(header.styleSheetId,header))
    await session.send('DOM.enable');await session.send('CSS.enable')
    const {root:dom}=await session.send('DOM.getDocument',{depth:0})
    const viewport={width,height:1000,url:page.url(),errors,failedRequests,elements:{},stylesheets:[],protected:[],overflow:await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth}))}
    for(const [name,selector] of Object.entries(targets)) {
      const {nodeId}=await session.send('DOM.querySelector',{nodeId:dom.nodeId,selector})
      if(!nodeId){viewport.elements[name]={selector,missing:true};continue}
      const matched=await session.send('CSS.getMatchedStylesForNode',{nodeId}),computed=await session.send('CSS.getComputedStyleForNode',{nodeId})
      const snapshot=await page.$eval(selector,(element,properties)=>{
        const style=getComputedStyle(element),computed=Object.fromEntries(properties.map(key=>[key,style.getPropertyValue(key)])),box=element.getBoundingClientRect(),rules=[],unavailable=[],groups=[];let order=0
        const walk=(ruleList,source,context=[])=>{for(const rule of ruleList){
          if(rule instanceof CSSMediaRule){if(matchMedia(rule.conditionText).matches)walk(rule.cssRules,source,[...context,{kind:'media',condition:rule.conditionText}]);continue}
          if(rule instanceof CSSSupportsRule){if(CSS.supports(rule.conditionText))walk(rule.cssRules,source,[...context,{kind:'supports',condition:rule.conditionText}]);continue}
          if(rule instanceof CSSStyleRule){
            order++;try{if(!element.matches(rule.selectorText))continue}catch{unavailable.push({source,selector:rule.selectorText,reason:'selector matches unsupported'});continue}
            const declarations=Array.from(rule.style).map((property,index)=>({property,value:rule.style.getPropertyValue(property),important:rule.style.getPropertyPriority(property)==='important',declarationOrder:index}))
            rules.push({selector:rule.selectorText,source,order,context,declarations});continue
          }
          if(rule.cssRules){const kind=rule.constructor.name;groups.push(kind);walk(rule.cssRules,source,[...context,{kind,condition:rule.conditionText??rule.name??null}])}
          else if(rule instanceof CSSImportRule)unavailable.push({source,reason:'Imported sheet not flattened; candidate winner unresolved',url:rule.href})
        }}
        for(const sheet of document.styleSheets){if(sheet.disabled||(sheet.media.mediaText&&!matchMedia(sheet.media.mediaText).matches))continue;try{walk(sheet.cssRules,sheet.href??'inline stylesheet')}catch(error){unavailable.push({source:sheet.href,reason:String(error)})}}
        const inline=Array.from(element.style).map((property,index)=>({property,value:element.style.getPropertyValue(property),important:element.style.getPropertyPriority(property)==='important',declarationOrder:index}))
        if(inline.length)rules.push({selector:'style attribute',source:'inline attribute',order:++order,context:[],inline:true,declarations:inline})
        return {tag:element.tagName,id:element.id,className:element.className,text:element.textContent?.trim().slice(0,160),computed,box:{x:box.x,y:box.y,width:box.width,height:box.height},rules,unavailable,groups,activeAnimations:element.getAnimations().map(animation=>({state:animation.playState,type:animation.constructor.name})),animation:{name:style.animationName,duration:style.animationDuration,transition:style.transitionProperty},matchedSelectors:rules.flatMap(rule=>{if(rule.inline)return [];try{return Array.from(document.querySelectorAll(rule.selector)).includes(element)?[rule.selector]:[]}catch{return[]}})}
      },properties)
      // Split top-level selector lists with the parser, then let the browser decide which branches match.
      for(const rule of snapshot.rules) {
        rule.matchingSelectors=rule.inline?[]:await page.$eval(selector,(element,list)=>list.filter(item=>{try{return element.matches(item)}catch{return false}}),selectorParser().astSync(rule.selector).nodes.map(node=>node.toString()))
        rule.specificity=rule.inline?[0,0,0]:maximum(rule.matchingSelectors.map(specificity))
      }
      const diagnostics={}
      const shorthandPrefixes={'font':['font-family','font-size','font-weight','font-style','line-height'],'background':['background-color'],'border':['border-top-width','border-top-color','border-radius'],'padding':['padding-top','padding-right','padding-bottom','padding-left'],'margin':['margin-top','margin-bottom'],'overflow':['overflow-x'],'padding-inline':['padding-left','padding-right'],'padding-block':['padding-top','padding-bottom'],'padding-inline-start':['padding-left','padding-right'],'padding-inline-end':['padding-left','padding-right'],'margin-block':['margin-top','margin-bottom'],'margin-block-start':['margin-top','margin-bottom'],'margin-block-end':['margin-top','margin-bottom'],'inline-size':['width'],'max-inline-size':['max-width'],'block-size':['height'],'min-block-size':['min-height'],'border-top':['border-top-width','border-top-color'],'border-width':['border-top-width'],'border-color':['border-top-color'],'row-gap':['gap'],'column-gap':['gap']}
      for(const property of properties) {
        const candidates=snapshot.rules.flatMap(rule=>rule.declarations.filter(d=>d.property===property||d.property==='all'||(shorthandPrefixes[d.property]??[]).includes(property)).map(d=>({...d,selector:rule.selector,matchingSelectors:rule.matchingSelectors,source:rule.source,order:rule.order,context:rule.context,specificity:rule.specificity,inline:!!rule.inline,shorthand:d.property!==property}))).sort((a,b)=>rank(b,a))
        const reasons=[]
        if(snapshot.unavailable.length)reasons.push('Some stylesheet rules could not be inspected')
        if(candidates.some(c=>c.context.some(context=>!['media','supports'].includes(context.kind))))reasons.push('Cascade layer/scope/container group requires browser-specific resolution')
        if((matched.matchedCSSRules??[]).some(entry=>entry.rule.origin!=='regular'&&entry.rule.style.cssProperties.some(decl=>decl.important&&decl.name===property)))reasons.push('Non-author important declaration requires origin resolution')
        if(candidates.some(c=>/:host|::slotted|&/.test(c.selector)))reasons.push('Shadow DOM/nesting specificity requires context')
        if(candidates.some(c=>c.shorthand))reasons.push('Shorthand contribution not fully resolved')
        if(snapshot.activeAnimations.length||snapshot.animation.name!=='none')reasons.push('Active animation/transition may affect computed value')
        if(candidates[0]&&/^(inherit|unset|revert|revert-layer)$/i.test(candidates[0].value.trim()))reasons.push('Inheritance/revert requires origin/ancestor resolution')
        if(!candidates.length)reasons.push('No direct inspectable author declaration; inherited/user-agent value')
        diagnostics[property]={computed:snapshot.computed[property],resolution:reasons.length?'unresolved':'ranked-author-cascade',reasons,winningDeclaredRule:reasons.length?null:candidates[0],candidates}
      }
      const activeProperties=new Map();let duplicateDeclarations=0,importantDeclarations=0
      for(const rule of snapshot.rules)for(const decl of rule.declarations){if(decl.important)importantDeclarations++;const key=decl.property;activeProperties.set(key,(activeProperties.get(key)??0)+1)}
      for(const count of activeProperties.values())duplicateDeclarations+=Math.max(0,count-1)
      viewport.elements[name]={selector,...snapshot,diagnostics,statistics:{matchedRules:snapshot.rules.length,importantDeclarations,duplicateDeclarations},cdp:{computed:computed.computedStyle,matchedCSSRules:matched.matchedCSSRules,inherited:matched.inherited,inlineStyle:matched.inlineStyle,attributesStyle:matched.attributesStyle}}
    }
    viewport.protected=await page.evaluate((selector,properties)=>[...document.querySelectorAll(selector)].map((root,index)=>{
      const take=element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return {tag:element.tagName,id:element.id,className:element.className,style:Object.fromEntries(properties.map(key=>[key,style.getPropertyValue(key)])),box:{width:box.width,height:box.height}}}
      const ancestors=[];for(let parent=root.parentElement;parent;parent=parent.parentElement)ancestors.push(take(parent))
      return {index,root:take(root),ancestors,tree:[root,...root.querySelectorAll('*')].filter(element=>!['SCRIPT','STYLE'].includes(element.tagName)).map(take)}
    }),protectedSelector,properties)
    viewport.stylesheets=[...sheets.values()].map(header=>({id:header.styleSheetId,url:header.sourceURL,sourceMapURL:header.sourceMapURL??null,origin:header.origin,startLine:header.startLine,startColumn:header.startColumn}))
    if(viewport.stylesheets.every(sheet=>!sheet.sourceMapURL))viewport.sourceMapLimitation='Loaded production CSS does not expose source maps. Original source inventory and generated stylesheet URLs/CDP source ranges are retained; no guessed original-source winner attribution.'
    await page.screenshot({path:resolve(out,`landing-${width}.png`),fullPage:true})
    writeFileSync(resolve(out,`cascade-${width}.json`),JSON.stringify(viewport,null,2));report.viewports.push({width,file:`cascade-${width}.json`,screenshot:`landing-${width}.png`,missing:Object.entries(viewport.elements).filter(([,v])=>v.missing).map(([name])=>name),errors,overflow:viewport.overflow,statistics:Object.fromEntries(Object.entries(viewport.elements).filter(([,v])=>!v.missing).map(([name,value])=>[name,value.statistics]))})
    await session.detach();await page.close();console.log(`Captured ${phase} ${width}px cascade and protected inheritance`)
  }
  writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2))
  assert.ok(report.viewports.every(view=>view.missing.length===0),'Required landing target missing; inspect artifacts')
  assert.ok(report.viewports.every(view=>view.errors.length===0),'Landing runtime errors; inspect artifacts')
  console.log(`PASS captured read-only cascade audit: ${out}`)
} catch(error) {
  report.error=error.stack??String(error);writeFileSync(resolve(out,'report.json'),JSON.stringify(report,null,2));throw error
} finally {if(browser)await browser.close();if(server)await new Promise(r=>server.close(r))}
