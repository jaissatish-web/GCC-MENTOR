/** Interactive real review component against fictional data, no external writes. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import puppeteer from 'puppeteer'
const require=createRequire(import.meta.url),root=process.cwd(),dir=mkdtempSync(tmpdir()+'/gcc-review-ui-')
const data={full_name:'',email:'',phone:'',professional_summary:'',currently_in_gulf:false,nationality:'',current_location:'',notice_period:'',visa_status:'',visa_transferable:null,passport_type:'',passport_validity_date:'',date_of_birth:'',whatsapp:'',linkedin_url:'',target_job_title:'',target_industry:'',target_company:'',target_country:'',skills:[],work_experience:[{key:'unknown-role',company:'Example employer',role:'Engineer',start_date:'2020-01',end_date:'',location:'',description:'Maintained control systems.',highlights:'',gcc_country:''}],education:[],certifications:[],additional_information:[]}
const review={version:1,id:'fictional-review',createdAt:'',sourceText:'',wordingStatus:'not_needed',changes:[],imported:{roles:0,skills:0,qualifications:0,certificates:0}}
writeFileSync(dir+'/entry.jsx',`import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{ResumeReviewPage}from${JSON.stringify(root+'/components/profile/ResumeReviewPage.tsx')};function App(){const[value,setValue]=useState({...${JSON.stringify(data)},email:document.body.dataset.invalid?'invalid':''});const[saved,setSaved]=useState(0);const[facts,setFacts]=useState(null);return <><pre id="saved-facts">{JSON.stringify(facts)}</pre><output id="saved">Saved {saved}</output><ResumeReviewPage value={value} review={${JSON.stringify(review)}} existing={false} busy={false} error={null} score={0} missing={[]} onChange={setValue} onConfirm={next=>{setFacts(next);setSaved(saved+1)}}/></>}createRoot(document.getElementById('root')).render(<App/>);`)
writeFileSync(dir+'/loader.cjs',`module.exports=s=>require(${JSON.stringify(require.resolve('sucrase'))}).transform(s,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true}).code`)
const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.jsx',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.jsx'],alias:{'@':root},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(e,s)=>e||s.hasErrors()?no(e||Error(s.toString({errors:true}))):yes()))
const css=readdirSync(root+'/.next/static/css').filter(f=>f.endsWith('.css')).map(f=>readFileSync(root+'/.next/static/css/'+f,'utf8')).join('\n')

let browser
try {
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH || await puppeteer.executablePath(),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-zygote','--single-process']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const render=async(invalid=false)=>{await page.setContent(`<html><head><style>${css}</style></head><body class="app-type internal-ui career-studio" data-invalid="${invalid?'yes':''}"><div id="root"></div></body></html>`);await page.addScriptTag({content:readFileSync(dir+'/fixture.js','utf8')})}
 mkdirSync('artifacts/deferred-review',{recursive:true})
 const button=async text=>{const found=await page.$$('button');for(const element of found){if((await element.evaluate(e=>e.textContent)).includes(text))return element}throw Error(text+' missing')}
 for(const width of [390,1440]){
  await page.setViewport({width,height:900});await render();await page.waitForSelector('input[type=checkbox]')
  let create=await button('Confirm & Create');assert.ok(await create.evaluate(e=>e.disabled),'acknowledgement required')
  await page.click('input[type=checkbox]');create=await button('Confirm & Create');assert.equal(await create.evaluate(e=>e.disabled),false,'missing essentials do not disable create')
  await create.click();await page.waitForSelector('#review-issues-title');assert.equal(await page.$eval('#saved',e=>e.textContent),'Saved 0','warning precedes write')
  const panel=await page.$eval('[aria-labelledby=review-issues-title]',e=>({border:getComputedStyle(e).borderColor,bg:getComputedStyle(e).backgroundColor,text:getComputedStyle(e.querySelector('h3')).color,errorToken:getComputedStyle(e).getPropertyValue('--ui-error-rgb').trim().split(/\s+/).join(', '),focused:document.activeElement===e}))
  assert.ok(panel.focused);assert.equal(panel.border,`rgb(${panel.errorToken})`);assert.equal(panel.text,`rgb(${panel.errorToken})`);assert.notEqual(panel.bg,'rgba(0, 0, 0, 0)');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow')
  await page.screenshot({path:`artifacts/deferred-review/warning-${width}.png`,fullPage:false})
  await (await button('Update now')).click();assert.equal(await page.$eval('#review-field-full_name',e=>document.activeElement===e),true)
  await (await button('Skip and create')).click();await page.waitForFunction(()=>document.querySelector('#saved').textContent==='Saved 1');assert.equal(await page.$eval('#saved-facts',e=>JSON.parse(e.textContent).work_experience[0].end_date_unconfirmed),true,'skip must persist unknown instead of implying current')
 }
 await render(true);await page.waitForSelector('input[type=checkbox]');await page.click('input[type=checkbox]');await (await button('Confirm & Create')).click();await page.waitForSelector('#review-issues-title');assert.ok(await (await button('Skip and create')).evaluate(e=>e.disabled),'malformed supplied email requires correction or clearing')
 assert.deepEqual(errors,[]);console.log('PASS deferred review UI: 390/1440px, acknowledgement, focused red warning, no premature save, update focus, explicit skip/save and invalid-format protection')
} finally {if(browser)await browser.close();rmSync(dir,{recursive:true,force:true})}
