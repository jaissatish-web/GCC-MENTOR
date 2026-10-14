/** Headless-shell test adapter for containers without desktop Chromium sockets.
 * Only the launcher changes: renderPackagePdf, PDF bytes and ATS checks are real.
 * Usage: node scripts/verify-template-pdfs-shell.mjs <template ids> [--raw]
 */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
require('./resolve-paths.ts')
const launcher = require.resolve('../lib/pdf/browser.ts')
const original = require(launcher)
const puppeteer = require('puppeteer')
require.cache[launcher].exports = {
  ...original,
  launchBrowser: () => puppeteer.launch({ headless: 'shell', pipe: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] }),
}
require('./verify-template-pdfs.ts')
