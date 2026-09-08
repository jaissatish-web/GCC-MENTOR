import { requireAdmin } from '@/lib/admin/adminAuth'
import { loadEntitlements } from '@/lib/entitlements'
import { availableTemplates } from '@/lib/templates'
import { updateEntitlementAction } from '../actions'
import { PageShell } from '@/components/layout/PageShell'

/**
 * Free plan — the one screen that decides what a free user gets (TASK-163).
 *
 * Built BEFORE the free-tier screens at the founder's explicit choice, so the
 * rules never get scattered across a dozen gates and every later change is his to
 * make without a deploy.
 *
 * Each row is a feature. `requires_ai` is surfaced as a plain warning rather than
 * hidden, because switching one of those on is a decision about the OpenRouter
 * bill, not a display preference — the founder should see that before he clicks,
 * not afterwards.
 *
 * requireAdmin() is called here AND inside the server action. The action is the one
 * that matters: a page check alone would be a suggestion, since anyone can POST to
 * a server action directly.
 */
export const dynamic = 'force-dynamic'

export default async function AdminPlanPage() {
  await requireAdmin()
  const rows = await loadEntitlements()
  const templates = availableTemplates()

  return (
    <PageShell title="Free plan">
      <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed text-graphite-soft">
        What a user gets without paying. Changes take effect immediately — no deploy.
        Rows marked <strong className="text-terra">costs money</strong> spend real tokens on every
        use, so switching one on for free users will show up on your AI bill.
      </p>

      {/* NOT YET ENFORCED, and said so on the screen (TASK-163).
          The table, the reader and this editor are real and the values persist, but
          no user-facing gate calls freeAllows()/freeTemplateIds() yet. Saying that
          here is the whole difference between this and /admin/prompts, which looked
          like a working control while editing a row nothing read. This banner comes
          out in the same commit that wires the first gate. */}
      <p className="mt-5 rounded-bp border border-signal/50 bg-paper px-4 py-3 text-[13px] leading-relaxed text-graphite-soft">
        <strong className="text-signal-ink">Not live yet.</strong> Your choices here are saved and
        will be honoured as soon as the free-tier screens are wired to them. Until then the product
        behaves as it does today: everything needs payment except the readiness score and a typed
        profile. This notice disappears when enforcement lands.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-bp border border-terra/30 bg-terra-tint px-4 py-3 text-[13px] text-terra">
          Could not read the plan table. Free users are currently limited to the costless features
          only, which is the safe fallback.
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-3">
        {rows.map((row) => {
          const isTemplates = row.feature === 'templates'
          const chosen = Array.isArray(row.free_value) ? (row.free_value as string[]) : []
          return (
            <form
              key={row.feature}
              action={updateEntitlementAction}
              className="rounded-bp-lg border border-edge bg-white p-4"
            >
              <input type="hidden" name="feature" value={row.feature} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-semibold text-graphite">{row.label}</span>
                    {row.requires_ai ? (
                      <span className="rounded-[4px] bg-terra-tint px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-terra">
                        Costs money
                      </span>
                    ) : (
                      <span className="rounded-[4px] bg-signal-tint px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-signal-ink">
                        Free to run
                      </span>
                    )}
                  </div>
                  {row.description ? (
                    <p className="mt-1 text-[13px] leading-relaxed text-slate">{row.description}</p>
                  ) : null}
                </div>

                <label className="flex shrink-0 items-center gap-2 text-[13px] text-graphite-soft">
                  <input
                    type="checkbox"
                    name="freeAllowed"
                    defaultChecked={row.free_allowed}
                    className="size-4 accent-signal"
                  />
                  Included for free
                </label>
              </div>

              <div className="mt-3 flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-1 text-[12px] text-slate">
                  <span>Free limit (blank = no limit)</span>
                  <input
                    type="number"
                    name="freeLimit"
                    min={0}
                    max={100000}
                    defaultValue={row.free_limit ?? ''}
                    className="min-h-9 w-[170px] rounded-bp border border-edge bg-white px-2.5 text-[13px] text-graphite"
                  />
                </label>

                {isTemplates ? (
                  <fieldset className="min-w-0 flex-1 border-0 p-0">
                    <legend className="mb-1 text-[12px] text-slate">
                      Templates a free user may pick
                    </legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {templates.map((t) => (
                        <label
                          key={t.id}
                          className="flex items-center gap-1.5 text-[13px] text-graphite-soft"
                        >
                          <input
                            type="checkbox"
                            name="freeTemplates"
                            value={t.id}
                            defaultChecked={chosen.includes(t.id)}
                            className="size-3.5 accent-signal"
                          />
                          {t.name}
                          {t.allowsPhoto ? (
                            <span className="text-[12px] text-slate">(photo)</span>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    <p className="mt-1.5 text-[12px] text-slate">
                      Pick photo-free designs to keep photos as a paid feature — no extra rule needed.
                    </p>
                  </fieldset>
                ) : null}

                <button
                  type="submit"
                  className="ml-auto min-h-9 shrink-0 rounded-bp bg-signal px-4 text-[13px] font-semibold text-white"
                >
                  Save
                </button>
              </div>
            </form>
          )
        })}
      </div>
    </PageShell>
  )
}
