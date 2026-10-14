/** Offline document-layout check. No site, account or customer data is accessed. */
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const React = require('react'); globalThis.React = React
const { renderToStaticMarkup } = require('react-dom/server')
const { getTemplate } = require('../lib/templates.ts')
const { buildCareerProfileResume } = require('../lib/careerProfileResume.ts')
const { makeQualitySample } = require('../lib/resumeQualitySamples.ts')
const profile = makeQualitySample(0, 4, 19)
const document = buildCareerProfileResume(profile)
const markup = renderToStaticMarkup(React.createElement(getTemplate('gcc_professional').component, { document, profile, optimizedContent: { summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] } }))
const browser = await require('puppeteer').launch({ headless: 'shell', pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] })
try {
  const page = await browser.newPage()
  for (const width of [320, 390, 1280]) for (const selected of [0, 1, 1.25, 1.5, 2]) {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 2 })
    await page.setContent(`<html><body style="margin:0"><div id="frame"><div id="page" style="width:794px">${markup}</div></div></body></html>`)
    const geometry = await page.evaluate(({width, selected}) => {
      const zoom = selected || Math.min(1, (width - 32) / 794)
      const frame = window.document.getElementById('frame')
      const inner = window.document.getElementById('page')
      inner.style.zoom = String(zoom)
      frame.style.width = `${794 * zoom}px`
      frame.style.height = `${inner.offsetHeight * zoom}px`
      frame.style.overflow = 'hidden'
      return { expected: 794 * zoom, width: inner.getBoundingClientRect().width, frameHeight: frame.getBoundingClientRect().height, height: inner.getBoundingClientRect().height, text: inner.innerText }
    }, {width, selected})
    assert.ok(Math.abs(geometry.width - geometry.expected) < 1, 'native document width')
    assert.ok(Math.abs(geometry.height - geometry.frameHeight) < 1.5, 'last page must not be clipped')
    assert.ok(geometry.text.includes(document.experience.at(-1).entry.company), 'last role retained')
  }
  console.log('PASS: native document zoom at 320/390/1280 px and fit/100/125/150/200%; long resume remains complete')
} finally { await browser.close() }
