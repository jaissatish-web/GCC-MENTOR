import { AppFooter } from '@/components/layout/AppFooter'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublishedPage, isLegalSlug } from '@/lib/admin/siteContent'

export const dynamic = 'force-dynamic'

/** All legal pages use the existing founder-editable site_content publication gate. */
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
            className="mt-7 font-display text-[17px] font-semibold text-ink first:mt-0"
          >
            {block.replace(/:$/, '')}
          </h2>
        )
      }
      return (
        <p key={i} className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-soft">
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
    timeZone: 'UTC',
  })

  return (
    <div className="min-h-dvh bg-canvas font-redesign-sans">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-[760px] items-center px-3 sm:px-6">
          <Link
            href="/"
            aria-label="GCC MENTOR — home"
            className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-ctl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
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
        </div>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-3 py-9 sm:px-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-ink sm:text-[30px]">
            {page.title}
          </h1>
          <p className="text-[13px] text-ink-muted type-helper">Last updated: {updated}</p>
        </div>
        <div className="h-px w-full bg-line" />
        <article className="flex flex-col gap-4">{renderBody(page.body)}</article>
      </main>
      <AppFooter variant="compact" />
    </div>
  )
}
