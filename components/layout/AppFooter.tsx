import Link from 'next/link'
import { GULF_COUNTRIES } from '@/lib/utils'
import { getPublishedValue, listPublishedLegal } from '@/lib/admin/siteContent'

/**
 * AppFooter — on every signed-in page.
 *
 * WHY, and why the content is what it is. `01_PRODUCT.md` §3: this market is
 * "trust-starved more than feature-starved", with documented, active scam
 * behaviour targeting exactly this audience — agents who take money for Gulf
 * placement and disappear. The footer of a career product aimed at those people
 * is not decoration. It is where someone checks whether anyone real is behind
 * this before they hand over their CV.
 *
 * So this carries the things that answer that question, and nothing else:
 * who built it, what it will and will not do, where to reach a person, and
 * what is honestly not built yet.
 *
 * ONE DELIBERATE ABSENCE. The same §3 says the trust signals — the founder
 * story, transparent pricing, the "nothing invented" promise — are "primary
 * product surface, NOT footer content". This footer therefore repeats them in
 * summary; it does not replace them. If the only place a user meets the
 * grounding promise is down here, the product has already failed.
 *
 * LEGAL LINKS APPEAR ONLY ONCE WRITTEN. Migration 046 put the privacy, terms
 * and refund pages in a table the founder edits at `/admin/content`, and this
 * asks that table what is published rather than hard-coding three links. Until
 * a page is written AND published it does not exist here — a link to a blank
 * legal page is worse than no link, because it reads as though the policy says
 * nothing. Nothing about them is written on the founder's behalf.
 *
 * The about line comes from the same table, so the sentence under the logo can
 * be changed without a developer or a deploy.
 */

const LIVE_SERVICES = [
  { label: 'Gulf Readiness Score', href: '/gcc-readiness' },
  { label: 'Career Profile', href: '/profile' },
  { label: 'Resume Optimizer', href: '/optimize/target' },
  { label: 'Cover Letter', href: '/cover-letter' },
  { label: 'CV Templates', href: '/templates' },
  { label: 'My Resumes', href: '/dashboard/library' },
]

export async function AppFooter() {
  const year = new Date().getFullYear()
  // Both read from site_content (migration 046) — founder-editable, no deploy.
  const [legalPages, aboutLine] = await Promise.all([
    listPublishedLegal(),
    getPublishedValue(
      'footer_about',
      'A Gulf career platform built by a 15-year Gulf E&I Superintendent.',
    ),
  ])

  return (
    <footer className="mt-10 border-t border-edge bg-white">
      <div className="mx-auto grid w-full max-w-[1120px] gap-7 px-5 py-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        {/* ── who is behind this ── */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="-mx-2 flex w-fit min-h-11 items-center gap-2.5 rounded-bp px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-bp bg-signal font-mono text-[13px] font-semibold text-white"
            >
              G
            </span>
            <span className="font-bp-display text-[14px] font-bold tracking-[-0.01em] text-graphite">
              GCC MENTOR
            </span>
          </Link>
          <p className="max-w-[38ch] text-[13px] leading-relaxed text-graphite-soft">{aboutLine}</p>
          <p className="max-w-[38ch] text-[13px] leading-relaxed text-slate">
            Every generated line is checked against your own profile before you see it.
            Nothing is invented.
          </p>
        </div>

        {/* ── what actually works today ── */}
        {/* HIDDEN ON PHONES. Every link here is already one tap away in the
            bottom navigation, so on mobile this column was pure duplication —
            and it was most of the 890px the footer was costing. It earns its
            place on wider screens, where the sidebar scrolls out of view. */}
        <nav aria-label="Services" className="hidden flex-col gap-2.5 sm:flex">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate">
            Services
          </h2>
          <ul className="flex flex-col gap-1.5">
            {LIVE_SERVICES.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-flex min-h-[26px] items-center text-[13px] text-graphite-soft underline-offset-2 hover:text-signal-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* Named as not built, because saying so is the product's whole
              posture. A "coming soon" that never comes is what the scams do. */}
          <p className="mt-1 text-[12px] leading-relaxed text-slate">
            Interview Q&amp;A and Mock Interview are <strong className="font-semibold">not built yet</strong>.
            They are labelled everywhere they appear.
          </p>
        </nav>

        {/* ── where, and how to reach a person ── */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate">
            Gulf markets
          </h2>
          <p className="text-[13px] leading-relaxed text-graphite-soft">
            {GULF_COUNTRIES.filter((c) => c.value !== 'generic_gulf')
              .map((c) => c.label)
              .join(' · ')}
          </p>

          <h2 className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate">
            Contact
          </h2>
          <a
            href="mailto:jaissatish@gmail.com"
            className="inline-flex min-h-11 w-fit items-center text-[13px] font-semibold text-signal-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            jaissatish@gmail.com
          </a>
          <p className="text-[12px] leading-relaxed text-slate">
            A real person replies, usually within a day.
          </p>
        </div>
      </div>

      {/* ── the honest bottom line ── */}
      <div className="border-t border-edge">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-[12px] text-slate">© {year} GCC MENTOR</p>
            {/* Only what is actually written. An empty list renders nothing —
                the footer never advertises a policy that does not exist. */}
            {legalPages.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="text-[12px] text-slate underline-offset-2 hover:text-signal-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                {p.title}
              </Link>
            ))}
          </div>
          {/* Said plainly rather than hidden. A user deciding whether to trust
              this is better served by knowing there is no card checkout than by
              discovering it at the moment they try to pay. */}
          <p className="text-[12px] leading-relaxed text-slate">
            Card checkout is not live yet — a purchase is arranged directly with us.
          </p>
        </div>
      </div>
    </footer>
  )
}
