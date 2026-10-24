/** Real built pages and production components, isolated fictional APIs; no external writes. */
import assert from 'node:assert/strict'
import {mkdirSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import puppeteer from 'puppeteer-core'
import {buildStudioBundle,createStudioServer} from './studio-harness.mjs'

const root=process.cwd(), scratch=mkdtempSync(join(tmpdir(),'gcc-studio-')), shots=root+'/artifacts/studio'
mkdirSync(shots,{recursive:true})
let browser,server
const results=[],errors=[],external=[]
try {
  await buildStudioBundle(root,scratch)
  server=createStudioServer(root,scratch+'/fixture.js')
  await new Promise(yes=>server.listen(0,'127.0.0.1',yes))
  const origin='http://127.0.0.1:'+server.address().port
  browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH,headless:true,pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']})
  const page=await browser.newPage()
  page.on('pageerror',e=>errors.push(e.message))
  // The base-resume fixture intentionally changes context; accept only its existing
  // unsaved-navigation prompt when moving to the next fictional test case.
  page.on('dialog',dialog=>{if(dialog.type()==='beforeunload')void dialog.accept();else{errors.push('Unexpected dialog: '+dialog.message());void dialog.dismiss()}})
  await page.setRequestInterception(true)
  // Chrome can request data: images for native date controls; these make no network call.
  page.on('request',r=>{const url=new URL(r.url());if(url.protocol==='data:'||url.origin===origin)void r.continue();else{external.push(r.url());void r.abort()}})
  const go=async path=>{console.log('CHECK '+path);if(path.startsWith('/__scenario')){await fetch(origin+path);return}await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForNetworkIdle({idleTime:150,timeout:5000}).catch(()=>{})}
  const reflow=async name=>{assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' horizontal overflow');results.push(name)}
  const shot=async name=>{await page.evaluate(()=>{for(const animation of document.getAnimations()){if(Number.isFinite(animation.effect?.getComputedTiming().endTime)){try{animation.finish()}catch{}}}});await page.screenshot({path:`${shots}/${name}.png`,fullPage:false})}
  for(const width of [320,390,768,1440]){
    await page.setViewport({width,height:width>=1024?1024:844,deviceScaleFactor:1})
    await go('/__scenario?state=saved');await go('/dashboard')
    await page.waitForFunction(()=>document.querySelector('.studio-continue')?.textContent.includes('3 of 10'))
    const home=await page.evaluate(()=>({height:document.querySelector('.studio-continue .ui-button').getBoundingClientRect().height,body:getComputedStyle(document.querySelector('.studio-home')).fontSize,nav:[...document.querySelectorAll('[data-mobile-navigation] a')].map(a=>a.textContent.trim()),rail:getComputedStyle(document.querySelector('.studio-sidebar')).width}))
    assert.equal(home.body,'16px');assert.ok(home.height>=48&&home.height<=56,'CTA sizing');assert.deepEqual(home.nav,['Home','Resumes','Practice','Profile']);if(width>=1024)assert.equal(home.rail,'224px')
    if(width<768)assert.equal(await page.$$eval('[data-mobile-navigation] a > span',els=>els.every(el=>el.getBoundingClientRect().height<25)),true,'Navigation labels fit one line')
    await reflow('Home '+width);await shot('home-'+width)
    await go('/profile');await page.waitForSelector('.studio-profile-summary');assert.equal(await page.$('#f_phone_number'),null,'Summary must not render full editor')
    await reflow('Profile '+width);await shot('profile-'+width)
    await page.click('.studio-profile-row');await page.waitForSelector('#f_phone_number');assert.equal(await page.$('#sec_work_experience'),null,'Unrelated sections are removed')
    await page.$eval('#f_full_name',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Maya Review Draft');el.dispatchEvent(new Event('input',{bubbles:true}))})
    await page.waitForFunction(()=>document.body.innerText.includes('unsaved changes'))
    await page.evaluate(()=>[...document.querySelectorAll('.workspace-heading-link')].find(e=>e.textContent.trim()==='Profile').click())
    await page.waitForSelector('.studio-profile-summary');assert.ok(await page.$eval('.studio-profile-identity',el=>el.textContent.includes('Maya Review Draft')),'Back preserves unsaved edits')
    await page.click('.studio-profile-row');await page.waitForSelector('#f_phone_number');await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Save changes').click())
    await page.waitForFunction(()=>document.body.innerText.includes('All changes saved'))
    const writes=await(await fetch(origin+'/__writes')).json();const save=writes.find(w=>w.path==='/api/profile');assert.ok(save?.body.expected_updated_at!==undefined,'Optimistic version retained');assert.equal(save.body.full_name,'Maya Review Draft')
    await reflow('Contact '+width);await shot('contact-'+width)
    await go('/package/studio-resume');await page.waitForSelector('.studio-document-summary');assert.equal(await page.$$eval('.studio-service-row',els=>els.length),3);assert.equal(await page.$eval('.studio-workspace-actions',el=>el.open),false)
    assert.ok(await page.$eval('.studio-service-row[href^="/mock-interview"]',el=>el.href.includes('package=studio-resume')))
    await reflow('Resume '+width);await shot('resume-'+width)
    await go('/mock-interview?package=studio-resume&run=run-active');await page.waitForSelector('.studio-interview-room');await page.waitForSelector('textarea')
    assert.equal(await page.$eval('[data-mobile-navigation]',el=>getComputedStyle(el).display),'none')
    await reflow('Interview '+width);await shot('interview-'+width)
    await page.type('textarea','I coordinated the team and documented the result.');await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Submit answer').click())
    await page.waitForFunction(()=>document.body.innerText.includes('Question 5 of 10'))
    assert.ok((await(await fetch(origin+'/__writes')).json()).some(w=>w.path.endsWith('/answer')&&w.body.answer.includes('coordinated')))
    await go('/mock-interview?package=studio-resume&run=run-2');await page.waitForSelector('.studio-feedback-priorities');assert.equal(await page.$$eval('.studio-feedback-row',els=>els.length),3)
    assert.equal(await page.$eval('[aria-label="Previous comparable practice score"]',el=>el.value),72)
    assert.ok(await page.$eval('.studio-report-actions a',el=>el.href.includes('setup=1')))
    if(width===390)assert.ok(await page.$eval('.studio-report-actions a',el=>el.getBoundingClientRect().bottom<=innerHeight),'Report next action above fold')
    await reflow('Report '+width);await shot('report-'+width)
    await page.evaluate(()=>[...document.querySelectorAll('.studio-report-actions button')].find(e=>e.textContent.trim()==='Review answers').click());await page.waitForFunction(()=>document.body.innerText.includes('Back to report'))
  }
  await page.setViewport({width:390,height:844})
  for(const state of ['empty','error','pending']){await go('/__scenario?state='+state);await go('/dashboard');await page.waitForSelector('.studio-home');await reflow(state);await shot('home-'+state)}
  await go('/__scenario?state=base');await go('/package/studio-resume');await page.waitForSelector('.studio-service-row');assert.ok(await page.$eval('.studio-resume-workspace',el=>el.textContent.includes('Not optimized')));results.push('Base resume services')
  await go('/__scenario?state=saved');await go('/dashboard');await page.waitForFunction(()=>document.querySelector('.studio-continue')?.textContent.includes('3 of 10'));await page.addStyleTag({content:'html{font-size:200% !important}'});await reflow('Enlarged Home');await shot('home-enlarged')
  assert.deepEqual(errors,[],'Application runtime errors');assert.deepEqual(external,[],'External requests')
  writeFileSync(shots+'/results.json',JSON.stringify({results,errors,external},null,2));console.log(`PASS Career Studio: ${results.length} responsive/state checks, versioned profile save, interview submit/report, zero external calls`)
} finally {if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes))}rmSync(scratch,{recursive:true,force:true})}
