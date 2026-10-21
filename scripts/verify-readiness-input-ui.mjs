/** Real React form -> real multipart API -> actual PDF/DOCX parsing -> readiness result.
 * The usage limiter, service switch and AI provider are isolated; actual document parsers run.
 * Run after build: CHROME_PATH=/path/to/chromium npm run test:readiness-input
 */
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {createServer} from 'node:http'
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {resolve,join} from 'node:path'
import {Document,Packer,Paragraph} from 'docx'
import puppeteer from 'puppeteer-core'
const root=resolve('.'),dir=mkdtempSync(join(tmpdir(),'gcc-readiness-')),require=createRequire(root+'/package.json')
require('sucrase/register');require('./scripts/resolve-paths')
const limiter=require.resolve('./lib/anonymousRateLimit');require.cache[limiter]={id:limiter,filename:limiter,loaded:true,exports:{getClientIdentityHash:()=> 'isolated-test',getAnonymousRateLimitStatus:async()=>({allowed:true}),incrementAnonymousRateLimit:async()=>{},LIMIT_ACTION_ANON_ATS_SCAN:'ats_scan'}}
function stub(path,exports){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports}}
stub('./lib/ai/serviceGuard',{isServicePaused:async()=>({paused:false})})
stub('./lib/ai/provider',{generate:async()=>({text:JSON.stringify({full_name:'Demo Candidate',email:'demo@example.com',phone:'+919000000000',current_location:'India',date_of_birth:'1990-01-01',notice_period:'30 days',work_experience:[{role:'Instrumentation Engineer',company:'Example Engineering',start_date:'2020-01-01',responsibilities:'Delivered commissioning and calibration'}],education:[{degree:'BTech'}],skills:['Calibration'],certifications:[],additional_information:[]}),inputTokens:10,outputTokens:20,truncated:false})})
const {POST}=require('./app/api/career-intake/route'),{NextRequest}=require('next/server')
const resume='Demo Candidate\nInstrumentation Commissioning Engineer\nEmail: demo@example.com | Phone: +91 90000 00000\nLocation: India | Nationality: Indian\nSummary: Engineer with 10 years of oil and gas commissioning experience.\nExperience: Senior Instrument Engineer, Example Engineering, 2020 - Present.\nDelivered loop checking, calibration, FAT, SAT, DCS and PLC commissioning.\nInstrument Engineer, Example Services, 2016 - 2020.\nEducation: BTech Electronics and Communication Engineering, 2015.\nCertifications: Industrial Automation. Skills: SIS, Modbus, HART.\nLanguages: English and Hindi. Available in 30 days.'
function makePdf(text){const stream='BT /F1 10 Tf 40 790 Td 18 TL '+text.split('\n').map((l,i)=>(i?'T* ':'')+'('+l.replace(/[\\()]/g,'\\$&')+') Tj').join('\n')+' ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];let out='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}const start=Buffer.byteLength(out);out+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return Buffer.from(out)}
writeFileSync(dir+'/resume.pdf',makePdf(resume));writeFileSync(dir+'/resume.docx',await Packer.toBuffer(new Document({sections:[{children:resume.split('\n').map(text=>new Paragraph(text))}]})));writeFileSync(dir+'/bad.pdf','This is not a PDF file.');writeFileSync(dir+'/wrong.txt',resume);writeFileSync(dir+'/large.pdf',Buffer.alloc(4*1024*1024+1))
writeFileSync(dir+'/entry.mjs',`import React from 'react';import {createRoot} from 'react-dom/client';import Page from ${JSON.stringify(root+'/app/gulf-readiness-score/page.tsx')};createRoot(document.getElementById('root')).render(React.createElement(Page));`)
writeFileSync(dir+'/link.js',`import React from 'react';export default function Link({prefetch,...p}){return React.createElement('a',p)}`)
writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.mjs',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.mjs'],alias:{'@':root,'next/link':dir+'/link.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
const landing=readFileSync('.next/server/app/index.html','utf8'),bodyClass=landing.match(/<body class="([^"]+)"/)[1]
const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^\"]+\.css)"/g)].map(m=>m[1]))].map(p=>readFileSync(p.replace('/_next/','.next/'),'utf8')).join('\n')
const observations=[],errors=[];let failNext=false
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost')
 if(u.pathname==='/api/career-intake'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk)
  const request=new NextRequest('http://localhost/api/career-intake',{method:'POST',headers:req.headers,body:Buffer.concat(chunks)})
  const form=await request.clone().formData();const selected=form.get('file');observations.push({file:selected?.name??null,text:form.get('resume_text')})
  const reply=failNext?new Response(JSON.stringify({error:'Temporary test failure. Please retry.'}),{status:503,headers:{'content-type':'application/json'}}):await POST(request);failNext=false
  const body=await reply.text();res.writeHead(reply.status,Object.fromEntries(reply.headers));res.end(body);return
 }
 if(u.pathname==='/fixture.js'){res.writeHead(200,{'Content-Type':'application/javascript'});res.end(readFileSync(dir+'/fixture.js'));return}
 if(u.pathname.startsWith('/_next/static/media/')){res.writeHead(200,{'Content-Type':'font/woff2'});res.end(readFileSync(root+u.pathname.replace('/_next/','/.next/')));return}
 res.writeHead(200,{'Content-Type':'text/html'});res.end(`<html><head><meta charset="utf-8"><style>${css}</style></head><body class="${bodyClass}"><div id="root"></div><script src="/fixture.js"></script></body></html>`)
 }catch(e){errors.push(e.message);res.writeHead(500);res.end(JSON.stringify({error:e.message}))}})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message))
 const click=text=>page.$$eval('button',(buttons,label)=>buttons.find(e=>e.textContent.trim()===label).click(),text)
 const start=async()=>{await page.goto(origin,{waitUntil:'networkidle0'});await page.evaluate(()=>sessionStorage.clear());await page.reload({waitUntil:'networkidle0'});await page.waitForSelector('#resume-upload')}
 const questions=async(gulf=false)=>{
  await click('Continue');await page.waitForSelector('#intake-location')
  await page.$$eval('fieldset',(fields,value)=>fields.forEach(f=>[...f.querySelectorAll('button')].find(b=>b.textContent===(value?'Yes':'No')).click()),gulf)
  await click('Continue');await page.waitForSelector('#intake-country');await page.select('#intake-country','generic_gulf');await page.select('#intake-passport','not_available')
  await click('See my two readiness results')
 }
 const result=async()=>{await page.waitForFunction(()=>document.body.textContent.includes('Edit my preparation answers'));const handoff=await page.evaluate(()=>Object.keys(sessionStorage).map(k=>{try{return JSON.parse(sessionStorage.getItem(k))}catch{return null}}).find(x=>x?.result&&x?.resumeText));assert.ok(handoff.resumeText.includes('commissioning'));assert.equal(typeof handoff.result.finalScore,'number');return handoff.result.finalScore}
 const upload=async name=>{const input=await page.$('input[type=file]');await input.uploadFile(dir+'/'+name)}
 mkdirSync('artifacts/readiness-input',{recursive:true})
 for(const width of [320,390,768,1440]){
  await page.setViewport({width,height:844});await start()
  await click('Continue');assert.ok(await page.$eval('#resume-input-error',e=>e.textContent.includes('Choose a PDF')))
  await click('Paste text');assert.equal(await page.$('#resume-upload'),null)
  await page.type('textarea','Short');await click('Continue');assert.ok(await page.$eval('#resume-input-error',e=>e.textContent.includes('50 characters')))
  await page.$eval('textarea',e=>{e.value='';e.dispatchEvent(new Event('input',{bubbles:true}))})
  await page.click('textarea',{clickCount:3});await page.type('textarea',resume)
  assert.equal(await page.$eval('textarea',e=>e.value),resume,'Typing retains focus and all characters')
  assert.ok(await page.$eval('textarea',e=>e.getBoundingClientRect().height<=320),'Long pasted resumes stay in a scrollable input')
  await click('Upload resume');assert.equal(await page.$('textarea'),null);await upload('resume.pdf')
  await click('Paste text');assert.equal(await page.$eval('textarea',e=>e.value),resume,'Both drafts survive switching')
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Paste overflow at ${width}`)
  if(width===390)await page.screenshot({path:'artifacts/readiness-input/paste-390.png',fullPage:true})
  await questions();await result();assert.equal(observations.at(-1).file,null);assert.equal(observations.at(-1).text.replace(/\r\n/g,'\n'),resume,'Paste ignores inactive selected file')
  for(const name of ['resume.pdf','resume.docx']){
   await start();await upload(name);assert.equal(await page.$('textarea'),null)
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Upload overflow at ${width}`)
   if(width===390)await page.screenshot({path:`artifacts/readiness-input/${name.endsWith('pdf')?'pdf':'docx'}-390.png`,fullPage:true})
   await questions(name.endsWith('pdf'));const score=await result();assert.equal(observations.at(-1).file,name);assert.equal(observations.at(-1).text,null);console.log(`PASS ${width}px ${name}: actual extraction and score ${score}`)
  }
 }
 await start();await upload('wrong.txt');assert.ok(await page.$eval('#resume-input-error',e=>e.textContent.includes('Choose a PDF')))
 await upload('large.pdf');assert.ok(await page.$eval('#resume-input-error',e=>e.textContent.includes('4MB')))
 await upload('bad.pdf');await click('Continue');await page.waitForSelector('#resume-input-error');assert.ok(await page.$eval('#resume-input-error',e=>e.textContent.includes('could not read')));assert.ok(await page.$('#resume-upload'))
 await click('Paste text');await page.type('textarea',resume);failNext=true;await click('Continue');await page.waitForSelector('#resume-input-error');assert.equal(await page.$eval('textarea',e=>e.value),resume,'Failed request preserves text');await questions();await result()
 assert.deepEqual(errors,[]);console.log('PASS PDF/DOCX/paste end-to-end; active-only input, draft preservation, focus, inline validation, invalid/oversized files, parser failure and retry. One structured extraction feeds the two scorecards. The AI provider uses a synthetic response.')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));rmSync(dir,{recursive:true,force:true})}
