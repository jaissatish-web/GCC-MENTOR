// Actual compiled page contracts. Interactive checks are in the browser suite.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const html=readFileSync('.next/server/app/index.html','utf8')
const text=html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()
for(const copy of ['Prepare for the Gulf job you want.', 'Your real experience is the starting point.', 'Not confirmed', 'A gap is not added as experience.', 'Your Career Profile remains unchanged.', 'Illustrative demonstration', 'ILLUSTRATIVE DATA', 'Answer-structure score']) assert.ok(text.includes(copy), `Missing approved story: ${copy}`)
for(const value of [46,61,74]) assert.ok(html.includes(`>${value}</`),`Missing illustrative attempt ${value}`)
assert.ok(html.includes('Pause demo'), 'Needs persistent motion control')
console.log('PASS V3 approved grounded story and explicitly illustrative chart')
