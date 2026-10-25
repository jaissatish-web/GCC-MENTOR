/** Clear Path contract: actual production CSS, no account, network or service writes.
 * Build first, then CHROME_PATH=/path/to/chrome node scripts/verify-clear-path-ui.mjs.
 * CLEAR_PATH_BASELINE_CSS optionally points to baseline compiled CSS for an exact
 * public computed-style comparison. Probe custom-property propagation independently
 * from default token values so unrelated hardcoded styles cannot mask drift.
 */
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const landing = readFileSync('.next/server/app/index.html', 'utf8')
const files = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m => m[1]))]
assert.ok(files.length, 'Run npm run build first')
const css = files.map(f => readFileSync(f.replace('/_next/', '.next/'), 'utf8').replace(/url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g, (_, url) => `url("data:font/woff2;base64,${readFileSync(join('.next/static/media', basename(url))).toString('base64')}")`)).join('\n')
const baselineCss = process.env.CLEAR_PATH_BASELINE_CSS ? readFileSync(process.env.CLEAR_PATH_BASELINE_CSS, 'utf8') : null
const fontClass = /<body class="([^"]+)"/.exec(landing)?.[1] || ''
const documentMarkup = `<div data-document-preview style="font-family:Georgia;font-size:11px;color:#27313a;background:#fefdfc;padding:7px;border:1px solid #987654;border-radius:3px"><div id="resume-render" style="font-family:Georgia"><h1 style="font-family:Georgia;font-size:21px;font-weight:700;line-height:1.2;letter-spacing:.2px">Document heading</h1><p style="font-family:Georgia;font-size:11px;font-weight:400;line-height:1.4">Document body</p><button style="height:20px;padding:1px;border-radius:2px">Document control</button></div></div><div class="actual-template-orbit-face"><p style="font-family:Georgia;font-size:9px">Orbit document</p></div>`
const roles = `<main class="ui-page page-gutter ui-page-default"><h1 style="font-size:64px;font-weight:900">Page <span class="text-xs">heading</span></h1><h2 class="text-4xl">Section heading</h2><h3 class="text-xs">Third heading</h3><h4>Fourth heading</h4><h5>Fifth heading</h5><h6>Sixth heading</h6><p class="type-body">Existing career information remains readable.</p><p class="type-helper">Supporting guidance</p><label>Target role<input class="field w-full"></label><button class="ui-button">Continue</button><section class="ui-card ui-surface rounded-card">Card content</section>${documentMarkup}</main>`
const markup = `<section id="public" class="app-type">${roles}</section><section id="internal" class="app-type internal-ui">${roles}</section><section id="public-portal" class="app-type" data-side-sheet><div role="dialog"><h2>Public menu</h2><p>Public copy</p></div></section><section id="internal-portal" class="app-type internal-ui" data-side-sheet><div role="dialog"><h2>Services</h2><p>Internal copy</p></div></section>`
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH || await chromium.executablePath(),headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']})
const records=[]
mkdirSync('artifacts/clear-path',{recursive:true})
try {
 const page=await browser.newPage()
 await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith('data:')?r.continue():r.abort())
 async function read() {
  return await page.evaluate(()=>{
   const style=e=>{const s=getComputedStyle(e);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,line:s.lineHeight,tracking:s.letterSpacing,color:s.color,background:s.backgroundColor,padding:s.padding,border:s.border,borderRadius:s.borderRadius,minHeight:s.minHeight,maxWidth:s.maxWidth,gap:s.gap}}
   const scope=id=>{const el=document.getElementById(id);return {
    headings:[...el.querySelectorAll('main>h1,main>h2,main>h3,main>h4,main>h5,main>h6')].map(style),
    body:style(el.querySelector('.type-body')),helper:style(el.querySelector('.type-helper')),field:style(el.querySelector('input')),button:style(el.querySelector('main>.ui-button')),card:style(el.querySelector('.ui-card')),page:style(el.querySelector('main')),
    document:[...el.querySelectorAll('[data-document-preview],[data-document-preview] *, .actual-template-orbit-face p')].map(style),
    palette:getComputedStyle(el).getPropertyValue('--ui-brand-rgb').trim(),
   }}
   return {public:scope('public'),internal:scope('internal'),publicPortal:style(document.querySelector('#public-portal h2')),internalPortal:style(document.querySelector('#internal-portal h2')),overflow:document.documentElement.scrollWidth>innerWidth+1}
  })
 }
 for(const width of [320,390,768,1440]) {
  await page.setViewport({width,height:1000,deviceScaleFactor:1})
  await page.setContent(`<html><head><style>${css}</style></head><body class="${fontClass}">${markup}</body></html>`)
  await page.evaluate(()=>document.fonts.ready)
  const before=await read()
  assert.deepEqual(before.internal.headings.map(h=>h.size),width>=768?['28px','20px','16px','15px','14px','13px']:['24px','18px','16px','15px','14px','13px'],`Internal H1–H6 at ${width}`)
  assert.ok(before.internal.headings.every(h=>h.weight==='600'))
  assert.equal(before.internal.body.size,'16px')
  assert.equal(before.internal.helper.size,'14px')
  assert.equal(before.internal.field.size,'16px')
  assert.equal(before.internalPortal.size,width>=768?'20px':'18px')
  assert.equal(before.publicPortal.size,'18px')
  assert.equal(before.internal.palette,'6 104 71')
  assert.equal(before.internal.field.background,'rgb(255, 255, 255)','Editable fields stay white')
  assert.equal(before.internal.card.background,'rgb(255, 255, 255)','Content surfaces stay white')
  assert.equal(before.internal.page.padding.split(' ')[1],width>=768?'32px':'16px')
  assert.equal(before.overflow,false,`Fixture overflow at ${width}`)
  assert.deepEqual(before.internal.document,before.public.document,`Internal scope must not change authored document styles at ${width}`)
  if(baselineCss) {
   await page.setContent(`<html><head><style>${baselineCss}</style></head><body class="${fontClass}">${markup}</body></html>`)
   await page.evaluate(()=>document.fonts.ready)
   const baseline=await read()
   assert.deepEqual(before.public,baseline.public,`Public CSS contract changed at ${width}`)
   assert.deepEqual(before.publicPortal,baseline.publicPortal,`Public portal changed at ${width}`)
   await page.setContent(`<html><head><style>${css}</style></head><body class="${fontClass}">${markup}</body></html>`)
   await page.evaluate(()=>document.fonts.ready)
  }
  await page.evaluate(()=>{
   for(const el of document.querySelectorAll('.internal-ui')) {
    for(let n=1;n<=6;n++)el.style.setProperty(`--ui-h${n}-size`,`${35-n}px`)
    el.style.setProperty('--ui-body-size','19px')
    el.style.setProperty('--ui-page-gutter','27px')
    el.style.setProperty('--ui-page-gap','31px')
    el.style.setProperty('--ui-control-height','53px')
    el.style.setProperty('--ui-control-radius','7px')
    el.style.setProperty('--ui-card-padding','23px')
    el.style.setProperty('--ui-card-radius','9px')
    el.style.setProperty('--ui-brand-rgb','20 65 100')
   }
  })
  const after=await read()
  assert.deepEqual(after.public,before.public,'Internal settings must not change public surface')
  assert.deepEqual(after.publicPortal,before.publicPortal,'Internal settings must not change public menu')
  assert.deepEqual(after.internal.headings.map(h=>h.size),['34px','33px','32px','31px','30px','29px'],'Each heading role changes independently')
  assert.equal(after.internal.body.size,'19px')
  assert.equal(after.internal.page.padding.split(' ')[1],'27px')
  assert.equal(after.internal.page.gap,'31px')
  assert.equal(after.internal.button.minHeight,'53px')
  assert.equal(after.internal.button.borderRadius,'7px')
  assert.equal(after.internal.card.padding,'23px')
  assert.equal(after.internal.card.borderRadius,'9px')
  assert.equal(after.internal.palette,'20 65 100')
  assert.deepEqual(after.internal.document,before.internal.document,'Changing internal settings must not change documents')
  await page.screenshot({path:`artifacts/clear-path/role-propagation-${width}.png`,fullPage:true})
  records.push({width,pass:true,baselineCompared:!!baselineCss})
 }
 console.log(`PASS: Clear Path independent H1–H6, central layout/control propagation, public menu and authored document isolation at 320/390/768/1440${baselineCss?'; baseline public computed styles identical':''}`)
} finally {
 writeFileSync('artifacts/clear-path/results.json',JSON.stringify(records,null,2))
 await browser.close()
}
