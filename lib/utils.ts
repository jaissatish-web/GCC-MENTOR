import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Target countries. `generic_gulf` is a real, selectable option — not a
 * fallback — and drives generic Gulf CV format conventions.
 * See docs/CAREER_PROFILE.md §2.
 */
/**
 * `flag` is the country's standard Unicode flag — its own glyph, not a drawing
 * of one.
 *
 * DELIBERATELY NOT AN SVG. Hand-drawing these would mean approximating the
 * Saudi flag, which carries the shahada, and a rough approximation of that is
 * not something to ship.
 *
 * WHAT IT LOOKS LIKE WHERE. Android and iOS — which is where these users are —
 * render real flags. Windows desktop has no flag glyphs in its emoji font and
 * falls back to the two-letter code ("SA", "AE"). That is a Windows font
 * limitation rather than a defect, and the fallback still names the right
 * country, which is what makes this safe to use.
 *
 * `generic_gulf` has none on purpose: it is the value stored when nobody picked
 * a country, so there is no flag that would be true.
 */
export const GULF_COUNTRIES = [
  { value: 'saudi_arabia', label: 'Saudi Arabia', flag: '🇸🇦' },
  { value: 'uae',          label: 'UAE',          flag: '🇦🇪' },
  { value: 'qatar',        label: 'Qatar',        flag: '🇶🇦' },
  { value: 'oman',         label: 'Oman',         flag: '🇴🇲' },
  { value: 'kuwait',       label: 'Kuwait',       flag: '🇰🇼' },
  { value: 'bahrain',      label: 'Bahrain',      flag: '🇧🇭' },
  { value: 'generic_gulf', label: 'Generic Gulf', flag: '' },
] as const

export type GulfCountry = (typeof GULF_COUNTRIES)[number]['value']

/**
 * Industries that map to a curated AI persona. Anything not listed here
 * falls back to `generic_gulf_professional` — nobody is turned away.
 * See docs/PROMPTS.md §3.
 */
export const PERSONA_INDUSTRIES = [
  { value: 'engineering_technical', label: 'Engineering / Technical' },
  { value: 'construction_site',     label: 'Construction / Site' },
  { value: 'it_tech',               label: 'IT / Technology' },
  { value: 'other',                 label: 'Other' },
] as const

/** Package status values. See docs/DASHBOARD_LIBRARY.md §3. */
export const PACKAGE_STATUSES = [
  { value: 'applied',         label: 'Applied' },
  { value: 'shortlisted',     label: 'Shortlisted' },
  { value: 'interview',       label: 'Interview' },
  { value: 'visa_processing', label: 'Visa processing' },
  { value: 'offer',           label: 'Offer' },
] as const

/** Format a rupee amount for display. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** MVP price, in rupees. See docs/MVP.md §7. */
export const PRICE_INR = 499

/**
 * What to call a saved resume (TASK-156).
 *
 * ONE HELPER, USED EVERYWHERE. `packages.name` (migration 036) is the label the
 * user typed; `target_job_title` is the role the resume was optimized for and is
 * not editable. The fallback belongs in one place because it was previously
 * inlined in one screen and simply forgotten in three others — the Library, both
 * dashboard lists and the template gallery's picker all printed the job title, so
 * renaming a resume appeared to do nothing anywhere except the field it was typed
 * into. The founder reported it as "rename is not saving"; it was saving fine and
 * being ignored on read.
 */
export function resumeLabel(pkg: {
  name?: string | null
  target_job_title?: string | null
}): string {
  return pkg.name?.trim() || pkg.target_job_title?.trim() || 'Untitled resume'
}
