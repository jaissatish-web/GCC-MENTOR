/** Actual resume-preview browser regression, with isolated fake API responses.
 * CHROME_PATH=/path/to/chromium npm run test:preview
 * No production data, credentials, server, AI calls or new dependencies.
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import puppeteer from 'puppeteer-core'

const require = createRequire(import.meta.url)
const root = process.cwd()
const scratch = mkdtempSync(join(tmpdir(), 'gcc-preview-save-'))
let browser
try {
  const fixtureResult = spawnSync(process.execPath, ['-r', 'sucrase/register', '-e', `
    require('./scripts/resolve-paths');
    const fixture = require('./scripts/fixtures/templateFixture').makeTemplateFixture();
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
  const executablePath = process.env.CHROME_PATH || puppeteer.executablePath?.()
  assert.ok(executablePath, 'Set CHROME_PATH to your installed Chrome/Chromium executable.')
  browser = await puppeteer.launch({ executablePath, headless: true, pipe: true,
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
          pkg.name = update.name || null
        }
        return json(200, { package: pkg })
      }
      if (url.pathname === '/photo.jpg') return request.respond({ status: 200, contentType: 'image/jpeg', body: readFileSync(join(root, 'public/sample/sample-headshot.jpg')) })
      return request.abort()
    } catch (error) { errors.push(error.message); await request.abort() }
  })
  const load = async (query = '?tab=design') => {
    await page.goto(`https://preview.test/${query}`, { waitUntil: 'networkidle0' })
    await page.waitForSelector('[aria-label="Resume name"]')
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
    }, {}, expected)
  }
  const rename = async (name) => {
    await page.$eval('[aria-label="Resume name"]', (element, value) => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(element, value)
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }, name)
  }
  for (const raw of [true, false]) {
    reset(raw); await load(); await blocked(false)
    const snapshot = JSON.stringify(pkg.document_snapshot)
    const names = await page.$$eval('[aria-label="Resume templates"] > button', buttons => buttons.map(button => button.getAttribute('aria-label').split(' — ')[0]))
    assert.equal(names.length, 53, 'Every template stays available to every profession')
    assert.equal(new Set(names).size, 50, 'Template names remain distinct')
    assert.ok(names.every(name => /^(Gulf|GCC) /.test(name)), 'Every template has a neutral Gulf name')
    assert.equal(await page.$('[aria-label="Filter templates by field"]'), null, 'No profession filter implies a restriction')
    await page.click('[aria-controls="text-style-panel"]')
    await click('Large'); await blocked(true)
    await click('Helvetica'); await page.click('button[aria-label="Navy"]'); await click('Dark')
    await blocked(true)
    assert.equal(writes.length, 0, 'Changing style does not save silently')
    await rename('My Master Engineering CV')
    await page.click('[aria-label^="Gulf Classic —"]'); await blocked(true)
    assert.equal(writes.length, 0, 'Changing template does not save silently')
    failSave = true
    await click('Save changes')
    await page.waitForFunction(() => document.body.textContent.includes('Save failed.'))
    await blocked(true)
    failSave = false; pendingSave = true
    await click('Save changes')
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some((e) => e.textContent.trim() === 'Saving…' && e.disabled))
    await blocked(true)
    await rename('Changed during save')
    assert.equal(writes.length, 2)
    releaseSave(); pendingSave = false
    await page.waitForFunction(() => document.body.textContent.includes('Save changes to enable PDF download.'))
    await blocked(true)
    assert.equal(pkg.name, 'My Master Engineering CV', 'First save captures the clicked draft')
    await click('Save changes'); await blocked(false)
    assert.equal(pkg.name, 'Changed during save')
    assert.equal(pkg.template_id, 'ats_classic')
    assert.equal(writes.at(-1).styleOverrides.size, 'large')
    assert.equal(writes.at(-1).styleOverrides.accent, 'navy')
    assert.equal(writes.at(-1).styleOverrides.font, 'sans')
    assert.equal(writes.at(-1).styleOverrides.ink, 'dark')
    assert.equal(JSON.stringify(pkg.document_snapshot), snapshot, 'Preferences never overwrite content snapshots')
    await load(); await blocked(false)
    await page.click('[aria-label^="Gulf Creative —"]'); await blocked(true)
    await click('Undo changes'); await blocked(false)
    await page.click('[aria-label^="Gulf Creative —"]'); await click('Save changes'); await blocked(false)
    await click('Reset to template default'); await blocked(true)
    await click('Save changes'); await blocked(false)
    assert.equal(pkg.style_overrides, null, 'Reset saves template defaults')
    await load('?tab=design&template=ats_classic'); await blocked(true)
    await click('Save changes'); await blocked(false)
    assert.equal(pkg.template_id, 'ats_classic')
    await load('?tab=design&template=creative_gcc'); await blocked(true)
    await click('Undo changes'); await blocked(false)
    console.log(`PASS ${raw ? 'Career Profile' : 'optimized'} preview: styles, template, name, failure, retry, pending save, concurrent edit, reset, undo, gallery and reload`)
  }
  reset(); await load(); pendingPhoto = true
  assert.equal(await page.$eval('[aria-controls="photo-settings-panel"]', el => el.getAttribute('aria-expanded')), 'false')
  assert.equal(await page.$eval('#photo-settings-panel', el => el.hidden), true, 'Photo controls start collapsed')
  await page.click('[aria-controls="photo-settings-panel"]')
  assert.equal(await page.$eval('#photo-settings-panel', el => el.hidden), false, 'Photo controls expand')
  await (await page.$('[aria-label="Choose profile photo"]')).uploadFile(join(root, 'public/sample/sample-headshot.jpg'))
  await blocked(true)
  await page.click('[aria-controls="photo-settings-panel"]')
  assert.equal(await page.$eval('#photo-settings-panel', el => el.hidden), true, 'Photo controls collapse during upload without interrupting it')
  releasePhoto(); pendingPhoto = false
  await blocked(false)
  assert.equal(writes.length, 0, 'Photo keeps its existing immediate Career Profile save')
  mkdirSync('artifacts/preview-settings', { recursive: true })
  for (const width of [320, 390, 768, 1440]) {
    reset(); await page.setViewport({ width, height: 960 }); await load()
    if (width < 1024) {
      assert.equal(await page.$eval('.editor-settings-panel', el => el.open), false, 'Mobile opens on the document, not the settings')
      await click('Templates')
      await page.waitForFunction(() => document.querySelector('.editor-settings-panel').open)
      assert.equal(await page.$$eval('[aria-label="Resume templates"] > button', buttons => buttons.length), 50)
      await page.click('[aria-label^="Gulf Premium —"]'); await blocked(true)
      await page.keyboard.press('Escape')
      await page.waitForFunction(() => !document.querySelector('.editor-settings-panel').open)
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), 'Templates', 'Escape returns focus to the design control')
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      assert.ok(await page.$eval('[aria-label="Save and download CV"]', el => { const rect = el.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight }), 'Save/download remain visible after scrolling the CV')
      await click('Save changes'); await blocked(false)
      await click('Text')
      await page.waitForFunction(() => document.querySelector('.editor-settings-panel').open)
      await click('Large'); await blocked(true)
      await click('Back to preview')
      await page.waitForFunction(() => !document.querySelector('.editor-settings-panel').open)
      await click('Save changes'); await blocked(false)
      await click('Photo')
      await page.waitForFunction(() => document.querySelector('.editor-settings-panel').open)
      assert.equal(await page.$eval('#photo-settings-panel', el => el.hidden), false)
      await page.keyboard.press('Tab')
      assert.ok(await page.evaluate(() => document.querySelector('.editor-settings-panel').contains(document.activeElement)), 'Sheet keeps keyboard focus inside')
      if (width === 390) {
        pendingPhoto = true
        await (await page.$('[aria-label="Choose profile photo"]')).uploadFile(join(root, 'public/sample/sample-headshot.jpg'))
        await blocked(true)
        await click('Back to preview')
        releasePhoto(); pendingPhoto = false
        await blocked(false)
        await click('Photo')
        await page.waitForFunction(() => document.querySelector('.editor-settings-panel').open)
      }
      await page.screenshot({ path: `artifacts/preview-settings/settings-${width}.png`, fullPage: false })
      await click('Back to preview')
      await page.waitForFunction(() => !document.querySelector('.editor-settings-panel').open)
      await page.screenshot({ path: `artifacts/preview-settings/preview-${width}.png`, fullPage: false })
    } else {
      await page.click('[aria-controls="photo-settings-panel"]')
      assert.equal(await page.$eval('#photo-settings-panel', el => el.hidden), false)
      await page.click('[aria-controls="text-style-panel"]')
      assert.equal(await page.$eval('[aria-controls="photo-settings-panel"]', el => el.getAttribute('aria-expanded')), 'true', 'Text and photo panels expand independently')
      await page.click('[aria-controls="text-style-panel"]')
      await page.click('[aria-controls="photo-settings-panel"]')
      await page.screenshot({ path: `artifacts/preview-settings/settings-${width}.png`, fullPage: false })
    }
    await rename('My Master Engineering CV'); await blocked(true)
    if (css) assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow at ${width}px`)
    await click('Save changes'); await blocked(false)
  }
  assert.deepEqual(errors, [])
  console.log(`PASS responsive save/download controls at 320, 390, 768 and 1440px${css ? ' with production CSS' : ' (build first to also check CSS overflow)'}`)
  console.log('PASS photo upload disables PDF while saving; no browser errors or real API calls')
} finally {
  if (browser) await browser.close()
  rmSync(scratch, { recursive: true, force: true })
}
