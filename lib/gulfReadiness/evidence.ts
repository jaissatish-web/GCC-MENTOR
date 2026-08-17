import type { Confidence } from '@/lib/gulfReadiness/types'

/**
 * Reading the resume with rules, not a model.
 *
 * Each detector returns a fill ratio (0..1), the evidence it actually found, the
 * gaps it noticed, and how confident it is. The engine multiplies the ratio by the
 * dimension's weight to get points.
 *
 * THE HONESTY RULE FOR THIS FILE. A detector may only report what the text
 * supports. When it cannot read a section it returns LOW confidence and says so in
 * a gap — it never returns a confident zero, because "we could not read your
 * certifications" and "you have no certifications" are different statements and only
 * the resume knows which is true. A crude-but-honest signal is the correct trade for
 * a free, no-LLM score; the user sees their own resume and can judge.
 */

export interface DetectorOutput {
  ratio: number
  evidence: string[]
  gaps: string[]
  confidence: Confidence
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** Normalised lower-case text, collapsed whitespace. */
export function normalise(text: string): string {
  return (text ?? '').replace(/\r/g, '\n').replace(/[ \t]+/g, ' ').toLowerCase()
}

/** A resume this short cannot be read with any confidence at all. */
export function isLowSignal(text: string): boolean {
  return (text ?? '').trim().length < 200
}

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re)
  return m ? m.length : 0
}

/**
 * Work experience — number of distinct roles and rough span.
 *
 * Detected from date ranges (a resume lists them per role) rather than by trying to
 * parse employers, which is exactly the structured-extraction job this score avoids.
 * More roles and a longer span raise the ratio, up to a cap.
 */
export function detectWorkExperience(text: string): DetectorOutput {
  const years = text.match(/\b(19|20)\d{2}\b/g) ?? []
  const ranges = countMatches(
    text,
    /\b(19|20)\d{2}\s*(?:-|–|—|to|till|until|present|current)\s*((19|20)\d{2}|present|current|now)/gi,
  )
  const roleWords = countMatches(text, /\b(engineer|manager|supervisor|officer|executive|analyst|technician|specialist|consultant|coordinator|lead|head|director|administrator|operator|assistant|nurse|accountant|designer|developer)\b/gi)

  const evidence: string[] = []
  const gaps: string[] = []

  // A rough role count: prefer explicit date ranges, fall back to distinct years.
  const roleSignal = Math.max(ranges, Math.min(roleWords, Math.floor(years.length / 2)))
  if (roleSignal >= 3) evidence.push('Multiple roles detected across your work history')
  else if (roleSignal >= 1) evidence.push('Work history detected')
  else gaps.push('No clear work history could be read from the resume')

  const ratio = clamp01(roleSignal / 3)
  const confidence: Confidence = ranges >= 1 ? 'high' : roleWords >= 1 ? 'medium' : 'low'
  if (confidence !== 'high') gaps.push('Employment dates are not clearly presented')

  return { ratio, evidence, gaps, confidence }
}

/**
 * Projects / internships — the fresher's substitute for employment.
 */
export function detectProjects(text: string): DetectorOutput {
  const projects = countMatches(text, /\b(project|internship|intern|training|apprentice|thesis|capstone|final year)\b/gi)
  const evidence: string[] = []
  const gaps: string[] = []

  if (projects >= 3) evidence.push('Several projects, internships or training entries detected')
  else if (projects >= 1) evidence.push('Project or internship experience detected')
  else gaps.push('No projects, internships or training were found — these are what a fresher is judged on')

  return { ratio: clamp01(projects / 3), evidence, gaps, confidence: projects >= 1 ? 'medium' : 'low' }
}

export function detectSkills(text: string): DetectorOutput {
  const hasSection = /\bskills?\b/i.test(text)
  // Skills lists are usually comma or bullet separated near a "skills" header.
  const commaGroups = countMatches(text, /,/g)
  const evidence: string[] = []
  const gaps: string[] = []

  if (hasSection) evidence.push('A skills section was detected')
  else gaps.push('No clearly labelled skills section was found')

  const ratio = clamp01((hasSection ? 0.5 : 0) + Math.min(commaGroups, 12) / 24)
  if (ratio < 0.5) gaps.push('Add a clear, well-populated skills section')

  return { ratio, evidence, gaps, confidence: hasSection ? 'high' : 'low' }
}

export function detectEducation(text: string): DetectorOutput {
  const degree = /\b(bachelor|master|b\.?tech|b\.?e\b|b\.?sc|m\.?tech|m\.?sc|mba|ph\.?d|diploma|degree|engineering|graduat)/i.test(text)
  const evidence: string[] = []
  const gaps: string[] = []
  if (degree) evidence.push('Education / qualification detected')
  else gaps.push('No education or qualification could be read from the resume')
  return { ratio: degree ? 1 : 0, evidence, gaps, confidence: degree ? 'high' : 'low' }
}

export function detectCertifications(text: string): DetectorOutput {
  const cert = /\b(certif|licen[cs]e|accredit|certified|pmp|nebosh|iosh|aws certified|cisco|ccna|iso \d)/i.test(text)
  const evidence: string[] = []
  const gaps: string[] = []
  if (cert) evidence.push('Certifications or licences detected')
  else gaps.push('No certifications were found — a relevant certification often lifts a Gulf application')
  return { ratio: cert ? 1 : 0, evidence, gaps, confidence: cert ? 'medium' : 'low' }
}

/**
 * Resume quality & targeting — a composite: quantified achievements, contact
 * completeness, and a stated target. This is the dimension optimization most
 * directly improves, so its gaps are worded to point there.
 */
export function detectResumeQuality(text: string): DetectorOutput {
  const quantified = countMatches(text, /(\d+\s?%|\$\s?\d|₹\s?\d|\b\d{2,}\b\s*(?:\+|k|m|million|crore|lakh|units|projects|people|team|loops|kv|mw|tph|barrels|tons?))/gi)
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)
  const hasPhone = /(\+?\d[\d\s-]{7,}\d)/.test(text)
  const hasSummary = /\b(summary|profile|objective|about)\b/i.test(text)

  const evidence: string[] = []
  const gaps: string[] = []

  if (quantified >= 3) evidence.push('Several quantified achievements detected')
  else gaps.push('Achievements are not quantified — numbers are what a recruiter reads first')

  if (hasEmail && hasPhone) evidence.push('Complete contact details detected')
  else gaps.push('Contact details look incomplete')

  if (hasSummary) evidence.push('A professional summary was detected')
  else gaps.push('No professional summary — a targeted summary frames the whole resume')

  const ratio = clamp01(
    Math.min(quantified, 3) / 3 * 0.5 + (hasEmail && hasPhone ? 0.25 : 0) + (hasSummary ? 0.25 : 0),
  )
  return { ratio, evidence, gaps, confidence: 'high' }
}
