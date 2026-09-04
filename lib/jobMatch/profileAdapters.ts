import type { JobMatchProfileInput, JobMatchWorkExperienceInput } from './requirementMapping'
import type { CareerProfileDraft, CareerProfileFull, TargetCountry } from '@/types/careerProfile'
import { gccCountryFromLocation } from './gccLocation'

/**
 * Settle one work entry's GCC country from the two things that can say it.
 *
 * A country the user picked from the dropdown ALWAYS wins — it is a confirmed
 * answer, and a derived reading must never overwrite one. Only when that column
 * is empty do we read the free-text location the resume states for the job.
 *
 * This is the fix for open items §B1. `location` has always been extracted and
 * has never been read by anything, so the GCC category was pinned to zero for
 * every anonymous scan no matter what the CV said. Deriving here rather than in
 * the scorer keeps it in the one place both callers already share, so the
 * anonymous funnel and a signed-in profile cannot drift apart on it.
 */
function resolveGccCountry(
  explicit: TargetCountry | null,
  location: string | null,
): Pick<JobMatchWorkExperienceInput, 'gccCountry' | 'gccCountrySource'> {
  if (explicit) return { gccCountry: explicit, gccCountrySource: 'profile' }
  const derived = gccCountryFromLocation(location)
  if (derived) return { gccCountry: derived.country, gccCountrySource: 'derived' }
  return { gccCountry: null, gccCountrySource: null }
}

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
      ...resolveGccCountry(w.gcc_country ?? null, w.location ?? null),
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
      ...resolveGccCountry(w.gcc_country, w.location),
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
