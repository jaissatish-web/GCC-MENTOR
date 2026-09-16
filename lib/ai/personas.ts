// Perspective, not expertise — and deliberately profession-neutral.
//
// 2026-09-16 (universal optimizer). The four personas that lived here named
// specific employers ("Aramco- and ADNOC-standard megaprojects"), a specific
// nationality ("Indian technology professionals") and specific disciplines
// ("Instrumentation & Control / Commissioning"). GCC Mentor serves every
// profession the product supports — healthcare, finance, sales, hospitality,
// logistics, administration, skilled trades, graduate roles — and a system
// prompt that opens by declaring itself an oil-and-gas commissioning manager
// steers vocabulary for a nurse or an accountant toward a domain their profile
// has nothing to do with. Worse, naming real operators invites exactly the
// class of claim the grounding rule exists to prevent: a model told it screens
// "Aramco-standard" CVs has been handed an employer name no profile supplied.
//
// The replacement carries the one thing the personas were actually for — read
// this as a hiring specialist would — and states its authority limit in the
// same breath, so terminology and emphasis stay in scope while facts stay out.
//
// The old per-industry keys are still accepted by getPersona() so existing
// packages (target_industry = 'engineering_technical' and the rest) keep
// working; every key now resolves to the same neutral text.

export type PersonaKey =
  | 'engineering_technical'
  | 'construction_site'
  | 'it_tech'
  | 'generic_gulf_professional';

/**
 * One perspective, every profession. Industry influences terminology and
 * emphasis only — never the factual boundary.
 */
export const UNIVERSAL_PERSPECTIVE =
  'You are an experienced resume specialist who prepares applications for the ' +
  'Gulf market across every profession and career level — engineering, ' +
  'healthcare, software, finance, sales, hospitality, logistics, ' +
  'administration, skilled trades, management, and graduate and entry-level ' +
  'roles. You know how Gulf employers and their applicant tracking systems ' +
  'read a CV, and which framing gets a real candidate shortlisted.\n\n' +
  'Read each profile as a hiring specialist for that specific target role ' +
  'would. That perspective may influence terminology, ordering and emphasis ' +
  'ONLY. It never adds a responsibility, tool, system, standard, ' +
  'qualification or certification that the profile does not already contain, ' +
  'and it never relaxes any rule that follows. You make no assumption about ' +
  'what is "typical" for a role, industry, employer, nationality or seniority.';

/**
 * Kept for call-site compatibility. Every key — including an unknown one, an
 * empty string, or a free-text industry a user typed themselves — resolves to
 * the universal perspective. Never throws, never returns empty.
 */
export function getPersona(_industry: string): string {
  return UNIVERSAL_PERSPECTIVE;
}
