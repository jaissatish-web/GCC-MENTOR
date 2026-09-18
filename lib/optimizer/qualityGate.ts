/**
 * Quality gate (2026-09-17). PURE. Runs beside lib/ai/validateGrounding.ts.
 *
 * The grounding validator answers "is anything invented?". A resume can pass it
 * and still be poor: hype words the grounding rule forbids but nothing checked,
 * "supported" silently promoted to "led", bullets that lost the one keyword the
 * employer searches for, a "High" build that placed none of its planned terms.
 * This gate answers "is it good, and did this level deliver?".
 *
 * SEVERITY
 *   hard — the block must not ship as written (repair, else original text)
 *   soft — the block may ship, but a repair is attempted and the better
 *          version wins
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import { entrySourceText, profileWideText } from './evidence'
import type { EvidenceMap } from './evidence'
import type { TailoringPlan } from './plan'
import { acronymExpansion, containsTermInSentence, containsTermRaw, contentStems, stemsMatch, wordCount } from './text'

export type QualityCode =
  | 'banned_word'
  | 'promoted_involvement'
  | 'forbidden_gap_term'
  | 'first_person'
  | 'bullet_length'
  | 'duplicate_bullet'
  | 'lost_keyword'
  | 'coverage_below_level'
  | 'summary_length'
  | 'bullet_count_changed'
  | 'bullet_limit_exceeded'
  | 'unstated_outcome'
  | 'label_prefix'
  | 'unsupported_intensifier'
  | 'present_tense'
  | 'objective_statement'
  | 'dropped_fact'
  | 'dropped_protected'
  | 'summary_missing_years'

export interface QualityIssue {
  code: QualityCode
  severity: 'hard' | 'soft'
  /** 'summary' or a profile_work_experience id. */
  owner: string
  detail: string
  /** Derived from content. Retry prompts only; NEVER logged. */
  offendingValue?: string
}

/** The grounding instruction's own list (lib/ai/grounding.ts, LANGUAGE). */
export const BANNED_WORDS = [
  'expert',
  'strategic',
  'award-winning',
  'multidisciplinary',
  'transformational',
  'industry-leading',
  'world-class',
  'visionary',
  'seasoned',
  'unparalleled',
]

/**
 * Words that claim ownership or authority. Allowed only when the source already
 * claims it. Exact words, not stems: "lead time", "head office" and "direct
 * reports" are not claims, and stemming would make them one.
 */
const AUTHORITY_WORDS = new Set([
  'led', 'leading', 'managed', 'manage', 'manages', 'managing', 'headed', 'directed', 'directing',
  'spearheaded', 'spearheading', 'oversaw', 'oversee', 'oversees', 'overseeing', 'owned', 'supervised',
  'supervise', 'supervises', 'supervising', 'orchestrated', 'championed', 'chaired', 'commanded', 'governed',
])

const AUTHORITY_TITLE = /\b(manager|management|lead|leader|head|supervisor|superintendent|director|chief|principal|foreman|in[- ]?charge|officer in charge|team leader|owner|founder|president|vp)\b/i

const FIRST_PERSON = /\b(I|my|me|mine|myself|we|our)\b/

/**
 * The commonest way a rewrite invents without inventing a noun: a trailing
 * clause that asserts a benefit the source never states — ", ensuring accuracy
 * and compliance", ", resulting in faster delivery", ", contributing to patient
 * safety". Each is a claim the candidate would be asked to defend. Allowed only
 * when the source itself uses that verb.
 */
const OUTCOME_TAILS: Array<{ re: RegExp; source: RegExp }> = [
  { re: /,?\s*\b(ensuring|to ensure|which ensured|in order to ensure|so as to ensure)\b/i, source: /\bensur/i },
  { re: /\bto (maintain|guarantee|drive|enhance|improve|optimi[sz]e|maximi[sz]e|streamline|boost) (accurate|high|overall|operational|efficien|quality|compliance|productivity|performance|customer)/i, source: /\b(maintain|guarantee|driv|enhanc|improv|optimi|maximi|streamlin|boost)/i },
  { re: /,\s*(resulting in|which resulted in|leading to|thereby)\b/i, source: /\b(result|led to|leading to|thereby)\b/i },
  { re: /,\s*(contributing to|helping to|driving|enhancing|improving|boosting|maximi[sz]ing|optimi[sz]ing|streamlining)\b/i, source: /\b(contribut|help|driv|enhanc|improv|boost|maximi|optimi|streamlin)/i },
  { re: /,\s*(maintaining|delivering|achieving|demonstrating|showcasing|fostering)\b/i, source: /\b(maintain|deliver|achiev|demonstrat|showcas|foster)/i },
]

/**
 * Words that grade the candidate rather than describe what they did. Each is a
 * claim ("proven record", "extensive experience") the profile must make first.
 */
export const INTENSIFIERS = [
  'proven', 'track record', 'extensive', 'strong background', 'strong track', 'excellent', 'exceptional',
  'outstanding', 'highly skilled', 'highly experienced', 'deep expertise', 'in-depth', 'robust', 'dynamic',
  'fast-paced', 'competitive environment', 'results-driven', 'result-oriented', 'results-oriented', 'passionate',
  'dedicated', 'detail-oriented', 'self-motivated', 'hardworking', 'hard-working', 'best-in-class', 'cutting-edge',
  'consistently', 'successfully', 'exceeding', 'exceeded', 'significantly', 'substantially',
  'proficient', 'proficiency', 'hands-on', 'expertise', 'mastery', 'adept', 'well-versed', 'committed to',
  'passionate about', 'reliable', 'maintainable', 'high-quality', 'seamless', 'seamlessly',
]

/** Base-form verbs that open a bullet in the present tense. Every role is written in the past tense. */
const PRESENT_OPENERS = new Set([
  'manage', 'prepare', 'perform', 'provide', 'educate', 'document', 'supervise', 'coordinate', 'build', 'write',
  'add', 'work', 'track', 'negotiate', 'maintain', 'lead', 'develop', 'support', 'administer', 'participate',
  'conduct', 'review', 'ensure', 'handle', 'monitor', 'file', 'test', 'fix', 'oversee', 'deliver', 'design',
  'implement', 'create', 'analyze', 'analyse', 'assist', 'serve', 'record', 'check', 'witness', 'plan', 'train',
  'operate', 'inspect', 'install', 'repair', 'process', 'collaborate', 'communicate', 'organize', 'organise',
  'reconcile', 'audit', 'care', 'assess', 'execute', 'drive', 'achieve', 'use', 'run', 'help', 'report', 'close',
])

function authorityWords(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/[A-Za-z]+/g)) {
    const w = m[0].toLowerCase()
    if (AUTHORITY_WORDS.has(w)) out.add(w)
  }
  return [...out]
}

function hasAuthority(text: string): boolean {
  return authorityWords(text).length > 0
}

function normBullet(b: string): string {
  return b.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

/**
 * Facts a rewrite must never drop, even when a role is condensed (2026-09-18).
 * Measured on a High build: "to ADNOC and Bechtel standards", a whole
 * "Promoted to lead…" bullet and "one of the largest … in the Middle East"
 * all disappeared, because the dropped-fact check skipped condensed roles.
 * Named standards, Gulf clients, promotions and scale claims are exactly what a
 * Gulf recruiter reads for; a name that is the role's own employer is not
 * protected (the header already shows it).
 */
const PROTECTED =
  /\b(promoted|largest|first[- ]ever|award(?:ed)?|saudi aramco|aramco|adnoc|takreer|qatarenergy|qatar petroleum|sabic|neom|kpc|knpc|pdo|bapco|bechtel|shell dep|saes|saep|samss|api\s?\d{2,4}|asme(?:\s?b\d{2}(?:\.\d+)?)?|iec\s?\d{4,5}|nfpa\s?\d{1,4}|iso\s?\d{4,5}|middle east)\b/gi

function protectedTerms(source: string, ownNames: string): string[] {
  const own = ownNames.toLowerCase()
  return [...new Set((source.match(PROTECTED) ?? []).map((m) => m.toLowerCase().replace(/\s+/g, ' ')))].filter((t) => !own.includes(t))
}

export interface GateInput {
  profile: CareerProfileFull
  plan: TailoringPlan | null
  evidence: EvidenceMap
  level: OptimizationLevel
  /** Whole years across the dated roles (lib/experienceYears.ts); the summary should state it. */
  totalYears?: number | null
  /** Generated summary, or null when the summary was not rewritten. */
  summary: string | null
  blocks: Array<{ entryId: string; bullets: string[] }>
}

export function checkQuality(input: GateInput): QualityIssue[] {
  const { profile, plan, evidence, level } = input
  const issues: QualityIssue[] = []
  const entries = new Map((profile.work_experience ?? []).map((e) => [e.id, e]))
  const wholeProfile = [profileWideText(profile), ...[...entries.values()].map(entrySourceText)].join('\n')
  const aliasesOf = (t: string) => evidence.keywords.find((k) => k.term === t)?.aliases ?? []
  const gapTerms = plan?.gaps ?? []

  const checkText = (owner: string, text: string, source: string, roleTitle: string | null) => {
    for (const w of BANNED_WORDS) {
      const re = new RegExp(`\\b${w.replace('-', '[- ]')}\\b`, 'i')
      if (re.test(text) && !re.test(wholeProfile)) {
        issues.push({ code: 'banned_word', severity: 'hard', owner, detail: 'Uses a hype word the profile never uses.', offendingValue: w })
      }
    }
    const sourceHasAuthority = hasAuthority(source) || (roleTitle !== null && AUTHORITY_TITLE.test(roleTitle))
    if (!sourceHasAuthority && hasAuthority(text)) {
      issues.push({
        code: 'promoted_involvement',
        severity: 'hard',
        owner,
        detail: 'Claims leadership or ownership that the source text does not state.',
        offendingValue: authorityWords(text).join(', '),
      })
    }
    for (const g of gapTerms) {
      if (containsTermRaw(text, g, aliasesOf(g)) && !containsTermRaw(source, g, aliasesOf(g))) {
        issues.push({ code: 'forbidden_gap_term', severity: 'hard', owner, detail: 'Mentions a target requirement the profile does not support.', offendingValue: g })
      }
    }
    for (const t of OUTCOME_TAILS) {
      const m = t.re.exec(text)
      if (m && !t.source.test(source)) {
        issues.push({
          code: 'unstated_outcome',
          severity: 'hard',
          owner,
          detail: 'Adds a trailing clause that claims a benefit or outcome the source does not state. End the sentence at the fact.',
          offendingValue: m[0].replace(/^,\s*/, ''),
        })
        break
      }
    }
    for (const w of INTENSIFIERS) {
      const re = new RegExp(`\\b${w.replace(/[- ]/g, '[- ]')}\\b`, 'i')
      if (re.test(text) && !re.test(wholeProfile)) {
        issues.push({
          // Carries the exact matched words so a sentence can be located and cut.
          code: 'unsupported_intensifier',
          severity: 'hard',
          owner,
          detail: 'Grades the candidate with a word the profile never uses. Describe what was done instead.',
          offendingValue: w,
        })
        break
      }
    }
    if (owner !== 'summary') {
      const first = (/^[A-Za-z]+/.exec(text.trim())?.[0] ?? '').toLowerCase()
      if (PRESENT_OPENERS.has(first)) {
        issues.push({ code: 'present_tense', severity: 'soft', owner, detail: 'Opens in the present tense. Write every role in the past tense.', offendingValue: first })
      }
    }
    if (owner !== 'summary' && /^[A-Z][A-Za-z &/-]{2,40}:\s/.test(text)) {
      issues.push({ code: 'label_prefix', severity: 'soft', owner, detail: 'Starts with a "Label:" prefix. Start with the action verb.' })
    }
    if (FIRST_PERSON.test(text)) {
      issues.push({ code: 'first_person', severity: 'soft', owner, detail: 'Uses first person.' })
    }
  }

  // ---- Summary
  if (input.summary !== null && input.summary.trim() !== '') {
    const allRoleTitles = [...entries.values()].map((e) => e.role).join(' | ')
    checkText('summary', input.summary, wholeProfile, allRoleTitles)
    const words = wordCount(input.summary)
    if (input.totalYears != null && input.totalYears >= 2 && !/\b\d{1,2}\s*\+?\s*(years|yrs)\b/i.test(input.summary)) {
      issues.push({
        code: 'summary_missing_years',
        severity: 'soft',
        owner: 'summary',
        detail: `State the candidate's total experience (${input.totalYears} years) in the first sentence — recruiters screen on it.`,
        offendingValue: `${input.totalYears} years`,
      })
    }
    if (words < 30 || words > 110) {
      issues.push({ code: 'summary_length', severity: 'soft', owner: 'summary', detail: `Summary is ${words} words; target 45–90.` })
    }
    // Employer terms the candidate's own summary already stated must survive.
    const lostFromSummary = evidence.keywords
      .filter((k) => k.inSummary && k.kind !== 'soft_skill')
      .filter((k) => !containsTermInSentence(input.summary, k.term, k.aliases))
      .map((k) => k.term)
    if (lostFromSummary.length > 0) {
      issues.push({
        code: 'lost_keyword',
        severity: 'soft',
        owner: 'summary',
        detail: `Dropped ${lostFromSummary.length} employer term(s) the original summary stated.`,
        offendingValue: lostFromSummary.join('; '),
      })
    }
    // An objective ("Seeking to…") says what the candidate wants, not what they
    // have done, and was measured slipping through on a fresher build.
    const objective = /(^|[.!?]\s+)(seeking|looking for|looking to|aspiring|eager to|keen to|hoping to|aiming to)\b[^.!?]*/i.exec(input.summary)
    if (objective) {
      issues.push({
        code: 'objective_statement',
        severity: 'hard',
        owner: 'summary',
        detail: 'Contains an objective statement. Describe what the candidate has done instead.',
        offendingValue: objective[0].replace(/^[.!?]\s+/, '').trim().split(/\s+/).slice(0, 4).join(' '),
      })
    }
    if (plan && plan.summary.anchors.length > 0) {
      const placed = plan.summary.anchors.filter((a) => containsTermInSentence(input.summary, a.term, aliasesOf(a.term))).length
      const need = summaryRequiredCount(plan.summary.anchors.length, level)
      if (placed < need) {
        issues.push({
          code: 'coverage_below_level',
          severity: 'soft',
          owner: 'summary',
          detail: `Summary uses ${placed} of ${plan.summary.anchors.length} anchor terms; this level needs ${need}.`,
          offendingValue: plan.summary.anchors.filter((a) => !containsTermInSentence(input.summary, a.term, aliasesOf(a.term))).map((a) => a.term).join('; '),
        })
      }
    }
  }

  // ---- Experience blocks
  const seen = new Map<string, string>()
  for (const block of input.blocks) {
    const entry = entries.get(block.entryId)
    if (!entry) continue
    const source = entrySourceText(entry)
    const sourceBullets = entry.highlights ?? []
    const owner = block.entryId
    const joined = block.bullets.join('\n')

    for (const b of block.bullets) {
      checkText(owner, b, source, entry.role)
      const words = wordCount(b)
      if (words < 5 || words > 45) {
        issues.push({ code: 'bullet_length', severity: 'soft', owner, detail: `A bullet is ${words} words; target 8–35.` })
      }
      const key = normBullet(b)
      if (key && seen.has(key)) {
        issues.push({ code: 'duplicate_bullet', severity: 'soft', owner, detail: 'Repeats a bullet.' })
      } else if (key) seen.set(key, owner)
    }

    // Protected facts survive every level, condensed roles included.
    const ownNames = [entry.company, entry.role, entry.location].filter(Boolean).join(' ')
    const outLower = joined.toLowerCase().replace(/\s+/g, ' ')
    const lostProtected = protectedTerms(sourceBullets.join('\n'), ownNames).filter((t) => !outLower.includes(t))
    if (lostProtected.length > 0) {
      issues.push({
        code: 'dropped_protected',
        severity: 'hard',
        owner,
        detail: 'Dropped a named standard, client, promotion or scale fact from the original. Keep it.',
        offendingValue: lostProtected.join('; '),
      })
    }

    // A rewrite must not lose what the candidate did. Measured 2026-09-17: a
    // High build merged "Cared for ventilated patients…" away, dropping the
    // strongest ICU evidence from the ICU role. Each original bullet must keep at
    // least three quarters of its distinctive words somewhere in the rewritten role, except
    // where the plan deliberately condenses the role.
    if (!plan?.entries[block.entryId]?.maxBullets) {
      const outStems = contentStems(joined)
      const acronyms = [...new Set(joined.match(/\b[A-Z]{2,6}\b/g) ?? [])]
      for (const src of sourceBullets) {
        // An acronym in the rewrite keeps the words it stands for ("CMMS").
        const expanded = acronyms.map((a) => acronymExpansion(a, src)).filter((x): x is string => !!x)
        const outHere = expanded.length ? [...outStems, ...contentStems(expanded.join(' '))] : outStems
        const want = contentStems(src).filter((s) => s.length >= 4 && !/^\d/.test(s))
        if (want.length < 2) continue
        const kept = want.filter((w) => outHere.some((o) => stemsMatch(w, o))).length
        if (kept / want.length < 0.75) {
          issues.push({ code: 'dropped_fact', severity: 'soft', owner, detail: 'Lost an original bullet\'s content. Keep every fact the original states.', offendingValue: src })
        }
      }
    }

    const p = plan?.entries[block.entryId]
    if (p) {
      const lost = p.keepTerms.filter((t) => !containsTermInSentence(joined, t, aliasesOf(t)))
      // A condensed role may drop bullets, and with them their terms.
      if (lost.length > 0 && p.maxBullets === null) {
        issues.push({ code: 'lost_keyword', severity: 'soft', owner, detail: `Dropped ${lost.length} employer term(s) the original stated.`, offendingValue: lost.join('; ') })
      }
      if (p.useTerms.length > 0) {
        const placed = p.useTerms.filter((u) => containsTermInSentence(joined, u.term, aliasesOf(u.term))).length
        const need = requiredCount(p.useTerms.length, level)
        if (placed < need) {
          issues.push({
            code: 'coverage_below_level',
            severity: 'soft',
            owner,
            detail: `Uses ${placed} of ${p.useTerms.length} supported employer terms; this level needs ${need}.`,
            offendingValue: p.useTerms.filter((u) => !containsTermInSentence(joined, u.term, aliasesOf(u.term))).map((u) => u.term).join('; '),
          })
        }
      }
      if (p.maxBullets !== null && block.bullets.length > p.maxBullets) {
        issues.push({ code: 'bullet_limit_exceeded', severity: 'soft', owner, detail: `Has ${block.bullets.length} bullets; the plan allows ${p.maxBullets}.` })
      }
    }
    if (level === 'easy' && sourceBullets.length > 0 && block.bullets.length !== sourceBullets.length) {
      issues.push({ code: 'bullet_count_changed', severity: 'soft', owner, detail: 'Easy keeps the same number of bullets.' })
    }
  }

  return issues
}

/** A summary is 3–4 sentences; it carries the heaviest anchors, not all of them. */
export function summaryRequiredCount(total: number, level: OptimizationLevel): number {
  if (total === 0) return 0
  const share = level === 'easy' ? 0.34 : level === 'moderate' ? 0.5 : 0.67
  return Math.max(1, Math.ceil(total * share - 1e-9))
}

export function requiredCount(total: number, level: OptimizationLevel): number {
  if (total === 0) return 0
  if (level === 'easy') return Math.floor(total * 0.5)
  if (level === 'moderate') return Math.ceil(total * 0.8 - 1e-9)
  return total
}
