import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPromptSummaries, listVersions, isPromptKey, type PromptKey } from '@/lib/ai/prompts'
import { savePromptDraftAction, publishPromptAction, revertPromptAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import Link from 'next/link'
import { PageShell } from '@/components/layout/PageShell'

/**
 * Admin · Prompts — draft, publish, roll back.
 *
 * Founder decision 2026-08-17: prompts are his to edit and optimise, with
 * versions, because prompt quality is product quality here. Draft-then-publish
 * was chosen over edit-goes-live, so a change can be written before anyone
 * receives it.
 *
 * WHAT THIS REPLACED. A single textarea per key, saved in place, with no version
 * and no rollback — and entirely inert: no AI call read a stored template at all.
 * The old table is untouched but superseded.
 *
 * THE FLOOR IS SHOWN, NOT JUST ENFORCED. The screen states which parts of a
 * prompt this box controls and which it cannot touch. The grounding block and the
 * output schema are injected in code and are not editable from anywhere — a bad
 * edit to the first would silently turn off the product's one promise, and a bad
 * edit to the second would break every call. Saying so on the screen is part of
 * making the control safe to hand over.
 */

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: { prompt?: string; promptSaved?: string; promptError?: string }
}) {
  const admin = await requireAdmin()
  const { promptSaved, promptError } = searchParams

  const summaries = await listPromptSummaries()
  const selectedKey: PromptKey | null = isPromptKey(searchParams.prompt) ? searchParams.prompt : null
  const versions = selectedKey ? await listVersions(selectedKey) : []
  const selected = selectedKey ? summaries.find((s) => s.key === selectedKey) ?? null : null
  const activeBody = selected?.active?.body ?? ''

  return (
    <PageShell
      title="Prompts"
      subtitle={`Signed in as ${admin.email ?? admin.id}`}
    >

      {promptSaved ? (
        <div className="rounded-bp-lg border border-signal/50 bg-signal-tint px-3.5 py-2.5 text-[12px] text-signal-ink">
          Saved — {promptSaved.replace(/\+/g, ' ')}.
        </div>
      ) : null}
      {promptError ? (
        <div className="rounded-bp-lg border border-terra/30 bg-terra-tint px-3.5 py-2.5 text-[12px] text-terra">
          {promptError.replace(/\+/g, ' ')}
        </div>
      ) : null}

      {/* What this screen can and cannot change. Stated, not just enforced. */}
      <Card className="flex flex-col gap-2 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate">What you control here</h2>
        <p className="text-[12px] text-graphite-soft">
          <strong>You can change:</strong> the persona, the tone, the task instructions, what to
          emphasise, and any examples. This is where output quality lives.
        </p>
        <p className="text-[12px] text-graphite-soft">
          <strong>You cannot change, from here or anywhere:</strong> the grounding rule and the
          output format. The grounding rule is what stops the AI inventing facts a user never
          gave us — editing it would switch off the product&rsquo;s one promise with nothing to
          catch it. The output format is what the code reads the answer back through.
        </p>
        <p className="text-[12px] text-slate">
          A prompt with no published version runs on the text built into the code. Publishing
          replaces it for everyone immediately; rolling back is one click on any earlier version.
        </p>
      </Card>

      {/* Index */}
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate">Services</h2>
        <div className="flex flex-col divide-y divide-edge">
          {summaries.map((s) => (
            <Link
              key={s.key}
              href={`/admin/prompts?prompt=${s.key}`}
              className={
                'flex items-center justify-between gap-3 py-2.5 text-[13px] ' +
                (selectedKey === s.key ? 'text-graphite' : 'text-graphite-soft hover:text-graphite')
              }
            >
              <span className="flex flex-col">
                <span className="font-semibold">
                  {s.label}
                  {!s.built ? (
                    <span className="ml-2 rounded-full border border-edge px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider text-slate">
                      not built yet
                    </span>
                  ) : null}
                </span>
                <span className="font-mono text-[12px] text-slate">{s.key}</span>
              </span>
              <span className="shrink-0 text-[12px] text-slate">
                {s.active ? (
                  <span className="font-mono font-bold text-signal">v{s.active.version} live</span>
                ) : (
                  <span>built-in prompt</span>
                )}
                {s.versionCount > 0 ? <span className="ml-2">· {s.versionCount} version{s.versionCount === 1 ? '' : 's'}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      {selected ? (
        <>
          {/* Editor — always writes a NEW draft, never overwrites what is live. */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate">
              {selected.label} — new draft
            </h2>
            <p className="text-[12px] text-slate">{selected.active ? `Pre-filled with v${selected.active.version}, the version that is live now. Saving creates a new draft; nothing changes for users until you publish it.` : 'This prompt has no stored version yet, so it is running on the text built into the code. Saving creates your first draft.'}</p>
            <form action={savePromptDraftAction} className="flex flex-col gap-3">
              <input type="hidden" name="promptKey" value={selected.key} />
              <Textarea name="body" rows={14} defaultValue={activeBody} className="font-mono text-[13px]" />
              <input
                name="notes"
                placeholder="What did you change, and why? (shown in the version list)"
                className="min-h-11 w-full rounded-bp border border-edge px-3 text-[13px] text-graphite outline-none focus:border-signal focus:ring-2 focus:ring-signal/25"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" variant="primary">Save as draft</Button>
                {selected.active ? (
                  <span className="text-[12px] text-slate">v{selected.active.version} stays live until you publish something else.</span>
                ) : null}
              </div>
            </form>
          </Card>

          {/* History — publish and rollback are the same action. */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate">Versions</h2>
            {versions.length === 0 ? (
              <p className="text-[12px] text-slate">No versions yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-edge">
                {versions.map((v) => (
                  <div key={v.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                    <div className="flex min-w-[200px] flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-graphite">
                        <span className="font-mono">v{v.version}</span>
                        <span
                          className={
                            'ml-2 rounded-full px-2 py-0.5 text-[12px] font-bold uppercase tracking-wider ' +
                            (v.status === 'active'
                              ? 'bg-signal-tint text-signal-ink'
                              : v.status === 'draft'
                                ? 'bg-gold-tint text-signal-ink'
                                : 'border border-edge text-slate')
                          }
                        >
                          {v.status === 'active' ? 'live' : v.status}
                        </span>
                      </span>
                      {v.notes ? <span className="text-[12px] text-graphite-soft">{v.notes}</span> : null}
                      <span className="font-mono text-[12px] text-slate">{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                    {v.status !== 'active' ? (
                      <form action={publishPromptAction}>
                        <input type="hidden" name="versionId" value={v.id} />
                        <input type="hidden" name="promptKey" value={selected.key} />
                        <Button type="submit" variant="secondary" size="sm">
                          {v.status === 'draft' ? 'Publish' : 'Roll back to this'}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {selected.active ? (
              <form action={revertPromptAction} className="mt-1 flex items-center gap-3 border-t border-edge pt-3">
                <input type="hidden" name="promptKey" value={selected.key} />
                <Button type="submit" variant="ghost" size="sm">Use the built-in prompt instead</Button>
                <span className="text-[12px] text-slate">Stops using any stored version. Nothing is deleted.</span>
              </form>
            ) : null}
          </Card>
        </>
      ) : null}
    </PageShell>
  )
}
