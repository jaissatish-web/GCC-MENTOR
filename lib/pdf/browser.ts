import fs from 'fs'
import path from 'path'
import os from 'os'
import type { Browser, Page } from 'puppeteer-core'

/**
 * One place that knows how to get a Chrome, for every route that renders the
 * resume template through a real browser (PDF download, blurred preview image).
 *
 * WHY THIS EXISTS — the PDF download was broken in production, and always had
 * been.
 *
 * Both routes previously imported the full `puppeteer` package, which relies on
 * a Chrome binary that its postinstall step downloads into `~/.cache/puppeteer`
 * ON THE MACHINE THAT RAN npm install. That cache is not part of a Vercel
 * deployment, so on the live site `executablePath()` pointed at a path that did
 * not exist, the Linux fallbacks did not exist either, and `launch()` threw —
 * surfacing as "PDF generation failed" for anyone who had actually paid. It
 * worked perfectly on the founder's laptop the whole time, which is exactly why
 * it survived this long.
 *
 * Serverless therefore uses `@sparticuz/chromium`, a Chromium build packaged to
 * fit inside a lambda, driven by `puppeteer-core` (the same API with no bundled
 * browser). Local development reuses whatever Chrome is already on the machine.
 *
 * `puppeteer` itself is now a devDependency and is deliberately NOT imported
 * from application code: importing it would pull the full package back into the
 * deployed bundle and reintroduce the size problem this avoids.
 */

/** Chrome locations to try in local development, best first. */
function findLocalChrome(): string | undefined {
  const candidates: string[] = []

  // Puppeteer's own cache, if the dev dependency has downloaded one. Read off
  // disk rather than by importing puppeteer, to keep it out of the bundle.
  const cacheRoot = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome')
  try {
    for (const dir of fs.readdirSync(cacheRoot)) {
      candidates.push(
        path.join(cacheRoot, dir, 'chrome-win64', 'chrome.exe'),
        path.join(cacheRoot, dir, 'chrome-linux64', 'chrome'),
        path.join(cacheRoot, dir, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
      )
    }
  } catch {
    /* no cache directory — fall through to the system installs */
  }

  candidates.push(
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  )

  return candidates.find((p) => {
    try {
      return fs.existsSync(p)
    } catch {
      return false
    }
  })
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION)

export async function launchBrowser(): Promise<Browser> {
  const puppeteer = (await import('puppeteer-core')).default

  if (isServerless) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  const executablePath = findLocalChrome()
  if (!executablePath) {
    // Named explicitly rather than left as a generic launch failure — this is
    // the one setup step a new developer machine actually needs.
    throw new Error(
      'No Chrome found for PDF rendering. Install Google Chrome, or run `npx puppeteer browsers install chrome`.'
    )
  }

  return puppeteer.launch({
    headless: true,
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

/**
 * Wait for every <img> on the page to finish loading.
 *
 * The profile photo is fetched over the network from a signed URL, and
 * `setContent(..., { waitUntil: 'domcontentloaded' })` returns before any image
 * has arrived — so the delivered PDF could come out with the photo missing
 * while the on-screen preview showed it. Resolves rather than throws on a
 * broken or slow image: a resume missing its photo is worth delivering, an
 * error instead of the document the user paid for is not.
 */
export async function waitForImages(page: Page, timeoutMs = 5000): Promise<void> {
  try {
    await page.evaluate(async (timeout: number) => {
      const images = Array.from(document.images)
      await Promise.all(
        images.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  const done = () => resolve()
                  img.addEventListener('load', done, { once: true })
                  img.addEventListener('error', done, { once: true })
                  setTimeout(done, timeout)
                })
        )
      )
      // Fonts too — text reflowing after the screenshot is the same class of
      // problem as a missing image.
      if (document.fonts?.ready) await document.fonts.ready
    }, timeoutMs)
  } catch {
    /* best effort only */
  }
}
