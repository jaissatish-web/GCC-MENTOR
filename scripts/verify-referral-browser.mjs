import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { setTimeout } from 'node:timers/promises'
import puppeteer from 'puppeteer-core'

const accountId = '78740a19-a125-4c71-a1bd-754bcab9b47a'
const code = 'F1ED03B3BC1C4D4BB05B1FEF'
const claim = '58a78270-6dd0-45ec-b059-e86aacecc0d3'
const user = { id: accountId, aud: 'authenticated', role: 'authenticated', email: 'referral-e2e@example.test', email_confirmed_at: '2026-11-25T00:00:00Z', app_metadata: {}, user_metadata: {}, created_at: '2026-11-25T00:00:00Z' }
const json = value => Buffer.from(JSON.stringify(value)).toString('base64url')
const validFor = 7200
const accessToken = [json({ alg: 'HS256', typ: 'JWT' }), json({ sub: accountId, aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + validFor }), 'synthetic-signature'].join('.')
const session = 'base64-' + json({ access_token: accessToken, refresh_token: 'fixture-refresh', expires_at: Math.floor(Date.now() / 1000) + validFor, expires_in: validFor, token_type: 'bearer', user })
let generated = false
let paidQuery = 0
const databasePaths = []
const supabase = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  databasePaths.push(path)
  const rpc = path.startsWith('/rest/v1/rpc/')
  const single = req.headers.accept?.includes('vnd.pgrst.object')
  const reply = (value, status = 200) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(value))
  }
  if (path === '/auth/v1/user') {
    return req.headers.authorization?.endsWith(accessToken) ? reply(user) : reply({ message: 'Unauthorized' }, 401)
  }
  if (rpc || path.includes('referral_') || path.includes('credit_') || path.endsWith('/user_service_credits')) {
    if (req.headers.authorization !== 'Bearer fixture-service-key') return reply({ message: 'Unauthorized' }, 401)
  }
  if (path.endsWith('/get_or_create_referral_link')) {
    let body = ''
    for await (const chunk of req) body += chunk
    if (JSON.parse(body).p_user_id !== accountId) return reply({ message: 'Wrong account' }, 403)
    generated = true
    paidQuery++
    return reply({ code, suspended_at: null })
  }
  if (path.endsWith('/record_referral_visit')) return reply([{ claim_id: claim, claim_expires_at: new Date(Date.now() + 86400_000).toISOString() }])
  if (path.endsWith('/referral_summary')) return reply({ visits: 0, registrations: 0, qualified: 0 })
  if (path.endsWith('/wallet_source_summary')) return reply([])
  if (path.endsWith('/referral_program_settings')) return reply({ enabled: true, reward_units: 3, attribution_days: 30 })
  if (path.endsWith('/referral_links')) return reply(generated ? { code, suspended_at: null } : null)
  if (path.endsWith('/referral_attributions') && new URL(req.url, 'http://localhost').searchParams.has('referred_id')) return reply(null)
  if (path.endsWith('/site_content') || path.endsWith('/career_profiles')) return reply(single ? null : [])
  return reply([])
})
const chrome = process.env.CHROME_PATH
assert.ok(chrome, 'Set CHROME_PATH')
const appPort = Number(process.env.REFERRAL_TEST_PORT ?? '3617')
const origin = 'http://localhost:' + appPort
supabase.listen(0, '127.0.0.1')
await once(supabase, 'listening')
const dbOrigin = 'http://127.0.0.1:' + supabase.address().port
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: dbOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-publishable-key', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
next.stdout.on('data', chunk => { logs += chunk.toString() })
next.stderr.on('data', chunk => { logs += chunk.toString() })

let browser
try {
  for (let attempt = 0; attempt < 50; attempt++) {
    if ((await fetch(origin + '/signup').catch(() => null))?.ok) break
    if (next.exitCode !== null || attempt === 49) throw new Error('Next never started: ' + logs)
    await setTimeout(200)
  }
  browser = await puppeteer.launch({ executablePath: chrome, headless: true, pipe: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  const browserErrors = []
  const redirects = []
  page.on('response', reply => {
    if (reply.url().startsWith(origin) && reply.status() >= 300 && reply.status() < 400) {
      redirects.push({ path: new URL(reply.url()).pathname, location: reply.headers().location,
        cookieWasSet: Boolean(reply.headers()['set-cookie']), destination: reply.request().headers()['sec-fetch-dest'] })
    }
  })
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.goto(origin + '/settings/referrals', { waitUntil: 'domcontentloaded' })
  assert.equal(new URL(page.url()).pathname, '/login')
  assert.equal((await fetch(origin + '/api/referrals/link', { method: 'POST' })).status, 401)

  await page.goto(origin + '/?ref=' + code, { waitUntil: 'domcontentloaded' })
  assert.equal(new URL(page.url()).pathname, '/')
  const visitorCookies = await page.cookies(origin)
  assert.equal(visitorCookies.find(cookie => cookie.name === 'gcc_referral_claim')?.value, claim, JSON.stringify({ redirects, databasePaths }))
  assert.equal(visitorCookies.find(cookie => cookie.name === 'gcc_referral_claim')?.httpOnly, true)

  await page.setCookie({ name: 'sb-127-auth-token', value: session, url: origin, httpOnly: true })
  for (const width of [360, 768, 1440]) {
    await page.setViewport({ width, height: 900 })
    const response = await page.goto(origin + '/settings/referrals', { waitUntil: 'networkidle0' })
    assert.equal(response.status(), 200)
    assert.match(await page.$eval('h1', node => node.textContent), /Referral & Credits/)
    await page.waitForFunction(() => document.body.textContent.includes('Referral performance'))
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at ' + width)
    if (generated) {
      await page.waitForSelector('input[type="url"]')
      assert.match(await page.$eval('input[type="url"]', node => node.value), new RegExp(code + '$'))
    } else {
      const button = await page.waitForSelector('button::-p-text(Generate referral link)')
      await button.click()
      await page.waitForSelector('input[type="url"]')
    }
    const whatsapp = await page.$eval('a[href^="https://wa.me"]', node => node.href)
    assert.match(decodeURIComponent(whatsapp), new RegExp(code))
    assert.ok(await page.$('textarea'))
  }
  assert.equal(paidQuery, 1)
  assert.deepEqual(browserErrors, [])
  console.log('Referral browser smoke passed: anonymous guard and first-party capture, signed-in generation, page reload, share and layout at 360, 768 and 1440px.')
} catch (error) {
  console.error(logs.slice(-1400))
  throw error
} finally {
  await browser?.close()
  next.kill()
  await new Promise((resolve) => supabase.close(resolve))
}
