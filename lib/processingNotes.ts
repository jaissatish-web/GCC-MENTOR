/**
 * What each waiting screen says while it works — one sentence at a time,
 * rotating under the named steps (components/ui/Processing.tsx).
 *
 * Founder request 2026-09-11: no timings anywhere; give every wait something
 * to read instead. THE RULE FOR EVERY LINE: it must be true of THAT service,
 * today, in the code that runs it — not a market statistic, not a prediction,
 * nothing about how long. Each set below cites where its claims come from, so
 * whoever changes that code can see which lines here it could make false.
 * `02_PHILOSOPHY.md`: nothing on screen that the product cannot stand behind.
 */

/**
 * Reading a CV into a Career Profile — /onboarding/extracting and the Career
 * Profile's inline import.
 * Source: lib/ai/extractionPrompt.ts ("You never invent, infer or guess a fact
 * that is not literally in the text"; a field the CV lacks is omitted), and the
 * profile editor that follows, where every field can be corrected.
 */
export const EXTRACTION_NOTES: readonly string[] = [
  'Reading each job — the title, the employer, where it was and when.',
  'Only what your CV actually says is filled in. Nothing is guessed.',
  'Anything your CV leaves out stays blank, for you to add.',
  'Picking out your skills, certifications and education.',
  'You can check and correct every field afterwards.',
  'Your Career Profile is what every CV and cover letter is built from.',
]

/**
 * The free Gulf Readiness scan — /gulf-readiness-score.
 * Source: lib/gulfReadiness/ — arithmetic, no model call, deterministic, six
 * scored dimensions (docs/09_SCORING.md §1).
 */
export const SCAN_NOTES: readonly string[] = [
  'Your score comes from fixed rules, so the same CV and answers always give the same score.',
  'Six areas are scored, from your work experience to your certifications.',
  'No AI writes this score. It is arithmetic on what your CV says.',
]

/**
 * Setting up a CV build — the wait on POST /api/optimize (Phase A) in
 * /optimize/setup.
 * Source: Phase A structures a pasted advert (moved there 2026-09-05); the
 * grounding rule (lib/ai/grounding.ts) and validateGrounding in
 * app/api/optimize/route.ts for the facts. Deliberately says nothing about the
 * NEXT screen: that is the pay page or the build depending on payment state,
 * and it will change when the paid locks return.
 */
export function setupNotes(hasJobDescription: boolean): readonly string[] {
  return [
    ...(hasJobDescription ? ['Reading the job advert for the skills and experience it asks for.'] : []),
    'Your employers, job titles and dates stay exactly as your profile states them.',
    'Only the wording is sharpened, for the role you are aiming at.',
    'Every rewritten line is checked against your Career Profile before you see it.',
  ]
}

/**
 * Building the CV — the generation wait in /optimize/generate/[packageId].
 * Source: validateGrounding with one grounding retry (app/api/optimize/route.ts);
 * on success the page opens /package/[id] — the finished resume, where it is
 * viewed, styled, edited and downloaded.
 */
export const GENERATE_NOTES: readonly string[] = [
  'Your employers, job titles and dates are kept exactly as your profile states them.',
  'Any line that cannot be traced to your profile is sent back and rewritten.',
  'The wording is sharpened for the role. The facts stay yours.',
  'Next: your finished CV, ready to style, edit and download.',
]

/**
 * Writing a cover letter — /cover-letter.
 * Source: lib/ai/buildCoverLetterPrompt.ts ("you must never invent") and
 * validateCoverLetterGrounding with retries
 * (app/api/packages/[id]/cover-letter/route.ts).
 */
export const COVER_LETTER_NOTES: readonly string[] = [
  'Written only from your Career Profile and the job you chose.',
  'A draft that mentions anything not in your profile is sent back and rewritten.',
  'The tone changes how it sounds, never what it says about you.',
]
