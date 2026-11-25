/** Exercise the template checks with the Chromium binary packaged for Vercel. */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
require('sucrase/register')
process.env.VERCEL = '1'
require('./verify-template-pdfs.ts')
