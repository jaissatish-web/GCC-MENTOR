// PDF text extraction, backed by Mozilla's PDF.js via `unpdf` (TASK-124).
//
// WHY THIS IS A LIBRARY NOW, after ~900 lines of hand-rolled parser.
//
// The hand-rolled version was written to avoid a dependency, and it worked
// until it met real resumes. It then produced two launch-grade defects in two
// days:
//
//   TASK-107  Subset fonts (BAAAAA+SegoeUI) use arbitrary glyph codes. Reading
//             them as characters yielded a consistent-looking cipher, and every
//             DIGIT landed below the printable filter and was silently deleted.
//             The model downstream filled the gaps with invented numbers — the
//             exact opposite of this product's one promise. Fixed by parsing
//             /ToUnicode CMaps by hand.
//   TASK-123  Line-position operators (Td/TD/T*/Tm) were not parsed at all, so
//             lines fused into each other ("Engineerrajesh.kumar@example.com").
//             Fixed by hand — and then neutered anyway by the final
//             `.replace(/\s+/g, ' ')`, which collapsed every newline the fix
//             had just inserted. Measured on the founder's own two resumes:
//             ONE non-empty line out of 227 and 149 real ones.
//
// Both are solved problems in the renderer Firefox ships. Measured on those
// same two resumes, PDF.js matched the hand-rolled extractor character for
// character (9,893 vs 9,898) and digit for digit (257 and 328 exactly), while
// recovering the line structure the hand-rolled one had flattened. It costs
// ~1.4s on a 1.5MB file against ~50ms, which is irrelevant next to a ~60s AI
// call and buys correctness on every font encoding, not just the two seen so
// far.
//
// LICENCE, checked before adopting: `unpdf` is MIT and bundles a serverless
// build of PDF.js, which is Apache-2.0. Both are permissive and safe for a
// commercial product. (OpenResume, the best-known open-source resume parser,
// is AGPL-3.0 and was deliberately NOT used — running AGPL code as a network
// service would oblige us to publish this entire codebase.)
//
// KEPT FROM THE OLD IMPLEMENTATION, because they are product behaviour rather
// than parsing: the garbled-output guard, and the embedded-image count that
// the Gulf readiness photo check (TASK-110) reads.

import { extractText, getDocumentProxy } from 'unpdf'

export interface ExtractResult {
  text: string
  /** Diagnostic info — non-empty only when debugging is needed */
  filter?: string
  streamCount?: number
  errorCount?: number
  /** Retained for callers that still read it; PDF.js handles fonts internally. */
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

/**
 * Count embedded raster images without decoding any of them.
 *
 * A direct scan of the raw bytes for image XObject declarations. This is the
 * one piece of the old parser worth keeping: PDF.js exposes images only by
 * walking every page's operator list, which costs far more than this for a
 * signal the readiness engine deliberately treats as a weak hint anyway.
 */
function countEmbeddedImages(buffer: Buffer): number {
  const raw = buffer.toString('latin1')
  return (raw.match(/\/Subtype\s*\/Image\b/g) ?? []).length
}

/**
 * Extract the text of a PDF.
 *
 * ASYNC since TASK-124 — PDF.js parses asynchronously. Both call sites
 * (`/api/parse/upload` and `/api/ats-scan`) were already async.
 *
 * Never throws: a file PDF.js cannot open returns empty text, which
 * `looksGarbled` then reports as unreadable, so callers keep exactly one
 * failure path to handle rather than two.
 */
export async function extractPdfText(buffer: Buffer, debug = false): Promise<ExtractResult> {
  const result: ExtractResult = { text: '' }
  if (debug) {
    result.streamCount = 0
    result.errorCount = 0
  }

  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text, totalPages } = await extractText(pdf, { mergePages: true })
    // mergePages is typed as possibly returning per-page strings; normalise.
    result.text = (Array.isArray(text) ? text.join('\n') : text)
      // Collapse runs of blank lines and trailing spaces, but NEVER newlines
      // themselves — line structure is what the readiness checks and the
      // extraction prompt both read. This is the bug TASK-123 fixed and the
      // old `\s+ -> ' '` reintroduced.
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    if (debug) result.streamCount = totalPages
  } catch (e) {
    if (debug) result.errorCount = 1
    console.error('pdfTextExtract: PDF.js failed', e instanceof Error ? e.message : String(e))
    result.text = ''
  }

  result.looksGarbled = looksGarbled(result.text)
  result.imageCount = countEmbeddedImages(buffer)
  return result
}

/**
 * Does this text look like a failed decode rather than a resume?
 *
 * Kept from the hand-rolled implementation. It is now a second line of defence
 * rather than the first — PDF.js decodes the encodings that used to defeat us —
 * but it still earns its place: a SCANNED resume (pages that are pure images)
 * yields little or no text from any extractor, and sending that to the model
 * invites exactly the invention this product forbids. Refusing loudly is
 * strictly better than any answer derived from it.
 *
 * Deliberately crude — it only has to separate "real prose" from "noise", and
 * every threshold sits far from what normal resume text produces.
 */
function looksGarbled(text: string): boolean {
  const t = text.trim()
  if (t.length < 50) return true

  // Real prose is overwhelmingly printable ASCII. Emoji and accents push this
  // up a little, hence a generous ceiling rather than a tight one.
  const nonPrintable = (t.match(/[^\x20-\x7E -ɏ -➿\uD800-\uDFFF\n]/g) ?? []).length
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
  if (vowels / letters < 0.2) return true

  return false
}
