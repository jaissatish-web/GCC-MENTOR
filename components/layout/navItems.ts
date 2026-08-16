import {
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  BookOpenIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  PlusCircleIcon,
  MagnifyingGlassIcon,
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
 * sit directly under Dashboard, and the creation entry point comes before the
 * tools that operate on what was created. Payments is intentionally absent —
 * it now lives inside Settings.
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
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, exact: true },
  { label: 'Create Resume', href: '/create-resume', icon: PlusCircleIcon },
  { label: 'Career Profile', href: '/profile', icon: UserCircleIcon, needsProfile: true },
  { label: 'Resume Library', href: '/dashboard/library', icon: BookOpenIcon },
  { label: 'Profile Strength', href: '/gcc-readiness', icon: ShieldCheckIcon },
  { label: 'Job Match', href: '/job-match', icon: MagnifyingGlassIcon },
  { label: 'Resume Optimizer', href: '/optimize', icon: DocumentTextIcon },
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
  '/create-resume',
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
