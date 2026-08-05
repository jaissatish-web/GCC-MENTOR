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
export const GULF_COUNTRIES = [
  { value: 'saudi_arabia', label: 'Saudi Arabia' },
  { value: 'uae',          label: 'UAE' },
  { value: 'qatar',        label: 'Qatar' },
  { value: 'oman',         label: 'Oman' },
  { value: 'kuwait',       label: 'Kuwait' },
  { value: 'bahrain',      label: 'Bahrain' },
  { value: 'generic_gulf', label: 'Generic Gulf' },
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
