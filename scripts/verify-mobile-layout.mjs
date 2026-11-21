/** Shared mobile layout regression against production CSS. Run after npm run build.
 * CHROME_PATH=/path/to/chromium npm run test:mobile
 * Isolated fixture: no account, API calls or production writes.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import puppeteer from 'puppeteer-core'

const rendered = spawnSync(process.execPath, ['-r', 'sucrase/register', '-e', `
  require('./scripts/resolve-paths');
  const React = require('react');
  const {renderToStaticMarkup} = require('react-dom/server');
  const {PageShell} = require('./components/layout/PageShell');
  const {SectionCard} = require('./components/layout/PageHeader');
  const {FileText} = require('lucide-react');
  const {Button} = require('./components/ui/Button');
  const {WrappedSelect} = require('./components/ui/WrappedSelect');
  const {ScoreCards} = require('./components/profile/ProfileOverview');
  console.log(renderToStaticMarkup(React.createElement(PageShell, {
    title: 'Cover letter', subtitle: 'A clear letter based on your resume and target role.', icon: FileText,
    actions: React.createElement(Button, {size: 'sm'}, 'Optimize Resume for This Job')
  }, React.createElement(SectionCard, null,
    React.createElement('h2', {className: 'type-section'}, 'Choose your approach'),
    React.createElement('p', {className: 'type-body'}, 'Review your information before continuing.'),
    React.createElement('input', {className: 'field w-full', 'aria-label': 'Target role'}),
    React.createElement(WrappedSelect, {label:'Choose your profession', options:['Instrumentation & automation','Process, production & operations'], value:1, onChange:()=>{}}),
    React.createElement('input', {type: 'datetime-local', className: 'field w-full', 'aria-label': 'Interview date and time'}),
    React.createElement(Button, {size: 'sm'}, 'Continue')
  ), React.createElement(ScoreCards, {
    completeness: {score: 64, itemsLeft: 3, detail: '5 of 8 sections complete'},
    gulf: null, onOpenCompleteness: () => {}, onOpenReadiness: () => {}, className: 'mt-4'
  }))));
`], { encoding: 'utf8' })
assert.equal(rendered.status, 0, rendered.stderr)
const readiness = readFileSync('.next/server/app/gulf-readiness-score.html', 'utf8')
assert.match(readiness, /<title>Free Gulf Readiness Score/)
const canonical = readiness.match(/rel="canonical" href="([^"]+)"/)?.[1]
assert.ok(canonical, 'Readiness must publish a canonical URL')
assert.equal(canonical, new URL('/gulf-readiness-score', process.env.NEXT_PUBLIC_APP_URL || 'https://gcc-mentor.vercel.app').href)
const sitemap = readFileSync('.next/server/app/sitemap.xml.body', 'utf8')
assert.ok(!sitemap.includes('/login') && !sitemap.includes('/signup'), 'Auth pages must stay out of the public sitemap.')
const landing = readFileSync('.next/server/app/index.html', 'utf8')
const cssFiles = [...new Set([...landing.matchAll(/href="(\/_next\/static\/css\/[^"]+\.css)"/g)].map(match => match[1]))]
assert.ok(cssFiles.length, 'Run npm run build before testing mobile layouts.')
const css = cssFiles.map(file => readFileSync(file.replace('/_next/', '.next/'), 'utf8').replace(
  /url\((?:["']?)([^)"']+\.woff2)(?:["']?)\)/g,
  (_, url) => `url("data:font/woff2;base64,${readFileSync(join('.next/static/media', basename(url))).toString('base64')}")`
)).join('\n')
const fontClass = landing.match(/<body[^>]*class="([^"]+)"/)?.[1] ?? ''
mkdirSync('artifacts/typography', { recursive: true })
const executablePath = process.env.CHROME_PATH
assert.ok(executablePath, 'Set CHROME_PATH to your installed Chrome/Chromium executable.')
const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'] })
try {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', r => r.url().startsWith('data:') ? r.continue() : r.abort())
  for (const width of [320, 360, 375, 390, 430, 768, 1280, 1366, 1440]) {
    for (const enlarged of [false, true]) {
      await page.setViewport({ width, height: 844 })
      await page.setContent(`<html style="font-size:${enlarged ? 32 : 16}px"><head><style>${css}</style></head><body class="${fontClass} app-type">${rendered.stdout}</body></html>`)
      await page.evaluate(() => document.fonts.ready)
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
      assert.equal(result.titleSize, `${(width >= 768 ? 32 : 28) * scale}px`)
      assert.equal(result.weight, '700')
      assert.equal(result.inputSize, `${16 * scale}px`)
      assert.equal(result.bodySize, `${(width >= 768 ? 16 : 15) * scale}px`)
      assert.ok(result.buttonHeight >= 44)
      await page.$eval('details', element => { element.open = true })
      const choices = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        clipped: [...document.querySelectorAll('details button span, details summary span')].some(element => element.scrollWidth > element.clientWidth + 1),
        touch: [...document.querySelectorAll('details button, details summary')].every(element => element.getBoundingClientRect().height >= 44),
      }))
      assert.ok(choices.width <= width + 1, `Profession choices overflow at ${width}`)
      assert.ok(!choices.clipped, `Profession labels clipped at ${width}`)
      assert.ok(choices.touch, `Profession choices need 44px touch targets at ${width}`)
      if (width === 390 && !enlarged) await page.screenshot({ path: 'artifacts/typography/shared-ui-390.png', fullPage: true })
      if (width < 768) assert.equal(result.subtitleX, result.titleX, 'Phone subtitle aligns with the title after removing the decorative heading icon')
      else assert.equal(result.subtitleX, result.titleX, 'Larger screens align subtitle with title')
    }
  }
  // Approved UI utilities follow role tokens; resume documents stay independent.
  await page.setViewport({width: 390, height: 844})
  await page.setContent(`<html><head><style>${css}</style></head><body class="app-type"><main>
    <h1 class="type-title">Page title</h1>
    <h2 class="type-section">Section title</h2>
    <p class="type-body">Body paragraph</p>
    <p class="text-xl font-bold utility-example">Deliberate emphasis</p>
    <span class="text-[13px] caption-example">Small label</span>
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
    document.body.style.fontFamily = 'var(--ui-font)'
    root.setProperty('--ui-card-radius', '9px')
    root.setProperty('--ui-card-padding', '21px')
  })
  const configured = await page.evaluate(() => {
    const style = s => getComputedStyle(document.querySelector(s))
    return {title: style('main > h1').fontSize, section: style('main > h2').fontSize,
      body: style('main > p').fontSize, family: style('main > h1').fontFamily,
      radius: style('.rounded-card').borderRadius, padding: style('.rounded-card').paddingTop,
      documentTitle: style('#resume-render h1').fontSize, documentWeight: style('#resume-render h1').fontWeight,
      documentFamily: style('#resume-render h1').fontFamily, documentBody: style('#resume-render p').fontSize,
      utilitySize: style('.utility-example').fontSize, utilityWeight: style('.utility-example').fontWeight,
      captionSize: style('.caption-example').fontSize}
  })
  assert.deepEqual(configured, {title:'27px', section:'19px', body:'18px', family:'Arial',
    radius:'9px', padding:'21px', documentTitle:'21px', documentWeight:'700', documentFamily:'Georgia', documentBody:'11px', utilitySize:'18px', utilityWeight:'400', captionSize:'13px'})
  // Real public landing markup, production CSS and the bundled landing faces, without API calls.
  const publicMarkup = landing.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, '<span aria-hidden="true"></span>')
  // The landing is pinned to its own --lp-* tokens (landing.module.css "LANDING TOKENS").
  // Every assertion in this block therefore runs while the visitor's --uds-* theme is
  // deliberately hostile: if any landing type value still tracks --uds-*, the pin is broken
  // and the assertion fails here rather than in production. Only type/palette inputs are
  // overridden - never the geometry ones - so overflow and clipping keep their own meaning.
  const hostileTheme = `<style>[data-universal-theme]{--uds-hero-size:100px!important;--uds-marketing-size:100px!important;--uds-body-size:40px!important;--uds-card-size:60px!important;--uds-heading-weight:400!important;--uds-body-weight:900!important;--uds-heading-line:3!important;--uds-body-line:3!important;--uds-tracking:.3em!important;--uds-canvas:#FF00FF!important;--uds-surface:#00FF00!important;--uds-ink:#FF0000!important;--uds-muted:#0000FF!important;--uds-brand:#FF00FF!important;--uds-brand-hover:#00FFFF!important;--uds-font:Arial!important}</style>`
  for (const width of [360, 375, 390, 430, 1280, 1366, 1440]) {
    for (const enlarged of [false, true]) {
      await page.setViewport({ width, height: width < 640 ? 844 : 900 })
      const bodyMarkup = publicMarkup.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? publicMarkup
      await page.setContent(`<html><head><style>${css}</style>${hostileTheme}</head><body class="${fontClass}">${bodyMarkup}</body></html>`)
      await page.evaluate(enlarged => {
        document.documentElement.classList.remove('js-reveal')
        document.documentElement.style.fontSize = enlarged ? '32px' : '16px'
      }, enlarged)
      await page.evaluate(() => document.fonts.ready)
      const metrics = await page.evaluate(() => {
        const hero = document.querySelector('h1')
        const heading = getComputedStyle(hero)
        const sub = document.querySelector('#hero-title ~ p')
        const section = document.querySelector('#templates-title')
        // The hero is now `clamp(2.35rem, 4.1vw, 3.75rem)` (--lp-h1-size), so a fixed px
        // expectation no longer exists. The clamp resolves to 37.6px below 917px, 42.0px at
        // 1024, 52.5px at 1280, 56.0px at 1366 and 59.0px at 1440 at a 16px root; at a 32px
        // root the rem minimum wins and it is 75.2px. A probe resolves that exact expression
        // with this viewport and root size, which keeps the old guarantee intact: the hero
        // consumes the landing display scale, whatever the clamp resolves to here.
        const probe = document.createElement('p')
        probe.style.position = 'absolute'
        probe.style.visibility = 'hidden'
        probe.style.fontSize = 'clamp(2.35rem, 4.1vw, 3.75rem)'
        document.querySelector('#main-content').appendChild(probe)
        const expectedHero = parseFloat(getComputedStyle(probe).fontSize)
        probe.remove()
        const subStyle = getComputedStyle(sub)
        // Self-hosted faces: next/font/local names them after the declaration ("display",
        // "body", "numeric"), so identify them by what actually loaded rather than by the
        // source font's name.
        const facesLoaded = [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family)
        const sectionStyle = getComputedStyle(section)
        return { scroll: document.documentElement.scrollWidth, size: parseFloat(heading.fontSize),
          weight: heading.fontWeight, font: heading.fontFamily,
          lineRatio: parseFloat(heading.lineHeight) / parseFloat(heading.fontSize), facesLoaded,
          clipped: hero.scrollWidth > hero.clientWidth + 1, expectedHero,
          sectionSize: parseFloat(sectionStyle.fontSize), sectionWeight: sectionStyle.fontWeight, sectionFont: sectionStyle.fontFamily,
          bodySize: parseFloat(subStyle.fontSize), bodyFont: subStyle.fontFamily,
          bodyLineRatio: parseFloat(subStyle.lineHeight) / parseFloat(subStyle.fontSize),
          overflow: [...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1 && el.getBoundingClientRect().width>0).slice(0,16).map(el=>({tag:el.tagName,text:el.textContent.slice(0,55),class:el.getAttribute('class'),right:el.getBoundingClientRect().right})) }
      })
      if (metrics.scroll > width + 1) await page.screenshot({path:'artifacts/typography/landing-overflow.png',fullPage:false})
      assert.ok(metrics.scroll <= width + 1, `Landing overflow at ${width}, enlarged=${enlarged}: ${JSON.stringify(metrics)}`)
      assert.ok(!metrics.clipped, `Clipped landing title at ${width}`)
      // next/font registers a hashed family (`__Plus_Jakarta_Sans_<hash>`), so compare the
      // FIRST family in the stack with underscores read as spaces; a bare substring test could
      // match a fallback that never paints.
      const firstFamily = font => font.split(',')[0].replaceAll('_', ' ').replaceAll('"', '').trim()
      assert.equal(metrics.weight, '800', `Landing hero must use the 800 display weight at ${width}, enlarged=${enlarged}: ${JSON.stringify(metrics)}`)
      assert.ok(metrics.facesLoaded.includes(firstFamily(metrics.font)), `Landing headings must paint a loaded landing face: ${metrics.font} / loaded ${JSON.stringify(metrics.facesLoaded)}`)
      assert.ok(Math.abs(metrics.lineRatio - 1.06) < .01, `Landing hero line height must be 1.06 at ${width}: ${metrics.lineRatio}`)
      const textScale = enlarged ? 2 : 1
      assert.ok(Math.abs(metrics.size - metrics.expectedHero) < .02, `Marketing hero must resolve clamp(2.35rem,4.1vw,3.75rem) at ${width}, enlarged=${enlarged}: expected ${metrics.expectedHero}, got ${metrics.size}`)
      // --lp-h2-size is 1.5rem/1.75rem/2.25rem at phone/tablet/desktop (24/28/36px), so the
      // old per-breakpoint form of this assertion survives with the new numbers.
      const expectedSection = (width >= 1024 ? 36 : width >= 768 ? 28 : 24) * textScale
      assert.ok(Math.abs(metrics.sectionSize - expectedSection) < .02, `Marketing sections must use the landing section scale (${expectedSection}px at ${width}, enlarged=${enlarged}), got ${metrics.sectionSize}`)
      assert.equal(metrics.sectionWeight, '700', `Landing section headings must use the 700 weight at ${width}: ${JSON.stringify(metrics)}`)
      assert.ok(metrics.facesLoaded.includes(firstFamily(metrics.sectionFont)), `Landing section headings must paint a loaded landing face: ${metrics.sectionFont}`)
      // --lp-body-size is 0.875rem phone / 1rem desktop with --lp-body-line 1.6, and body copy
      // is DM Sans; it still doubles with the root font size.
      assert.ok(Math.abs(metrics.bodySize - (width >= 1024 ? 16 : 14) * textScale) < .02, `Landing body copy must use the landing body scale (${(width >= 1024 ? 16 : 14) * textScale}px at ${width}, enlarged=${enlarged}), got ${metrics.bodySize}`)
      assert.ok(metrics.facesLoaded.includes(firstFamily(metrics.bodyFont)) && firstFamily(metrics.bodyFont) !== firstFamily(metrics.font), `Landing body copy must paint the loaded body face, distinct from the display face: ${metrics.bodyFont}`)
      assert.ok(Math.abs(metrics.bodyLineRatio - 1.6) < .01, `Landing body line height must be 1.6 at ${width}: ${metrics.bodyLineRatio}`)
      await page.screenshot({ path: `artifacts/typography/landing-${width}${enlarged ? '-enlarged' : ''}.png`, fullPage: true })
      assert.equal(await page.$$eval('#how-it-works ol > li', items => items.length), 3, 'Approved V2 journey remains visible with three connected stages')
      assert.equal(await page.$$eval('[data-concern-choice]',items=>items.filter(el=>el.getBoundingClientRect().height>0).length),4,'All main candidate concerns remain visible');
      assert.equal(await page.$$eval('[data-concern-choice][aria-pressed="true"]',items=>items.length),1,'One preparation focus is selected');
      assert.ok(await page.$eval('#solutions',el=>el.getBoundingClientRect().height>0),'Solution response remains visible');
      for (const selector of ['#services details']) {
        assert.equal(await page.$eval(selector, el => el.open), false, 'Landing disclosures start collapsed')
        await page.$eval(`${selector} > summary`, el => { if (!el.getBoundingClientRect().height) throw new Error('Summary is not visible'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); el.click() })
        assert.equal(await page.$eval(selector, el => el.open), true, 'Summary expands content')
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Expanded disclosure overflow at ${width}`)
        if (width === 390 && !enlarged) await page.screenshot({path: `artifacts/typography/disclosure-${selector.includes('challenges') ? 'problems' : 'journey'}-390.png`, fullPage:true})
        await page.$eval(`${selector} > summary`, el => { if (!el.getBoundingClientRect().height) throw new Error('Summary is not visible'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); el.click() })
        assert.equal(await page.$eval(selector, el => el.open), false, 'Summary collapses content again')
      }

    }
  }
  console.log('PASS: production landing and shared UI at phone/laptop widths, enlarged text, distinct type roles, preserved document typography, bundled self-hosted landing faces (a loaded display face for headings, a distinct loaded body face for copy), a source of theme-independent landing tokens and 44px controls.')
} finally {
  await browser.close()
}
