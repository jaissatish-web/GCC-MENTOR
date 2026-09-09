import Link from 'next/link'
import { GULF_COUNTRIES } from '@/lib/utils'
import { getPublishedValue, listPublishedLegal } from '@/lib/admin/siteContent'
import { NotLiveText } from '@/components/ui/NotLive'

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
    // The fallback matches what is in the row, so a database hiccup degrades to
    // the same sentence rather than to a different, older claim about the team.
    getPublishedValue(
      'footer_about',
      'Built by engineers, not recruiters. Our founder has spent 15 years on EPC and PMC projects for client companies across the Middle East, and the rest of the team comes from the same work.',
    ),
  ])

  return (
    <footer className="mt-10 border-t border-line bg-white">
      <div className="mx-auto grid w-full max-w-[1120px] gap-7 px-5 py-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        {/* ── who is behind this ── */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="-mx-2 flex w-fit min-h-11 items-center gap-2.5 rounded-ctl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-ctl bg-teal font-mono text-[13px] font-semibold text-white"
            >
              G
            </span>
            <span className="font-display text-[14px] font-bold tracking-[-0.01em] text-ink">
              GCC MENTOR
            </span>
          </Link>
          <p className="max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">{aboutLine}</p>
          {/* WHY THIS SENTENCE IS HERE AND NOT ONLY IN THE ABOUT LINE. The
              founder's point (2026-09-09): in the Gulf, knowing how the market
              actually works is most of the outcome. It is written as OUR
              JUDGEMENT — "we put it at" — not as a researched figure, because
              this product's whole promise is that it does not state things it
              cannot stand behind. A footer is not the place to invent a
              statistic. */}
          <p className="max-w-[40ch] text-[13px] leading-relaxed text-ink-soft">
            In the Gulf, information decides most of it — what a client expects, how a
            package is built, what a visa status signals. We put that at around{' '}
            <strong className="font-semibold text-ink">75% of the outcome</strong>, which
            is why this exists.
          </p>
          <p className="max-w-[40ch] text-[13px] leading-relaxed text-ink-muted">
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
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Services
          </h2>
          <ul className="flex flex-col gap-1.5">
            {LIVE_SERVICES.map((s) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className="inline-flex min-h-[26px] items-center text-[13px] text-ink-soft underline-offset-2 hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* Named as not built, because saying so is the product's whole
              posture. A "coming soon" that never comes is what the scams do. */}
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Interview Q&amp;A and Mock Interview are <NotLiveText>not built yet</NotLiveText>.
            They are labelled everywhere they appear.
          </p>
        </nav>

        {/* ── where, and how to reach a person ── */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Gulf markets
          </h2>
          {/* Flag then name, as a list rather than a run-on sentence — six
              countries separated by dots read as one long string, and the flag
              is what makes the row scannable. `aria-hidden` on the glyph: a
              screen reader announcing "flag of Saudi Arabia, Saudi Arabia" is
              worse than the name alone. */}
          <ul className="flex flex-col gap-1">
            {GULF_COUNTRIES.filter((c) => c.value !== 'generic_gulf').map((c) => (
              <li key={c.value} className="flex items-center gap-2 text-[13px] text-ink-soft">
                <span aria-hidden="true" className="text-[15px] leading-none">
                  {c.flag}
                </span>
                {c.label}
              </li>
            ))}
          </ul>

          <h2 className="mt-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Contact
          </h2>
          <a
            href="mailto:jaissatish@gmail.com"
            className="inline-flex min-h-11 w-fit items-center text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            jaissatish@gmail.com
          </a>
        </div>
      </div>

      {/* ── the honest bottom line ── */}
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <p className="text-[12px] text-ink-muted">© {year} GCC MENTOR</p>
            {/* Only what is actually written. An empty list renders nothing —
                the footer never advertises a policy that does not exist. */}
            {legalPages.map((p) => (
              <Link
                key={p.slug}
                href={`/${p.slug}`}
                className="text-[12px] text-ink-muted underline-offset-2 hover:text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {p.title}
              </Link>
            ))}
          </div>
          {/* Said plainly rather than hidden. A user deciding whether to trust
              this is better served by knowing there is no card checkout than by
              discovering it at the moment they try to pay. */}
          <p className="text-[12px] leading-relaxed text-ink-muted">
            <NotLiveText>Card checkout is not live yet</NotLiveText> — a purchase is
            arranged directly with us.
          </p>
        </div>
      </div>
    </footer>
  )
}
