import {
  Squares2X2Icon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  BriefcaseIcon,
  RectangleStackIcon,
  UserCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  Cog6ToothIcon,
  IdentificationIcon,
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
  /** Shared icon color and background across every navigation surface. */
  iconClass: string
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
  { label: 'Home', href: '/dashboard', iconClass: 'bg-blue-50 text-blue-700', icon: Squares2X2Icon, exact: true, shortLabel: 'Home' },
  { label: 'Career Profile', href: '/profile', iconClass: 'bg-teal-soft text-teal', icon: UserCircleIcon, needsProfile: true, shortLabel: 'Profile' },
  // "Profile Strength" (/gcc-readiness) sat here from 2026-09-09 to 2026-09-11.
  // It left when Career Profile and Profile Strength became one page (founder
  // decision): both scores and what raises each now live on /profile, and
  // /gcc-readiness redirects there.
  // "Target Jobs" from 2026-09-09 to 2026-09-11, then "Resume Library" again by
  // founder decision. Only the name went back: each row still leads with the
  // job — title, employer, country — and carries its stage, applied → offer.
  { label: 'Resume Library', href: '/dashboard/library', iconClass: 'bg-indigo-50 text-indigo-700', icon: BriefcaseIcon, shortLabel: 'Resumes' },
  { label: 'Resume Templates', href: '/templates', iconClass: 'bg-rose-50 text-rose-700', icon: RectangleStackIcon, shortLabel: 'Templates' },
  { label: 'Resume Optimizer', href: '/optimize', iconClass: 'bg-yellow-50 text-yellow-700', icon: DocumentTextIcon, shortLabel: 'Optimize' },
  { label: 'Cover Letter', href: '/cover-letter', iconClass: 'bg-violet-50 text-violet-700', icon: EnvelopeIcon },
  { label: 'Interview Q&A', href: '/interview-qa', iconClass: 'bg-cyan-50 text-cyan-700', icon: QuestionMarkCircleIcon, shortLabel: 'Q&A' },
  { label: 'Mock Interview', href: '/mock-interview', iconClass: 'bg-orange-50 text-orange-700', icon: ChatBubbleLeftRightIcon, shortLabel: 'Mock' },
  { label: 'LinkedIn Optimization', href: '/linkedin-optimization', iconClass: 'bg-blue-100 text-blue-800', icon: IdentificationIcon },
  { label: 'Settings', href: '/settings', iconClass: 'bg-fuchsia-50 text-fuchsia-700', icon: Cog6ToothIcon },
] as const

/**
 * Three familiar destinations plus the shared More drawer. Service routes
 * remain available in the drawer and in the dashboard's next action.
 */
export const MOBILE_PRIMARY_HREFS: readonly string[] = [
  '/dashboard',
  '/profile',
  '/dashboard/library',
]

export const MOBILE_PRIMARY_ITEMS: readonly NavItem[] = NAV_ITEMS.filter((i) =>
  MOBILE_PRIMARY_HREFS.includes(i.href)
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

/**
 * Internal ordering groups shared by the sidebar and phone menu. Category
 * headings are hidden (founder 2026-10-08); `stage` retains next/locked marks.
 * Every NAV_ITEMS href appears in exactly one group.
 */
export interface NavGroup {
  key: string
  /** null = no heading (Home sits alone at the top). */
  label: string | null
  hrefs: readonly string[]
  stage?: 'profile' | 'cv' | 'apply'
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { key: 'home', label: null, hrefs: ['/dashboard'] },
  { key: 'profile', label: 'Your profile', hrefs: ['/profile'], stage: 'profile' },
  { key: 'files', label: 'Your files', hrefs: ['/dashboard/library'] },
  { key: 'cv', label: 'Tailored CV', hrefs: ['/optimize', '/templates'], stage: 'cv' },
  { key: 'apply', label: 'Apply & interview', hrefs: ['/cover-letter', '/interview-qa', '/mock-interview'], stage: 'apply' },
  { key: 'professional', label: 'Your online profile', hrefs: ['/linkedin-optimization'] },
  { key: 'account', label: 'Account', hrefs: ['/settings'] },
]
