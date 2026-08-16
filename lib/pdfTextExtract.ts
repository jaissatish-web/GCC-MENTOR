// Direct PDF text extraction — zero external dependencies.
// Handles common PDF stream filters: FlateDecode, ASCII85Decode,
// ASCIIHexDecode, and chained filters (e.g. [/ASCII85Decode /FlateDecode]).
// All modern PDF generators (Word, Google Docs, Canva, resume builders)
// compress their streams — this decompresses them first.

import { inflateSync, inflateRawSync } from 'zlib'

export interface ExtractResult {
  text: string
  /** Diagnostic info — non-empty only when debugging is needed */
  filter?: string
  streamCount?: number
  errorCount?: number
  /** How many embedded-font ToUnicode maps were parsed (0 = none found). */
  fontMapCount?: number
  /** True when the text is almost certainly a failed decode, not a resume. */
  looksGarbled?: boolean
  /**
   * How many embedded raster images the document contains.
   *
   * Used only as a weak hint for "does this CV carry a photo?" — a resume may
   * embed a logo or an icon instead, so the caller must treat a non-zero count
   * as "an image is present", never as "a photograph of you is present".
   */
  imageCount?: number
}

// ---------------------------------------------------------------------------
// Embedded font decoding (ToUnicode CMaps)
//
// WHY THIS EXISTS — this is the bug that made the product fabricate.
//
// Word/LibreOffice/Canva exports embed SUBSET fonts (BAAAAA+SegoeUI) whose
// glyph codes are arbitrary: in a real resume tested here, code 0x44 meant "a",
// an offset of 29 from ASCII. Reading those codes as characters yields a
// consistent-looking cipher — "6 $ 7 , 6 +" for "SATISH" — and, worse, digits
// land at codes 0x13–0x1C, below the printable filter, so EVERY NUMBER was
// silently deleted. Years of experience, kV ratings, quantities and dates all
// vanished.
//
// The model downstream then received confident-looking garbage and filled the
// gaps with invented specifics, which is the exact opposite of this product's
// one promise. Extraction correctness is therefore a grounding concern, not a
// formatting nicety.
//
// The correct mapping is already in the file: each font carries a /ToUnicode
// CMap giving code -> unicode. We parse those and decode through them.
// ---------------------------------------------------------------------------

type CMap = Map<number, string>

interface FontInfo {
  cmap: CMap
  /** Identity-H and friends use 2-byte codes; simple fonts use 1. */
  bytes: 1 | 2
}

/** Index every `N 0 obj … endobj` body once, so lookups are O(1) afterwards. */
function buildObjectIndex(raw: string): Map<number, string> {
  const objs = new Map<number, string>()
  const re = /(\d+)\s+0\s+obj([\s\S]*?)endobj/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    // First definition wins: an incrementally-updated PDF can repeat an object
    // number, and the earlier one is the one the rest of our offsets assume.
    if (!objs.has(Number(m[1]))) objs.set(Number(m[1]), m[2])
  }
  return objs
}

/** Pull and decompress a stream body out of an already-located object. */
function objectStream(objBody: string): Buffer | null {
  const s = objBody.indexOf('stream')
  const e = objBody.indexOf('endstream')
  if (s === -1 || e === -1 || e <= s) return null
  let data = Buffer.from(objBody.slice(s + 6, e), 'latin1')
  while (data.length && (data[0] === 0x0a || data[0] === 0x0d)) data = data.subarray(1)
  const dict = objBody.slice(0, s)
  try {
    return decompressStream(data, dict)
  } catch {
    return null
  }
}

function hexToCodePointString(hex: string): string {
  // A bfchar/bfrange destination may hold several UTF-16BE units (ligatures).
  let out = ''
  for (let i = 0; i + 3 < hex.length + 1; i += 4) {
    const unit = parseInt(hex.slice(i, i + 4), 16)
    if (Number.isNaN(unit)) break
    out += String.fromCharCode(unit)
  }
  return out
}

/** Parse the bfchar/bfrange sections of a ToUnicode CMap. */
function parseCMap(text: string): { cmap: CMap; bytes: 1 | 2 } {
  const cmap: CMap = new Map()

  // Codespace width — `<0000> <FFFF>` means 2-byte codes.
  let bytes: 1 | 2 = 2
  const csr = text.match(/begincodespacerange([\s\S]*?)endcodespacerange/)
  if (csr) {
    const first = csr[1].match(/<([0-9a-fA-F]+)>/)
    if (first && first[1].length <= 2) bytes = 1
  }

  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g
  let bc: RegExpExecArray | null
  while ((bc = bfcharRe.exec(text)) !== null) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g
    let pair: RegExpExecArray | null
    while ((pair = pairRe.exec(bc[1])) !== null) {
      cmap.set(parseInt(pair[1], 16), hexToCodePointString(pair[2]))
    }
  }

  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g
  let br: RegExpExecArray | null
  while ((br = bfrangeRe.exec(text)) !== null) {
    // Form A: <lo> <hi> <dstStart>
    const formARe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g
    let r: RegExpExecArray | null
    while ((r = formARe.exec(br[1])) !== null) {
      const lo = parseInt(r[1], 16)
      const hi = parseInt(r[2], 16)
      const dst = parseInt(r[3], 16)
      // Guard against a malformed range claiming millions of entries.
      if (hi < lo || hi - lo > 65535) continue
      for (let c = lo; c <= hi; c++) cmap.set(c, String.fromCharCode(dst + (c - lo)))
    }
    // Form B: <lo> <hi> [ <d1> <d2> … ]
    const formBRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g
    let rb: RegExpExecArray | null
    while ((rb = formBRe.exec(br[1])) !== null) {
      const lo = parseInt(rb[1], 16)
      let i = 0
      const dRe = /<([0-9a-fA-F]+)>/g
      let d: RegExpExecArray | null
      while ((d = dRe.exec(rb[3])) !== null) {
        cmap.set(lo + i, hexToCodePointString(d[1]))
        i++
      }
    }
  }

  return { cmap, bytes }
}

/**
 * Map every font RESOURCE NAME (/F14) to its decoded ToUnicode map.
 *
 * Keyed by name rather than by page because exporters of this class assign a
 * font name once per document — /F14 resolves to object 14 in every page's
 * resource dictionary — so a global table is both correct here and far simpler
 * than threading page resources through the content-stream walk. A name that
 * genuinely disagreed between pages would simply be decoded by whichever
 * mapping was registered; the fallback path below still applies when a code is
 * absent from the map, so the failure mode stays "unchanged behaviour", not
 * "wrong characters".
 */
function buildFontMaps(raw: string, objs: Map<number, string>): Map<string, FontInfo> {
  const fonts = new Map<string, FontInfo>()
  const cache = new Map<number, FontInfo | null>()

  const resRe = /\/Font\s*<<([\s\S]*?)>>/g
  let resDict: RegExpExecArray | null
  while ((resDict = resRe.exec(raw)) !== null) {
    const refRe = /\/([A-Za-z0-9]+)\s+(\d+)\s+0\s+R/g
    let ref: RegExpExecArray | null
    while ((ref = refRe.exec(resDict[1])) !== null) {
      const name = ref[1]
      const objNum = Number(ref[2])
      if (fonts.has(name)) continue

      let info = cache.get(objNum)
      if (info === undefined) {
        info = null
        const fontObj = objs.get(objNum)
        const tu = fontObj?.match(/\/ToUnicode\s+(\d+)\s+0\s+R/)
        if (tu) {
          const cmapObj = objs.get(Number(tu[1]))
          if (cmapObj) {
            const buf = objectStream(cmapObj)
            if (buf) {
              const parsed = parseCMap(buf.toString('latin1'))
              if (parsed.cmap.size > 0) info = parsed
            }
          }
        }
        cache.set(objNum, info)
      }
      if (info) fonts.set(name, info)
    }
  }

  return fonts
}

/**
 * True for streams that cannot contain page text.
 *
 * Images and embedded font programs are binary; scanning them for BT/ET finds
 * spurious matches and emits raw bytes as "text". A /Form XObject is a real
 * content stream and must stay in.
 */
function isNonContentStream(dict: string): boolean {
  if (!dict) return false
  if (/\/Subtype\s*\/Image/.test(dict)) return true
  if (/\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode|RunLengthDecode)/.test(dict)) return true
  if (/\/FontFile\d?/.test(dict)) return true
  if (/\/Type\s*\/(Font|Metadata|XRef|ObjStm)/.test(dict)) return true
  if (/\/Subtype\s*\/(Type1C|CIDFontType0C|OpenType|TrueType)/.test(dict)) return true
  return false
}

/** Decode a hex text string through a font's CMap. */
function decodeWithCMap(hex: string, font: FontInfo): string {
  const step = font.bytes * 2
  let out = ''
  for (let i = 0; i + step <= hex.length; i += step) {
    const code = parseInt(hex.slice(i, i + step), 16)
    if (Number.isNaN(code)) continue
    const mapped = font.cmap.get(code)
    if (mapped !== undefined) {
      out += mapped
    } else if (code >= 32 && code <= 0x10ffff) {
      // Unmapped code — fall back to treating it as a character rather than
      // dropping it, so a partially-mapped font degrades instead of vanishing.
      out += String.fromCharCode(code)
    }
  }
  return out
}

function extractPdfText(buffer: Buffer, debug = false): ExtractResult {
  const raw = buffer.toString('latin1')
  const result: ExtractResult = { text: '' }
  if (debug) result.streamCount = 0

  if (!raw.startsWith('%PDF-')) return result

  // Resolve embedded-font encodings before reading any content stream — a
  // subset font's codes are meaningless without its ToUnicode map.
  let fonts: Map<string, FontInfo> = new Map()
  try {
    fonts = buildFontMaps(raw, buildObjectIndex(raw))
  } catch {
    // A malformed font table must never cost us the whole document; fall back
    // to raw code-as-character decoding, i.e. the previous behaviour.
    fonts = new Map()
  }
  if (debug) result.fontMapCount = fonts.size

  const textParts: string[] = []
  let pos = 0
  let errors = 0
  let images = 0

  while (pos < raw.length) {
    // Find stream: 'stream\n' or 'stream\r\n'
    let streamMarker = raw.indexOf('stream', pos)
    while (streamMarker !== -1) {
      const after = raw[streamMarker + 6]
      if (after === '\n' || after === '\r') break
      streamMarker = raw.indexOf('stream', streamMarker + 1)
    }
    if (streamMarker === -1) break

    // Determine the actual data start (skip 'stream\r\n' or 'stream\n')
    let dataStart = streamMarker + 7 // 'stream\n'
    if (raw[streamMarker + 6] === '\r' && raw[streamMarker + 7] === '\n') {
      dataStart = streamMarker + 8 // 'stream\r\n'
    } else if (raw[streamMarker + 6] === '\n') {
      dataStart = streamMarker + 7
    } else {
      pos = streamMarker + 6
      continue
    }

    const streamEnd = raw.indexOf('endstream', dataStart)
    if (streamEnd === -1) break

    // Find the stream dictionary (<< ... >> before stream)
    const dictStart = raw.lastIndexOf('<<', streamMarker)
    const dict = dictStart !== -1 && dictStart > pos ? raw.slice(dictStart, streamMarker) : ''

    // Trim trailing whitespace before endstream
    let dataEnd = streamEnd
    while (dataEnd > dataStart && (raw[dataEnd - 1] === '\n' || raw[dataEnd - 1] === '\r' || raw[dataEnd - 1] === ' ')) {
      dataEnd--
    }

    // Only page/form content streams hold text. Image bitmaps and embedded
    // font programs decompress into binary that happens to contain "BT"/"ET"
    // byte pairs often enough to leak megabytes of noise into the output —
    // which then goes to the model as if it were resume content. Skip them.
    if (isNonContentStream(dict)) {
      if (/\/Subtype\s*\/Image/.test(dict)) images++
      pos = streamEnd + 9
      continue
    }

    if (debug) result.streamCount!++

    let streamData: Buffer | null = null
    try {
      const rawData = Buffer.from(raw.slice(dataStart, dataEnd), 'latin1')
      streamData = decompressStream(rawData, dict)

      if (!streamData) {
        errors++
        if (debug && !result.filter && dict) result.filter = detectFilter(dict) ?? undefined
      }
    } catch {
      errors++
    }

    if (streamData) {
      const streamStr = streamData.toString('latin1')
      extractTextFromContent(streamStr, fonts, textParts)
    }

    pos = streamEnd + 9
  }

  if (debug) result.errorCount = errors
  result.text = textParts.join(' ').replace(/\s+/g, ' ').trim()
  result.looksGarbled = looksGarbled(result.text)
  result.imageCount = images
  return result
}

/**
 * Does this text look like a failed decode rather than a resume?
 *
 * The guard that would have caught the original bug on its own. When a subset
 * font cannot be decoded the output is not empty — it is confident-looking
 * rubbish ("6 $ 7 , 6 +") that passes a length check and reaches the model,
 * which then fills the gaps with invented specifics. Refusing to send it is
 * strictly better than any answer derived from it: this product's promise is
 * that nothing is invented, and an unreadable file has to fail loudly.
 *
 * Kept deliberately crude — it only has to separate "real prose" from "noise",
 * and every threshold here is far from the values normal resume text produces.
 */
function looksGarbled(text: string): boolean {
  const t = text.trim()
  if (t.length < 50) return true

  // Real prose is overwhelmingly printable ASCII. Emoji and accents push this
  // up a little, hence a generous ceiling rather than a tight one.
  const nonPrintable = (t.match(/[^\x20-\x7E -ɏ -➿\uD800-\uDFFF]/g) ?? []).length
  if (nonPrintable / t.length > 0.15) return true

  // Words. Garbled output is either one giant run or single characters
  // separated by spaces; neither yields a normal mean word length.
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 10) return true
  const avgWordLen = words.reduce((n, w) => n + w.length, 0) / words.length
  if (avgWordLen < 2 || avgWordLen > 25) return true

  // Vowel frequency is the cheapest reliable "is this a language?" signal.
  // English prose sits near 38%; a substitution cipher lands far below it.
  const letters = (t.match(/[A-Za-z]/g) ?? []).length
  if (letters < 40) return true
  const vowels = (t.match(/[AEIOUaeiou]/g) ?? []).length
  if (vowels / letters < 0.20) return true

  return false
}

function decompressStream(data: Buffer, dict: string): Buffer | null {
  const filter = detectFilter(dict)
  if (!filter) return data

  // Multiple chained filters: e.g. [/ASCII85Decode /FlateDecode]
  // Apply in the order listed
  let current = data
  for (const f of filter.split('+')) {
    try {
      if (f === 'FlateDecode') {
        // Try standard zlib first, then raw deflate
        try {
          current = inflateSync(current)
        } catch {
          current = inflateRawSync(current)
        }
      } else if (f === 'ASCII85Decode') {
        current = decodeAscii85(current)
      } else if (f === 'ASCIIHexDecode') {
        current = decodeAsciiHex(current)
      }
      // LZWDecode, RunLengthDecode, etc. — unsupported for now
      // but most modern PDFs only use FlateDecode or ASCII85+FlateDecode
    } catch {
      return null
    }
  }

  return current
}

function detectFilter(dict: string): string | null {
  // Single filter: /Filter /FlateDecode
  const singleMatch = dict.match(/\/Filter\s*\/(\w+)/)
  if (singleMatch) return singleMatch[1]

  // Array of filters: /Filter [/ASCII85Decode /FlateDecode]
  const arrayMatch = dict.match(/\/Filter\s*\[([^\]]+)\]/)
  if (arrayMatch) {
    const filters = arrayMatch[1].match(/\/\w+/g)
    if (filters) return filters.map(f => f.slice(1)).join('+')
  }

  return null
}

function decodeAscii85(data: Buffer): Buffer {
  const text = data.toString('latin1')
  // Remove whitespace and the ~> end marker
  const cleaned = text.replace(/\s/g, '').replace(/~>$/, '')
  const result: number[] = []
  let group: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned.charCodeAt(i)
    if (ch < 33 || ch > 117) continue // skip invalid chars
    group.push(ch - 33)

    if (group.length === 5) {
      const n = group[0] * 85 * 85 * 85 * 85 +
                group[1] * 85 * 85 * 85 +
                group[2] * 85 * 85 +
                group[3] * 85 +
                group[4]
      result.push((n >> 24) & 0xFF, (n >> 16) & 0xFF, (n >> 8) & 0xFF, n & 0xFF)
      group = []
    }
  }

  // Handle remaining characters (padding implied)
  if (group.length > 0) {
    while (group.length < 5) group.push(84) // 84 = max value, padding
    const n = group[0] * 85 * 85 * 85 * 85 +
              group[1] * 85 * 85 * 85 +
              group[2] * 85 * 85 +
              group[3] * 85 +
              group[4]
    for (let j = 0; j < group.length - 1; j++) {
      result.push((n >> (24 - j * 8)) & 0xFF)
    }
  }

  return Buffer.from(result)
}

function decodeAsciiHex(data: Buffer): Buffer {
  const text = data.toString('latin1').replace(/\s/g, '')
  const result: number[] = []
  for (let i = 0; i < text.length - 1; i += 2) {
    const hex = text.slice(i, i + 2)
    if (/^[0-9a-fA-F]{2}$/.test(hex)) {
      result.push(parseInt(hex, 16))
    }
  }
  return Buffer.from(result)
}

function unescapePdfLiteral(s: string): string {
  return s
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, ' ')
    .replace(/\\r/g, ' ')
    .replace(/\\t/g, ' ')
}

/**
 * Walk a text block IN ORDER, tracking the active font.
 *
 * The previous implementation ran four independent regexes over the block, so
 * it could not know which font any given string belonged to — a prerequisite
 * for decoding subset fonts at all. It also pushed every string as its own
 * part and joined the lot with spaces, which is why a document that emits one
 * glyph per array element came out as "S A T I S H".
 *
 * Here each show-operator's glyphs are concatenated without separators, and a
 * space is inserted only where the PDF's own kerning says one belongs.
 */
function extractTextFromBlock(
  block: string,
  fonts: Map<string, FontInfo>,
  parts: string[]
): void {
  // Show operators:
  //   /F14 11 Tf  |  (lit) Tj  |  <hex> Tj  |  [ … ] TJ  |  (lit) '  |  (lit) "
  // Line-position operators, which is where LINE STRUCTURE lives:
  //   tx ty Td  |  tx ty TD  |  T*  |  a b c d e f Tm
  //
  // Those four were previously not matched at all, so every line inside a
  // BT/ET block was concatenated with nothing between it and the next one.
  // Line breaks only survived when the producer happened to emit one BT/ET per
  // line; Word and LibreOffice do not — they open one block per paragraph and
  // move the cursor with Td/Tm. Measured effect on a real PDF: the email came
  // back as "Engineerrajesh.kumar@example.com" (the previous line's last word
  // fused onto it) and "English" went undetected because it had fused onto the
  // "LANGUAGES" heading. Section headings merging into body text also defeats
  // the structure checks in lib/gccReadiness/analyzeResume.ts, and hands the
  // extraction model a wall of run-together words — the same degraded input
  // TASK-107 exists to prevent, arriving by a different route.
  const opRe =
    /\/([A-Za-z0-9]+)\s+[\d.]+\s+Tf|\(((?:[^()\\]|\\.)*)\)\s*(Tj|'|")|<([0-9a-fA-F\s]+)>\s*Tj|\[([\s\S]*?)\]\s*TJ|(-?[\d.]+)\s+(-?[\d.]+)\s+(Td|TD)|(T\*)|(?:-?[\d.]+\s+){4}(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/g

  let currentFont: FontInfo | undefined
  let m: RegExpExecArray | null

  /** Text-matrix y of the last Tm, so a Tm that only moves horizontally (common
   *  for kerning and tab stops) is not mistaken for a new line. */
  let lastTmY: number | null = null

  // Everything inside one BT/ET is accumulated into a SINGLE part.
  //
  // A word is routinely split across several show-operators — this document
  // emits "Superint" and "endent" as two Tj calls so it can apply kerning
  // between them. Pushing each operator separately and joining the list with a
  // space (the previous behaviour) therefore manufactured spaces inside words:
  // "Superint endent", "P assport", "T abuk". Real word gaps survive because
  // the font's CMap maps a genuine space glyph, and blocks are still joined
  // with a space so separate lines never run together.
  let blockText = ''

  const newline = () => {
    if (blockText && !blockText.endsWith('\n')) blockText += '\n'
  }

  while ((m = opRe.exec(block)) !== null) {
    if (m[1] !== undefined) {
      currentFont = fonts.get(m[1])
      continue
    }

    // ---- line-position operators (no text of their own) --------------------
    if (m[8] !== undefined) {
      // tx ty Td / TD — a non-zero vertical move is a new line. A purely
      // horizontal one is a tab stop or a column, which must NOT break a line.
      if (parseFloat(m[7]) !== 0) newline()
      continue
    }

    if (m[9] !== undefined) {
      // T* — move to the next line, unconditionally.
      newline()
      continue
    }

    if (m[11] !== undefined) {
      // a b c d e f Tm — sets the text matrix outright. Only treat it as a new
      // line when it actually moves the baseline; producers also use Tm to
      // re-position horizontally within a line.
      const y = parseFloat(m[11])
      if (lastTmY !== null && y !== lastTmY) newline()
      lastTmY = y
      continue
    }

    if (m[2] !== undefined) {
      // ' and " both mean "move to the next line, THEN show" — the line break
      // comes first, which is what makes them different from Tj.
      if (m[3] === "'" || m[3] === '"') newline()
      blockText += unescapePdfLiteral(m[2])
      continue
    }

    if (m[4] !== undefined) {
      const hex = m[4].replace(/\s+/g, '')
      blockText += currentFont ? decodeWithCMap(hex, currentFont) : hexStringToText(hex)
      continue
    }

    if (m[5] !== undefined) {
      // A TJ array interleaves strings with kerning numbers. Glyphs join with
      // no separator; a sufficiently negative kern is the document's way of
      // spelling a space, which is how word boundaries survive in exports that
      // never emit an actual space character.
      let run = ''
      const elRe = /\(((?:[^()\\]|\\.)*)\)|<([0-9a-fA-F\s]+)>|(-?[\d.]+)/g
      let el: RegExpExecArray | null
      while ((el = elRe.exec(m[5])) !== null) {
        if (el[1] !== undefined) {
          run += unescapePdfLiteral(el[1])
        } else if (el[2] !== undefined) {
          const hex = el[2].replace(/\s+/g, '')
          run += currentFont ? decodeWithCMap(hex, currentFont) : hexStringToText(hex)
        } else if (el[3] !== undefined) {
          // Only a LARGE negative kern means "word gap". Typographic kerning
          // pairs after capitals (T, P, R, V, W, Y) sit around -30..-150, and
          // treating those as spaces shredded words into "T abuk", "P assport",
          // "R esults". Exports of this class emit a real space glyph via the
          // font's CMap anyway, so this only has to catch documents that
          // position words without one — hence a deliberately conservative
          // threshold that stays clear of ordinary kerning.
          if (parseFloat(el[3]) <= -400 && run && !run.endsWith(' ')) run += ' '
        }
      }
      blockText += run
    }
  }

  if (blockText.trim()) parts.push(blockText)
}

function extractTextFromContent(
  content: string,
  fonts: Map<string, FontInfo>,
  parts: string[]
): void {
  let btPos = 0
  while (btPos < content.length) {
    const btIdx = content.indexOf('BT', btPos)
    if (btIdx === -1) break
    const etIdx = content.indexOf('ET', btIdx)
    if (etIdx === -1) break
    extractTextFromBlock(content.slice(btIdx + 2, etIdx), fonts, parts)
    btPos = etIdx + 2
  }
}

/** Decode PDF hex-encoded text to readable string */
function hexStringToText(hex: string): string {
  const bytes: number[] = []
  for (let i = 0; i < hex.length - 1; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  // Most PDF hex text is UTF-16BE encoded (common for embedded fonts)
  // Try UTF-16BE first, fall back to Latin-1
  try {
    const buf = Buffer.from(bytes)
    // Check for BOM
    if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return buf.toString('utf16le').slice(1) // UTF-16BE with BOM
    }
    // Try UTF-16BE (most common for PDF hex text)
    const utf16be = Buffer.alloc(bytes.length * 2)
    for (let i = 0; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        utf16be[i] = bytes[i]
        utf16be[i + 1] = bytes[i + 1]
      }
    }
    // Simpler approach: just try ASCII/Latin-1 first
    if (bytes.every(b => b < 128)) {
      return buf.toString('latin1')
    }
    // Try swapping bytes for UTF-16BE
    const swapped = Buffer.alloc(bytes.length)
    for (let i = 0; i < bytes.length; i += 2) {
      if (i + 1 < bytes.length) {
        swapped[i] = bytes[i + 1]
        swapped[i + 1] = bytes[i]
      } else {
        swapped[i] = bytes[i]
      }
    }
    return swapped.toString('utf16le')
  } catch {
    return ''
  }
}

export { extractPdfText }