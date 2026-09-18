/**
 * Profile-derived entity extraction for the grounding validator (2026-09-16).
 *
 * WHY ENTITIES AND NOT TOKENS. The obvious way to catch "the JD asked for PMP
 * and the resume now claims PMP" is to diff every word of the output against
 * every word of the profile. That fails immediately on a general product: it
 * rejects "commissioned" because the profile wrote "commissioning", rejects
 * every plural, and rejects legitimate paraphrase — which is most of what an
 * optimizer is FOR. A validator that fires on normal English would either be
 * switched off or, worse, would silently replace good writing with fallback.
 *
 * So nothing here is a dictionary and nothing is hard-coded. Every set is
 * derived from the candidate's own profile at request time, and only
 * IDENTIFIABLE things are extracted — the classes where an exact match is
 * meaningful and a false positive is unlikely:
 *
 *   certifications · education · employers · locations · skills · numbers
 *
 * General professional vocabulary is deliberately not modelled. "Led delivery
 * of" is either supported by the source or it is an attribution failure, and
 * attribution is a Phase 2 detector, not a token check.
 */

import { totalExperienceYears } from '@/lib/experienceYears'
import type { CareerProfileFull, ProfileWorkExperience } from '@/types/careerProfile'

/** Words too common to carry identity, so never treated as an entity. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'into', 'over', 'under', 'across',
  'team', 'teams', 'project', 'projects', 'client', 'clients', 'system',
  'systems', 'work', 'working', 'role', 'company', 'management', 'engineer',
  'engineering', 'senior', 'junior', 'lead', 'manager', 'support', 'service',
  'services', 'new', 'all', 'per', 'via', 'ltd', 'llc', 'inc', 'plc', 'co',
])

/** Normalise for comparison: case, punctuation and surrounding whitespace. */
export function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’'`]/g, '')
    .replace(/[^a-z0-9+#./-]+/g, ' ')
    .trim()
}

/**
 * Comparable numeric tokens. "400+" and "1,400" normalise to 400 / 1400 so a
 * rewrite may keep or drop the "+" without tripping the check.
 */
export function extractNumbers(text: string | null | undefined): string[] {
  if (!text) return []
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
  return matches.map((m) => m.replace(/,/g, '').replace(/\.0+$/, ''))
}

export function collectNumbers(texts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const t of texts) for (const n of extractNumbers(t)) out.add(n)
  return out
}

/** Irregular past-tense verbs that open CV bullets and carry no identity. */
const OPENING_VERBS = new Set([
  'built', 'wrote', 'ran', 'made', 'drove', 'took', 'gave', 'kept', 'held', 'sold', 'taught', 'won', 'oversaw',
  'brought', 'bought', 'began', 'grew', 'met', 'found', 'sent', 'spent', 'understood', 'set', 'led', 'did', 'got',
])

/**
 * Multi-word proper-noun-ish phrases and standalone identifiers. Catches
 * "NEOM Green Hydrogen Company", "Triconex TS3000", "NEBOSH" and "ISO 9001"
 * without needing to know what any of them are.
 */
export function extractNamedEntities(text: string | null | undefined): Set<string> {
  const out = new Set<string>()
  if (!text) return out
  // Runs of capitalised or all-caps words, and alphanumeric identifiers.
  const patterns = [
    /\b(?:[A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*)\b/g,
    /\b[A-Za-z]+\d[A-Za-z0-9-]*\b/g,
  ]
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const m = match[0]
      // "Provided care…", "Supervised installation…": a single Capitalised word
      // at the start of a sentence or bullet is ordinary English, not a name.
      // Treating it as one made a verb used in two roles a "cross-entry leak"
      // (measured 2026-09-17). ALL-CAPS and alphanumeric identifiers still count.
      // Only verb-shaped words are skipped — a tool or product name opening a
      // bullet ("Python scripts…", "Revit models…") is still an entity.
      if (
        !/\s/.test(m) &&
        /^[A-Z][a-z]+$/.test(m) &&
        (/(ed|ing)$/.test(m) || OPENING_VERBS.has(m.toLowerCase())) &&
        /(^|[.!?:;•\n-]\s*)$/.test(text.slice(0, match.index ?? 0))
      ) {
        continue
      }
      const n = normalizeToken(m)
      if (!n || n.length < 3) continue
      if (STOPWORDS.has(n)) continue
      out.add(n)
      // Also index each significant word, so "NEOM Green Hydrogen Company"
      // still matches a bullet that says only "NEOM".
      for (const w of n.split(' ')) {
        if (w.length >= 3 && !STOPWORDS.has(w) && /[a-z]/.test(w)) out.add(w)
      }
    }
  }
  return out
}

export interface EntrySources {
  id: string
  /** Everything this entry may legitimately draw on. */
  text: string
  numbers: Set<string>
  entities: Set<string>
}

export interface ProfileEntities {
  /** Certification names and issuers. */
  certifications: Set<string>
  /** Institutions, degrees, fields of study. */
  education: Set<string>
  /** Skill names as written by the user. */
  skills: Set<string>
  /** Employers across the whole history, plus the current employer. */
  employers: Set<string>
  /** Locations across the whole history, plus the current location. */
  locations: Set<string>
  /** Every entity appearing anywhere in the profile. */
  all: Set<string>
  /** Profile-wide factual prose, for summary validation. Excludes dates. */
  summaryNumbers: Set<string>
  /** Per work-experience entry, keyed by id. */
  entries: Map<string, EntrySources>
  /** How many entries' sources each entity appears in — the false-positive guard. */
  entityEntryCount: Map<string, number>
}

function addAll(target: Set<string>, source: Iterable<string>): void {
  for (const s of source) target.add(s)
}

/**
 * Build every allowed set for one request.
 *
 * DATES ARE EXCLUDED FROM NUMBERS, EVERYWHERE. `start_date` and `end_date` used
 * to feed the allowed-number set, which meant a role dated 2016 legitimised
 * "2016" as a quantity in a bullet — "supervised 2016 inspections" would have
 * passed. Dates are employment facts, not achievement figures.
 */
export function buildProfileEntities(profile: CareerProfileFull): ProfileEntities {
  const certifications = new Set<string>()
  const education = new Set<string>()
  const skills = new Set<string>()
  const employers = new Set<string>()
  const locations = new Set<string>()
  const all = new Set<string>()

  for (const c of profile.certifications ?? []) {
    addAll(certifications, extractNamedEntities(c.name))
    if (c.issuer) addAll(certifications, extractNamedEntities(c.issuer))
  }
  for (const e of profile.education ?? []) {
    addAll(education, extractNamedEntities(e.institution))
    addAll(education, extractNamedEntities(e.degree))
    if (e.field_of_study) addAll(education, extractNamedEntities(e.field_of_study))
  }
  for (const s of profile.skills ?? []) {
    const n = normalizeToken(s.name)
    if (n) skills.add(n)
    addAll(skills, extractNamedEntities(s.name))
  }
  for (const w of profile.work_experience ?? []) {
    addAll(employers, extractNamedEntities(w.company))
    if (w.location) addAll(locations, extractNamedEntities(w.location))
  }
  if (profile.current_employer) addAll(employers, extractNamedEntities(profile.current_employer))
  if (profile.current_location) addAll(locations, extractNamedEntities(profile.current_location))

  // Per-entry sources. A REWRITABLE entry may use only its own text.
  const entries = new Map<string, EntrySources>()
  const entityEntryCount = new Map<string, number>()
  for (const w of profile.work_experience ?? []) {
    // The role title is a fact of this entry (2026-09-17): "MEP" in "MEP Site
    // Engineer" is something the candidate may say about that job.
    const text = [w.company, w.role ?? '', w.location ?? '', w.description ?? '', ...(w.highlights ?? [])].join('\n')
    const entities = extractNamedEntities(text)
    entries.set(w.id, {
      id: w.id,
      text,
      // Dates deliberately absent — see the note above.
      numbers: collectNumbers([w.description, ...(w.highlights ?? [])]),
      entities,
    })
    for (const e of new Set(entities)) {
      entityEntryCount.set(e, (entityEntryCount.get(e) ?? 0) + 1)
    }
  }

  // Profile-wide factual prose the summary may draw on. Dates excluded for the
  // same reason, so a summary cannot turn an employment year into a metric.
  const summaryNumbers = collectNumbers([
    profile.professional_summary,
    ...(profile.work_experience ?? []).flatMap((w: ProfileWorkExperience) => [
      w.description,
      ...(w.highlights ?? []),
    ]),
    ...(profile.certifications ?? []).map((c) => c.name),
    ...(profile.additional_information ?? []).map((a) => `${a.label} ${a.value}`),
    ...(profile.skills ?? []).map((s) => s.name),
    // The computed total (and one below, for "over N years") is a fact of the
    // profile's own dates, so the summary may state it (2026-09-18).
    ...yearsFacts(profile),
  ])

  addAll(all, certifications)
  addAll(all, education)
  addAll(all, skills)
  addAll(all, employers)
  addAll(all, locations)
  for (const e of entries.values()) addAll(all, e.entities)
  addAll(all, extractNamedEntities(profile.professional_summary ?? ''))
  for (const a of profile.additional_information ?? []) {
    addAll(all, extractNamedEntities(`${a.label} ${a.value}`))
  }

  return {
    certifications,
    education,
    skills,
    employers,
    locations,
    all,
    summaryNumbers,
    entries,
    entityEntryCount,
  }
}

/**
 * Is this entity safe to attribute to `entryId`?
 *
 * FIVE CONDITIONS, and rules 3 and 4 are what stop this firing on real writing:
 *   1. it appears in the output for this entry
 *   2. it is absent from this entry's own source
 *   3. it appears in exactly ONE entry's source across the profile
 *   4. it is not a profile-wide fact (skill, certification, education)
 *   5. it is an identifiable entity, not general vocabulary (guaranteed by
 *      extractNamedEntities, which only yields proper-noun-ish tokens)
 *
 * A tool used at three employers fails rule 3. Anything on the candidate's
 * skills list fails rule 4. Both are legitimately theirs to mention anywhere,
 * so neither is ever reported.
 */
export function isCrossEntryLeak(
  entities: ProfileEntities,
  entryId: string,
  candidate: string,
): boolean {
  const entry = entities.entries.get(entryId)
  if (!entry) return false
  if (entry.entities.has(candidate)) return false
  if (entities.skills.has(candidate)) return false
  if (entities.certifications.has(candidate)) return false
  if (entities.education.has(candidate)) return false
  return (entities.entityEntryCount.get(candidate) ?? 0) === 1
}

function yearsFacts(profile: CareerProfileFull): string[] {
  const y = totalExperienceYears(profile)
  return y === null || y < 1 ? [] : [`${y} years`, `${Math.max(1, y - 1)} years`]
}
