// Throwaway signed-in session WITH data, so client-side crashes can be seen.
import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
import fs from 'fs'
import crypto from 'crypto'
const require = createRequire(import.meta.url)
const { createChunks } = require('@supabase/ssr/dist/main/utils/chunker.js')
const { stringToBase64URL } = require('@supabase/ssr/dist/main/utils/base64url.js')
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/)
  .filter(l=>l.includes('=')&&!l.startsWith('#'))
  .map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false} })
const EMAIL = `sweep-${Date.now()}@example.com`, PASSWORD = crypto.randomUUID()+'Aa1!'
const { data, error } = await admin.auth.admin.createUser({ email:EMAIL, password:PASSWORD, email_confirm:true })
if (error) throw error
const uid = data.user.id
const { data: prof, error: pe } = await admin.from('career_profiles').insert({
  user_id: uid, full_name:'Rajesh Kumar', email:EMAIL, phone:'+971501234567',
  current_location:'Abu Dhabi, UAE', target_job_title:'Senior Piping Engineer',
  target_country:'uae', currently_in_gulf:true, professional_summary:'Senior Piping Engineer with 12 years in the Gulf.',
}).select('id').single()
if (pe) throw pe
const rows = [
  { user_id:uid, profile_id:prof.id, target_job_title:'Senior Piping Engineer', target_company:'ADNOC', target_country:'uae', optimization_level:'moderate', status:'interview', is_paid:true, optimized_content:{summary:{generated:'x',source_profile_summary:'y'},experience_blocks:[]}, skills_order:[], field_visibility_snapshot:{} },
  { user_id:uid, profile_id:prof.id, target_job_title:'Piping Lead', target_company:null, target_country:'generic_gulf', optimization_level:'easy', status:'applied', is_paid:false, optimized_content:null, skills_order:[], field_visibility_snapshot:{} },
  { user_id:uid, profile_id:prof.id, target_job_title:'QA/QC Engineer', target_company:'Saudi Aramco', target_country:'saudi_arabia', optimization_level:'high', status:'offer', is_paid:true, optimized_content:{summary:{generated:'x',source_profile_summary:'y'},experience_blocks:[]}, skills_order:[], field_visibility_snapshot:{} },
]
const { error: ie } = await admin.from('packages').insert(rows)
if (ie) throw ie
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth:{persistSession:false} })
const s = await anon.auth.signInWithPassword({ email:EMAIL, password:PASSWORD })
if (s.error) throw s.error
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const chunks = createChunks(`sb-${ref}-auth-token`, 'base64-'+stringToBase64URL(JSON.stringify(s.data.session)))
console.log(JSON.stringify({ uid, cookies: chunks.map(c=>({name:c.name,value:c.value})) }))
