import type { Package } from '@/types/package'

/**
 * The one thing this user should do next.
 *
 * WHY THIS IS A MODULE AND NOT A TERNARY ON THE DASHBOARD. It was three tiers
 * inline in app/dashboard/page.tsx — no profile, thin profile, everything
 * else — which meant a user who had started a resume and stopped halfway was
 * told to "optimize your next application", with no way back to the one they
 * had already paid attention to. Pulled out here so the rules are readable in
 * one place and can be asserted against in a test without rendering a page.
 *
 * IT READS ONLY WHAT THE DASHBOARD ALREADY FETCHES: GET /api/profile,
 * GET /api/packages, and (since 2026-09-11) whether a CV reading is waiting —
 * GET /api/profile/pending-draft. Every branch below is a fact those responses
 * already carry.
 *
 * ONE ACTION, NOT A LIST. The failure mode of a "personalised" dashboard is
 * five suggestions of equal weight, which is the same as none. The order here
 * is: finish what you started, before starting something new. A half-built
 * application is worth more to this user than a prompt to begin another.
 *
 * NEVER POINTS AT SOMETHING THAT IS NOT BUILT. There is no branch for the
 * interview stage, even though the status enum has one, because Interview Prep
 * does not exist — and a primary call to action that lands on "coming soon" is
 * the product breaking its own promise on the most prominent surface it has.
 */

export interface NextAction {
  /** Short verb phrase, the heading of the strip. */
  title: string
  /** One sentence of why, or what happens next. Never a paragraph. */
  body: string
  cta: string
  href: string
  /**
   * Which rule fired. Not rendered — it exists so a test can assert the state
   * machine rather than string-match the copy, which is expected to change.
   */
  state:
    | 'draft_waiting'
    | 'no_profile'
    | 'profile_thin'
    | 'no_target_job'
    | 'job_unpaid'
    | 'job_not_generated'
    | 'job_needs_letter'
    | 'add_next_job'
}

/** The subset of the profile this decision actually depends on. */
export interface NextActionProfile {
  readiness_score?: number | null
}

/**
 * How a job is named back to the user.
 *
 * The user's own label wins, then the target job title. The employer is
 * appended only when there is one — `target_company` is nullable (migration
 * 030) and "at null" or "at (no company)" is exactly the kind of database
 * leakage that makes a product feel unfinished.
 */
export function jobLabel(pkg: Package): string {
  const name = (pkg.name ?? '').trim() || pkg.target_job_title
  const company = (pkg.target_company ?? '').trim()
  return company ? `${name} at ${company}` : name
}

function hasCoverLetter(pkg: Package): boolean {
  return Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
}

/**
 * The score below which the profile is the bottleneck.
 *
 * 40 is the threshold the dashboard has used since TASK-034 and is unchanged
 * here; it is named rather than inlined so it stops being a magic number in a
 * ternary.
 */
export const PROFILE_THIN_BELOW = 40

export function computeNextAction(
  profile: NextActionProfile | null,
  packages: readonly Package[],
  score: number,
  /**
   * How many profile fields are still empty, from the same `calculateReadiness`
   * call the dashboard already makes. Optional: the decision never depends on
   * it, only the sentence does, so a caller without it still gets the right
   * action.
   */
  missingCount = 0,
  /** A CV reading is waiting for the user's decision (migration 047). */
  hasPendingDraft = false
): NextAction {
  // A CV READING WAITING FOR A DECISION COMES FIRST (2026-09-11). It is a paid
  // call whose result is already in hand, kept on the server until the user
  // chooses — the purest case of "finish what you started". It outranks even
  // "no profile": a first-time user whose reading could not be auto-saved has
  // no profile yet, and the reading IS their profile, one tap away.
  if (hasPendingDraft) {
    return {
      state: 'draft_waiting',
      title: 'Your CV reading is waiting',
      body: profile
        ? 'We read your CV and kept the result. Choose whether to add it to your profile or replace it.'
        : 'We read your CV and kept the result. Check it and save your profile.',
      cta: 'Review it',
      href: '/profile',
    }
  }

  // A brand-new user is told to CREATE A RESUME, not to "complete a Career
  // Profile". They signed up to make a CV; "Career Profile" is our internal
  // name for the data behind it, and leading with it points a first-time
  // visitor at an empty form using a term they have never seen.
  if (!profile) {
    return {
      state: 'no_profile',
      title: 'Create your first resume',
      body: 'Upload your CV, paste the text, or type it in. We read it and build your profile from it.',
      cta: 'Add your CV',
      href: '/profile?import=upload',
    }
  }

  if (score < PROFILE_THIN_BELOW) {
    return {
      state: 'profile_thin',
      title: 'Finish your career profile',
      body:
        missingCount > 0
          ? `${missingCount} item${missingCount === 1 ? '' : 's'} left. Every resume you build is made from this, so it is the one thing worth doing properly.`
          : 'Every resume you build is made from it, so this is the one thing worth doing properly.',
      cta: 'Complete profile',
      href: '/profile',
    }
  }

  if (packages.length === 0) {
    return {
      state: 'no_target_job',
      title: 'Add the job you are applying for',
      body: 'Give us the role and we build a CV against it. Everything you do for that job stays with it.',
      cta: 'Add a target job',
      href: '/optimize/target',
    }
  }

  // Packages arrive newest-first from GET /api/packages, so the first match in
  // each sweep below is the most recent one in that state — which is the one
  // the user was last working on.

  // Started and stopped before unlocking. Pay-before-generate (migration 033)
  // means an unpaid package has no `optimized_content` at all, so this is a
  // genuinely unfinished job rather than a paid one awaiting a re-run.
  const unpaid = packages.find((p) => !p.is_paid && p.optimized_content === null)
  if (unpaid) {
    return {
      state: 'job_unpaid',
      // Not "Unlock": there is no checkout, and a heading that implies a
      // payment the user cannot make is a promise the product cannot keep.
      title: `Finish the CV for ${jobLabel(unpaid)}`,
      body: 'You set this job up but its CV is not built yet. Pick up where you left off.',
      cta: 'Continue',
      href: `/optimize/pay/${unpaid.id}`,
    }
  }

  // Paid, but generation never completed — a timeout, a closed tab, a reload
  // at the wrong moment. The user has already paid for this and would
  // otherwise have to work out for themselves that it can be resumed.
  const ungenerated = packages.find((p) => p.is_paid && p.optimized_content === null)
  if (ungenerated) {
    return {
      state: 'job_not_generated',
      title: `Build the CV for ${jobLabel(ungenerated)}`,
      // No duration (2026-09-11): "takes about a minute" was a local number
      // production runs past. See lib/processingNotes.ts.
      body: 'This job is unlocked and ready to build.',
      cta: 'Build the CV',
      href: `/optimize/generate/${ungenerated.id}`,
    }
  }

  const needsLetter = packages.find((p) => p.optimized_content !== null && !hasCoverLetter(p))
  if (needsLetter) {
    return {
      state: 'job_needs_letter',
      title: `Write the cover letter for ${jobLabel(needsLetter)}`,
      body: 'Gulf employers read the letter before the CV. Yours is built from the same profile.',
      cta: 'Write the letter',
      href: '/cover-letter',
    }
  }

  return {
    state: 'add_next_job',
    title: 'Add your next target job',
    body: `${packages.length} job${packages.length === 1 ? '' : 's'} set up so far. Each new one reuses the profile you have already built.`,
    cta: 'Add a target job',
    href: '/optimize/target',
  }
}
