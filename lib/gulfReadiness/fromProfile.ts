import type { FunnelAnswers, GulfFacts, GulfReadinessResult, PhotoState } from '@/lib/gulfReadiness/types'
import type { ArabicLevel, CareerProfileFull, PaperworkStatus, ReadinessCategory } from '@/types/careerProfile'
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
  // The details a Gulf recruiter screens on first (2026-09-18) — the engine
  // now scores them, so the signed-in score must be able to see them.
  nationality?: string | null
  visa_status?: string | null
  notice_period?: string | null
  current_location?: string | null
  additional_information?: Array<{ label?: string | null; value?: string | null }> | null
  // Gulf Readiness v2 (2026-10-01): read as facts, not text.
  photo_url?: string | null
  /** field_visibility.photo — false hides the photo from the CV. */
  photo_visible?: boolean | null
  photo_checklist_confirmed?: boolean | null
  passport_validity_date?: string | null
  passport_type?: string | null
  visa_transferable?: boolean | null
  whatsapp?: string | null
  has_driving_license?: boolean | null
  driving_license_country?: string | null
  arabic_level?: ArabicLevel | null
  degree_attestation?: PaperworkStatus | null
  professional_licence?: PaperworkStatus | null
  saudi_verification?: PaperworkStatus | null
  target_country?: string | null
  target_job_title?: string | null
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

/**
 * The scoring input for a SAVED Career Profile.
 *
 * The dashboard card's mapping. The Career Profile's Improve panel maps the
 * editor's live state field-for-field the same way (app/profile/page.tsx), so
 * a saved profile scores identically on both — keep the two in step.
 */
export function scoringInputFromProfile(p: CareerProfileFull): ProfileScoringInput {
  return {
    professional_summary: p.professional_summary,
    phone: p.phone,
    email: p.email,
    nationality: p.nationality,
    visa_status: p.visa_status,
    notice_period: p.notice_period,
    current_location: p.current_location,
    additional_information: (p.additional_information ?? []).map((a) => ({ label: a.label, value: a.value })),
    photo_url: p.photo_url,
    photo_visible: p.field_visibility?.photo ?? true,
    photo_checklist_confirmed: p.photo_checklist_confirmed ?? null,
    passport_validity_date: p.passport_validity_date,
    passport_type: p.passport_type,
    visa_transferable: p.visa_transferable,
    whatsapp: p.whatsapp,
    has_driving_license: p.has_driving_license,
    driving_license_country: p.driving_license_country,
    arabic_level: p.arabic_level ?? null,
    degree_attestation: p.degree_attestation ?? null,
    professional_licence: p.professional_licence ?? null,
    saudi_verification: p.saudi_verification ?? null,
    target_country: p.target_country,
    target_job_title: p.target_job_title,
    work_experience: p.work_experience.map((w) => ({
      company: w.company,
      role: w.role,
      start_date: w.start_date,
      end_date: w.end_date,
      location: w.location,
      description: w.description,
      highlights: w.highlights,
    })),
    skills: p.skills.map((s) => ({ name: s.name })),
    certifications: p.certifications.map((c) => ({ name: c.name, issuer: c.issuer })),
    education: p.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      field_of_study: e.field_of_study,
    })),
  }
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

  const personal = [
    p.nationality?.trim() ? `Nationality: ${p.nationality.trim()}` : null,
    p.current_location?.trim() ? `Location: ${p.current_location.trim()}` : null,
    p.visa_status?.trim() ? `Visa status: ${p.visa_status.trim()}` : null,
    p.notice_period?.trim() ? `Notice period: ${p.notice_period.trim()}` : null,
  ].filter((x): x is string => !!x)
  if (personal.length) {
    out.push('PERSONAL DETAILS')
    out.push(...personal)
  }

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

  const extra = (p.additional_information ?? []).filter((a) => a?.label?.trim() && a?.value?.trim())
  if (extra.length) {
    out.push('ADDITIONAL INFORMATION')
    for (const a of extra) out.push(`${a.label!.trim()}: ${a.value!.trim()}`)
  }

  return out.join('\n')
}

function dateRange(start?: string | null, end?: string | null): string {
  const s = (start ?? '').slice(0, 7)
  const e = end ? end.slice(0, 7) : 'Present'
  return s ? `${s} - ${e}` : ''
}

/** Score a profile with the same engine and scenario logic as the anonymous scan. */
export function scoreProfileReadiness(profile: ProfileScoringInput, answers: FunnelAnswers, today?: Date): GulfReadinessResult {
  return calculateGulfReadiness({ answers, resumeText: profileToScoringText(profile), facts: factsFromProfile(profile), today })
}

/** What the photo is worth depends on whether it is there, shown, and confirmed professional. */
export function photoStateOf(p: ProfileScoringInput): PhotoState {
  if (!p.photo_url?.trim()) return 'none'
  if (p.photo_visible === false) return 'hidden'
  return p.photo_checklist_confirmed ? 'shown_confirmed' : 'shown'
}

/** The structured facts the engine reads directly (Gulf Readiness v2). */
export function factsFromProfile(p: ProfileScoringInput): GulfFacts {
  return {
    photo: photoStateOf(p),
    passportValidityDate: p.passport_validity_date ?? null,
    passportType: p.passport_type ?? null,
    visaStatus: p.visa_status ?? null,
    visaTransferable: p.visa_transferable ?? null,
    noticePeriod: p.notice_period ?? null,
    hasDrivingLicence: p.has_driving_license ?? null,
    drivingLicenceCountry: p.driving_license_country ?? null,
    whatsapp: p.whatsapp ?? null,
    arabicLevel: p.arabic_level ?? null,
    degreeAttestation: p.degree_attestation ?? null,
    professionalLicence: p.professional_licence ?? null,
    saudiVerification: p.saudi_verification ?? null,
    targetCountry: p.target_country ?? null,
    targetJobTitle: p.target_job_title ?? null,
  }
}

/**
 * Reconstruct the funnel scenario from the completeness engine's category.
 *
 * The anonymous scan carries its funnel answers in sessionStorage, but a
 * signed-in surface reached later — the dashboard — has no such handoff. The
 * four readiness categories (lib/readiness.ts) map 1:1 onto the four funnel
 * scenarios (scenarioFromAnswers in engine.ts), and the category is derived from
 * the same saved profile fields, so this lets the dashboard show Gulf Readiness
 * for any user without persisting a separate answer set. It can differ from a
 * self-declared funnel answer only where the profile data itself disagrees
 * (e.g. no employment gap ⇒ 'experienced' rather than 'returner') — which is the
 * more accurate reading, not a fabricated one.
 */
export function answersFromReadinessCategory(category: ReadinessCategory): FunnelAnswers {
  switch (category) {
    case 'currently_in_gulf':
      return { hasGulfExperience: true, currentlyInGulf: true }
    case 'returner':
      return { hasGulfExperience: true, currentlyInGulf: false }
    case 'experienced_not_in_gulf':
      return { hasGulfExperience: false, hasProfessionalExperience: true }
    case 'fresher':
      return { hasGulfExperience: false, hasProfessionalExperience: false }
  }
}
