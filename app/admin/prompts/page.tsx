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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 font-redesign-sans">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">Prompt templates</h1>
        <p className="text-sm text-ink-400">Signed in as {admin.email ?? admin.id}</p>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
          Prompt templates
        </h2>
        <p className="text-[12px] text-ink-400">
          Edit the introductory tone/voice for specific AI prompts without a
          redeploy. The grounding constraint and output schema below each
          template are hard-coded and never editable from here.
        </p>

        {promptSaved ? (
          <div className="rounded-radius-lg border border-forest/50 bg-forest-tint px-3.5 py-2.5 text-[12px] text-forest">
            Saved.
          </div>
        ) : null}
        {promptError ? (
          <div className="rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-2.5 text-[12px] text-terra">
            {promptError}
          </div>
        ) : null}

        {promptTemplates.length === 0 ? (
          <p className="text-[12px] text-ink-400">No prompt templates found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {promptTemplates.map((tmpl) => (
              <form
                key={tmpl.key}
                action={updatePromptTemplateAction}
                className="flex flex-col gap-3 rounded-radius-lg border border-line-light p-3"
              >
                <input type="hidden" name="key" value={tmpl.key} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm font-semibold text-ink-900">
                      {tmpl.key}
                    </span>
                    {tmpl.description ? (
                      <span className="text-[12px] text-ink-400">{tmpl.description}</span>
                    ) : null}
                  </div>
                  {tmpl.updatedAt ? (
                    <span className="text-[11px] text-ink-400">
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
