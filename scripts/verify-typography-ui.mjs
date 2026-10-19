/** Universal typography enforcement: real production CSS against legacy module,
 * utility and inline conflicts. No network, account data or production APIs.
 * After build: CHROME_PATH=/path/to/chrome npm run test:typography
 */
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import puppeteer from 'puppeteer-core'
const landing = readFileSync('.next/server/app/index.html', 'utf8')
const files = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m => m[1]))]
assert.ok(files.length, 'Build before verifying typography')
const css = files.map(f => readFileSync(f.replace('/_next/', '.next/'), 'utf8').replace(/url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g, (_, url) => `url("data:font/woff2;base64,${readFileSync(join('.next/static/media', basename(url))).toString('base64')}")`)).join('\n')
const fontClass = /<body class="([^"]+)"/.exec(landing)[1]
const html = `<main class="ui-page page-gutter legacy"><h1 style="font-family:Arial;font-size:64px;font-weight:900">One <span class="text-xs font-thin" style="font-size:8px">heading system</span></h1><h2 class="text-4xl">Section heading</h2><h3 class="text-xs">Subheading</h3><p class="text-3xl font-black" style="font-size:11px;font-weight:700;font-style:italic">A paragraph follows the body role across every application page.</p><p class="type-helper">Supporting information</p><span class="type-caption">Caption</span><label>Field label<input class="field" value="Input text"></label><button class="ui-button">Continue</button><strong>Inline emphasis</strong><div class="type-stat font-mono">83 / 100</div><div class="linkedin-profile-preview"><h2>Social preview heading</h2><p>Same application font</p></div><div data-document-preview style="font-family:Georgia"><div id="resume-render" style="font-family:Georgia"><h1 style="font-family:Georgia;font-size:21px;font-weight:700">Document title</h1><p style="font-family:Georgia;font-size:11px;font-weight:400">Document body</p></div></div><div class="actual-template-orbit-face" style="font-family:Georgia;font-size:10px"><p style="font-family:Georgia;font-size:9px">Template face</p></div></main>`
const legacy = `.legacy{font-family:Arial;font-size:13px;line-height:1.1}.legacy h1{font-size:60px;font-weight:900}.legacy h2{font-size:35px}.legacy p{font-size:12px;font-weight:700;line-height:1.1;letter-spacing:2px}.legacy input{font-family:Arial;font-size:15px}.legacy button{font-size:11px}`
const browser = await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']})
try {
 const page=await browser.newPage()
 await page.setRequestInterception(true)
 page.on('request',r=>r.url().startsWith('data:')?r.continue():r.abort())
 mkdirSync('artifacts/typography-universal',{recursive:true})
 for(const width of [320,390,768,1440]) {
  await page.setViewport({width,height:1000})
  await page.setContent(`<html><head><style>${css}</style><style>${legacy}</style></head><body class="${fontClass} app-type">${html}</body></html>`)
  await page.evaluate(()=>document.fonts.ready)
  const result=await page.evaluate(()=>{const s=q=>getComputedStyle(document.querySelector(q));return {title:s('main>h1').fontSize,titleChild:s('main>h1 span').fontSize,titleChildWeight:s('main>h1 span').fontWeight,section:s('main>h2').fontSize,sub:s('h3').fontSize,body:s('main>p').fontSize,bodyWeight:s('main>p').fontWeight,bodyLine:s('main>p').lineHeight,bodyStyle:s('main>p').fontStyle,label:s('label').fontSize,input:s('input').fontSize,helper:s('.type-helper').fontSize,caption:s('.type-caption').fontSize,button:s('button').fontSize,font:s('input').fontFamily,statFont:s('.type-stat').fontFamily,socialFont:s('.linkedin-profile-preview p').fontFamily,doc:s('#resume-render p').fontSize,docTitle:s('#resume-render h1').fontSize,docFont:s('#resume-render h1').fontFamily,orbit:s('.actual-template-orbit-face p').fontSize,overflow:document.documentElement.scrollWidth>innerWidth}})
  assert.equal(result.title,width<640?'26px':'30px');assert.equal(result.titleChild,result.title);assert.equal(result.titleChildWeight,'700');assert.equal(result.section,width<640?'20px':'22px');assert.equal(result.sub,width<640?'16px':'18px')
  for(const key of ['body','input'])assert.equal(result[key],'16px')
  assert.equal(result.bodyWeight,'400');assert.equal(result.bodyStyle,'normal');assert.equal(result.bodyLine,'24.8px')
  assert.equal(result.label,'14px');assert.equal(result.helper,'14px');assert.equal(result.caption,'12px');assert.equal(result.button,'15px')
  for(const key of ['font','statFont','socialFont'])assert.ok(result[key].includes('Inter'),JSON.stringify(result))
  assert.equal(result.doc,'11px');assert.equal(result.docTitle,'21px');assert.ok(result.docFont.includes('Georgia'));assert.equal(result.orbit,'9px');assert.equal(result.overflow,false)
  await page.screenshot({path:`artifacts/typography-universal/roles-${width}.png`,fullPage:true})
  await page.evaluate(()=>{document.documentElement.style.setProperty('--ui-body-size','18px');document.documentElement.style.setProperty('--ui-title-size','28px');document.documentElement.style.setProperty('--ui-font','Arial')})
  const changed=await page.evaluate(()=>({title:getComputedStyle(document.querySelector('main>h1')).fontSize,paragraph:getComputedStyle(document.querySelector('main>p')).fontSize,font:getComputedStyle(document.querySelector('input')).fontFamily,doc:getComputedStyle(document.querySelector('#resume-render h1')).fontFamily}))
  assert.equal(changed.title,'28px');assert.equal(changed.paragraph,'18px');assert.equal(changed.font,'Arial');assert.ok(changed.doc.includes('Georgia'))
 }
 console.log('PASS: central typography overrides module, utility and inline conflicts at 320/390/768/1440; configuration changes propagate; resume documents remain isolated')
} finally {await browser.close()}
