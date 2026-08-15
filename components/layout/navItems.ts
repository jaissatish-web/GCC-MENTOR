import {
  Squares2X2Icon,
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
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon, exact: true },
  { label: 'Resume Library', href: '/dashboard/library', icon: BookOpenIcon },
  { label: 'Career Profile', href: '/profile', icon: UserCircleIcon },
  { label: 'GCC Readiness', href: '/gcc-readiness', icon: ShieldCheckIcon },
  { label: 'Create Resume', href: '/create-resume', icon: PlusCircleIcon },
  { label: 'Job Match', href: '/job-match', icon: MagnifyingGlassIcon },
  { label: 'Resume Optimizer', href: '/optimize', icon: DocumentTextIcon },
  { label: 'Cover Letter', href: '/cover-letter', icon: EnvelopeIcon },
  { label: 'Settings', href: '/settings', icon: Cog6ToothIcon },
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
