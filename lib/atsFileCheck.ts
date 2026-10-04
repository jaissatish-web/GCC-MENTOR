import { extractText, getDocumentProxy } from 'unpdf'
import type { ResumeDocument } from '@/lib/resumeDocument'

/**
 * READ THE DOWNLOADED CV BACK THE WAY AN ATS DOES (founder, 2026-10-02: "your
 * file reads correctly ✓" — no Gulf competitor checks its own file).
 *
 * The CV is perfect on screen; what matters to an applicant tracking system
 * is the text it can pull out of the PDF. So the PDF the user downloads is
 * read with a plain text extractor — the text stream in stored order, no
 * layout intelligence (our own CV-upload reader is deliberately smarter than
 * an ATS; this one deliberately is not) — and compared with what the CV says:
 *
 *   1. there is real text (not an image), without broken characters
 *   2. name, email and phone come out
 *   3. section headings an ATS recognises
 *   4. every job's title, employer and dates
 *   5. lines come out whole and in order (two-column designs interleave)
 *   6. the job's keywords that are in the CV are also in the extracted text
 *   7. no ligatures or icon glyphs that split words ("certiﬁed")
 *   8. a sensible length
 *
 * Deterministic, no model call. Each check says what to do when it fails.
 */

export interface FileCheckItem {
  id: 'text' | 'contact' | 'headings' | 'jobs' | 'order' | 'keywords' | 'characters' | 'length'
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export interface FileCheckReport {
  status: 'pass' | 'warn' | 'fail'
  passed: number
  total: number
  items: FileCheckItem[]
  pages: number
  chars: number
}

/** The text an ATS gets: page streams joined, nothing reordered. */
export async function atsTextOfPdf(pdf: Uint8Array): Promise<{ text: string; pages: number }> {
  const proxy = await getDocumentProxy(new Uint8Array(pdf))
  const { totalPages, text } = await extractText(proxy, { mergePages: false })
  return { text: (text as string[]).join('\n'), pages: totalPages }
}

const LIGATURES = /[ﬀ-ﬆ]/
const ICON_GLYPHS = /[-�]/

/** Lower case, one space, plain dashes and quotes, line-end hyphenation joined. */
export function norm(s: string): string {
  return s
    .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl')
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"')
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1-$2') // Chrome never hyphenates: a wrap at "-" is a real hyphen ("energy-" + "saving")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const SECTION_WORDS: Record<string, { strict: RegExp; soft?: RegExp; name: string }> = {
  summary: { strict: /\b(summary|profile|objective)\b/i, name: 'Summary' },
  experience: { strict: /\b(experience|employment)\b/i, soft: /\b(career|work) history\b/i, name: 'Experience' },
  skills: { strict: /\bskills\b/i, soft: /\b(expertise|competenc\w*)\b/i, name: 'Skills' },
  education: { strict: /\beducation\b/i, soft: /\b(academic|qualifications?)\b/i, name: 'Education' },
  certifications: { strict: /\b(certifications?|licen[cs]es?)\b/i, soft: /\b(training|accreditations?)\b/i, name: 'Certifications' },
}

/** Short lines that read as headings (≤ 6 words, no sentence punctuation). */
function headingLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && l.split(/\s+/).length <= 6 && !/[.:;]$/.test(l) && !/@|\d{3}/.test(l))
}

/** Phone digits, compared on the last 9 so "+971 50…" and "050…" both match. */
const digitsTail = (s: string) => s.replace(/\D/g, '').slice(-9)

/** A line counts as read whole when 90% of its words come out in one run, in order. */
function lineReadWhole(line: string, hay: string): boolean {
  const l = norm(line)
  if (l.length < 12) return true
  if (hay.includes(l)) return true
  // Tolerate one small difference (a bullet glyph, a wrapped hyphen): the longest
  // in-order run of the line's words must cover 90% of them.
  const words = l.split(' ')
  let best = 0
  for (let i = 0; i < words.length && words.length - i > best; i++) {
    let j = i + 1
    while (j <= words.length && hay.includes(words.slice(i, j).join(' '))) j++
    best = Math.max(best, j - 1 - i)
  }
  return best / words.length >= 0.9
}

export function checkAtsText(text: string, pages: number, doc: ResumeDocument, keywords: readonly string[]): FileCheckReport {
  const hay = norm(text)
  const items: FileCheckItem[] = []
  const push = (i: FileCheckItem) => items.push(i)

  // 1. Real text
  const chars = hay.replace(/\s/g, '').length
  push(
    chars < 300
      ? { id: 'text', label: 'An ATS can read the text', status: 'fail', detail: 'Almost no text could be read from this file — an ATS would see it as empty. Download it again; if this repeats, tell us.' }
      : { id: 'text', label: 'An ATS can read the text', status: 'pass', detail: `${chars.toLocaleString('en')} characters of real text, readable by any ATS.` },
  )

  // 2. Contact details
  const contact = doc.header.contactItems ?? []
  const email = (contact.find((c) => c.kind === 'email')?.text ?? '').toLowerCase()
  const phone = contact.find((c) => c.kind === 'phone')?.text ?? ''
  const name = doc.header.displayName ?? ''
  const missing = [
    name && !hay.includes(norm(name)) ? 'name' : null,
    email && !hay.includes(email) ? 'email' : null,
    phone && !text.replace(/\D/g, '').includes(digitsTail(phone)) ? 'phone' : null,
  ].filter(Boolean) as string[]
  const shown = [name && 'name', email && 'email', phone && 'phone'].filter(Boolean) as string[]
  push(
    missing.length
      ? { id: 'contact', label: 'Your name and contact details are found', status: 'fail', detail: `An ATS could not read your ${missing.join(' and ')}. Recruiters cannot call you back without it.` }
      : shown.length < 3
        ? { id: 'contact', label: 'Your name and contact details are found', status: 'warn', detail: `Your CV shows no ${['name', 'email', 'phone'].filter((x) => !shown.includes(x)).join(' or ')} — add it in your Career Profile.` }
        : { id: 'contact', label: 'Your name and contact details are found', status: 'pass', detail: 'Name, email and phone all read correctly.' },
  )

  // 3. Headings
  const lines = headingLines(text)
  const present: Array<keyof typeof SECTION_WORDS> = [
    ...(doc.summary?.trim() ? (['summary'] as const) : []),
    ...(doc.experience.length ? (['experience'] as const) : []),
    ...(doc.skills.length ? (['skills'] as const) : []),
    ...(doc.education.length ? (['education'] as const) : []),
    ...(doc.certifications.length ? (['certifications'] as const) : []),
  ]
  const unrecognised: string[] = []
  const softOnly: string[] = []
  for (const k of present) {
    const w = SECTION_WORDS[k]
    if (lines.some((l) => w.strict.test(l))) continue
    const soft = lines.find((l) => w.soft?.test(l))
    if (soft) softOnly.push(`"${soft}" (most ATS look for "${w.name}")`)
    else unrecognised.push(w.name)
  }
  push(
    unrecognised.length
      ? { id: 'headings', label: 'Section headings are recognised', status: 'fail', detail: `No heading an ATS recognises for: ${unrecognised.join(', ')}. Choose a design with standard headings, such as ATS Classic.` }
      : softOnly.length
        ? { id: 'headings', label: 'Section headings are recognised', status: 'warn', detail: `Some ATS may not recognise ${softOnly.join(', ')}. Fine for most; ATS Classic uses the standard names.` }
        : { id: 'headings', label: 'Section headings are recognised', status: 'pass', detail: `${present.map((k) => SECTION_WORDS[k].name).join(', ')} — all standard headings.` },
  )

  // 4. Jobs: title, employer, years
  const badJobs: string[] = []
  for (const x of doc.experience) {
    const role = norm(x.entry.role ?? '')
    const company = norm(x.entry.company ?? '')
    const years = (x.range.match(/\b(19|20)\d{2}\b/g) ?? []).filter((y) => !hay.includes(y))
    if ((role && !hay.includes(role)) || (company && !hay.includes(company)) || years.length) badJobs.push(x.entry.role || x.entry.company)
  }
  push(
    badJobs.length
      ? { id: 'jobs', label: 'Every job title, employer and date is found', status: 'fail', detail: `Not read correctly: ${badJobs.join('; ')}. An ATS may misdate or drop these jobs.` }
      : { id: 'jobs', label: 'Every job title, employer and date is found', status: 'pass', detail: `All ${doc.experience.length} job${doc.experience.length === 1 ? '' : 's'} read with title, employer and dates.` },
  )

  // 5. Order: lines whole, jobs in sequence
  const bullets = doc.experience.flatMap((x) => x.bullets)
  const whole = bullets.filter((b) => lineReadWhole(b, hay)).length
  // Each job is looked for AFTER the one before it (2026-10-04). Taking every
  // employer's first mention called a CV out of order when someone returned to
  // the same employer, or named one in the summary — common on long Gulf CVs.
  let from = 0
  let inSequence = true
  for (const x of doc.experience) {
    const key = norm(x.entry.company || x.entry.role || '')
    if (!key) continue
    const at = hay.indexOf(key, from)
    if (at >= 0) from = at + key.length
    else if (hay.includes(key)) inSequence = false // only found earlier: out of order (missing is item 4's to report)
  }
  const share = bullets.length ? whole / bullets.length : 1
  push(
    share < 0.85 || !inSequence
      ? { id: 'order', label: 'Lines read whole and in order', status: 'fail', detail: `${whole} of ${bullets.length} lines came out whole${inSequence ? '' : ' and the jobs came out of order'}. This design's layout mixes columns for an ATS — use a one-column design such as ATS Classic when you upload to a job portal.` }
      : share < 0.97
        ? { id: 'order', label: 'Lines read whole and in order', status: 'warn', detail: `${whole} of ${bullets.length} lines came out whole; a few were split. Most ATS cope with this.` }
        : { id: 'order', label: 'Lines read whole and in order', status: 'pass', detail: `All ${bullets.length} work lines read whole and in order.` },
  )

  // 6. Keywords: those the CV contains must survive extraction
  const docText = norm([doc.summary, ...doc.skills.map((s) => s.name), ...bullets, ...doc.certifications.map((c) => c.display)].join('\n'))
  const inCv = keywords.filter((k) => k.trim().length > 1 && docText.includes(norm(k)))
  const lost = inCv.filter((k) => !hay.includes(norm(k)))
  push(
    !inCv.length
      ? { id: 'keywords', label: 'The job’s keywords are readable', status: 'pass', detail: 'No job keywords to check for this CV.' }
      : lost.length
        ? { id: 'keywords', label: 'The job’s keywords are readable', status: lost.length / inCv.length > 0.1 ? 'fail' : 'warn', detail: `${inCv.length - lost.length} of ${inCv.length} keywords read correctly. Not readable: ${lost.slice(0, 6).join(', ')}.` }
        : { id: 'keywords', label: 'The job’s keywords are readable', status: 'pass', detail: `All ${inCv.length} job keywords in your CV are readable.` },
  )

  // 7. Characters
  const lig = LIGATURES.test(text)
  const icons = (text.match(new RegExp(ICON_GLYPHS.source, 'g')) ?? []).length
  push(
    lig || icons > 2
      ? { id: 'characters', label: 'No characters that break words', status: 'warn', detail: lig ? 'Some letter pairs (fi, fl) are stored as one symbol, so an ATS may read "certiﬁed" as two words. Try another design.' : 'Icons in this design come out as unreadable symbols. Harmless to most ATS, but ATS Classic has none.' }
      : { id: 'characters', label: 'No characters that break words', status: 'pass', detail: 'Plain letters throughout — no symbols that split words.' },
  )

  // 8. Length
  push(
    pages > 4
      ? { id: 'length', label: 'A length recruiters read', status: 'warn', detail: `${pages} pages. Gulf recruiters expect 2–3; consider a compact design or fewer older-job lines.` }
      : { id: 'length', label: 'A length recruiters read', status: 'pass', detail: `${pages} page${pages === 1 ? '' : 's'}.` },
  )

  const fails = items.filter((i) => i.status === 'fail').length
  const warns = items.filter((i) => i.status === 'warn').length
  return { status: fails ? 'fail' : warns ? 'warn' : 'pass', passed: items.filter((i) => i.status === 'pass').length, total: items.length, items, pages, chars }
}
