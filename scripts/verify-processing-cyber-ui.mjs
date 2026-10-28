/** Real shared processing components, isolated synthetic state; no API/account calls. */
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import puppeteer from 'puppeteer-core'
const root=process.cwd(),require=createRequire(import.meta.url),dir=mkdtempSync(join(tmpdir(),'processing-cyber-'))
const output=root+'/artifacts/processing-cyber';mkdirSync(output,{recursive:true})
let server,browser
try {
 writeFileSync(dir+'/entry.jsx',`import React,{useState}from'react';import{createRoot}from'react-dom/client';import{ProcessingOrbit,ProcessingSteps,ProcessingInline}from${JSON.stringify(root+'/components/ui/Processing.tsx')};import{OptimizationProgress}from${JSON.stringify(root+'/components/optimizer/OptimizationProgress.tsx')};const labels=['Reading the target job description','Checking the responsibilities and skills you confirmed for this application','Opening the result'];const notes=['Keep your actual experience at the centre.','A much longer quotation tests the reserved note area so the rotating visual stays in exactly the same place while text wraps over several lines on a small phone.'];function Fixture(){const[done,setDone]=useState([]),[phase,setPhase]=useState('analysis');window.confirmStage=()=>{setDone([0]);setPhase('build')};window.finish=()=>{setDone([0,1,2]);setPhase('opening')};return <main style={{maxWidth:460,margin:'0 auto',padding:16}}><div id="workflow" style={{display:'flex',flexDirection:'column',alignItems:'center',gap:20}}><ProcessingOrbit size={160}/><ProcessingSteps tone="dark" steps={labels} stepMs={80} notes={notes}/></div><div id="verified" style={{marginTop:24}}><ProcessingSteps tone="dark" steps={labels} completedIndices={done}/></div><div id="inline" style={{marginTop:24}}><ProcessingInline steps={labels} notes={notes} stepMs={80}/></div><div id="optimizer" style={{marginTop:24}}><OptimizationProgress phase={phase} analysisReady={true} steps={labels}/></div></main>}createRoot(document.getElementById('root')).render(<Fixture/>);`)
 writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
 const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
 await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.jsx',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.jsx'],alias:{'@':root},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
 writeFileSync(dir+'/input.css','@tailwind base;@tailwind components;@tailwind utilities;')
 const compiled=spawnSync(process.execPath,[require.resolve('tailwindcss/lib/cli.js'),'-i',dir+'/input.css','-o',dir+'/extra.css','--content','components/ui/Processing.tsx,components/optimizer/OptimizationProgress.tsx'],{cwd:root,encoding:'utf8'})
 assert.equal(compiled.status,0,compiled.stderr)
 const landing=readFileSync('.next/server/app/index.html','utf8'),fontClass=/<body class="([^"]+)"/.exec(landing)?.[1]||''
 const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(h=>`<link rel="stylesheet" href="${h}">`).join('')
 server=createServer((req,res)=>{
  const p=new URL(req.url,'http://fixture').pathname
  if(p==='/fixture.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(readFileSync(dir+'/fixture.js'))}
  if(p==='/extra.css'){res.setHeader('Content-Type','text/css');return res.end(readFileSync(dir+'/extra.css'))}
  if(p.startsWith('/_next/')){try{res.setHeader('Content-Type',p.endsWith('.css')?'text/css':'font/woff2');return res.end(readFileSync(root+'/.next/'+p.slice(7)))}catch{res.statusCode=404;return res.end()}}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}<link rel="stylesheet" href="/extra.css"></head><body class="${fontClass}" style="background:#08182f"><div class="app-shell" id="root"></div><script src="/fixture.js"></script></body></html>`)
 });await new Promise(r=>server.listen(0,'127.0.0.1',r))
 const chromium=(await import('@sparticuz/chromium')).default
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||await chromium.executablePath(),headless:true,pipe:true,args:chromium.args})
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 const boxes=()=>page.evaluate(()=>Object.fromEntries(['#workflow [data-processing-orbit]','#workflow [data-processing-steps]','#workflow [data-processing-notes]','#inline [data-processing-orbit]','#inline [data-processing-steps]','#optimizer'].map(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return[sel,{x:r.x,y:r.y,width:r.width,height:r.height}]})))
 for(const width of [320,1440]){
  await page.setViewport({width,height:1000});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForSelector('[data-processing-steps]')
  await page.evaluate(()=>document.fonts.ready)
  const initial=await boxes()
  await new Promise(r=>setTimeout(r,5700))
  const later=await boxes()
  assert.deepEqual(later,initial,'Orbit/step/quotation geometry stays stable after stage focus and quote rotation')
  assert.equal(await page.$$eval('#workflow [data-processing-state="done"]',es=>es.length),0,'Timers never claim completed work')
  assert.equal(await page.$$eval('#inline [data-processing-state="done"]',es=>es.length),0)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No phone overflow')
  await page.evaluate(()=>window.confirmStage())
  await page.waitForSelector('#verified [data-processing-state="done"]')
  assert.equal(await page.$$eval('#verified [data-processing-state="done"]',es=>es.length),1)
  assert.equal(await page.$eval('#verified [data-processing-state="done"] > span',e=>getComputedStyle(e).backgroundColor),'rgb(74, 222, 128)','Confirmed completion uses the semantic green status colour')
  assert.equal(await page.$$eval('#optimizer [data-processing-state="done"]',es=>es.length),1,'Real optimizer phase produces confirmed green tick')
  assert.deepEqual(await page.$eval('#workflow [data-processing-orbit]',e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}}),initial['#workflow [data-processing-orbit]'])
  await page.screenshot({path:output+`/processing-${width}.png`,fullPage:true})
  await page.evaluate(()=>window.finish())
  await page.waitForFunction(()=>document.querySelectorAll('#verified [data-processing-state="done"]').length===3)
 }
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}])
 assert.ok(await page.$$eval('[data-processing-orbit] [class*="animate-"]',els=>els.every(e=>getComputedStyle(e).animationName==='none'||getComputedStyle(e).display==='none')),'Reduced motion stops decorative animation')
 assert.deepEqual(errors,[])
 console.log('Processing cyber UI passed: 320/1440 stable geometry across quotes/stages, no timer-completion claims, real completion ticks, no overflow, reduced motion.')
}finally{await browser?.close();await new Promise(r=>server?server.close(r):r());rmSync(dir,{recursive:true,force:true})}
