/** Isolated real-component QA. No auth bypass route, credentials or production writes.
 * Requires a completed next build. Uses actual DesignSettings in a local-only bundle.
 */
import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,extname} from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import puppeteer from 'puppeteer-core'
const require=createRequire(import.meta.url)
require('sucrase/register')
const {DEFAULT_THEME}=require('../lib/design-system/theme.ts')
const root=process.cwd(),out=resolve('artifacts/recovery-079');mkdirSync(out,{recursive:true})
writeFileSync(out+'/entry.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {DesignSettings} from '${root}/app/admin/design-system/DesignSettings';createRoot(document.getElementById('root')!).render(<DesignSettings/>);`)
writeFileSync(out+'/loader.cjs',`const {transform}=require(${JSON.stringify(require.resolve('sucrase'))});module.exports=function(s){return transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true,filePath:this.resourcePath}).code}`)
// Admin fixture CSS is isolated from landing iframe; source classes retained.
writeFileSync(out+'/css.cjs',`module.exports=function(s){const names=Object.fromEntries([...s.matchAll(/\\.([a-zA-Z_][\\w-]*)/g)].map(m=>[m[1],m[1]]));return 'const style=document.createElement("style");style.textContent='+JSON.stringify(s)+';document.head.append(style);export default '+JSON.stringify(names)}`)
const wp=require('next/dist/compiled/webpack/webpack');wp.init()
await new Promise((res,rej)=>wp.webpack({mode:'development',devtool:false,entry:out+'/entry.tsx',output:{path:out,filename:'admin.js'},resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root}},module:{rules:[{test:/\.tsx?$/,use:out+'/loader.cjs'},{test:/\.css$/,use:out+'/css.cjs'}]}},(e,s)=>e||s.hasErrors()?rej(e||new Error(s.toString({all:false,errors:true}))):res()))
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}
const server=createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');let file
 if(u.pathname==='/__qa_admin'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><div id="root"></div><script src="/__qa_admin.js"></script>');return}
 if(u.pathname==='/__qa_admin.js')file=out+'/admin.js'
 else if(u.pathname.startsWith('/api/')){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.method==='GET'?{user:null,profile:null,packages:[],summary:null}:{error:'Read only fixture'}));return}
 else {const p=u.pathname==='/_next/image'?u.searchParams.get('url'):u.pathname;file=resolve(root,p==='/'?'.next/server/app/index.html':p.startsWith('/_next/static/')?'.next/'+p.slice(7):'public'+p)}
 if(!file?.startsWith(root+'/')||!existsSync(file)){res.statusCode=404;res.end();return}
 res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(readFileSync(file))
})
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`
let browser;const report={fixture:'Actual DesignSettings client component; authenticated server gate not exercised',results:[],errors:[]}
const hash=b=>createHash('sha256').update(b).digest('hex')
async function measured(frame){return frame.evaluate(()=>{
 const selectors={hero:'#hero-title',heading:'#services-title',paragraph:'[data-uds=hero] p',nav:'header nav a',primary:'[data-uds=hero] [data-uds=button-primary]',secondary:'[data-uds=hero] [data-uds=button-secondary]',card:'[data-uds=card]',section:'[data-uds=section]',globe:'#markets-title',globeCard:'[data-uds=globe-card]',interview:'[data-uds=website-widget] select'}
 const props=['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','borderColor','borderRadius','boxShadow','padding','margin','gap']
 return Object.fromEntries(Object.entries(selectors).map(([k,q])=>{const e=document.querySelector(q);return[k,e?Object.fromEntries(props.map(p=>[p,getComputedStyle(e)[p]])):null]}))
})}
try{
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
 const page=await browser.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setRequestInterception(true);page.on('request',r=>r.url().startsWith(origin)||r.url().startsWith('data:')?r.continue():r.abort())
 for(const width of [360,390,430,768,1024,1440]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});await page.goto(origin,{waitUntil:'networkidle0'});await page.waitForSelector('#hero-title');await page.$eval('#markets',e=>e.scrollIntoView());await page.waitForSelector('#markets-title');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/default-${width}.png`,fullPage:true});report.results.push({kind:'default',width,styles:await measured(page),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)})
 }
 for(const width of [390,1440]){
  await page.setViewport({width:2200,height:1000});await page.goto(origin+'/__qa_admin',{waitUntil:'networkidle0'});await page.waitForSelector('iframe');const device=width===390?'Mobile':'Desktop';await page.$$eval('button',(es,t)=>es.find(e=>e.textContent===t).click(),device);let frame=await (await page.$('iframe')).contentFrame();await frame.waitForSelector('#hero-title');await frame.$eval('#markets',e=>e.scrollIntoView());await frame.waitForSelector('#markets-title');await frame.evaluate(()=>scrollTo(0,0));
  const change=async(name,act,check)=>{
   console.log('Checking',width,name)
   await page.$$eval('button',es=>es.find(e=>e.textContent==='Reset to default').click());await frame.waitForFunction(()=>getComputedStyle(document.querySelector('[data-uds=button-primary]')).backgroundColor==='rgb(0, 127, 120)');
   await frame.$eval('[data-uds=visual]',e=>e.scrollIntoView({behavior:'instant'}))
   await frame.waitForFunction(()=>document.querySelectorAll('.actual-template-orbit-face').length>=3)
   await frame.evaluate(n=>{const top=n==='radius28'||n==='spacing-plus24'?document.querySelector('#services').getBoundingClientRect().top+scrollY:0;scrollTo({top,behavior:'instant'})},name)
   await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
   const before=await measured(frame),shot=await page.$('iframe');const beforeBytes=await shot.screenshot({path:`${out}/${width}-${name}-before.png`});await act();await frame.waitForFunction(check);const after=await measured(frame);const afterBytes=await shot.screenshot({path:`${out}/${width}-${name}-after.png`});assert.notEqual(hash(beforeBytes),hash(afterBytes),'Visible pixels must change');
   await page.$$eval('button',es=>es.find(e=>e.textContent.startsWith('Save browser draft')).click());await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('iframe');await page.$$eval('button',(es,t)=>es.find(e=>e.textContent===t).click(),device);frame=await (await page.$('iframe')).contentFrame();await frame.waitForSelector('#hero-title');await frame.waitForFunction(check);report.results.push({kind:'independent-setting',width,name,before,after,visiblePixelsChanged:true,savedDraftRefresh:true})
  }
  const input=async(label,value)=>{const el=await page.$(`xpath/.//label[span[normalize-space(.)='${label}']]//input`);assert.ok(el,`Missing ${label}`);await el.evaluate((e,v)=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;setter.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))},value)}
  await change('brand-purple',()=>input('Primary teal','#AA00FF'),()=>getComputedStyle(document.querySelector('[data-uds=button-primary]')).backgroundColor==='rgb(170, 0, 255)')
  await change('georgia',async()=>{await page.select('label select:not(#theme-preset)','georgia')},()=>getComputedStyle(document.querySelector('#hero-title')).fontFamily.startsWith('Georgia'))
  const size=DEFAULT_THEME[width===390?'mobile':'desktop'].heroSize+12
  await change('hero-plus12',()=>input('Landing hero px',String(size)),`getComputedStyle(document.querySelector('#hero-title')).fontSize==='${size}px'`)
  await change('radius28',()=>input('Card radius px','28'),()=>getComputedStyle(document.querySelector('[data-uds=card]')).borderRadius==='28px')
  const gap=DEFAULT_THEME[width===390?'mobile':'desktop'].landingGap+24
  await change('spacing-plus24',()=>input('Landing section spacing px',String(gap)),`getComputedStyle(document.querySelector('[data-uds=section]')).paddingTop==='${gap}px'`)
  await change('button-orange',async()=>{await page.locator('input[type=checkbox]').click();await input('Button background','#FF8800')},()=>getComputedStyle(document.querySelector('[data-uds=button-primary]')).backgroundColor==='rgb(255, 136, 0)')
 }
 assert.deepEqual(report.errors,[]);assert.ok(report.results.filter(r=>r.kind==='default').every(r=>!r.overflow));console.log('PASS: 12 independent settings via real admin component, visible pixel differences, save/reload; six widths')
}catch(e){report.failure=e.stack;throw e}finally{writeFileSync(out+'/results.json',JSON.stringify(report,null,2));await browser?.close();server.close()}
