import { HEALTH_REGULATORS, PAPERWORK_COPY, PASSPORT_MIN_DAYS } from '@/lib/gulfReadiness/config'
import { normalise } from '@/lib/gulfReadiness/evidence'
import type { GulfFacts, MustHave } from '@/lib/gulfReadiness/types'
import type { PaperworkStatus } from '@/types/careerProfile'

/**
 * The must-haves (Gulf Readiness v2, 2026-10-01): the paperwork that decides
 * whether a person can actually be hired, whatever their CV says.
 *
 * Each applies only where it really applies — Saudi verification only for a
 * Saudi target, a professional licence only for a regulated job, attestation
 * only for someone with a degree. "Not answered" is `unknown` ("not checked"),
 * never `missing`: we do not fail a person on a question we have not asked.
 *
 * Market basis (checked 2026-10-01): Saudi professional verification (QVP for
 * qualifications, SVP skills tests for trades) is enforced for most work visas
 * and residency renewals; UAE skilled work permits (levels 1–3) need an attested
 * degree; health professionals need their regulator's licence or eligibility
 * (DataFlow + Prometric); engineers in Saudi need SCE registration.
 */

const HEALTH = /\b(nurse|nursing|doctor|physician|surgeon|pharmac\w*|dentist|dental|radiograph\w*|radiolog\w*|physiotherap\w*|midwife|paramedic|anaesthe\w*|anesthe\w*|medical laboratory|lab technologist|optometrist|dietitian|respiratory therapist|gnm|bsn|mbbs|bds|b\.?\s?pharm|pharm\.?\s?d)\b/
const ENGINEER = /\bengineer(ing)?\b/
const DEGREE = /\b(bachelor|master|bhm|b\.\s?a\b|m\.\s?a\b|ba in|ma in|b\.?\s?arch|b\.?\s?ed|llm|b\.?\s?tech|m\.?\s?tech|b\.\s?e\b|m\.\s?e\b|b\.?\s?sc|m\.?\s?sc|b\.?\s?com|m\.?\s?com|bca|mca|mba|bba|ph\.?\s?d|diploma|degree|ll\.?\s?b|mbbs|bds|bsn|gnm|b\.?\s?pharm)\b/
const HEALTH_LICENCE_TEXT = /\b(dha|doh|haad|mohap|moh licen[cs]e|scfhs|qchp|dhp|nhra|omsb|prometric|dataflow) ?(licen[cs]e|eligib|registered|passed|cleared)?/
const SCE_TEXT = /\bsaudi council of engineers\b|\bsce\b/

export type Profession = 'health' | 'engineer' | 'other'

export function professionOf(text: string, facts: GulfFacts): Profession {
  const t = `${normalise(text)} ${(facts.targetJobTitle ?? '').toLowerCase()}`
  if (HEALTH.test(t)) return 'health'
  if (ENGINEER.test(t)) return 'engineer'
  return 'other'
}

function fromStatus(s: PaperworkStatus | null | undefined): MustHave['status'] | 'na' {
  switch (s) {
    case 'done': return 'ok'
    case 'in_progress': return 'in_progress'
    case 'not_started': return 'missing'
    case 'not_needed': return 'na'
    default: return 'unknown'
  }
}

function daysUntil(dateStr: string, today: Date): number | null {
  const d = new Date(/^\d{4}-\d{2}$/.test(dateStr) ? `${dateStr}-28` : dateStr)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((d.getTime() - today.getTime()) / 86_400_000)
}

export function evaluateMustHaves(text: string, facts: GulfFacts, today: Date): MustHave[] {
  const t = normalise(text)
  const out: MustHave[] = []
  const target = facts.targetCountry ?? null
  const profession = professionOf(text, facts)

  // 1. Passport — for everyone.
  {
    const c = PAPERWORK_COPY.passport
    const days = facts.passportValidityDate ? daysUntil(facts.passportValidityDate, today) : null
    const status: MustHave['status'] = days === null ? 'unknown' : days >= PASSPORT_MIN_DAYS ? 'ok' : 'missing'
    const steps: string[] = status === 'missing' ? [...c.steps] : ['Add your passport expiry date in your Career Profile.']
    if (facts.passportType === 'ECR') steps.push(c.ecrStep)
    out.push({
      key: 'passport',
      label: c.label,
      status,
      why: status === 'missing' ? c.whyMissing : status === 'unknown' ? c.whyUnknown : 'Valid for at least six months.',
      steps,
      field: 'passport_validity_date',
    })
  }

  // 2. Degree attestation — only for someone with a degree or diploma.
  if (DEGREE.test(t)) {
    const s = fromStatus(facts.degreeAttestation)
    if (s !== 'na') {
      const c = PAPERWORK_COPY.degree_attestation
      out.push({ key: 'degree_attestation', label: c.label, status: s, why: c.why, steps: [...c.steps], field: 'degree_attestation' })
    }
  }

  // 3. Saudi verification — only when Saudi is the target.
  if (target === 'saudi_arabia') {
    const s = fromStatus(facts.saudiVerification)
    if (s !== 'na') {
      const c = PAPERWORK_COPY.saudi_verification
      out.push({ key: 'saudi_verification', label: c.label, status: s, why: c.why, steps: [...c.steps], field: 'saudi_verification' })
    }
  }

  // 4. Professional licence — regulated jobs only (health anywhere; engineers for Saudi).
  if (profession === 'health' || (profession === 'engineer' && target === 'saudi_arabia')) {
    let s = fromStatus(facts.professionalLicence)
    if (s === 'unknown' && (profession === 'health' ? HEALTH_LICENCE_TEXT.test(t) : SCE_TEXT.test(t))) s = 'ok'
    if (s !== 'na') {
      if (profession === 'health') {
        const regulator = (target && HEALTH_REGULATORS[target]) || 'the health regulator of your target country'
        out.push({
          key: 'professional_licence',
          label: PAPERWORK_COPY.professional_licence_health.label,
          status: s,
          why: `Gulf hospitals and clinics hire only licensed or licence-eligible staff — you need ${regulator}.`,
          steps: PAPERWORK_COPY.professional_licence_health.steps(regulator),
          field: 'professional_licence',
        })
      } else {
        const c = PAPERWORK_COPY.professional_licence_engineer
        out.push({ key: 'professional_licence', label: c.label, status: s, why: c.why, steps: [...c.steps], field: 'professional_licence' })
      }
    }
  }
  return out
}
