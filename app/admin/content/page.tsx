import { requireAdmin } from '@/lib/admin/adminAuth'
import { PageShell } from '@/components/layout/PageShell'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { listSiteContent } from '@/lib/admin/siteContent'
import { saveSiteContentAction } from '../actions'

export const dynamic = 'force-dynamic'

/**
 * Site content — where the founder writes the footer and the legal pages.
 *
 * WHY THIS SCREEN EXISTS. There are no privacy, terms or refund pages in this
 * product, while it collects passport type and expiry, visa status and full work
 * histories. That is a trust problem in a market `01_PRODUCT.md` §3 describes
 * as actively targeted by scams, and a DPDP / GDPR question besides — and it
 * was blocked on a developer, which is the wrong shape for text. Prices and
 * prompts are already edited here rather than in code (`03_ARCHITECTURE.md` §6);
 * legal copy belongs in exactly the same place.
 *
 * PUBLISH IS A SEPARATE ACT from saving, deliberately. A half-written privacy
 * policy that is live is worse than none at all, so a page is invisible and
 * unlinked until it is both written and published — and the save refuses to
 * publish an empty page rather than letting the public route 404 on something
 * the founder believes is up.
 */
export default async function AdminContentPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>
}) {
  await requireAdmin()
  const params = (await searchParams) ?? {}
  const rows = await listSiteContent()

  const legal = rows.filter((r) => r.slug !== 'footer_about')
  const footer = rows.filter((r) => r.slug === 'footer_about')

  return (
    <PageShell
      title="Site content"
      subtitle="The footer and the legal pages. Saved straight to the live site — no deploy."
    >
      {params.error ? <Alert variant="danger">{decodeURIComponent(params.error)}</Alert> : null}
      {params.saved ? <Alert variant="success">Saved.</Alert> : null}

      <Alert variant="warning" title="Nothing here is written for you">
        These pages are empty until you write them. Describe only what the product actually
        does with a user&apos;s data — inventing terms is the one thing this product must
        never do. Have a lawyer read them before you publish.
      </Alert>

      <section className="flex flex-col gap-4">
        <h2 className="font-bp-display text-[17px] font-semibold text-graphite">Legal pages</h2>
        {legal.map((row) => (
          <form
            key={row.slug}
            action={saveSiteContentAction}
            className="flex flex-col gap-3 border border-edge bg-white p-4 sm:p-5"
          >
            <input type="hidden" name="slug" value={row.slug} />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-slate">/{row.slug}</span>
                {row.published && row.body.trim() ? (
                  <span className="rounded-full bg-signal-tint px-2 py-0.5 text-[12px] font-semibold text-signal-ink">
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[12px] font-semibold text-slate">
                    Not live
                  </span>
                )}
              </div>
              <span className="text-[12px] text-slate">
                {row.body.trim() ? `${row.body.trim().split(/\s+/).length} words` : 'empty'}
              </span>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-graphite">Page title</span>
              <input
                name="title"
                defaultValue={row.title}
                className="min-h-11 w-full rounded-bp border border-edge-strong bg-white px-3 py-2 text-[14px] text-graphite outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-graphite">Page text</span>
              <textarea
                name="body"
                defaultValue={row.body}
                rows={12}
                placeholder={`Write the ${row.title.toLowerCase()} here.\n\nA blank line starts a new paragraph.\nA line ending in a colon becomes a heading.`}
                className="w-full rounded-bp border border-edge-strong bg-white px-3 py-2.5 text-[14px] leading-relaxed text-graphite outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
              <span className="text-[12px] text-slate">
                Plain text. Blank line = new paragraph. A line ending in &ldquo;:&rdquo; becomes a heading.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex min-h-11 items-center gap-2.5">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={row.published}
                  className="size-4 accent-signal"
                />
                <span className="text-[13px] text-graphite-soft">
                  Publish — show this page and link it from the footer
                </span>
              </label>
              <Button type="submit" size="sm" busyLabel="Saving…">
                Save
              </Button>
            </div>
          </form>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-bp-display text-[17px] font-semibold text-graphite">Footer</h2>
        {footer.map((row) => (
          <form
            key={row.slug}
            action={saveSiteContentAction}
            className="flex flex-col gap-3 border border-edge bg-white p-4 sm:p-5"
          >
            <input type="hidden" name="slug" value={row.slug} />
            <input type="hidden" name="title" value={row.title} />
            <input type="hidden" name="published" value="on" />
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-graphite">
                The line under the logo
              </span>
              <textarea
                name="body"
                defaultValue={row.body}
                rows={3}
                className="w-full rounded-bp border border-edge-strong bg-white px-3 py-2.5 text-[14px] leading-relaxed text-graphite outline-none focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
              <span className="text-[12px] text-slate">
                Appears in the footer of every signed-in page. Keep it to a sentence or two.
              </span>
            </label>
            <Button type="submit" size="sm" busyLabel="Saving…" className="w-fit">
              Save
            </Button>
          </form>
        ))}
      </section>
    </PageShell>
  )
}
