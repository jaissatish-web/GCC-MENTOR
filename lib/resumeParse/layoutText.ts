import JSZip from 'jszip'
import { getDocumentProxy } from 'unpdf'
import { countEmbeddedImages, looksGarbled } from '@/lib/pdfTextExtract'

/**
 * CV file → text that still shows the LAYOUT (2026-10-01).
 *
 * The old reader handed the model one flat stream of text, and measured on the
 * resume-lab test set (scripts/resume-lab) that stream lost exactly the things
 * that decide whether a job is read correctly:
 *
 *   - Word tables came out one CELL per line, so "Company | Role | Period" rows
 *     arrived as unconnected lines and the model guessed which date went with
 *     which employer.
 *   - Word page headers and footers were dropped entirely — a CV that puts the
 *     name, phone and email in the header (common in Word templates) reached
 *     the model with no contact details at all, and the profile then refused
 *     to save without a phone and email.
 *   - Two-column PDFs drawn row by row (most design tools) came out with the
 *     sidebar and the main column interleaved line by line.
 *
 * Here tables keep their rows ("cell | cell | cell"), layout tables and PDF
 * columns are emitted one column at a time, and headers/footers are kept.
 * Nothing is summarised or reordered beyond that: the text stays the CV's own.
 */

export interface LayoutText {
  text: string
  /** PDF only: true when the document has no real text (a scan) or a failed decode. */
  scanned?: boolean
  garbled?: boolean
  /** Diagnostics for the parse report. */
  notes: string[]
}

// ============================================================== DOCX

interface Node { tag: string; attrs: string; children: (Node | string)[] }

const decode = (s: string) =>
  s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&')

const VOID = new Set(['br', 'img', 'hr'])

/** A tolerant tree builder for mammoth's (simple, well-formed) HTML. */
function parseHtml(html: string): Node {
  const root: Node = { tag: 'root', attrs: '', children: [] }
  const stack: Node[] = [root]
  const re = /<(\/?)([a-zA-Z0-9]+)([^>]*?)(\/?)>|([^<]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1]
    if (m[5] !== undefined) { top.children.push(decode(m[5])); continue }
    const [, close, rawTag, attrs, selfClose] = m
    const tag = rawTag.toLowerCase()
    if (close) {
      const i = stack.map((n) => n.tag).lastIndexOf(tag)
      if (i > 0) stack.length = i
      continue
    }
    const node: Node = { tag, attrs, children: [] }
    top.children.push(node)
    if (!selfClose && !VOID.has(tag)) stack.push(node)
  }
  return root
}

function inlineText(n: Node | string): string {
  if (typeof n === 'string') return n
  if (n.tag === 'br') return '\n'
  if (n.tag === 'img') return ''
  return n.children.map(inlineText).join('')
}

const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'table', 'ul', 'ol'])

/** Lines for a node, with tables kept as rows or as columns. */
function blockLines(n: Node): string[] {
  const out: string[] = []
  const pushText = (t: string, prefix = '') => {
    for (const line of t.split('\n')) {
      const clean = line.replace(/[ \t ]+/g, ' ').trim()
      if (clean) out.push(prefix + clean)
    }
  }
  for (const c of n.children) {
    if (typeof c === 'string') { pushText(c); continue }
    if (c.tag === 'table') { out.push('', ...tableLines(c), ''); continue }
    if (c.tag === 'ul' || c.tag === 'ol') { out.push(...blockLines(c)); continue }
    if (c.tag === 'li') {
      // A list item may hold a nested list; keep its own text as the bullet.
      const own = c.children.filter((x) => typeof x === 'string' || !BLOCK.has(x.tag))
      pushText(own.map(inlineText).join(''), '- ')
      for (const x of c.children) if (typeof x !== 'string' && BLOCK.has(x.tag)) out.push(...blockLines({ tag: 'div', attrs: '', children: [x] }))
      continue
    }
    if (c.tag === 'p' || /^h[1-6]$/.test(c.tag)) { pushText(inlineText(c)); continue }
    out.push(...blockLines(c))
  }
  return out
}

function tableLines(table: Node): string[] {
  const rows: Node[] = []
  const collect = (n: Node) => {
    for (const c of n.children) {
      if (typeof c === 'string') continue
      if (c.tag === 'tr') rows.push(c)
      else if (c.tag !== 'table') collect(c)
    }
  }
  collect(table)
  const out: string[] = []
  for (const row of rows) {
    const cells = row.children.filter((c): c is Node => typeof c !== 'string' && (c.tag === 'td' || c.tag === 'th'))
    const cellLines = cells.map((c) => blockLines(c).filter((l) => l !== ''))
    const filled = cellLines.filter((l) => l.length)
    if (!filled.length) continue
    if (filled.every((l) => l.length === 1)) {
      // A data row: keep it as one line so its cells stay together.
      out.push(filled.map((l) => l[0]).join(' | '))
    } else if (filled.length === 2 && filled[0].length === 1 && filled[0][0].length <= 40) {
      // Label column + content (Europass, date-left layouts): label first, then its content.
      out.push(filled[0][0] + ' | ' + filled[1][0], ...filled[1].slice(1))
    } else {
      // A layout table (sidebar + main column): one column at a time.
      filled.forEach((l, i) => { if (i) out.push(''); out.push(...l) })
    }
  }
  return out
}

/** Paragraph text of header/footer parts — the parts mammoth never reads. */
async function docxHeaderFooter(buffer: Buffer): Promise<{ header: string[]; footer: string[] }> {
  const header: string[] = [], footer: string[] = []
  try {
    const zip = await JSZip.loadAsync(buffer)
    for (const name of Object.keys(zip.files).sort()) {
      const kind = /^word\/header\d*\.xml$/.test(name) ? header : /^word\/footer\d*\.xml$/.test(name) ? footer : null
      if (!kind) continue
      const xml = await zip.files[name].async('string')
      for (const p of xml.split(/<\/w:p>/)) {
        const text = decode(
          (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>/g) ?? [])
            .map((t) => (t === '<w:tab/>' ? ' ' : t.replace(/<[^>]+>/g, '')))
            .join(''),
        ).replace(/\s+/g, ' ').trim()
        // Skip page furniture: "Page 1 of 2", lone numbers.
        if (text && !/^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(text) && !kind.includes(text)) kind.push(text)
      }
    }
  } catch {
    /* not a readable zip — the body read reports the real failure */
  }
  return { header, footer }
}

export async function docxLayoutText(buffer: Buffer): Promise<LayoutText> {
  const mammoth = await import('mammoth')
  const notes: string[] = []
  const { value: html } = await mammoth.convertToHtml({ buffer })
  const body = blockLines(parseHtml(html))
  const { header, footer } = await docxHeaderFooter(buffer)
  const bodyText = body.join('\n')
  const extraHead = header.filter((h) => !bodyText.includes(h))
  const extraFoot = footer.filter((f) => !bodyText.includes(f) && !extraHead.includes(f))
  if (extraHead.length) notes.push(`docx: ${extraHead.length} header line(s) kept`)
  if (extraFoot.length) notes.push(`docx: ${extraFoot.length} footer line(s) kept`)
  const text = [...extraHead, ...(extraHead.length ? [''] : []), ...body, ...(extraFoot.length ? ['', ...extraFoot] : [])]
    .join('\n').replace(/\n{3,}/g, '\n\n').trim()
  return { text, notes }
}

// ============================================================== PDF

interface Item { x: number; y: number; w: number; h: number; s: string }
interface Line { y: number; items: Item[] }

function toLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines: Line[] = []
  for (const it of sorted) {
    const tol = Math.max(2, it.h * 0.45)
    const line = lines.find((l) => Math.abs(l.y - it.y) <= tol)
    if (line) line.items.push(it)
    else lines.push({ y: it.y, items: [it] })
  }
  for (const l of lines) l.items.sort((a, b) => a.x - b.x)
  return lines.sort((a, b) => b.y - a.y)
}

function lineText(l: Line): string {
  let out = ''
  let prevEnd = -Infinity
  for (const it of l.items) {
    const charW = it.s.length ? it.w / it.s.length : it.h * 0.5
    const gap = it.x - prevEnd
    if (out) {
      if (gap > Math.max(charW, it.h * 0.5) * 2.5) out = out.trimEnd() + ' | '
      else if (gap > charW * 0.15 && !out.endsWith(' ') && !it.s.startsWith(' ')) out += ' '
    }
    out += it.s
    prevEnd = it.x + it.w
  }
  return out.replace(/\s+/g, ' ').replace(/(\s\|\s)+/g, ' | ').trim()
}

/** Share of positions within 4pt of the most common one — how "aligned" an edge is. */
function alignedShare(xs: number[]): number {
  if (!xs.length) return 0
  const counts = new Map<number, number>()
  for (const x of xs) counts.set(Math.round(x / 4), (counts.get(Math.round(x / 4)) ?? 0) + 1)
  let best = 0
  for (const [k, c] of counts) best = Math.max(best, c + (counts.get(k - 1) ?? 0) + (counts.get(k + 1) ?? 0))
  return best / xs.length
}

/** Does this run of items (one side of a line) contain a table-cell-sized gap? */
function hasCellGap(items: Item[]): boolean {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    const charW = prev.s.length ? prev.w / prev.s.length : prev.h * 0.5
    if (items[i].x - (prev.x + prev.w) > Math.max(charW, prev.h * 0.5) * 2.5) return true
  }
  return false
}

/**
 * Find the gutter of a two-column page, or null for a one-column page.
 *
 * A real second column holds substantial text of its own on BOTH sides and
 * almost nothing crosses the gutter. That separates a sidebar layout from the
 * look-alikes that must NOT be split: a table (paragraphs above and below cross
 * the gutter), right-aligned dates (one side holds almost no text), and Europass
 * label columns (the label side holds too little text to be a column).
 */
function findGutter(lines: Line[], pageWidth: number): number | null {
  if (lines.length < 12) return null
  const totalChars = lines.reduce((n, l) => n + l.items.reduce((k, i) => k + i.s.trim().length, 0), 0)
  let best: { g: number; score: number } | null = null
  for (let g = pageWidth * 0.2; g <= pageWidth * 0.75; g += 3) {
    let spanning = 0, leftLines = 0, rightLines = 0, leftChars = 0, rightChars = 0, celled = 0, leftOnly = 0
    const leftStarts: number[] = [], leftEnds: number[] = []
    for (const l of lines) {
      let hasL = false, hasR = false, spans = false
      const left: Item[] = [], right: Item[] = []
      for (const it of l.items) {
        if (!it.s.trim()) continue
        if (it.x < g - 2 && it.x + it.w > g + 2) spans = true
        else if (it.x + it.w <= g + 2) { hasL = true; leftChars += it.s.trim().length; left.push(it) }
        else { hasR = true; rightChars += it.s.trim().length; right.push(it) }
      }
      if (spans) spanning++
      if (hasL) leftLines++
      if (hasR) rightLines++
      if (hasCellGap(left) || hasCellGap(right)) celled++
      if (hasL && !hasR) leftOnly++
      if (left.length) { leftStarts.push(left[0].x); leftEnds.push(left[left.length - 1].x + left[left.length - 1].w) }
    }
    const n = lines.length
    if (spanning / n > 0.06) continue
    if (leftLines / n < 0.3 || rightLines / n < 0.3) continue
    if (leftChars / totalChars < 0.15 || rightChars / totalChars < 0.15) continue
    // A table page: its rows hold several separated cells on one side of any
    // gutter ("Project | Client | Value | Year"). A column of a two-column CV
    // holds one run of text per line. Splitting a table would part each row.
    if (celled / n > 0.2) continue
    // A label column (Europass "WORK EXPERIENCE", "2019 – 2021"): its text is
    // RIGHT-aligned against the content it labels, while a sidebar is
    // left-aligned (measured on the resume-lab set: every Europass page 1.0
    // right-aligned, every sidebar 1.0 left-aligned). Or, left-aligned, it is
    // thin and almost never stands on a line alone. Splitting it would part
    // each date from its job.
    const startAligned = alignedShare(leftStarts), endAligned = alignedShare(leftEnds)
    if (endAligned >= 0.6 && endAligned > startAligned) continue
    if (leftOnly / n < 0.12 && leftChars / totalChars < 0.22) continue
    const score = -spanning * 10 + Math.min(leftLines, rightLines)
    if (!best || score > best.score) best = { g, score }
  }
  return best?.g ?? null
}

export async function pdfLayoutText(buffer: Buffer): Promise<LayoutText> {
  const notes: string[] = []
  const imageCount = countEmbeddedImages(buffer)
  let pages: string[] = []
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p)
      const width = page.getViewport({ scale: 1 }).width
      const content = await page.getTextContent()
      const items: Item[] = []
      for (const raw of content.items as unknown[]) {
        const it = raw as { str?: string; transform?: number[]; width?: number; height?: number }
        if (typeof it.str !== 'string' || !it.transform || !it.str.length) continue
        items.push({ s: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0, h: it.height || Math.abs(it.transform[3]) || 10 })
      }
      // Whitespace runs are dropped: PDFs pad columns with wide " " items that
      // would otherwise appear to cross the gutter. Spacing comes from the gaps.
      const solid = items.filter((i) => i.s.trim())
      items.length = 0
      items.push(...solid)
      const lines = toLines(items)
      const gutter = findGutter(lines, width)
      if (gutter === null) {
        pages.push(lines.map(lineText).filter(Boolean).join('\n'))
      } else {
        notes.push(`pdf: page ${p} read as two columns`)
        const side = (left: boolean) =>
          toLines(items.filter((i) => (left ? i.x + i.w <= gutter + 2 : i.x + i.w > gutter + 2)))
            .map(lineText).filter(Boolean).join('\n')
        // Lines crossing the gutter (a name banner across the top) stay first.
        const spanning = lines.filter((l) => l.items.some((i) => i.x < gutter - 2 && i.x + i.w > gutter + 2)).map(lineText)
        pages.push([...spanning, side(true), '', side(false)].filter((s) => s !== undefined).join('\n'))
      }
    }
  } catch (e) {
    notes.push('pdf: PDF.js failed ' + (e instanceof Error ? e.message : String(e)))
    pages = []
  }
  const text = pages.join('\n\n').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return {
    text,
    scanned: !text && imageCount > 0,
    garbled: looksGarbled(text),
    notes,
  }
}
