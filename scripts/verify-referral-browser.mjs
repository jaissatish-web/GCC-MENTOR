// Build with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:3618 so Next inlines
// the same loopback address that this isolated fixture listens on.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
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
let linkRequests = 0
let qualificationRequests = 0
let program = 'active'
let hasProfile = true
let incoming = 'incomplete_profile'
const recordedAt = '2026-11-25T12:00:00Z'
const profile = { id: accountId, full_name: 'Synthetic Candidate', updated_at: recordedAt,
  phone: '', email: user.email, target_job_title: 'Engineer', currently_in_gulf: false }
const activity = Array.from({ length: 16 }, (_, i) => ({
  id: `row${String(i).padStart(5, '0')}`, status: i === 0 ? 'qualified' : 'under_review',
  created_at: recordedAt, qualified_at: i === 0 ? recordedAt : null,
}))
const ledger = Array.from({ length: 16 }, (_, i) => ({
  id: 16 - i, kind: ['grant', 'settle', 'reserve', 'release', 'refund', 'expire', 'reverse'][i % 7],
  units: 3, recorded_at: recordedAt, credit_lots: { source: 'referral' },
}))
const databasePaths = []
const supabase = createServer(async (req, res) => {
  const { pathname: path, searchParams } = new URL(req.url, 'http://localhost')
  databasePaths.push(path)
  const single = req.headers.accept?.includes('vnd.pgrst.object')
  const reply = (value, status = 200) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(value))
  }
  if (path === '/auth/v1/user') {
    return req.headers.authorization?.endsWith(accessToken) ? reply(user) : reply({ message: 'Unauthorized' }, 401)
  }
  if (path.includes('referral_') || path.includes('credit_') || path.includes('wallet_') || path.endsWith('/user_service_credits')) {
    if (req.headers.authorization !== 'Bearer fixture-service-key') return reply({ message: 'Unauthorized' }, 401)
  }
  if (path.endsWith('/get_or_create_referral_link')) {
    let body = ''
    for await (const chunk of req) body += chunk
    if (JSON.parse(body).p_user_id !== accountId) return reply({ message: 'Wrong account' }, 403)
    generated = true
    linkRequests++
    return reply({ code, suspended_at: null })
  }
  if (path.endsWith('/record_referral_visit')) return reply([{ claim_id: claim, claim_expires_at: new Date(Date.now() + 86400_000).toISOString() }])
  if (path.endsWith('/qualify_referral')) {
    let body = ''
    for await (const chunk of req) body += chunk
    assert.deepEqual(JSON.parse(body), { p_referred: accountId, p_assessed_profile_version: recordedAt })
    qualificationRequests++
    incoming = 'qualified'
    return reply('qualified')
  }
  if (path.endsWith('/referral_summary')) return reply({ visits: 20, unique_browsers_90d: 17, registrations: 16, qualified: 1, under_review: 15 })
  if (path.endsWith('/wallet_source_summary')) return reply([
    { source: 'referral', available: 9, reserved: 2, earned: 15, used: 4 },
    { source: 'admin_grant', available: 3, reserved: 0, earned: 3, used: 0 },
  ])
  if (path.endsWith('/referral_program_settings')) return reply({ enabled: program !== 'paused', reward_units: program === 'paused' ? 1 : 3, attribution_days: 30 })
  if (path.endsWith('/referral_links')) return reply(generated ? { code, suspended_at: program === 'suspended' ? recordedAt : null } : null)
  if (path.endsWith('/referral_attributions')) {
    if (searchParams.has('referred_id')) return reply({ status: incoming })
    const offset = Number(searchParams.get('offset'))
    return reply(activity.slice(offset, offset + Number(searchParams.get('limit'))))
  }
  if (path.endsWith('/credit_ledger')) {
    const offset = Number(searchParams.get('offset'))
    return reply(ledger.slice(offset, offset + Number(searchParams.get('limit'))))
  }
  if (path.endsWith('/site_content')) return reply(single ? null : [])
  if (path.endsWith('/career_profiles')) return reply(single ? hasProfile ? profile : null : hasProfile ? [profile] : [])
  return reply([])
})
const chrome = process.env.CHROME_PATH
assert.ok(chrome, 'Set CHROME_PATH')
const appPort = Number(process.env.REFERRAL_TEST_PORT ?? '3617')
const origin = 'http://localhost:' + appPort
supabase.listen(3618, '127.0.0.1')
await once(supabase, 'listening')
const dbOrigin = 'http://127.0.0.1:' + supabase.address().port
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(appPort)], {
  env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: dbOrigin, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ci-placeholder-anon-key', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key' },
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
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async text => { window.lastCopiedInvite = text },
    } })
    Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: undefined })
  })
  const screenshots = process.env.REFERRAL_SCREENSHOTS_DIR
  if (screenshots) mkdirSync(screenshots, { recursive: true })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewport({ width, height: 900, isMobile: width < 768, hasTouch: width < 768 })
    const response = await page.goto(origin + '/settings/referrals', { waitUntil: 'domcontentloaded' })
    assert.equal(response.status(), 200)
    await page.waitForSelector('#wallet-heading')
    await page.evaluate(() => document.fonts.ready)
    const walletStyle = await page.$eval('#wallet-heading', node => {
      const wallet = node.closest('section')
      return { heading: getComputedStyle(node).color, label: getComputedStyle(wallet.querySelector('dt')).color,
        amountSize: Number.parseFloat(getComputedStyle(wallet.querySelector('dd span')).fontSize) }
    })
    assert.deepEqual(walletStyle, { heading: 'rgb(255, 255, 255)', label: 'rgb(211, 229, 237)', amountSize: 34 })
    assert.match(await page.$eval('h1', node => node.textContent), /Referral & Credits/)
    assert.match(await page.$eval('[aria-labelledby="wallet-heading"]', node => node.textContent), /Available credits12.*Total earned18.*Total used4.*Reserved2/)
    assert.match(await page.$eval('#invite', node => node.textContent), /\+3 credits/)
    assert.equal(await page.$$('#activity li').then(items => items.length), 15)
    assert.equal(await page.$$('#ledger li').then(items => items.length), 15)
    assert.match(await page.$eval('#ledger', node => node.textContent), /Credits addedReferral\+3 credits.*Credits usedReferral−3 credits/)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal overflow at ' + width)
    if (!generated) {
      const button = await page.waitForSelector('button::-p-text(Generate referral link)')
      await button.click()
    }
    await page.waitForSelector('input[type="url"]')
    assert.match(await page.$eval('input[type="url"]', node => node.value), new RegExp(code + '$'))
    assert.equal(await page.$$('ul[aria-label="Share invite via"] a svg').then(icons => icons.length), 6)
    assert.equal(await page.$eval('#invite textarea', node => node.closest('details').open), false, 'Editor starts closed')
    assert.ok(await page.$eval('#invite button[aria-label="Copy referral link"]', node => node.getBoundingClientRect().height >= 44))
    if (screenshots && [390, 1440].includes(width)) await page.screenshot({ path: join(screenshots, `referrals-${width}.png`), fullPage: true })
    if (width === 390 || width === 1440) {
      assert.equal(await page.$('.studio-sidebar a[href="/settings/referrals"]'), null)
      await page.click('button[aria-label="All services"]')
      await page.waitForSelector('[role="dialog"]')
      assert.equal(await page.$('[role="dialog"] a[href="/settings/referrals"]'), null)
      await page.keyboard.press('Escape')
      await page.waitForSelector('[role="dialog"]', { hidden: true })
    }
    console.log(`PASS referral workspace at ${width}px`)
  }

  await page.click('button[aria-label="Copy referral link"]')
  await page.waitForFunction(expected => window.lastCopiedInvite?.endsWith(expected), {}, code)
  await page.click('#invite summary')
  await page.$eval('#invite textarea', node => { node.setSelectionRange(0, node.value.length) })
  await page.type('#invite textarea', 'Try GCC Mentor.')
  const whatsapp = await page.$eval('a[aria-label="Share via WhatsApp"]', node => node.href)
  assert.equal(new URL(whatsapp).searchParams.get('text'), 'Try GCC Mentor. ' + await page.$eval('input[type="url"]', node => node.value))
  await page.click('button::-p-text(Share Invite Link)')
  await page.waitForFunction(() => window.lastCopiedInvite?.startsWith('Try GCC Mentor. '))
  await page.evaluate(() => { navigator.share = async payload => { window.lastSharedInvite = payload } })
  await page.click('button::-p-text(Share Invite Link)')
  await page.waitForFunction(expected => window.lastSharedInvite?.text === 'Try GCC Mentor.' && window.lastSharedInvite.url.endsWith(expected), {}, code)
  await page.click('button::-p-text(Copy message)')
  await page.waitForFunction(() => document.body.textContent.includes('Sharing message copied.'))

  await page.click('nav[aria-label="Referral activity pages"] a')
  await page.waitForSelector('#activity time')
  await page.waitForFunction(() => new URLSearchParams(location.search).get('activity') === '2' && document.querySelectorAll('#activity li').length === 1)
  await page.click('nav[aria-label="Credit transaction pages"] a')
  await page.waitForFunction(() => new URLSearchParams(location.search).get('ledger') === '2' && document.querySelectorAll('#ledger li').length === 1)
  assert.equal(new URL(page.url()).searchParams.get('activity'), '2')

  for (const [path, saved] of [['/settings', true], ['/profile', true], ['/profile', false]]) {
    hasProfile = saved
    await page.goto(origin + path, { waitUntil: 'domcontentloaded' })
    const entry = await page.waitForSelector('main a[href="/settings/referrals"]')
    await entry.click()
    await page.waitForSelector('#wallet-heading')
    assert.equal(new URL(page.url()).pathname, '/settings/referrals')
  }
  hasProfile = true
  await page.click('#joining input[name="confirmed"]')
  await page.click('#joining button[type="submit"]')
  await page.waitForFunction(() => new URLSearchParams(location.search).get('qualification') === 'qualified')
  assert.equal(await page.$('#joining'), null)
  assert.equal(qualificationRequests, 1)

  for (const state of ['suspended', 'paused']) {
    program = state
    await page.goto(origin + '/settings/referrals', { waitUntil: 'domcontentloaded' })
    assert.ok(await page.$('input[aria-label="Permanent referral link"]'))
    assert.equal(await page.$('button[aria-label="Copy referral link"]'), null)
    assert.equal(await page.$('ul[aria-label="Share invite via"]'), null)
  }
  assert.equal(linkRequests, 1)
  assert.deepEqual(browserErrors, [])
  console.log('Referral browser checks passed: access and visit capture, Settings and Profile entry points, link reuse, copy and sharing, qualification, paused links, wallet history and pagination at 320, 390, 768 and 1440px.')
} catch (error) {
  console.error(logs.slice(-1400))
  throw error
} finally {
  await browser?.close()
  next.kill()
  await new Promise((resolve) => supabase.close(resolve))
}
