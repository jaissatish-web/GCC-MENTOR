import {
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  BriefcaseIcon,
  ChartBarIcon,
  RectangleStackIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'

/**
 * The single source of truth for authenticated navigation.
 *
 * Previously the same list was duplicated across Sidebar, MobileBottomNav and
 * MoreSheet, so a reorder had to be made three times and the mobile drawer had
 * already drifted out of step with the desktop rail. All three now render from
 * this array.
 *
 * Order is the founder-specified one (2026-08-14) and is deliberate: the two
 * things a returning user does most (open the Library, finish the Profile)
 * sit directly under Dashboard, and the tools that operate on what was created
 * follow. Payments is intentionally absent — it now lives inside Settings.
 *
 * "Job Match" was removed entirely (founder decision 2026-09-04): it is no longer
 * a service a user opens on its own. Pasting a job description now happens inside
 * Resume Optimizer, which already ran the same matching engine internally to build
 * its "Job Match Findings" — so the analysis did not go away, only the separate
 * screen that made it look like a second product.
 *
 * "Create Resume" was removed from this menu (founder decision 2026-08-18): the
 * three ways to start (upload · paste · fill manually) now live on the Career
 * Profile page itself, so the profile is the one place a user both sees their
 * data and (re)builds it. The /create-resume route still exists for the
 * dashboard's first-run CTA and the onboarding fallback — it is only gone from
 * the nav.
 */
export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  /**
   * When true the item only highlights on an exact pathname match.
   *
   * Only Dashboard needs this: `/dashboard` is a prefix of `/dashboard/library`,
   * so prefix-matching it would light up two nav items at once on the Library
   * page. Every other entry wants prefix matching so the highlight survives a
   * multi-step flow (`/optimize/target` → `/setup` → `/preview` → `/pay`).
   */
  exact?: boolean
  /**
   * Shown dimmed, with a "Not set up yet" hint, until the user has a profile.
   *
   * Deliberately dimmed rather than hidden. The user LANDS on this page right
   * after extraction, so removing it from the nav would drop them somewhere
   * with no visible way back — and nav that changes shape between visits makes
   * people re-learn the menu. Dimming keeps the destination discoverable while
   * making clear it is not the first step.
   */
  needsProfile?: boolean
  /**
   * The label the MOBILE BOTTOM BAR uses, when the sidebar's wording is too
   * long for a bar slot.
   *
   * Measured 2026-09-08, with the real font at the new 12px floor: a 4-item bar
   * on a 320px screen gives each item 80px, and "Resume Library" renders at
   * 84px — it overflows. "Career Profile" lands at 74px, which fits only by
   * touching its neighbours. Both were fine at the old 10px, which is exactly
   * the kind of thing raising a type floor surfaces.
   *
   * Shortening only the bar, and never the sidebar, is deliberate: the rail has
   * room for the full name and the full name is clearer. A bottom bar is
   * glanced at, not read, and one word is what fits.
   */
  shortLabel?: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, exact: true },
  { label: 'Career Profile', href: '/profile', icon: UserCircleIcon, needsProfile: true, shortLabel: 'Profile' },
  // "Profile Strength" (/gcc-readiness) sat here from 2026-09-09 to 2026-09-11.
  // It left when Career Profile and Profile Strength became one page (founder
  // decision): both scores and what raises each now live on /profile, and
  // /gcc-readiness redirects there.
  // "Target Jobs" from 2026-09-09 to 2026-09-11, then "Resume Library" again by
  // founder decision. Only the name went back: each row still leads with the
  // job — title, employer, country — and carries its stage, applied → offer.
  { label: 'Resume Library', href: '/dashboard/library', icon: BriefcaseIcon, shortLabel: 'Library' },
  { label: 'Resume Templates', href: '/templates', icon: RectangleStackIcon, shortLabel: 'Templates' },
  { label: 'Resume Optimizer', href: '/optimize', icon: DocumentTextIcon, shortLabel: 'Optimize' },
  { label: 'Cover Letter', href: '/cover-letter', icon: EnvelopeIcon },
  { label: 'Settings', href: '/settings', icon: Cog6ToothIcon },
] as const

/**
 * Services that are agreed but not built.
 *
 * These are rendered in the nav as DIMMED, NON-INTERACTIVE rows under their own
 * "Coming soon" heading — never as links.
 *
 * DELIBERATE DEVIATION, founder decision 2026-08-15.
 * docs/redesign/PLANNED_SERVICES.md previously said "No nav entry, on any
 * breakpoint, for any of the three." The founder asked for them to be visible
 * in the sidebar and, given the choice, chose the dimmed non-clickable
 * treatment specifically so the roadmap is visible without anyone tapping into
 * a dead end. That is what the original rule was protecting against, so the
 * intent survives even though the letter of it changed. The doc has been
 * updated rather than left contradicting the code.
 *
 * They carry no href by construction: there is nothing to navigate to, and a
 * type without one cannot accidentally be turned into a link later.
 */
export interface PlannedNavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export const PLANNED_NAV_ITEMS: readonly PlannedNavItem[] = [
  { label: 'Mock Interview', icon: ChatBubbleLeftRightIcon },
  { label: 'Q&A / Interview Prep', icon: QuestionMarkCircleIcon },
  { label: 'Saved Jobs', icon: BookmarkIcon },
] as const

/**
 * The five destinations pinned to the mobile bottom bar. The rest of
 * NAV_ITEMS appears in the "More" drawer, so every destination stays
 * reachable on a phone without a horizontal scroll.
 */
export const MOBILE_PRIMARY_HREFS: readonly string[] = [
  '/dashboard',
  '/dashboard/library',
  '/profile',
]

export const MOBILE_PRIMARY_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((i) =>
  MOBILE_PRIMARY_HREFS.includes(i.href)
)

export const MOBILE_MORE_ITEMS: readonly NavItem[] = NAV_ITEMS.filter(
  (i) => !MOBILE_PRIMARY_HREFS.includes(i.href)
)

/**
 * `/optimize` is the Resume Optimizer's nav href because the flow spans four
 * routes, but it is not itself a page — the entry point is `/optimize/target`.
 * Link targets go through here so the nav never points at a 404.
 */
export function navHref(item: NavItem): string {
  return item.href === '/optimize' ? '/optimize/target' : item.href
}

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
