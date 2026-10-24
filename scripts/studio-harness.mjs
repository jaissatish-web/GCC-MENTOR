/** Local-only fictional APIs for the real built UI; never imported by the app. */
import {createRequire} from 'node:module'
import {writeFileSync} from 'node:fs'

/** Bundle the real dynamic workspace with navigation/auth/server-footer test adapters. */
export async function buildStudioBundle(root, dir) {
  const require=createRequire(root+'/package.json')
  writeFileSync(dir+'/entry.mjs',`import React from 'react';import{createRoot}from'react-dom/client';import{AppShell}from'${root}/components/layout/AppShell.tsx';import{PackageScreen}from'${root}/app/package/[id]/PackageScreen.tsx';createRoot(document.getElementById('root')).render(React.createElement(AppShell,null,React.createElement(PackageScreen,{id:'studio-resume'})));`)
  writeFileSync(dir+'/navigation.js',`import{useSyncExternalStore,useMemo}from'react';const sub=fn=>{addEventListener('popstate',fn);addEventListener('studio-location',fn);return()=>{removeEventListener('popstate',fn);removeEventListener('studio-location',fn)}};for(const key of ['pushState','replaceState']){const fn=history[key].bind(history);history[key]=(...a)=>{fn(...a);dispatchEvent(new Event('studio-location'))}}export function usePathname(){return useSyncExternalStore(sub,()=>location.pathname)}export function useSearchParams(){const search=useSyncExternalStore(sub,()=>location.search);return useMemo(()=>new URLSearchParams(search),[search])}const router={push:u=>location.assign(u),replace:u=>location.replace(u),refresh:()=>location.reload()};export function useRouter(){return router}`)
  writeFileSync(dir+'/link.js',`import React from'react';export default function Link({prefetch,replace,scroll,...props}){return React.createElement('a',props)}`)
  writeFileSync(dir+'/footer.js',`export function AppFooter(){return null}`)
  writeFileSync(dir+'/auth.js',`export async function signOut(){throw new Error('Sign out disabled in the fictional review.')}`)
  writeFileSync(dir+'/loader.cjs',`module.exports=function(source){return require(${JSON.stringify(require.resolve('sucrase'))}).transform(source,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true,filePath:this.resourcePath}).code}`)
  const webpack=require('next/dist/compiled/webpack/webpack');webpack.init()
  await new Promise((yes,no)=>webpack.webpack({mode:'development',devtool:false,entry:dir+'/entry.mjs',output:{path:dir,filename:'fixture.js'},resolve:{extensions:['.tsx','.ts','.js','.mjs'],alias:{'@/components/layout/AppFooter':dir+'/footer.js','@/app/auth/actions':dir+'/auth.js','@':root,'next/navigation':dir+'/navigation.js','next/link':dir+'/link.js'},modules:[root+'/node_modules','node_modules']},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:dir+'/loader.cjs'}]}},(err,stats)=>err||stats.hasErrors()?no(err||new Error(stats.toString({errors:true}))):yes()))
}
import {createServer} from 'node:http'
import {readFileSync,existsSync} from 'node:fs'
import {resolve,extname} from 'node:path'
export function createStudioServer(root,bundlePath) {
const initial=JSON.parse(readFileSync(root+'/scripts/fixtures/studioFixture.json','utf8'))
let data=structuredClone(initial),scenario='saved',writes=[]
const landing=readFileSync(root+'/.next/server/app/index.html','utf8'),fontClass=/<body class="([^"]+)"/.exec(landing)?.[1]||''
const css=[...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(m=>m[1]))].map(href=>`<link rel="stylesheet" href="${href}">`).join('')
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.rsc':'text/x-component'}
const navigate=`<style>html{scrollbar-width:none}</style><script>document.addEventListener('click',e=>{const a=e.target.closest('a');if(a&&a.origin===location.origin&&a.pathname!==location.pathname&&!a.target&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();location.assign(a.href)}},true)</script>`
return createServer(async(req,res)=>{
 const url=new URL(req.url,'http://review'),p=url.pathname
 const send=(value,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value))}
 if(p==='/__scenario'){scenario=url.searchParams.get('state')||'saved';data=structuredClone(initial);if(scenario==='base'){data.pkg.tier='free';data.pkg.optimized_content=null}writes=[];return send({scenario})}
 if(p==='/__writes')return send(writes)
 if(p==='/review'){
  const target=url.searchParams.get('path')||'/dashboard',width=Math.max(320,Math.min(1440,Number(url.searchParams.get('width'))||390)),height=Number(url.searchParams.get('height'))||844
  res.writeHead(200,{'Content-Type':'text/html'});return res.end(`<html><head><meta charset="utf-8"><title>Career Studio design review</title></head><body style="margin:0;background:#e8e9e7;font:14px Arial"><div style="padding:12px 20px;background:white">Career Studio · fictional local data · ${width} × ${height}</div><iframe title="Career Studio preview" src="${target.replace(/"/g,'&quot;')}" width="${width}" height="${height}" style="display:block;margin:16px auto;border:0;background:white"></iframe></body></html>`)
 }
 if(p.startsWith('/api/')){
  if(req.method!=='GET'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);let body={};try{body=JSON.parse(Buffer.concat(chunks).toString())}catch{}
   writes.push({path:p,method:req.method,body})
   if(p==='/api/profile'&&req.method==='PUT'){data.profile={...data.profile,...body,updated_at:'2026-10-24T09:00:00Z'};return send({updated_at:data.profile.updated_at})}
   if(p.endsWith('/answer')){const run=data.pkg.mock_interview_runs.find(run=>run.id==='run-active'),q=run.questions.find(q=>q.id===body.questionId);if(q){q.answer=body.answer;q.feedback='Example review: explain the result more precisely.';q.score=7;run.current_index++}return send({run})}
   return send({error:'Generation and external changes are disabled in the fictional design review.'},409)
  }
  if(p==='/api/profile')return scenario==='error'?send({error:'Fictional unavailable profile'},500):scenario==='empty'?send({error:'No profile'},404):send(data.profile)
  if(p==='/api/profile/pending-draft')return send({pending:scenario==='pending'?{draft:{...data.profile,full_name:'Imported Maya Thomas'},report:null}:null,draft:null})
  if(p==='/api/profile/import-review')return send({review:null})
  if(p==='/api/ats-scan/session')return send({error:'No scan'},404)
  if(p==='/api/packages/career-profile')return send({package:null,summary:null})
  if(p==='/api/packages')return scenario==='error'?send({error:'Fictional unavailable list'},500):send({packages:scenario==='empty'?[]:[data.pkg],total:scenario==='empty'?0:1,next_cursor:null})
  if(p==='/api/packages/studio-resume')return send({package:data.pkg})
  if(p==='/api/dashboard/overview')return scenario==='error'?send({error:'Fictional unavailable totals'},500):send(scenario==='empty'?Object.fromEntries(Object.entries(data.overview).map(([k,v])=>[k,typeof v==='number'?0:v])):data.overview)
  if(p==='/api/mock-interview/progress')return send({attempts:2,progress:[]})
  if(p==='/api/mock-interview/voice-capabilities')return send({enabled:false})
  return send({},404)
 }
 if(p==='/package/studio-resume'){
  res.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});return res.end(`<html><head><meta charset="utf-8">${css}</head><body class="${fontClass}"><div id="root"></div><script src="/studio-fixture.js"></script>${navigate}</body></html>`)
 }
 const relative=p==='/studio-fixture.js'?bundlePath:p.startsWith('/_next/static/')?root+'/.next/'+p.slice(7):p.startsWith('/interviewers/')?root+'/public'+p:null
 if(relative&&existsSync(relative)){res.writeHead(200,{'Content-Type':mime[extname(relative)]||'application/octet-stream'});return res.end(readFileSync(relative))}
 const built=root+'/.next/server/app'+(p==='/'?'/dashboard':p)+(req.headers.rsc==='1'?'.rsc':'.html')
 if(existsSync(built)){let value=readFileSync(built);res.writeHead(200,{'Content-Type':mime[extname(built)]||'text/html','Cache-Control':'no-store'});return res.end(extname(built)==='.html'?value.toString().replace('</head>',navigate+'</head>'):value)}
 if(p==='/'){res.writeHead(302,{Location:'/dashboard'});return res.end()}
 res.writeHead(404);res.end('Not found')
})
}
