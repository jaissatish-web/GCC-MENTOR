/** Actual client components, isolated browser/API fixtures; no production account or AI spend.
 * CHROME_PATH=/path/to/chromium npm run test:linkedin
 */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import puppeteer from 'puppeteer-core'
const require = createRequire(import.meta.url)
const root = process.cwd(),
  scratch = mkdtempSync(join(tmpdir(), 'gcc-linkedin-ui-'))
let browser
try {
  const result = spawnSync(
    process.execPath,
    [
      '-r',
      'sucrase/register',
      '-e',
      "require('./scripts/resolve-paths'); console.log(JSON.stringify(require('./scripts/fixtures/templateFixture').makeTemplateFixture().profile))",
    ],
    { encoding: 'utf8' },
  )
  assert.equal(result.status, 0, result.stderr)
  const profile = JSON.parse(result.stdout)
  const setup = {
    source: 'career',
    mode: 'existing',
    goal: 'job',
    targetRoles: 'Engineer',
    industries: 'Energy',
    countries: 'Saudi Arabia',
    language: 'English',
    tone: 'professional',
    experienceIds: profile.work_experience.map((entry) => entry.id),
    jobDescriptions: '',
    instructions: '',
    omitTerms: [],
  }
  const output = {
    headlines: [
      'Engineering professional',
      'Instrumentation and commissioning',
      'Project delivery specialist',
    ],
    about:
      'My saved engineering work supports safe commissioning.\n\nI am interested in relevant Gulf opportunities.',
    experience: profile.work_experience.map((entry) => ({
      id: entry.id,
      description: entry.description || entry.role,
    })),
    skills: profile.skills.slice(0, 10).map((entry) => entry.name),
    advice: [
      'Emphasize documented contributions.',
      'Keep relevant skills visible.',
      'Add genuine work samples.',
    ],
  }
  writeFileSync(
    join(scratch, 'entry.mjs'),
    `import React from 'react';import{createRoot}from'react-dom/client';import{LinkedInWorkspace}from${JSON.stringify(join(root, 'components/linkedin/LinkedInWorkspace.tsx'))};createRoot(document.getElementById('root')).render(React.createElement(LinkedInWorkspace));`,
  )
  writeFileSync(
    join(scratch, 'link.js'),
    "import React from 'react';export default function Link(props){return React.createElement('a',props)}",
  )
  writeFileSync(
    join(scratch, 'image.js'),
    "import React from 'react';export default function Image({unoptimized,...props}){return React.createElement('img',props)}",
  )
  writeFileSync(
    join(scratch, 'loader.cjs'),
    `module.exports=function(source){return require(${JSON.stringify(require.resolve('sucrase'))}).transform(source,{transforms:['typescript','jsx'],jsxRuntime:'automatic',production:true,filePath:this.resourcePath}).code}`,
  )
  const webpack = require('next/dist/compiled/webpack/webpack')
  webpack.init()
  await new Promise((yes, no) =>
    webpack.webpack(
      {
        mode: 'development',
        devtool: false,
        entry: join(scratch, 'entry.mjs'),
        output: { path: scratch, filename: 'fixture.js' },
        resolve: {
          extensions: ['.tsx', '.ts', '.js', '.mjs'],
          alias: {
            '@': root,
            'next/link': join(scratch, 'link.js'),
            'next/image': join(scratch, 'image.js'),
          },
          modules: [join(root, 'node_modules'), 'node_modules'],
        },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              exclude: /node_modules/,
              use: join(scratch, 'loader.cjs'),
            },
          ],
        },
      },
      (error, stats) =>
        error || stats.hasErrors()
          ? no(error ?? new Error(stats.toString({ errors: true })))
          : yes(),
    ),
  )
  const landing = readFileSync('.next/server/app/index.html', 'utf8')
  const bodyClass = /<body class="([^"]+)"/.exec(landing)[1]
  const cssFiles = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(match => match[1]))]
  assert.ok(cssFiles.length, 'Run npm run build before this browser check.')
  const css = cssFiles.map(file => readFileSync(file.replace('/_next/', '.next/'), 'utf8')).join('\n')
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
    headless: true,
    pipe: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
    ],
  })
  const page = await browser.newPage(),
    errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  let draft = null,
    missing = false,
    failSave = false,
    writes = [],
    generateRequests = [],
    conflictMode = false,
    pendingSave = false,
    releaseSave
  const newDraft = () => ({
    user_id: profile.user_id,
    revision: 'revision-1',
    imported: null,
    setup,
    output: structuredClone(output),
    selected_headline: 0,
    completed: [],
    skipped: [],
    profile_fingerprint: 'fingerprint',
    updated_at: '2026-10-09T00:00:00Z',
  })
  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    try {
      const url = new URL(request.url())
      if (url.origin !== 'https://preview.test') return request.abort()
      const json = (status, body) =>
        request.respond({
          status,
          contentType: 'application/json',
          body: JSON.stringify(body),
        })
      if (url.pathname === '/')
        return request.respond({
          status: 200,
          contentType: 'text/html',
          body: `<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body class="${bodyClass}"><div class="app-type" id="root"></div><script src="/fixture.js"></script></body></html>`,
        })
      if (url.pathname.startsWith('/_next/static/media/'))
        return request.respond({status: 200, contentType: 'font/woff2', body: readFileSync(url.pathname.replace('/_next/', '.next/'))})
      if (url.pathname === '/fixture.js')
        return request.respond({
          status: 200,
          contentType: 'application/javascript',
          body: readFileSync(join(scratch, 'fixture.js')),
        })
      if (url.pathname === '/api/profile')
        return json(
          missing ? 404 : 200,
          missing
            ? { error: 'Profile not found' }
            : { ...profile, photo_url: null },
        )
      if (url.pathname === '/api/linkedin') {
        if (request.method() === 'PATCH') {
          const body = JSON.parse(request.postData())
          writes.push(body)
          if (pendingSave) await new Promise((done) => { releaseSave = done })
          if (failSave) return json(503, { error: 'Fixture save failed' })
          draft = {
            ...draft,
            ...body,
            revision: `revision-${writes.length + 1}`,
          }
          return json(200, { draft })
        }
        return json(missing ? 422 : 200, {
          draft,
          fingerprint: 'fingerprint',
          conflicts: [],
          stale: false,
        })
      }
      if (url.pathname === '/api/linkedin/generate') {
        const body = JSON.parse(request.postData())
        generateRequests.push(body)
        draft = { ...newDraft(), setup: body.setup }
        return json(200, { draft, fingerprint: 'fingerprint', stale: false })
      }
      if (url.pathname === '/api/linkedin/import') {
        draft = {
          ...newDraft(),
          output: null,
          imported: {
            id: 'imported',
            fullName: profile.full_name,
            summary: 'Imported summary',
            experience: [],
            warnings: ['Review the extracted dates.'],
          },
        }
        return json(200, {
          draft,
          fingerprint: 'fingerprint',
          conflicts: conflictMode
            ? [
                {
                  id: 'date-conflict',
                  label: 'Start date differs',
                  profileValue: '2020',
                  importedValue: '2021',
                },
              ]
            : [],
        })
      }
      if (url.pathname.endsWith('.jpg'))
        return request.respond({
          status: 200,
          contentType: 'image/jpeg',
          body: readFileSync(
            join(root, 'public/landing/who-any-profession.jpg'),
          ),
        })
      return request.abort()
    } catch (error) {
      errors.push(error.message)
      await request.abort().catch(() => {})
    }
  })
  const click = async (text) => {
    const matches = await page.$$('button')
    for (const button of matches)
      if (
        (await button.evaluate((node) => node.textContent))
          .replace(/\s+/g, ' ')
          .trim() === text
      ) {
        await button.click()
        return
      }
    throw new Error(
      `Button not found: ${text}; buttons=${JSON.stringify(await page.$$eval('button', (nodes) => nodes.map((node) => node.textContent)))}`,
    )
  }
  const disabled = (text) =>
    page.evaluate(
      (text) =>
        [...document.querySelectorAll('button')].find(
          (node) => node.textContent.trim() === text,
        )?.disabled,
      text,
    )
  const ready = () =>
    page.waitForFunction(
      () => !document.body.textContent.includes('Loading your Career Profile'),
    )
  const fits = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      'horizontal overflow',
    )
  for (const width of [320, 390, 768, 1440]) {
    draft = null
    missing = false
    await page.setViewport({ width, height: 900 })
    await page.goto('https://preview.test')
    await ready()
    await page.evaluate(() => document.fonts.ready)
    await fits()
    if (process.env.LINKEDIN_SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.LINKEDIN_SCREENSHOT_DIR, `linkedin-setup-${width}.png`), fullPage: true })
    assert.ok(await page.$('h1'))
    if (width < 640) {
      assert.equal(await page.$eval('h1', el => getComputedStyle(el).fontSize), '22px')
      assert.equal(await page.$eval('h2', el => getComputedStyle(el).fontWeight), '600')
    }
    await click('Continue')
    await fits()
    const roleField = await page.$(
      'input[placeholder="For example: Staff Nurse, Finance Analyst"]',
    )
    await roleField.focus()
    await page.keyboard.down('Control')
    await page.keyboard.press('KeyA')
    await page.keyboard.up('Control')
    await roleField.type('Staff Nurse')
    await click('Review setup')
    await click('Optimize LinkedIn')
    await page.waitForSelector('textarea[aria-label="About content"]')
    await fits()
    assert.equal(generateRequests.at(-1).setup.targetRoles, 'Staff Nurse')
    if (width < 640) {
      assert.equal(await page.$eval('h2', el => getComputedStyle(el).fontSize), '16px')
      assert.equal(await page.$eval('textarea', el => getComputedStyle(el).fontSize), '16px')
    }
    assert.equal(await disabled('Changes saved'), true)
    if (process.env.LINKEDIN_SCREENSHOT_DIR) await page.screenshot({path: join(process.env.LINKEDIN_SCREENSHOT_DIR, `linkedin-results-${width}.png`), fullPage: true})
    await click('Preview your optimized profile')
    await page.waitForSelector('[data-testid="linkedin-preview"]')
    await fits()
    const preview = await page.$eval('[data-testid="linkedin-preview"]', el => ({
      body: getComputedStyle(el.querySelector('.linkedin-profile-headline')).fontSize,
      metadata: getComputedStyle(el.querySelector('.linkedin-profile-card p.text-sm')).fontSize,
      family: getComputedStyle(el.querySelector('h2')).fontFamily,
      weight: getComputedStyle(el.querySelector('.linkedin-profile-headline')).fontWeight,
      name: getComputedStyle(el.querySelector('.linkedin-profile-name')).fontSize,
      cardX: el.querySelector('section').getBoundingClientRect().x,
      cardWidth: el.querySelector('section').getBoundingClientRect().width,
    }))
    assert.equal(preview.body, '14px')
    assert.equal(preview.metadata, '14px')
    assert.ok(preview.family.includes('Arial'))
    assert.equal(preview.weight, '400')
    assert.equal(preview.name, '20px')
    if (width < 640) {
      assert.equal(preview.cardX, 0, 'Phone profile card reaches the screen edge')
      assert.equal(preview.cardWidth, width)
    }
    assert.ok(
      await page.evaluate(() =>
        document.body.textContent.includes('Illustrative preview'),
      ),
    )
    if (process.env.LINKEDIN_SCREENSHOT_DIR)
      await page.screenshot({
        path: join(
          process.env.LINKEDIN_SCREENSHOT_DIR,
          `linkedin-preview-${width}.png`,
        ),
        fullPage: true,
      })
    await click('← Back to your content')
  }
  // User editing resets a completed task; failed save preserves edits for retry.
  draft.completed = ['about']
  await page.reload()
  await ready()
  const about = await page.$('textarea[aria-label="About content"]')
  await about.focus()
  await page.keyboard.down('Control')
  await page.keyboard.press('KeyA')
  await page.keyboard.up('Control')
  await about.type('My revised professional story.')
  assert.equal(await disabled('Save changes'), false)
  failSave = true
  await click('Save changes')
  await page.waitForFunction(() =>
    document.body.textContent.includes('Fixture save failed'),
  )
  assert.equal(
    await page.$eval(
      'textarea[aria-label="About content"]',
      (node) => node.value,
    ),
    'My revised professional story.',
  )
  assert.equal(writes.at(-1).completed.includes('about'), false)
  failSave = false
  await click('Save changes')
  await page.waitForFunction(() =>
    document.body.textContent.includes('Your changes and checklist are saved.'),
  )
  pendingSave = true
  const pendingAbout = await page.$('textarea[aria-label="About content"]')
  await pendingAbout.type(' Reviewed.')
  await click('Save changes')
  await page.waitForFunction(() => document.querySelector('textarea[aria-label="About content"]').matches(':disabled'))
  assert.ok(await page.$eval('input[type="radio"]', (node) => node.matches(':disabled')))
  pendingSave = false; releaseSave()
  await page.waitForFunction(() => document.body.textContent.includes('Your changes and checklist are saved.'))
  const task = await page.$('input[type="checkbox"]')
  await task.click()
  await click('Save changes')
  await page.waitForFunction(() =>
    document.body.textContent.includes('Your changes and checklist are saved.'),
  )
  assert.ok(writes.at(-1).completed.includes('headline'))
  await page.reload()
  await ready()
  assert.equal(
    await page.$eval('input[type="checkbox"]', (node) => node.checked),
    true,
  )
  // Optional import, confirmation and conflict gates.
  draft = null
  conflictMode = true
  await page.reload()
  await ready()
  await page.evaluate(() =>
    [...document.querySelectorAll('button')]
      .find((node) => node.textContent.includes('Paste LinkedIn profile'))
      .click(),
  )
  await page.$eval('textarea', (node) => {
    const set = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    ).set
    set.call(node, 'Imported LinkedIn About and Experience. '.repeat(10))
    node.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await click('Read and compare profile')
  await page.waitForFunction(() =>
    document.body.textContent.includes('Review extracted information'),
  )
  assert.equal(await disabled('Continue'), true)
  const checks = await page.$$('input[type="checkbox"]')
  await checks[0].click()
  assert.equal(await disabled('Continue'), true)
  await checks[1].click()
  assert.equal(await disabled('Continue'), false)
  await click('Continue')
  await page.waitForSelector(
    'input[placeholder="For example: Staff Nurse, Finance Analyst"]',
  )
  // No-profile users get a useful route to the existing profile.
  missing = true
  draft = null
  await page.reload()
  await ready()
  await page.waitForSelector('a[href="/profile"]')
  assert.ok(
    await page.evaluate(() =>
      document.body.textContent.includes('Start with your Career Profile'),
    ),
  )
  assert.deepEqual(errors, [])
  console.log(
    'PASS: actual LinkedIn setup/results/preview at 320/390/768/1440, edit-save-retry, checklist persistence, import conflicts and empty-profile path',
  )
} finally {
  if (browser) await browser.close()
  rmSync(scratch, { recursive: true, force: true })
}
