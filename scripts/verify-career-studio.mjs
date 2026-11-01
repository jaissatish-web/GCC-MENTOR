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
  const lightWorkspace=async name=>{
    const measured=await page.evaluate(()=>{
      const rgb=v=>(v.match(/[\d.]+/g)||[]).slice(0,3).map(Number)
      const lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
      const bg=el=>{while(el){const c=getComputedStyle(el).backgroundColor;if(c!=='transparent'&&c!=='rgba(0, 0, 0, 0)')return rgb(c);el=el.parentElement}return[255,255,255]}
      const visible=el=>el&&getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0
      const targets=['.studio-topbar','.studio-bottom-nav','.studio-sidebar','main','.library-resume-card'].map(s=>({selector:s,el:document.querySelector(s)})).filter(({el})=>visible(el))
      const copy=['.studio-topbar a','.studio-primary-nav a[aria-current="page"]','.studio-bottom-nav a[aria-current="page"]','main h1','main p','.library-resume-card a'].map(s=>({selector:s,el:document.querySelector(s)})).filter(({el})=>visible(el))
      return {surfaces:targets.map(({selector,el})=>({selector,luminance:lum(bg(el)),palette:getComputedStyle(el).getPropertyValue('--ui-surface-rgb').trim()})),copy:copy.map(({selector,el})=>{const a=lum(rgb(getComputedStyle(el).color)),b=lum(bg(el));return{selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}})}
    })
    assert.ok(measured.surfaces.length>=1,name+' includes readable content surfaces')
    if(!/^(Interview|Report)/.test(name))assert.ok(measured.surfaces.length>1,name+' includes both content and shared shell')
    for(const s of measured.surfaces){assert.ok(s.luminance>.8,name+' light '+s.selector);assert.equal(s.palette,'255 255 255',name+' central surface roles reach '+s.selector)}
    for(const c of measured.copy)assert.ok(c.ratio>=4.5,name+' contrast '+c.selector+': '+c.ratio)
    results.push(name+' shared light surfaces and contrast')
  }
  const shot=async name=>{await page.evaluate(()=>{for(const animation of document.getAnimations()){if(Number.isFinite(animation.effect?.getComputedTiming().endTime)){try{animation.finish()}catch{}}}});await page.screenshot({path:`${shots}/${name}.png`,fullPage:false})}
  for(const width of [320,375,390,430,768,1440]){
    await page.setViewport({width,height:width>=1024?1024:844,deviceScaleFactor:1})
    await go('/__scenario?state=saved');await go('/dashboard')
    await page.waitForFunction(()=>document.querySelector('.studio-continue')?.textContent.includes('3 of 10'))
    const home=await page.evaluate(()=>({height:document.querySelector('.studio-continue .ui-button').getBoundingClientRect().height,body:getComputedStyle(document.querySelector('.studio-home')).fontSize,nav:[...document.querySelectorAll('[data-mobile-navigation] a')].map(a=>a.textContent.trim()),rail:getComputedStyle(document.querySelector('.studio-sidebar')).width}))
    assert.equal(home.body,'15px');assert.ok(home.height>=44&&home.height<=52,'CTA sizing');assert.deepEqual(home.nav,['Home','Resumes','Practice','Profile']);if(width>=1024)assert.equal(home.rail,'224px')
    if(width<768)assert.equal(await page.$$eval('[data-mobile-navigation] a > span',els=>els.every(el=>el.getBoundingClientRect().height<25)),true,'Navigation labels fit one line')
    await lightWorkspace('Home '+width);await reflow('Home '+width);await shot('home-'+width)
    await go('/profile');await page.waitForSelector('.studio-profile-summary');assert.equal(await page.$('#f_phone_number'),null,'Summary must not render full editor')
    await lightWorkspace('Profile '+width);await reflow('Profile '+width);await shot('profile-'+width)
    assert.equal(await page.$$eval('.studio-profile-row:is(button,a)',els=>els.length),0,'Profile summary rows are read-only')
    assert.equal(await page.$$eval('.studio-profile-summary button',els=>els.filter(el=>el.textContent.trim()==='Edit Career Profile').length),1,'One canonical edit CTA')
    const editProfile=async()=>{
      await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Edit Career Profile').click())
      await page.waitForSelector('#profile-editor')
      await page.evaluate(()=>[...document.querySelectorAll('[aria-label="Career Profile blocks"] button')].find(e=>e.textContent.includes('Personal & Contact Details')).click())
      await page.waitForSelector('#f_full_name')
      assert.ok(await page.$('#sec_work_experience'),'All sections remain in the canonical editor')
      assert.ok(await page.$('#sec_skills'),'Skills section remains discoverable')
    }
    const changeName=async name=>page.$eval('#f_full_name',(el,name)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,name);el.dispatchEvent(new Event('input',{bubbles:true}))},name)
    const initialName=await page.$eval('.studio-profile-identity h2',el=>el.textContent)
    await editProfile();await changeName('Maya Cancelled Draft')
    await page.waitForFunction(()=>document.body.innerText.includes('unsaved changes'))
    await page.evaluate(()=>[...document.querySelectorAll('[data-profile-save-bar] button')].find(e=>e.textContent.trim()==='Cancel').click())
    await page.waitForSelector('.studio-profile-summary')
    assert.equal(await page.$eval('.studio-profile-identity h2',el=>el.textContent),initialName,'Cancel restores saved Career Profile facts')
    assert.equal((await(await fetch(origin+'/__writes')).json()).filter(w=>w.path==='/api/profile').length,0,'Cancel makes no profile write')
    await editProfile();await changeName('Maya Review Draft')
    await page.waitForFunction(()=>document.body.innerText.includes('unsaved changes'))
    await reflow('Contact '+width);await shot('contact-'+width)
    await page.evaluate(()=>[...document.querySelectorAll('[data-profile-save-bar] button')].find(e=>e.textContent.trim()==='Save changes').click())
    await page.waitForSelector('.studio-profile-summary')
    assert.equal(await page.$eval('.studio-profile-identity h2',el=>el.textContent),'Maya Review Draft','Save returns to the updated read-only summary')
    const writes=await(await fetch(origin+'/__writes')).json();const save=writes.find(w=>w.path==='/api/profile');assert.ok(save?.body.expected_updated_at!==undefined,'Optimistic version retained');assert.equal(save.body.full_name,'Maya Review Draft')
    await go('/dashboard/library');await page.waitForSelector('[data-resume-kind="career-profile"]');assert.equal(await page.$$eval('main [role="alert"]',els=>els.length),0,'Saved library fixture opens its base resume without an artificial error');assert.equal(await page.$$eval('.library-resume-card',els=>els[0].dataset.resumeKind),'career-profile','Career Profile Resume remains pinned first');await lightWorkspace('Resume Library '+width);await reflow('Resume Library '+width);await shot('library-'+width)
    await go('/package/studio-resume');await page.waitForSelector('.studio-document-summary');assert.equal(await page.$$eval('.studio-service-row',els=>els.length),3);assert.equal(await page.$eval('.resume-top-actions',el=>getComputedStyle(el).display),'grid');assert.equal(await page.$$eval('.editor-action-dock',els=>els.length),0,'No floating dock covers the resume');assert.deepEqual(await page.$$eval('.resume-top-actions > button',els=>els.slice(0,2).map(el=>el.textContent.trim())),['Undo changes','Save changes'],'Undo and Save remain available in the top action group')
    assert.ok(await page.$eval('.studio-service-row[href^="/mock-interview"]',el=>el.href.includes('package=studio-resume')))
    await lightWorkspace('Resume workspace '+width);await reflow('Resume '+width);await shot('resume-'+width)
    await go('/mock-interview?package=studio-resume&run=run-active');await page.waitForSelector('.studio-interview-room');await page.waitForSelector('textarea')
    assert.equal(await page.$eval('[data-mobile-navigation]',el=>getComputedStyle(el).display),'none')
    await lightWorkspace('Interview '+width);await reflow('Interview '+width);await shot('interview-'+width)
    await page.type('textarea','I coordinated the team and documented the result.');await page.evaluate(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Submit answer').click())
    await page.waitForFunction(()=>document.body.innerText.includes('Question 5 of 10'))
    assert.ok((await(await fetch(origin+'/__writes')).json()).some(w=>w.path.endsWith('/answer')&&w.body.answer.includes('coordinated')))
    await go('/mock-interview?package=studio-resume&run=run-2');await page.waitForSelector('.studio-feedback-priorities');assert.equal(await page.$$eval('.studio-feedback-row',els=>els.length),3)
    assert.equal(await page.$eval('[aria-label="Previous comparable practice score"]',el=>el.value),72)
    assert.ok(await page.$eval('.studio-report-actions a',el=>el.href.includes('setup=1')))
    if(width===390)assert.ok(await page.$eval('.studio-report-actions a',el=>el.getBoundingClientRect().bottom<=innerHeight),'Report next action above fold')
    await lightWorkspace('Report '+width);await reflow('Report '+width);await shot('report-'+width)
    await page.evaluate(()=>[...document.querySelectorAll('.studio-report-actions button')].find(e=>e.textContent.trim()==='Review answers').click());await page.waitForFunction(()=>document.body.innerText.includes('Back to report'))
  }
  await page.setViewport({width:390,height:844})
  for(const state of ['empty','error','pending']){await go('/__scenario?state='+state);await go('/dashboard');await page.waitForSelector('.studio-home');await reflow(state);await shot('home-'+state)}
  await go('/__scenario?state=base');await go('/package/studio-resume');await page.waitForSelector('.studio-service-row');assert.ok(await page.$eval('.studio-resume-workspace',el=>el.textContent.includes('Not optimized')));results.push('Base resume services')
  await go('/__scenario?state=saved');await go('/dashboard');await page.waitForFunction(()=>document.querySelector('.studio-continue')?.textContent.includes('3 of 10'));await page.addStyleTag({content:'html{font-size:200% !important}'});await reflow('Enlarged Home');await shot('home-enlarged')
  assert.deepEqual(errors,[],'Application runtime errors');assert.deepEqual(external,[],'External requests')
  writeFileSync(shots+'/results.json',JSON.stringify({results,errors,external},null,2));console.log(`PASS Career Studio: ${results.length} responsive/state checks, versioned profile save, interview submit/report, zero external calls`)
} finally {if(browser)await browser.close();if(server){server.closeAllConnections();await new Promise(yes=>server.close(yes))}rmSync(scratch,{recursive:true,force:true})}
