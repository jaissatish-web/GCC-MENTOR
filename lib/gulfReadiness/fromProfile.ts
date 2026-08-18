import type { FunnelAnswers, GulfReadinessResult } from '@/lib/gulfReadiness/types'
import { calculateGulfReadiness } from '@/lib/gulfReadiness/engine'

/**
 * Score a Career Profile with the SAME engine that scores an anonymous resume.
 *
 * Founder decision 2026-08-18: the readiness score updates live as the profile is
 * built, and it must be ONE engine — not a second one that would make the number
 * jump for a reason the user cannot see. So rather than write structured-field
 * detectors, this renders the profile back into the text shape the existing
 * detectors already read, and runs the identical calculation.
 *
 * The score therefore rises as the profile fills, which is exactly the intended
 * behaviour: "your score improves as you complete your profile." A free user who
 * types from an empty profile starts low and climbs; a paid user whose profile was
 * extracted from their resume lands near the score their scan showed, because it is
 * the same underlying facts run through the same engine.
 *
 * The funnel answers still decide the scenario, carried from the anonymous scan or
 * asked once here — never inferred.
 */

/** The only profile fields the score reads. Loose on purpose, so a full profile and
 *  a partly-typed draft both satisfy it. */
export interface ProfileScoringInput {
  professional_summary?: string | null
  phone?: string | null
  email?: string | null
  work_experience?: Array<{
    company?: string | null
    role?: string | null
    start_date?: string | null
    end_date?: string | null
    location?: string | null
    description?: string | null
    highlights?: string[] | null
  }> | null
  skills?: Array<{ name?: string | null }> | null
  certifications?: Array<{ name?: string | null; issuer?: string | null }> | null
  education?: Array<{ degree?: string | null; institution?: string | null; field_of_study?: string | null }> | null
}

function line(...parts: (string | null | undefined)[]): string {
  return parts.filter((p) => p && String(p).trim()).join(' ')
}

/**
 * Render the profile into the same kind of text a resume would contain, so the
 * detectors in evidence.ts read it the way they read an uploaded CV. This is the
 * one place the two worlds meet; it never invents a fact, it only lays out the
 * facts the profile already holds.
 */
export function profileToScoringText(p: ProfileScoringInput): string {
  const out: string[] = []

  if (p.professional_summary?.trim()) {
    out.push('PROFESSIONAL SUMMARY')
    out.push(p.professional_summary.trim())
  }

  out.push('CONTACT')
  out.push(line(p.email ?? undefined, p.phone ?? undefined))

  const work = (p.work_experience ?? []).filter((w) => w && (w.company || w.role))
  if (work.length) {
    out.push('WORK EXPERIENCE')
    for (const w of work) {
      out.push(line(w.role, w.company ? `— ${w.company}` : null, w.location, dateRange(w.start_date, w.end_date)))
      if (w.description?.trim()) out.push(w.description.trim())
      for (const h of w.highlights ?? []) if (h?.trim()) out.push(`- ${h.trim()}`)
    }
  }

  const skills = (p.skills ?? []).map((s) => s?.name).filter(Boolean)
  if (skills.length) {
    out.push('SKILLS')
    out.push(skills.join(', '))
  }

  const certs = (p.certifications ?? []).filter((c) => c?.name)
  if (certs.length) {
    out.push('CERTIFICATIONS')
    for (const c of certs) out.push(line('certification', c.name, c.issuer))
  }

  const edu = (p.education ?? []).filter((e) => e?.degree || e?.institution)
  if (edu.length) {
    out.push('EDUCATION')
    for (const e of edu) out.push(line(e.degree, e.field_of_study, e.institution))
  }

  return out.join('\n')
}

function dateRange(start?: string | null, end?: string | null): string {
  const s = (start ?? '').slice(0, 7)
  const e = end ? end.slice(0, 7) : 'Present'
  return s ? `${s} - ${e}` : ''
}

/** Score a profile with the same engine and scenario logic as the anonymous scan. */
export function scoreProfileReadiness(profile: ProfileScoringInput, answers: FunnelAnswers): GulfReadinessResult {
  return calculateGulfReadiness({ answers, resumeText: profileToScoringText(profile) })
}
