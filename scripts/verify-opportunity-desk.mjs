/** Browser regression against real components and the local read-only fixture server. */
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import puppeteer from 'puppeteer-core'
const {qaServer}=await import('./preview-opportunity-desk.mjs')
const origin='http://127.0.0.1:4173',errors=[],writes=[],results=[]
mkdirSync('artifacts/opportunity-desk',{recursive:true})
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-zygote','--single-process']})
try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/')&&r.method()!=='GET')writes.push({url:r.url(),method:r.method()})})
 for(const width of [320,390,768,1440]){
  await page.setViewport({width,height:844})
  for(const [name,path]of[['landing','/'],['dashboard','/dashboard'],['workspace','/package/desk-job']]){
   await page.goto(origin+path,{waitUntil:'networkidle0'});await page.waitForSelector('h1',{visible:true});await page.evaluate(()=>document.fonts.ready)
   const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,nodes:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&e.getBoundingClientRect().width>0).slice(0,6).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,60)}))}))
   assert.ok(overflow.scroll<=width+1,`${name}/${width}: ${JSON.stringify(overflow)}`)
   assert.deepEqual(errors,[],`Runtime errors ${name}/${width}`)
   if(width===320||width===390||width===1440)await page.screenshot({path:`artifacts/opportunity-desk/${name}-${width}.png`,fullPage:false})
   if(name==='landing'){
    for(const selector of['#challenges details','#how-it-works']){assert.equal(await page.$eval(selector,e=>e.open),false);await page.$eval(`${selector}>summary`,e=>e.click());assert.equal(await page.$eval(selector,e=>e.open),true);await page.$eval(`${selector}>summary`,e=>e.click())}
    assert.equal(await page.$eval('#hero-readiness-cta',e=>e.getAttribute('href')),'/gulf-readiness-score')
   }
   if(name==='dashboard'){
    await page.waitForSelector('[aria-label="Your next step"] a');assert.ok(await page.$('[aria-labelledby="desk-jobs-title"] a[href="/package/desk-job"]'))
    assert.equal(await page.$eval('a[aria-label="Career Profile"]',e=>e.getAttribute('href')),'/profile')
   }
   if(name==='workspace'){
    assert.ok(await page.$('a[href="/cover-letter?package=desk-job"]'))
    const select=async label=>page.$$eval('nav[aria-label="Resume workspace"] button',(es,label)=>es.find(e=>e.textContent===label).click(),label)
    await select('Practice');await page.waitForSelector('a[href="/mock-interview?package=desk-job"]');assert.ok(await page.$('a[href="/interview-qa?package=desk-job"]'))
    await select('Documents');await page.waitForSelector('[aria-label="Save and download resume"], #resume-render, [data-document-preview]')
    assert.ok(await page.$('a[href="/api/packages/desk-job/pdf"],button[aria-describedby="resume-save-status"]'))
    await select('Overview');await page.waitForSelector('[aria-label="Next preparation action"]')
    await page.$$eval('button',es=>es.find(e=>e.textContent.includes('Application tracker')).click());await page.waitForSelector('input[type="datetime-local"]')
    if(width===390)await page.screenshot({path:'artifacts/opportunity-desk/tracker-390.png',fullPage:false})
   }
   results.push({name,width,pass:true})
  }
 }
 assert.deepEqual(writes,[],'Preview navigation must never write, generate, score or change saved data')
 writeFileSync('artifacts/opportunity-desk/results.json',JSON.stringify({results,errors,writes},null,2))
 console.log('PASS: landing, dashboard and job workspace at 320/390/768/1440px; collapsed guides, existing CTA routes, Documents/Practice/Tracker navigation; no runtime errors or API writes.')
}finally{await browser.close();qaServer.close()}
