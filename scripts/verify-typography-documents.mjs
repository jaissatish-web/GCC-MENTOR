/** Compare authored resume/letter typography against a captured pre-change build.
 * Usage: TYPE_BASELINE=/absolute/baseline-directory CHROME_PATH=/chrome node scripts/verify-typography-documents.mjs
 * Baseline directory contains static/ and index.html from the original build.
 * Local fictional fixtures only; all external requests are blocked.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { execFileSync } from 'node:child_process'
import puppeteer from 'puppeteer-core'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const React = require('react'); globalThis.React = React
const {renderToStaticMarkup} = require('react-dom/server')
const {availableTemplates} = require('../lib/templates.ts')
const {buildCareerProfileResume} = require('../lib/careerProfileResume.ts')
const {makeTemplateFixture} = require('./fixtures/templateFixture.ts')
const {CoverLetterEmail} = require('../components/service/CoverLetterEmail.tsx')
const baseline = process.env.TYPE_BASELINE
assert.ok(baseline, 'Set TYPE_BASELINE to an original-build capture directory')
function load(dir, htmlPath) {
 const html=readFileSync(htmlPath,'utf8')
 const paths=[...new Set([...html.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m=>m[1]))]
 assert.ok(paths.length,'Compiled CSS missing')
 const css=paths.map(path=>readFileSync(join(dir,path.replace('/_next/','')),'utf8').replace(/url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g,(_,url)=>`url("data:font/woff2;base64,${readFileSync(join(dir,'static/media',basename(url))).toString('base64')}")`)).join('\n')
 return {css,classes:html.match(/<body[^>]*class="([^"]+)"/)?.[1]??''}
}
const builds={before:load(baseline,join(baseline,'index.html')),after:load('.next','.next/server/app/index.html')}
const {profile,optimizedContent,skillsOrder}=makeTemplateFixture()
profile.photo_url=null
const document=buildCareerProfileResume(profile)
const fixtures=availableTemplates().map(t=>({name:t.id,markup:renderToStaticMarkup(React.createElement(t.component,{document,profile,optimizedContent,skillsOrder})),kind:'resume'}))
const letter=renderToStaticMarkup(React.createElement(CoverLetterEmail,{text:'Dear Hiring Manager,\n\nI am applying for the Instrumentation Engineer position. My experience includes commissioning, loop checks and coordination with site teams.\n\nThank you for considering my application.\n\nKind regards,\nRavi Kumar Sharma',jobTitle:'Instrumentation Engineer',company:'Fictional Company',onChange:()=>{}}))
fixtures.push({name:'generated-letter',markup:letter,kind:'letter'})
const out='artifacts/typography-documents';mkdirSync(out,{recursive:true})
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']})
const summary=[]
try {
 const page=await browser.newPage();await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith('data:')?r.continue():r.abort())
 for(const width of [390,1440]) {
  await page.setViewport({width,height:1000})
  for(const fixture of fixtures) {
   const variants={}
   for(const [phase,build] of Object.entries(builds)) {
    const markup=fixture.markup // Compare the same authored document boundary in both current builds.
    const content=fixture.kind==='resume'?`<div data-document-preview><div id="resume-render" style="width:794px">${markup}</div></div>`:markup
    await page.setContent(`<html><head><style>${build.css}</style></head><body class="${build.classes} app-type internal-ui">${content}</body></html>`)
    await page.evaluate(()=>document.fonts.ready)
    variants[phase]=await page.evaluate(kind=>{
     const root=document.querySelector(kind==='letter'?'.cover-letter-email-body':'#resume-render')
     const box=root.getBoundingClientRect()
     return [root,...root.querySelectorAll('*')].filter(e=>!['STYLE','SCRIPT'].includes(e.tagName)).map(e=>{
      const s=getComputedStyle(e),b=e.getBoundingClientRect()
      return {tag:e.tagName,text:e.children.length?'':e.textContent,font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,color:s.color,margin:s.margin,padding:s.padding,width:b.width,height:b.height,x:b.x-box.x,y:b.y-box.y}
     })
    },fixture.kind)
    if(['ats_classic','falcon_executive','emerald_professional','generated-letter'].includes(fixture.name)){
     const selector=fixture.kind==='letter'?'.cover-letter-email-body':'#resume-render'
     await (await page.$(selector)).screenshot({path:`${out}/${fixture.name}-${width}-${phase}.png`})
    }
   }
   try {assert.deepEqual(variants.after,variants.before,`${fixture.name}/${width}: authored typography or internal geometry changed`)} catch(error) {
    writeFileSync(`${out}/${fixture.name}-${width}-difference.json`,JSON.stringify(variants,null,2));throw error
   }
   summary.push({name:fixture.name,width,elements:variants.after.length,unchanged:true})
  }
 }
 const protectedPaths=['components/templates','lib/pdf','lib/coverLetterFiles.ts']
 for(const path of protectedPaths)assert.equal(execFileSync('git',['diff',process.env.TYPE_BASE_REF||'42f1abd','--',path],{encoding:'utf8'}),'',`${path} source changed`)
 writeFileSync(`${out}/results.json`,JSON.stringify(summary,null,2))
 console.log(`PASS: ${fixtures.length} authored documents at390/1440px preserve every element's computed typography and relative geometry; template/PDF/letter-export source unchanged`)
} finally {await browser.close()}
