/** Shared sample data and photo layout regression checks. Optional --browser checks A4 fit. */
import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { strict as assert } from 'node:assert'
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { availableTemplates } from '../lib/templates'
import { SAMPLE_RESUME_DOCUMENT, SAMPLE_TEMPLATE_SCALES } from '../lib/sampleResume'
import { SampleResumePreview } from '../components/resume/SampleResumePreview'

;(globalThis as unknown as { React: unknown }).React = React

async function main() {
  const templates = availableTemplates()
  const portrait = 'data:image/jpeg;base64,' + readFileSync('public/sample/sample-headshot.jpg').toString('base64')
  for (const t of templates) {
    assert(Number.isFinite(SAMPLE_TEMPLATE_SCALES[t.id]), `${t.id}: missing sample fit`)
    const html = renderToStaticMarkup(createElement(SampleResumePreview, { templateId: t.id }))
    for (const item of SAMPLE_RESUME_DOCUMENT.experience) {
      for (const bullet of item.bullets) assert(html.includes(bullet), `${t.id}: omitted sample bullet`)
    }
    const images = html.match(/<img\b[^>]*>/g) ?? []
    assert.equal(images.length, t.allowsPhoto ? 1 : 0, `${t.id}: photo eligibility`)
    for (const img of images) {
      assert(img.includes('object-fit:contain'), `${t.id}: photo must preserve full image`)
      assert(img.includes('object-position:center top'), `${t.id}: portrait alignment`)
    }
    const hidden = { ...SAMPLE_RESUME_DOCUMENT, header: { ...SAMPLE_RESUME_DOCUMENT.header, showPhoto: false } }
    assert(!renderToStaticMarkup(createElement(t.component!, { document: hidden } as never)).includes('<img'), `${t.id}: photo off`)
  }
  assert(readFileSync('components/landing-v3/DocumentOrbit.tsx', 'utf8').includes('<SampleResumePreview'))
  assert(readFileSync('components/resume/TemplatePicker.tsx', 'utf8').includes('<SampleResumePreview'))
  if (process.argv.includes('--browser')) {
    const { default: puppeteer } = await import('puppeteer')
    const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || undefined, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
    try {
      const siteCss = readdirSync('.next/static/css').filter(name => name.endsWith('.css')).map(name => readFileSync(`.next/static/css/${name}`, 'utf8')).join('\n')
      const page = await browser.newPage()
      await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
      mkdirSync('artifacts/template-showcase', { recursive: true })
      for (const t of templates) {
        const markup = renderToStaticMarkup(createElement(SampleResumePreview, { templateId: t.id })).replaceAll('/sample/sample-headshot.jpg', portrait)
        await page.setContent(`<html><head><style>${siteCss}*{box-sizing:border-box}body{margin:0;font-size:15px;line-height:1.55}</style></head><body>${markup}</body></html>`)
        await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(img => img.decode())) })
        const measured = await page.evaluate(() => {
          const root = document.querySelector('#resume-render')!
          const rect = root.getBoundingClientRect()
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
          let bottom = 0
          let node
          while ((node = walker.nextNode())) {
            if (!node.textContent || !node.textContent.trim()) continue
            const range = document.createRange(); range.selectNode(node)
            bottom = Math.max(bottom, range.getBoundingClientRect().bottom - rect.top)
          }
          return { width: rect.width, height: rect.height, bottom, photos: Array.from(root.querySelectorAll('img')).map(img => {
            const box = img.getBoundingClientRect()
            return { width: box.width, height: box.height, loaded: img.naturalWidth > 0, circular: img.style.borderRadius === '50%' }
          }) }
        })
        assert.equal(measured.width, 794, `${t.id}: A4 width`)
        assert.equal(measured.height, 1123, `${t.id}: A4 height`)
        assert(measured.bottom >= 960 && measured.bottom <= 1085, `${t.id}: sample fill ${measured.bottom}`)
        for (const photo of measured.photos) {
          assert(photo.loaded && photo.width >= 100 && photo.height >= 100, `${t.id}: usable portrait size`)
          if (photo.circular) assert.equal(photo.width, photo.height, `${t.id}: circle distorted`)
        }
        if (['gulf_premium', 'technical_sidebar', 'modern_professional', 'portrait_right', 'creative_gcc', 'cfo_signature'].includes(t.id)) {
          await page.screenshot({ path: `artifacts/template-showcase/${t.id}.png`, fullPage: true })
        }
      }
    } finally { await browser.close() }
  }
  console.log(`PASS: ${templates.length} designs share all sample experience; photo eligibility and containment verified${process.argv.includes('--browser') ? '; A4 fit and loaded portrait dimensions verified' : ''}.`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
