/** VISUAL-010: capture the real shared gallery sample at A4 with production CSS.
 * Build first. CHROME_PATH=/path/to/chrome OUT=artifacts/visual-template-gallery
 * node_modules/.bin/sucrase-node scripts/render-visual-template-previews.ts
 */
import './resolve-paths'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { availableTemplates } from '../lib/templates'
import { SampleResumePreview } from '../components/resume/SampleResumePreview'
import { launchBrowser } from '../lib/pdf/browser'

;(globalThis as unknown as { React: unknown }).React = React
async function main() {
  const puppeteer = (await import('puppeteer-core')).default
  const browser = process.env.CHROME_PATH
    ? await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, pipe: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process', '--disable-gpu'] })
    : await launchBrowser()
  const out = process.env.OUT ?? 'artifacts/visual-template-gallery'
  mkdirSync(out, { recursive: true })
  const css = readdirSync('.next/static/css').filter(name => name.endsWith('.css')).map(name => readFileSync(join('.next/static/css', name), 'utf8')).join('\n')
  const portrait = 'data:image/jpeg;base64,' + readFileSync('public/sample/sample-headshot.jpg').toString('base64')
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 })
    for (const t of availableTemplates().filter(t => t.atsLevel === 'visual')) {
      const markup = renderToStaticMarkup(createElement(SampleResumePreview, { templateId: t.id })).replaceAll('/sample/sample-headshot.jpg', portrait)
      await page.setContent(`<html><head><meta charset="utf-8"><style>${css}body{margin:0}</style></head><body>${markup}</body></html>`)
      await page.evaluate(async () => { await Promise.all(Array.from(document.images).map(img => img.decode())) })
      const bounds = await page.evaluate(() => {
        const root = document.querySelector('#resume-render')!
        const box = root.getBoundingClientRect()
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
        let node; let bottom = 0; let left = 794; let right = 0
        while ((node = walker.nextNode())) {
          if (!node.textContent || !node.textContent.trim()) continue
          const range = document.createRange(); range.selectNode(node)
          const rect = range.getBoundingClientRect()
          bottom = Math.max(bottom, rect.bottom - box.top)
          left = Math.min(left, rect.left - box.left)
          right = Math.max(right, rect.right - box.left)
        }
        return { width: box.width, height: box.height, bottom, left, right }
      })
      assert.equal(bounds.width, 794, `${t.id}: A4 width`)
      assert.equal(bounds.height, 1123, `${t.id}: A4 height`)
      assert(bounds.bottom >= 960 && bounds.bottom <= 1085, `${t.id}: sample vertical fit`)
      assert(bounds.left >= 0 && bounds.right <= 794, `${t.id}: clipped sample text`)
      await page.screenshot({ path: join(out, `${t.id}.png`), fullPage: true })
      console.log(`PASS ${t.id}: unchanged shared sample, A4 fit, horizontal text bounds; screenshot saved`)
    }
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
