/** Pixel-exact comparison of synthetic resume PDF fixtures.
 * node scripts/verify-universal-design-pdfs.mjs BEFORE_DIRECTORY AFTER_DIRECTORY
 * Requires Poppler's pdfinfo and pdftoppm. No application or customer data reads.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve, relative, dirname, basename } from 'node:path'
const [beforeArg,afterArg] = process.argv.slice(2)
assert.ok(beforeArg && afterArg,'Provide before and after PDF fixture directories')
const before = resolve(beforeArg), after = resolve(afterArg)
assert.ok(existsSync(before) && existsSync(after),'Both PDF fixture directories must exist')
const files = directory => readdirSync(directory,{withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(join(directory,entry.name)) : entry.isFile() && entry.name.endsWith('.pdf') ? [join(directory,entry.name)] : []).sort()
const originals = files(before), changed = files(after)
assert.ok(originals.length >= 6,'Expected at least three templates with photo/no-photo PDFs')
assert.deepEqual(changed.map(file => relative(after,file)), originals.map(file => relative(before,file)),'PDF fixture sets differ')
const output = resolve('artifacts/universal-design-v1/pdf-comparison')
mkdirSync(output,{recursive:true})
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex')
const command = (binary,args) => execFileSync(binary,args,{encoding:'utf8',env:{...process.env,LC_ALL:'C'},timeout:120000})
const summary = []
try {
  for (const original of originals) {
    const name = relative(before,original), candidate = join(after,name)
    const info = file => command('pdfinfo',[file]).split('\n').filter(line => /^(Pages:|Page size:|Page rot:)/.test(line)).map(line => line.trim())
    const oldInfo = info(original), newInfo = info(candidate)
    assert.ok(oldInfo.some(line => line.startsWith('Pages:')),'PDF page metadata unavailable')
    assert.deepEqual(newInfo,oldInfo,`${name}: page count/dimensions/rotation changed`)
    const renders = []
    for (const [phase,file] of [['before',original],['after',candidate]]) {
      const directory = join(output,phase,dirname(name),basename(name,'.pdf'))
      rmSync(directory,{recursive:true,force:true})
      mkdirSync(directory,{recursive:true})
      // PPM contains decoded pixels and dimensions, without timestamps/PNG metadata.
      command('pdftoppm',['-r','96',file,join(directory,'page')])
      renders.push(readdirSync(directory).filter(name => /^page-\d+\.ppm$/.test(name)).sort().map(name => ({name,hash:digest(join(directory,name))})))
    }
    assert.ok(renders[0].length,`${name}: no PDF pages rasterized`)
    assert.deepEqual(renders[1],renders[0],`${name}: visible PDF pixels changed`)
    summary.push({name,metadata:oldInfo,pages:renders[0],unchanged:true})
  }
  console.log(`PASS: ${summary.length} fictional PDFs preserve page metadata and every rasterized pixel at96dpi`)
} finally { writeFileSync(join(output,'results.json'),JSON.stringify(summary,null,2)) }
