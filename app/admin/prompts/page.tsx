import { requireAdmin } from '@/lib/admin/adminAuth'
import { getAllPromptTemplates } from '@/lib/ai/promptTemplates'
import { updatePromptTemplateAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'

/**
 * Admin · Prompt templates (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Edit the introductory tone/voice for specific AI
 * prompts without a redeploy. Same form, same action, same behavior as
 * before — this is a navigation restructure only.
 */
export default async function PromptsPage({
  searchParams,
}: {
  searchParams: { promptSaved?: string; promptError?: string }
}) {
  const admin = await requireAdmin()
  const { promptSaved, promptError } = searchParams

  const promptTemplates = await getAllPromptTemplates()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">Prompt templates</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          Prompt templates
        </h2>
        <p className="text-[12px] text-ink-muted">
          Edit the introductory tone/voice for specific AI prompts without a
          redeploy. The grounding constraint and output schema below each
          template are hard-coded and never editable from here.
        </p>

        {promptSaved ? (
          <div className="rounded-xl border border-state-emerald-line bg-state-emerald-bg px-3.5 py-2.5 text-[12px] text-emerald">
            Saved.
          </div>
        ) : null}
        {promptError ? (
          <div className="rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-2.5 text-[12px] text-state-terra-text">
            {promptError}
          </div>
        ) : null}

        {promptTemplates.length === 0 ? (
          <p className="text-[12px] text-ink-faint">No prompt templates found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {promptTemplates.map((tmpl) => (
              <form
                key={tmpl.key}
                action={updatePromptTemplateAction}
                className="flex flex-col gap-3 rounded-xl border border-line p-3"
              >
                <input type="hidden" name="key" value={tmpl.key} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-semibold text-midnight">
                      {tmpl.key}
                    </span>
                    {tmpl.description ? (
                      <span className="text-[12px] text-ink-muted">{tmpl.description}</span>
                    ) : null}
                  </div>
                  {tmpl.updatedAt ? (
                    <span className="text-[11px] text-ink-faint">
                      Last updated {tmpl.updatedAt.slice(0, 10)}
                    </span>
                  ) : null}
                </div>
                <Textarea
                  name="content"
                  label="Content"
                  defaultValue={tmpl.content}
                  rows={5}
                  className="w-full"
                />
                <Button type="submit" variant="primary" className="self-start">
                  Save
                </Button>
              </form>
            ))}
          </div>
        )}
      </Card>
    </main>
  )
}
