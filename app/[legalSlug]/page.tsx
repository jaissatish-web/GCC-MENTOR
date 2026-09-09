import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedPage, isLegalSlug, LEGAL_SLUGS } from '@/lib/admin/siteContent'

export const dynamic = 'force-dynamic'

/**
 * The legal pages — privacy, terms and refund — rendered from whatever the
 * founder has written at `/admin/content` (migration 046).
 *
 * ONE ROUTE, NOT THREE. The three pages differ only in their text, so three
 * files would be the same file three times and would drift the moment one was
 * edited. The slug is validated against a fixed list rather than passed
 * through, so this cannot become an accidental catch-all that swallows every
 * unmatched URL in the app.
 *
 * 404 UNTIL WRITTEN, on purpose. `getPublishedPage` returns null for an
 * unpublished or empty page, and the footer only links to what is published.
 * A blank legal page is worse than a missing one: it reads as though the
 * policy says nothing, and it is exactly the kind of hollow claim this product
 * exists not to make.
 *
 * Public: no session needed, and `middleware.ts` never sees these paths.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ legalSlug: string }>
}): Promise<Metadata> {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) return {}
  const page = await getPublishedPage(legalSlug)
  return page ? { title: page.title } : {}
}

/**
 * Plain text in, readable page out.
 *
 * The editor is a textarea, because a legal page written once a year does not
 * justify a rich text editor and every one of those brings its own escaping
 * bugs. Two conventions carry all the structure these pages need: a blank line
 * starts a paragraph, and a line ending in a colon is a heading.
 */
function renderBody(body: string) {
  return body
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) => {
      const isHeading = block.length < 80 && block.endsWith(':') && !block.includes('\n')
      if (isHeading) {
        return (
          <h2
            key={i}
            className="mt-7 font-bp-display text-[17px] font-semibold text-graphite first:mt-0"
          >
            {block.replace(/:$/, '')}
          </h2>
        )
      }
      return (
        <p key={i} className="text-[15px] leading-relaxed text-graphite-soft">
          {block}
        </p>
      )
    })
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ legalSlug: string }>
}) {
  const { legalSlug } = await params
  if (!isLegalSlug(legalSlug)) notFound()

  const page = await getPublishedPage(legalSlug)
  if (!page) notFound()

  const updated = new Date(page.updatedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-dvh bg-paper font-redesign-sans">
      <header className="border-b border-edge bg-white">
        <div className="mx-auto flex h-14 max-w-[760px] items-center px-5 sm:px-6">
          <Link
            href="/"
            aria-label="GCC MENTOR — home"
            className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-bp px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
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
        </div>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-9 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-bp-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-graphite sm:text-[30px]">
            {page.title}
          </h1>
          <p className="text-[13px] text-slate">Last updated {updated}</p>
        </div>
        <div className="h-px w-full bg-edge" />
        <article className="flex flex-col gap-4">{renderBody(page.body)}</article>

        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-edge pt-5">
          {LEGAL_SLUGS.filter((s) => s !== legalSlug).map((s) => (
            <Link
              key={s}
              href={`/${s}`}
              className="text-[13px] font-medium text-signal-ink underline-offset-2 hover:underline"
            >
              {s === 'privacy' ? 'Privacy' : s === 'terms' ? 'Terms' : 'Refunds'}
            </Link>
          ))}
          <Link
            href="/"
            className="text-[13px] font-medium text-signal-ink underline-offset-2 hover:underline"
          >
            Home
          </Link>
        </nav>
      </main>
    </div>
  )
}
