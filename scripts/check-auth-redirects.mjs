/**
 * Where do emailed auth links really go?  node scripts/check-auth-redirects.mjs
 *
 * GENERATES (does not send) a recovery link for the QA test account and prints
 * the redirect Supabase would use. A URL not on the project's Redirect URLs
 * allow-list is silently replaced by the Site URL — which is how reset emails
 * came to open http://localhost:3000 (docs/SUPABASE_AUTH_SETUP.md).
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const SITE = process.env.SITE || 'https://gcc-mentor.vercel.app'
let bad = 0
for (const redirectTo of [`${SITE}/auth/callback?next=/auth/update-password`, undefined]) {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: process.env.EMAIL || 'qa-newuser@example.com', options: redirectTo ? { redirectTo } : {} })
  if (error) { console.log('ERROR', error.message); bad++; continue }
  const got = new URL(data.properties.action_link).searchParams.get('redirect_to')
  const ok = got?.startsWith(SITE)
  if (!ok) bad++
  console.log(ok ? 'OK  ' : 'FAIL', 'asked', redirectTo ?? '(default)', '->', got)
}
console.log(bad ? '\nSupabase is still sending links to the wrong site. See docs/SUPABASE_AUTH_SETUP.md' : '\nEmailed links open the real site.')
process.exit(bad ? 1 : 0)
