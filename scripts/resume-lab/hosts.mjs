/**
 * Which OpenRouter hosts serve the extraction model fastest right now?
 * (2026-10-01, lib/resumeParse/pipeline.ts FAST_HOSTS)
 *
 *   node scripts/resume-lab/hosts.mjs [cv.txt]
 *
 * Sends the same CV with thinking off to every host listed for the configured
 * model, one call each, in parallel, and prints seconds and tokens/second. One
 * CV costs about ₹0.1 per host. Speeds drift — re-run before trusting the order
 * in FAST_HOSTS, and update it (and its comment) from what this prints.
 */
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let config = null
for (const key of ['extraction', 'default']) {
  const { data } = await db.from('ai_provider_config').select('provider, model, api_key').eq('key', key).maybeSingle()
  if (data) { config = data; break }
}
if (!config || config.provider !== 'openrouter') throw new Error('extraction is not configured on OpenRouter')

const cvFile = process.argv[2]
const cv = cvFile ? fs.readFileSync(cvFile, 'utf8') : fs.readFileSync('scripts/fixtures/resume-parse/sample-cv.txt', 'utf8')
const { EXTRACTION_PROMPT_V2 } = await import('../../lib/resumeParse/prompt.ts').catch(() => ({ EXTRACTION_PROMPT_V2: null }))
const system = EXTRACTION_PROMPT_V2 ?? 'Extract the resume into JSON with full_name, work_experience, education and skills. Return only JSON.'

const endpoints = await fetch(`https://openrouter.ai/api/v1/models/${config.model}/endpoints`).then((r) => r.json())
const hosts = endpoints.data.endpoints.map((e) => e.provider_name)
console.log(`${config.model}: ${hosts.length} hosts\n`)

const rows = await Promise.all(hosts.map(async (host) => {
  const t0 = Date.now()
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.api_key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model, temperature: 0, max_tokens: 8000,
        messages: [{ role: 'system', content: system }, { role: 'user', content: `Resume text:\n\n${cv}` }],
        reasoning: { enabled: false }, provider: { only: [host], allow_fallbacks: false },
      }),
    }).then((x) => x.json())
    const s = (Date.now() - t0) / 1000
    const out = r.usage?.completion_tokens ?? 0
    return { host, s, out, tps: out ? Math.round(out / s) : 0, error: r.error?.message }
  } catch (e) {
    return { host, s: (Date.now() - t0) / 1000, out: 0, tps: 0, error: String(e) }
  }
}))
for (const r of rows.sort((a, b) => a.s - b.s)) {
  console.log(`${r.host.padEnd(16)} ${r.s.toFixed(1).padStart(5)}s  out ${String(r.out).padStart(5)}  ${String(r.tps).padStart(4)} tok/s ${r.error ? '  ' + r.error.slice(0, 80) : ''}`)
}
