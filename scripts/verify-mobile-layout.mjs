/** Shared mobile layout regression against production CSS. Run after npm run build.
 * CHROME_PATH=/path/to/chromium npm run test:mobile
 * Isolated fixture: no account, API calls or production writes.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const rendered = spawnSync(process.execPath, ['-r', 'sucrase/register', '-e', `
  require('./scripts/resolve-paths');
  const React = require('react');
  const {renderToStaticMarkup} = require('react-dom/server');
  const {PageShell} = require('./components/layout/PageShell');
  const {SectionCard} = require('./components/layout/PageHeader');
  const {FileText} = require('lucide-react');
  const {Button} = require('./components/ui/Button');
  const {ScoreCards} = require('./components/profile/ProfileOverview');
  console.log(renderToStaticMarkup(React.createElement(PageShell, {
    title: 'Cover letter', subtitle: 'A clear letter based on your resume and target role.', icon: FileText
  }, React.createElement(SectionCard, null,
    React.createElement('h2', {className: 'type-section'}, 'Choose your approach'),
    React.createElement('p', {className: 'type-body'}, 'Review your information before continuing.'),
    React.createElement('input', {className: 'field w-full', 'aria-label': 'Target role'}),
    React.createElement(Button, {size: 'sm'}, 'Continue')
  ), React.createElement(ScoreCards, {
    completeness: {score: 64, itemsLeft: 3, detail: '5 of 8 sections complete'},
    gulf: null, onOpenCompleteness: () => {}, onOpenReadiness: () => {}, className: 'mt-4'
  }))));
`], { encoding: 'utf8' })
assert.equal(rendered.status, 0, rendered.stderr)
const readiness = readFileSync('.next/server/app/gulf-readiness-score.html', 'utf8')
assert.match(readiness, /<title>Free Gulf Readiness Score/)
assert.match(readiness, /rel="canonical" href="https:\/\/[^"]+\/gulf-readiness-score"/)
const sitemap = readFileSync('.next/server/app/sitemap.xml.body', 'utf8')
assert.ok(!sitemap.includes('/login') && !sitemap.includes('/signup'), 'Auth pages must stay out of the public sitemap.')
const landing = readFileSync('.next/server/app/index.html', 'utf8')
const cssFiles = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(match => match[1]))]
assert.ok(cssFiles.length, 'Run npm run build before testing mobile layouts.')
const css = cssFiles.map(file => readFileSync(file.replace('/_next/', '.next/'), 'utf8')).join('\n')
const executablePath = process.env.CHROME_PATH
assert.ok(executablePath, 'Set CHROME_PATH to your installed Chrome/Chromium executable.')
const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
try {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', r => r.abort())
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    for (const enlarged of [false, true]) {
      await page.setViewport({ width, height: 844 })
      await page.setContent(`<html style="font-size:${enlarged ? 32 : 16}px"><head><style>${css}</style></head><body class="app-type">${rendered.stdout}</body></html>`)
      const result = await page.evaluate(() => {
        const title = document.querySelector('h1')
        const subtitle = document.querySelector('header p')
        const icon = document.querySelector('header span')
        const style = selector => getComputedStyle(document.querySelector(selector))
        return {
          scroll: document.documentElement.scrollWidth,
          overflow: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({text: el.textContent.slice(0,70), className: el.getAttribute('class')})).slice(0,8),
          titleSize: style('h1').fontSize, weight: style('h1').fontWeight,
          inputSize: style('input').fontSize, bodySize: style('.type-body').fontSize,
          buttonHeight: document.querySelector('button').getBoundingClientRect().height,
          subtitleX: subtitle.getBoundingClientRect().x, iconX: icon.getBoundingClientRect().x,
          titleX: title.getBoundingClientRect().x,
        }
      })
      assert.ok(result.scroll <= width + 1, `Overflow at ${width}, enlarged=${enlarged}: ${JSON.stringify(result)}`)
      const scale = enlarged ? 2 : 1
      assert.equal(result.titleSize, `${(width >= 1024 ? 30 : width >= 640 ? 28 : 22) * scale}px`)
      assert.equal(result.weight, '600')
      assert.equal(result.inputSize, `${16 * scale}px`)
      assert.equal(result.bodySize, `${(width < 640 ? 15 : 16) * scale}px`)
      assert.ok(result.buttonHeight >= 44)
      if (width < 640) assert.equal(result.subtitleX, result.iconX, 'Phone subtitle must use the full header width')
      else assert.equal(result.subtitleX, result.titleX, 'Larger screens align subtitle with title')
    }
  }
  // A single token change must affect both modern roles and older page markup.
  await page.setViewport({width: 390, height: 844})
  await page.setContent(`<html><head><style>${css}</style></head><body class="app-type"><main>
    <h1 class="text-5xl font-black">Legacy title</h1>
    <h2 class="text-4xl">Legacy section</h2>
    <p class="text-xl">Legacy paragraph</p>
    <div class="rounded-card p-6">Card</div>
    <div data-document-preview><div id="resume-render" style="font-family:Georgia">
      <h1 style="font-size:21px;font-weight:700">Document title</h1>
      <p style="font-size:11px">Document body</p>
    </div></div>
  </main></body></html>`)
  await page.evaluate(() => {
    const root = document.documentElement.style
    root.setProperty('--ui-title-size', '27px')
    root.setProperty('--ui-section-size', '19px')
    root.setProperty('--ui-body-size', '18px')
    root.setProperty('--ui-font', 'Arial')
    root.setProperty('--ui-card-radius', '9px')
    root.setProperty('--ui-card-padding', '21px')
  })
  const configured = await page.evaluate(() => {
    const style = s => getComputedStyle(document.querySelector(s))
    return {title: style('main > h1').fontSize, section: style('main > h2').fontSize,
      body: style('main > p').fontSize, family: style('main > h1').fontFamily,
      radius: style('.rounded-card').borderRadius, padding: style('.rounded-card').paddingTop,
      documentTitle: style('#resume-render h1').fontSize, documentWeight: style('#resume-render h1').fontWeight,
      documentFamily: style('#resume-render h1').fontFamily, documentBody: style('#resume-render p').fontSize}
  })
  assert.deepEqual(configured, {title:'27px', section:'19px', body:'18px', family:'Arial',
    radius:'9px', padding:'21px', documentTitle:'21px', documentWeight:'700', documentFamily:'Georgia', documentBody:'11px'})
  console.log('PASS: shared page/card layout, full-width phone subtitle, readable fields, heading weight, 44px controls, and no overflow at six widths × normal/enlarged text.')
} finally {
  await browser.close()
}
