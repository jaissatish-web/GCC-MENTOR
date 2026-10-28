/** Actual setup component with fictional API responses; no account/provider calls. */
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),require=createRequire(import.meta.url),dir=mkdtempSync(join(tmpdir(),'optimizer-setup-'))
let server,browser,submitted,failCheck=false
const errors=[]
const pkg=JSON.parse(readFileSync(root+'/scripts/fixtures/studioFixture.json','utf8')).pkg
const owner=pkg.document_snapshot.experience[0].entry.id
const confirmedText='Prepared handover documentation for operations.'
pkg.document_snapshot.experience[0].bullets.push(confirmedText)
pkg.match_report={report_version:1,before:{total:55},after:{total:80},auto_applied:true,target:{job_title:'Project Engineer',title_variants:[],keywords:[]},suggestions:[{id:'confirmed-1',block:owner,requirement:'handover documentation',text:confirmedText,status:'confirmed'},{id:'pending-1',block:owner,requirement:'planning',text:'Coordinated planning with operations.',status:'pending'}]}
let savedPreview=null
try {
 writeFileSync(dir+'/entry.jsx',`import React from'react';import{createRoot}from'react-dom/client';import Setup from${JSON.stringify(root+'/app/optimize/setup/page.tsx')};import Preview from${JSON.stringify(root+'/app/optimize/preview/[packageId]/page.tsx')};const params=Promise.resolve({packageId:'preview-fixture'});createRoot(document.getElementById('root')).render(location.pathname.includes('/preview/')?<React.Suspense><Preview params={params}/></React.Suspense>:<Setup/>);`)
 writeFileSync(dir+'/navigation.js',`const router={push:u=>history.pushState(null,'',u),replace:u=>history.replaceState(null,'',u)};export function useRouter(){return router}`)
 writeFileSync(dir+'/link.js',`import React from'react';export default function Link({prefetch,...props}){return React.createElement('a',props)}`)
 writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
 const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
 await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.jsx',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.jsx'],alias:{'@':root,'next/navigation':dir+'/navigation.js','next/link':dir+'/link.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
 const landing=readFileSync('.next/server/app/index.html','utf8'),fontClass=/<body class="([^"]+)"/.exec(landing)?.[1]||''
 const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(h=>`<link rel="stylesheet" href="${h}">`).join('')
 server=createServer(async(req,res)=>{
 const p=new URL(req.url,'http://fixture').pathname
 const send=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data))}
 if(p==='/api/packages/preview-fixture'){if(req.method==='PATCH'){let raw='';for await(const c of req)raw+=c;savedPreview=JSON.parse(raw);return send({success:true})}return send({package:pkg})}
 if(p==='/api/profile')return send({id:'profile-1',work_experience:[{id:'role-1',company:'Fictional Energy',role:'Engineer',highlights:['Maintained controls']}]})
 if(p==='/api/optimize/check')return failCheck?send({error:'Failed'},503):send({check:{mode:'job_description',fieldMatch:'same',candidateField:'Instrumentation',jobField:'Instrumentation',before:55,expected:{easy:65,moderate:80,high:90},recommendedLevel:'moderate',askCertifications:[],askSkills:[],dutySuggestions:[{id:'duty-1',term:'handover documentation',block:'role-1',quote:'Maintained controls',importance:'must',levels:['moderate','high']},{id:'duty-2',term:'team coordination',block:'role-1',quote:'Maintained controls',importance:'nice',levels:['high']}]},consented:true})
 if(p==='/api/optimize'){let raw='';for await(const c of req)raw+=c;submitted=JSON.parse(raw);return send({success:true,packageId:'fixture-package'})}
 if(p==='/fixture.js'){res.setHeader('Content-Type','text/javascript');return res.end(readFileSync(dir+'/fixture.js'))}
 if(p.startsWith('/_next/')){try{res.setHeader('Content-Type',p.endsWith('.css')?'text/css':'font/woff2');return res.end(readFileSync(root+'/.next/'+p.slice(7)))}catch{res.statusCode=404;return res.end()}}
 res.setHeader('Content-Type','text/html');res.end(`<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}</head><body class="${fontClass}"><div class="app-shell"><div id="root"></div></div><script>sessionStorage.setItem('optimization_target_draft',JSON.stringify({target_job_title:'Instrument Engineer',job_description:'Control maintenance and handover documentation',target_industry:'Energy'}))</script><script src="/fixture.js"></script></body></html>`)
 })
 await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const chrome=process.env.CHROME_PATH||await (await import('@sparticuz/chromium')).default.executablePath()
 browser=await puppeteer.launch({executablePath:chrome,headless:true,pipe:true,args:(await import('@sparticuz/chromium')).default.args})
 const page=await browser.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Fixture page error:',e.message)})
 const load=async()=>{await page.goto(`http://127.0.0.1:${server.address().port}/optimize/setup`);await page.waitForFunction(()=>document.querySelector('[role="radio"]:not(:disabled)'))}
 const clickText=async(selector,text)=>page.evaluate((selector,text)=>{const e=[...document.querySelectorAll(selector)].find(e=>e.textContent.includes(text));if(!e)throw Error('Missing '+text);e.click()},selector,text)
 for(const width of [390,1440]){
 await page.setViewport({width,height:950});await load()
 await clickText('[role="radio"]','Moderate')
 assert.equal(await page.$$eval('input[type="checkbox"]',es=>es.filter(e=>e.checked).length),0)
 assert.ok(await page.$('details[open]'))
 assert.ok(await page.evaluate(()=>document.body.innerText.includes('Required by this role')&&document.body.innerText.includes('Why this matters:')&&document.body.innerText.includes('Add under: Engineer')))

 assert.ok(await page.evaluate(()=>document.body.innerText.includes('Aim: about +25')))
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.click('input[type="checkbox"]')
 await clickText('[role="checkbox"]','Engineer')
 assert.equal(await page.$('input[type="checkbox"]'),null,'Deselected role hides its duties')
 await clickText('[role="checkbox"]','Engineer')
 await page.waitForSelector('input[type="checkbox"]')
 await page.click('input[type="checkbox"]') // deselect retained choice
 await clickText('[role="radio"]','Hard')
 assert.equal(await page.$$eval('input[type="checkbox"]',es=>es.length),2)
 await clickText('[role="radio"]','Easy')
 assert.equal(await page.$('input[type="checkbox"]'),null,'Easy has no additions')
 await clickText('[role="radio"]','Moderate')
 await page.click('input[type="checkbox"]')
 await clickText('[role="checkbox"]','Skills')
 await clickText('button','Optimize Resume for This Job')
 await page.waitForFunction(()=>location.pathname.includes('/generate/'))
 assert.deepEqual(submitted.selectedBlocks,{summary:true,experienceIds:['role-1'],skills:false,confirmedRequirements:['duty-1']})
 }
 failCheck=true;await page.goto(`http://127.0.0.1:${server.address().port}/optimize/setup`)
 await page.waitForFunction(()=>document.body.innerText.includes('Retry ATS check'))
 assert.equal(await page.$eval('[role="radio"]',e=>e.matches(':disabled')),true)
 failCheck=false;await clickText('button','Retry ATS check');await page.waitForFunction(()=>!document.querySelector('[role="radio"]').matches(':disabled'))
 for(const width of [390,1440]){
 await page.setViewport({width,height:950})
 await page.goto(`http://127.0.0.1:${server.address().port}/optimize/preview/preview-fixture`)
 await page.waitForFunction(()=>document.body.innerText.includes('New duty — confirmed by you'),{timeout:5000}).catch(async e=>{console.error('Preview body:',await page.evaluate(()=>document.body.innerText));throw e})
 assert.ok(await page.evaluate(()=>document.body.innerText.includes('New suggestion — not included')&&document.body.innerText.includes('Rewritten from your profile')))
 await clickText('summary','View original summary')
 assert.ok(await page.evaluate(()=>document.body.innerText.includes('Instrumentation and control engineer with fourteen years')))
 await clickText('summary','View original responsibilities')
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
 await page.click('[role="button"]')
 await page.waitForSelector('textarea')
 await page.focus('textarea');await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.type('Candidate edited summary using their own words.')
 await clickText('button','Done')
 assert.ok(await page.evaluate(()=>document.body.innerText.includes('Edited by you')))
 await clickText('button','Remove')
 assert.ok(!await page.evaluate(text=>document.body.innerText.includes(text),confirmedText))
 await clickText('button','Save')
 await page.waitForFunction(()=>location.pathname.includes('/package/'))
 assert.ok(savedPreview.suggestion_actions.some(a=>a.id==='confirmed-1'&&a.action==='dismiss'))
 assert.ok(!savedPreview.document.experience[0].bullets.includes(confirmedText))
 assert.equal(savedPreview.document.summary,'Candidate edited summary using their own words.')
 }
 assert.deepEqual(errors,[])
 console.log('Optimizer setup UI: mobile/desktop section and duty choices, exact payload, Easy exclusion, failed-check retry, original comparisons, provenance labels and confirmed-duty remove/save passed.')
} finally {await browser?.close();await new Promise(r=>server?server.close(r):r());rmSync(dir,{recursive:true,force:true})}
