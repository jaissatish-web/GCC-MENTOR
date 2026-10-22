import type { CareerProfileDraft } from '@/types/careerProfile'
import { stripIdNumbers } from '@/lib/idNumbers'
import type { ParseWarning } from './check'

/**
 * Retain responsibility blocks omitted by the model without guessing an employer.
 * Explicit per-job bullets already captured by extraction remain untouched.
 * Unassigned lines stay in their original category for candidate review.
 */

const HEADING = /^\s*(?:job\s+|key\s+|main\s+|major\s+|duties\s*(?:&|and)\s*)?(responsibilities|duties|achievements|accomplishments)\s*:?\s*$/i
/** Any other section heading ends the block. */
const NEXT_SECTION = /^\s*(education(al)?(\s+qualifications?)?|academic|qualifications?|technical\s+skills|skills|key\s+skills|core\s+competenc\w*|certifications?|licen[cs]es?|training|languages?|personal\s+(details|information|profile)|declaration|references?|hobbies|interests|projects?|employment(\s+history)?|work\s+experience|experience|career\s+(objective|summary)|profile|summary|strengths)\s*:?\s*$/i

const norm = (s: string) => s.toLowerCase().replace(/^[\s•●▪◦*\-–—·]+/, '').replace(/[^a-z0-9+%]+/g, ' ').trim()

/** The lines of each responsibilities block in the CV text, bullets stripped. */
export function looseDutyLines(text: string): { heading: string; lines: string[] } | null {
  const rows = text.split(/\r?\n/)
  const found: string[] = []
  let heading = ''
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i].match(HEADING)
    if (!m) continue
    heading = heading || rows[i].trim().replace(/:$/, '')
    for (let j = i + 1; j < rows.length; j++) {
      const row = rows[j].trim()
      if (!row) continue
      if (HEADING.test(row) || NEXT_SECTION.test(row)) break
      // The next job's header ("Al Futtaim | Site Engineer | 2019 – Present")
      // ends a per-job block: it carries a year or table cells, a duty rarely does.
      if (/\b(19|20)\d{2}\b/.test(row) || row.includes(' | ')) break
      // A heading in capitals that is not in the list also ends the block.
      if (/^[A-Z][A-Z &/]{3,40}$/.test(row) && row.split(/\s+/).length <= 4) break
      const line = row.replace(/^[\s•●▪◦*\-–—·]+/, '').trim()
      if (line.split(/\s+/).length >= 4) found.push(line)
    }
  }
  return found.length ? { heading: heading || 'Responsibilities', lines: found } : null
}

/** Preserve missing responsibilities separately; the legacy function name is retained for callers. */
export function attachLooseDuties(draft: CareerProfileDraft, text: string): ParseWarning | null {
  const block = looseDutyLines(text)
  if (!block) return null
  const have = [
    ...(draft.work_experience ?? []).flatMap((j) => [...(j.highlights ?? []), j.description ?? '']),
    ...(draft.additional_information ?? []).map((a) => a.value ?? ''),
  ].map(norm).filter(Boolean)
  const missing = block.lines.filter((line) => {
    const n = norm(line)
    return n && !have.some((h) => h.includes(n) || n.includes(h))
  }).map(line => stripIdNumbers(block.heading, line)).filter(Boolean)
  if (!missing.length) return null
  const rows = draft.additional_information ?? (draft.additional_information = [])
  const index = rows.length
  rows.push({
    label: block.heading,
    value: missing.join('\n'),
    category_name: block.heading,
    show_on_resume: true,
    sort_order: Math.max(0, ...rows.map(row => row.sort_order ?? 0)) + 1,
  })
  return {
    field: `additional_information.${index}.value`,
    message: `We kept ${missing.length} line${missing.length === 1 ? '' : 's'} from your CV's "${block.heading}" section separately. Please confirm which role or project they describe.`,
  }
}
