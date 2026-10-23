/** VISUAL-010 actual PackageScreen integration with isolated fake API responses.
 * CHROME_PATH=/path/to/chromium node scripts/verify-visual-template-workflow.mjs
 * Add --responsive-only to run just 10 designs × 5 viewport sizes.
 * No production data, credentials, server, AI calls or new dependencies.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import puppeteer from 'puppeteer'

const require = createRequire(import.meta.url)
const root = process.cwd()
const scratch = mkdtempSync(join(tmpdir(), 'gcc-visual-preview-'))
let browser
try {
  const fixtureResult = spawnSync(process.execPath, ['-r', 'sucrase/register', '-e', `
    require('./scripts/resolve-paths');
    const fixture = require('./scripts/fixtures/templateFixture').makeTemplateFixture();
    fixture.templates = require('./lib/templates').availableTemplates().map(t => ({id:t.id,name:t.name}));
    fixture.document = require('./lib/resumeDocument').buildResumeDocument({
      profile: fixture.profile, optimizedContent: fixture.optimizedContent, skillsOrder: fixture.skillsOrder
    });
    console.log(JSON.stringify(fixture));
  `], { cwd: root, encoding: 'utf8' })
  assert.equal(fixtureResult.status, 0, fixtureResult.stderr)
  const fixture = JSON.parse(fixtureResult.stdout)
  writeFileSync(join(scratch, 'entry.mjs'), `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {PackageScreen} from ${JSON.stringify(join(root, 'app/package/[id]/PackageScreen.tsx'))};
    createRoot(document.getElementById('root')).render(React.createElement(PackageScreen,{id:'preview-fixture'}));
  `)
  writeFileSync(join(scratch, 'navigation.js'), `
    const router = {push:()=>{},replace:(url)=>history.replaceState(null,'',url)};
    export function useRouter(){return router}
    export function useSearchParams(){return new URLSearchParams(location.search)}
  `)
  writeFileSync(join(scratch, 'link.js'), `
    import React from 'react'; export default function Link(props){return React.createElement('a',props)}
  `)
  writeFileSync(join(scratch, 'loader.cjs'), `module.exports=function(source){return require(${JSON.stringify(require.resolve('sucrase'))}).transform(source,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true,filePath:this.resourcePath}).code}`)
  const webpack = require('next/dist/compiled/webpack/webpack')
  webpack.init()
  await new Promise((yes, no) => webpack.webpack({
    mode: 'development', devtool: false, entry: join(scratch, 'entry.mjs'),
    output: { path: scratch, filename: 'fixture.js' },
    resolve: { extensions: ['.tsx', '.ts', '.js', '.mjs'], alias: {
      '@': root, 'next/navigation': join(scratch, 'navigation.js'), 'next/link': join(scratch, 'link.js'),
    }, modules: [join(root, 'node_modules'), 'node_modules'] },
    module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: join(scratch, 'loader.cjs') }] },
  }, (error, stats) => error || stats.hasErrors() ? no(error ?? new Error(stats.toString({ errors: true }))) : yes()))
  const executablePath = process.env.CHROME_PATH || await puppeteer.executablePath({ headless: 'shell' })
  assert.ok(executablePath, 'Set CHROME_PATH to your installed Chrome/Chromium executable.')
  browser = await puppeteer.launch({ executablePath, headless: 'shell', pipe: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
  const cssPath = join(root, '.next/static/css')
  let css = existsSync(cssPath) ? readdirSync(cssPath).filter((file) => file.endsWith('.css')).map((file) => readFileSync(join(cssPath, file), 'utf8')).join('\n') : ''
  const builtLanding = existsSync(join(root, '.next/server/app/index.html')) ? readFileSync(join(root, '.next/server/app/index.html'), 'utf8') : ''
  const bodyClass = builtLanding.match(/<body[^>]*class="([^"]+)"/)?.[1] ?? ''
  css = css.replace(/url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g, (_, url) => {
    const fontPath = join(root, '.next/static/media', url.split('/').at(-1))
    return existsSync(fontPath) ? `url("data:font/woff2;base64,${readFileSync(fontPath).toString('base64')}")` : `url("${url}")`
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1440, height: 960 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let profile, pkg, writes, failSave, pendingSave, releaseSave, pendingPhoto, releasePhoto
  const reset = (raw = true) => {
    profile = structuredClone(fixture.profile)
    profile.photo_url = null
    pkg = { id: 'preview-fixture', name: 'My resume', tier: raw ? 'free' : null,
      is_paid: true, status: 'saved', template_id: 'creative_gcc', style_overrides: {},
      created_at: '2026-10-08T00:00:00Z', document_snapshot: raw ? null : fixture.document,
      optimized_content: raw ? null : fixture.optimizedContent, skills_order: fixture.skillsOrder,
      field_visibility_snapshot: { ...profile.field_visibility, photo: true },
      target_job_title: 'Commissioning Engineer', target_country: 'saudi_arabia', optimization_level: 'high' }
    writes = []; failSave = false; pendingSave = false; pendingPhoto = false
  }
  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url())
      if (url.origin !== 'https://preview.test') return request.abort()
      const json = (status, data) => request.respond({ status, contentType: 'application/json', body: JSON.stringify(data) })
      if (url.pathname === '/' || url.pathname.startsWith('/package/')) return request.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div class="app-type" id="root"></div><script src="/fixture.js"></script></body></html>'.replace('</head>', `<style>${css}</style></head>`).replace('<body>', `<body class="${bodyClass}">`) })
      if (url.pathname === '/fixture.js') return request.respond({ status: 200, contentType: 'application/javascript', body: readFileSync(join(scratch, 'fixture.js')) })
      if (url.pathname === '/api/profile/photo') {
        if (pendingPhoto) await new Promise((done) => { releasePhoto = done })
        profile.photo_url = '/photo.jpg'
        return json(200, { photoUrl: profile.photo_url })
      }
      if (url.pathname === '/api/profile') return json(200, profile)
      if (url.pathname === '/api/packages/preview-fixture') {
        if (request.method() === 'PATCH') {
          const update = JSON.parse(request.postData() ?? await request.fetchPostData())
          writes.push(update)
          if (pendingSave) await new Promise((done) => { releaseSave = done })
          if (failSave) return json(500, { error: 'Save failed. Please try again.' })
          pkg.template_id = update.templateId
          pkg.style_overrides = update.styleOverrides
          if (Object.hasOwn(update, 'name')) pkg.name = update.name || null
        }
        return json(200, { package: pkg })
      }
      if (url.pathname === '/photo.jpg') return request.respond({ status: 200, contentType: 'image/jpeg', body: readFileSync(join(root, 'public/sample/sample-headshot.jpg')) })
      return request.abort()
    } catch (error) { errors.push(error.message); await request.abort() }
  })
  const load = async (query = '?tab=design') => {
    await page.goto(`https://preview.test/${query}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('[aria-label="Resume templates"]')
    assert.equal(await page.$('[aria-label="Resume name"]'), null, 'Rename is available only in the library')
  }
  const click = async (label) => {
    const buttons = await page.$$('button')
    for (const button of buttons) {
      if ((await button.evaluate((e) => e.textContent.trim())) === label && await button.evaluate(el => el.getClientRects().length > 0)) { await button.click(); return }
    }
    throw new Error(`Missing button ${label}`)
  }
  const blocked = async (expected) => {
    await page.waitForFunction((shouldBlock) => {
      const visible = element => element.getClientRects().length > 0
      const links = [...document.querySelectorAll('a[href$="/pdf"]')].filter(visible)
      const buttons = [...document.querySelectorAll('button')].filter(e => visible(e) && e.textContent.trim() === 'Download PDF')
      return shouldBlock ? links.length === 0 && buttons.length === 1 && buttons[0].disabled : links.length === 1 && buttons.length === 0
    }, {}, expected).catch(async error => {
      console.error(await page.evaluate(() => ({ text: document.body.innerText.slice(-1200), buttons: [...document.querySelectorAll('button')].filter(e => e.textContent.includes('Download')).map(e => ({ text:e.textContent, disabled:e.disabled, visible:e.getClientRects().length })), links: [...document.querySelectorAll('a[href$="/pdf"]')].map(e => ({ href:e.href, visible:e.getClientRects().length })), errors: [] })))
      throw error
    })
  }
  const designs = [
    ['executive_navy', 'Executive Navy'], ['emerald_professional', 'Emerald Professional'],
    ['royal_blue_modern', 'Royal Blue Modern'], ['graphite_executive', 'Graphite Executive'],
    ['teal_horizon', 'Teal Horizon'], ['burgundy_prestige', 'Burgundy Prestige'],
    ['industrial_pro', 'Industrial Pro'], ['golden_executive', 'Golden Executive'],
    ['sapphire_edge', 'Sapphire Edge'], ['modern_skyline', 'Modern Skyline'],
  ]
  if (!process.argv.includes('--responsive-only')) {
  for (const raw of [true, false]) {
    reset(raw); await load(); await blocked(false)
    const snapshot = JSON.stringify(pkg.document_snapshot)
    assert.equal(await page.$$eval('[aria-label="Resume templates"] > button', buttons => buttons.length), 63)
    for (const [id, name] of designs) {
      await page.click(`[aria-label^="${name} —"]`); await blocked(true)
      await page.click('[aria-controls="text-style-panel"]')
      await click('Large'); await click('Georgia'); if (await page.$eval('button[aria-label="Navy"]', el => el.getAttribute('aria-pressed')) !== 'true') await page.click('button[aria-label="Navy"]')
      await page.click('[aria-controls="text-style-panel"]')
      assert.equal(JSON.stringify(pkg.document_snapshot), snapshot, `${id}: draft changed saved content`)
      await click('Save changes'); await blocked(false)
      assert.equal(pkg.template_id, id)
      assert.equal(pkg.style_overrides.font, 'serif')
      assert.equal(pkg.style_overrides.size, 'large')
      assert.equal(pkg.style_overrides.accent, 'navy')
      assert.equal(JSON.stringify(pkg.document_snapshot), snapshot, `${id}: save changed frozen content`)
      assert(writes.every(update => Object.keys(update).every(key => ['templateId', 'styleOverrides'].includes(key))), 'Design save must contain metadata only')
      await load(); await blocked(false)
      assert.equal(await page.$eval(`[aria-label^="${name} —"]`, el => el.getAttribute('aria-pressed')), 'true', `${id}: saved choice did not survive reload`)
      assert(await page.$('a[href="/api/packages/preview-fixture/pdf"]'), `${id}: existing PDF download enabled`)
      console.log(`PASS saved/reloaded ${id} (${raw ? 'base' : 'optimized'})`)
    }
    await page.click('[aria-label^="Gulf Premium —"]'); await click('Save changes'); await blocked(false)
    await load(); assert.equal(pkg.template_id, 'gulf_premium')
    assert.equal(JSON.stringify(pkg.document_snapshot), snapshot, 'Switching back changed original content')
    console.log(`PASS ${raw ? 'Career Profile' : 'optimized snapshot'}: all 10 new templates selected, customized, saved, reloaded; PDF link gated/enabled; metadata-only saves; switch back`)
  }
  // Every original registry ID also survives the existing select/save/reload path.
  const original = fixture.templates.filter(t => !designs.some(([id]) => id === t.id))
  assert.equal(original.length, 53)
  for (const [i, design] of original.entries()) {
    reset(i % 2 === 0)
    if (pkg.template_id === design.id) pkg.template_id = 'gulf_premium'
    const snapshot = JSON.stringify(pkg.document_snapshot)
    await load(`?tab=design&template=${design.id}`); await blocked(true)
    await click('Save changes'); await blocked(false)
    assert.equal(pkg.template_id, design.id)
    assert.equal(JSON.stringify(pkg.document_snapshot), snapshot, `${design.id}: changed original saved content`)
    await load(); await blocked(false)
    assert.equal(pkg.template_id, design.id)
    console.log(`PASS original save/reload ${design.id}`)
  }
  console.log('PASS original 53 IDs: existing selection via preview link, metadata-only save, reload and unchanged snapshots (alternating base/optimized fixtures).')
  }
  assert(css, 'Production CSS required: run npm run build before this browser check')
  mkdirSync('artifacts/visual-template-workflow', { recursive: true })
  for (const width of [360, 390, 430, 768, 1440]) {
    for (const [id, name] of designs) {
      reset(); pkg.template_id = id
      await page.setViewport({ width, height: 960 }); await load(); await blocked(false)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}: document preview overflows at ${width}px`)
      if (width < 1024) { await click('Templates'); await page.waitForFunction(() => document.querySelector('.editor-settings-panel').open) }
      const card = await page.$(`[aria-label^="${name} —"]`)
      await card.scrollIntoView()
      assert(await card.evaluate(el => {const r = el.getBoundingClientRect(); return r.width > 0 && r.width <= innerWidth + 1}), `${id}: distorted thumbnail at ${width}px`)
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}: template controls overflow at ${width}px`)
      if (width < 1024) { await click('Back to preview'); await page.waitForFunction(() => !document.querySelector('.editor-settings-panel').open) }
      const save = width < 1024 ? await page.$('[aria-label="Save and download resume"]') : await page.$('a[href="/api/packages/preview-fixture/pdf"]')
      assert(save, `${id}: save/download controls absent`)
      await click('Open full-size preview')
      await page.waitForSelector('dialog[open] [aria-label="Document zoom"]')
      await page.waitForFunction(() => document.querySelector('dialog[open] [aria-label="Scrollable resume document"] [data-document-preview]').getBoundingClientRect().width <= innerWidth)
      await click('Close preview')
      if (width === 390) await page.screenshot({ path: `artifacts/visual-template-workflow/${id}-${width}.png`, fullPage: false })
    }
    console.log(`PASS all 10 new templates at ${width}px: existing preview, thumbnail and save/download controls; no page overflow`)
  }
  assert.deepEqual(errors, [], 'Browser errors')
  console.log('PASS synthetic PackageScreen workflow only: fake API persistence, actual existing components; real authenticated database save and PDF HTTP download not certified by this harness.')
} finally {
  if (browser) await browser.close()
  rmSync(scratch, { recursive: true, force: true })
}
