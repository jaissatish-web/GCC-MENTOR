import type { JobMatchProfileInput } from './requirementMapping'
import type { CareerProfileDraft, CareerProfileFull } from '@/types/careerProfile'

/**
 * Adapts the two shapes a candidate's data can arrive in — an anonymous
 * extraction draft (TASK-069/071, app/api/ats-scan/route.ts) or a real,
 * saved profile (TASK-073, app/api/optimize/route.ts) — into the Job Match
 * engine's one purpose-built input shape (lib/jobMatch/requirementMapping.ts).
 * Single source of truth so the two callers can't silently drift apart —
 * same reasoning as lib/resumeDocument.ts's "one derivation, many
 * renderers" (TASK-032).
 */

export function buildJobMatchProfileInputFromDraft(draft: CareerProfileDraft): JobMatchProfileInput {
  return {
    professionalSummary: draft.professional_summary ?? null,
    workExperience: (draft.work_experience ?? []).map((w) => ({
      role: w.role ?? '',
      startDate: w.start_date ?? null,
      endDate: w.end_date ?? null,
      description: w.description ?? null,
      highlights: w.highlights ?? [],
      gccCountry: w.gcc_country ?? null,
    })),
    skillNames: (draft.skills ?? []).map((s) => s.name ?? '').filter(Boolean),
    certificationNames: (draft.certifications ?? []).map((c) => c.name ?? '').filter(Boolean),
    educationEntries: (draft.education ?? []).map((e) => ({
      degree: e.degree ?? '',
      fieldOfStudy: e.field_of_study ?? null,
    })),
    // An anonymous draft never carries this field, by design (types/careerProfile.ts) — always "unknown," never a confirmed negative.
    hasDrivingLicense: null,
  }
}

export function buildJobMatchProfileInputFromFullProfile(profile: CareerProfileFull): JobMatchProfileInput {
  return {
    professionalSummary: profile.professional_summary,
    workExperience: (profile.work_experience ?? []).map((w) => ({
      role: w.role,
      startDate: w.start_date,
      endDate: w.end_date,
      description: w.description,
      highlights: w.highlights ?? [],
      gccCountry: w.gcc_country,
    })),
    skillNames: (profile.skills ?? []).map((s) => s.name),
    certificationNames: (profile.certifications ?? []).map((c) => c.name),
    educationEntries: (profile.education ?? []).map((e) => ({
      degree: e.degree,
      fieldOfStudy: e.field_of_study,
    })),
    hasDrivingLicense: profile.has_driving_license,
  }
}
