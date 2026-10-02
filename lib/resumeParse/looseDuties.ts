import type { CareerProfileDraft } from '@/types/careerProfile'
import { sortExperienceNewestFirst } from '@/lib/resumeOrder'
import type { ParseWarning } from './check'

/**
 * Duties written ONCE for the whole CV — a "JOB RESPONSIBILITIES" or "KEY
 * ACHIEVEMENTS" block under an employment table, common in Gulf and Indian
 * "biodata" CVs — must never be lost (launch audit 2026-10-02: an
 * accountant's only numbers, "Reduced month-end closing time from 10 to 6
 * days" and "Managed accounts payable for 400+ vendors", vanished at upload).
 *
 * The prompt already asks the model to attach such a block to the most recent
 * job; this is the safety net when it does not. Lines under the heading that
 * are in no job are attached to the most recent job, in the CV's own words,
 * and the user gets a note to move them if they belong elsewhere. Nothing is
 * rewritten or invented.
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

/**
 * Attach responsibilities lines that are in no job to the most recent job.
 * Returns the note for the profile editor, or null when nothing was missing.
 */
export function attachLooseDuties(draft: CareerProfileDraft, text: string): ParseWarning | null {
  const block = looseDutyLines(text)
  const jobs = draft.work_experience ?? []
  if (!block || !jobs.length) return null
  const have = jobs.flatMap((j) => [...(j.highlights ?? []), j.description ?? '']).map(norm).filter(Boolean)
  const missing = block.lines.filter((l) => {
    const n = norm(l)
    return n && !have.some((h) => h.includes(n) || n.includes(h))
  })
  if (!missing.length) return null
  const target = sortExperienceNewestFirst(jobs.map((j, i) => ({ ...j, sort_order: j.sort_order ?? i + 1, start_date: j.start_date ?? '', end_date: j.end_date ?? null, __i: i })))[0]
  const index = (target as unknown as { __i: number }).__i
  jobs[index].highlights = [...(jobs[index].highlights ?? []), ...missing]
  const company = jobs[index].company?.trim() || 'your most recent job'
  return {
    field: `work_experience.${index}.highlights`,
    message: `We put ${missing.length} line${missing.length === 1 ? '' : 's'} from your CV's "${block.heading}" section under ${company}. Move ${missing.length === 1 ? 'it' : 'them'} if ${missing.length === 1 ? 'it belongs' : 'they belong'} to another job.`,
  }
}
