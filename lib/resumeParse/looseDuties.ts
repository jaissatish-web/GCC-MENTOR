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

/** Keep each source heading with its own lines; never merge achievements into responsibilities. */
export function looseDutyBlocks(text: string): Array<{ heading: string; lines: string[] }> {
  const rows = text.split(/\r?\n/)
  const blocks: Array<{ heading: string; lines: string[] }> = []
  for (let i = 0; i < rows.length; i++) {
    const m = rows[i].match(HEADING)
    if (!m) continue
    const heading = rows[i].trim().replace(/:$/, '')
    const found: string[] = []
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
    if (found.length) blocks.push({ heading, lines: found })
  }
  return blocks
}

/** Compatibility view for callers interested in the first block only. */
export function looseDutyLines(text: string): { heading: string; lines: string[] } | null {
  return looseDutyBlocks(text)[0] ?? null
}

/** Preserve missing responsibilities separately; the legacy function name is retained for callers. */
export function attachLooseDuties(draft: CareerProfileDraft, text: string): ParseWarning | null {
  const blocks = looseDutyBlocks(text)
  if (!blocks.length) return null
  const have = [
    ...(draft.work_experience ?? []).flatMap((j) => [...(j.highlights ?? []), j.description ?? '']),
    ...(draft.additional_information ?? []).map((a) => a.value ?? ''),
  ].map(norm).filter(Boolean)
  const rows = draft.additional_information ?? (draft.additional_information = [])
  const index = rows.length
  let retained = 0
  const headings: string[] = []
  for (const block of blocks) {
    const missing: string[] = []
    for (const line of block.lines) {
      const clean = stripIdNumbers(block.heading, line)
      const n = norm(clean)
      if (!n || have.some(h => h.includes(n) || n.includes(h))) continue
      missing.push(clean)
      // Include newly retained lines so repeated headings/bullets do not duplicate facts.
      have.push(n)
    }
    if (!missing.length) continue
    rows.push({
      label: block.heading,
      value: missing.join('\n'),
      category_name: block.heading,
      show_on_resume: true,
      sort_order: Math.max(0, ...rows.map(row => row.sort_order ?? 0)) + 1,
    })
    retained += missing.length
    if (!headings.includes(block.heading)) headings.push(block.heading)
  }
  if (!retained) return null
  return {
    field: `additional_information.${index}.value`,
    message: `We kept ${retained} line${retained === 1 ? '' : 's'} from your CV's ${headings.map(heading => '"' + heading + '"').join(', ')} section${headings.length === 1 ? '' : 's'} separately. Please confirm which role or project they describe.`,
  }
}
