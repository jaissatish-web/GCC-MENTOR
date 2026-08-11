import { requireAdmin } from '@/lib/admin/adminAuth'
import { getProviderConfig, listProviderConfigs } from '@/lib/ai/providerConfig'
import {
  updateProviderConfigAction,
  deleteProviderConfigAction,
} from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

/** Never render a full secret into the page HTML — a short masked hint only. */
function maskSecret(secret: string): string {
  if (secret.length <= 8) return '••••••••'
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

/**
 * Admin · AI provider config (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Controls which AI service and model each feature
 * uses, plus per-call-site overrides. Same form, same actions, same behavior
 * as before — this is a navigation restructure only.
 */
export default async function AiProviderPage({
  searchParams,
}: {
  searchParams: { providerSaved?: string; providerError?: string }
}) {
  const admin = await requireAdmin()
  const { providerSaved, providerError } = searchParams

  const providerConfig = await getProviderConfig()
  const allProviderConfigs = await listProviderConfigs()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">AI provider</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          AI provider
        </h2>
        <p className="text-[12px] text-ink-muted">
          Controls which AI service and model each feature uses —
          change it here any time, no redeploy needed. Leave the API key blank to keep the
          key already saved for that key; only fill it in to change it.
        </p>

        {providerSaved ? (
          <div className="rounded-xl border border-state-emerald-line bg-state-emerald-bg px-3.5 py-2.5 text-[12px] text-emerald">
            Saved.
          </div>
        ) : null}
        {providerError ? (
          <div className="rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-2.5 text-[12px] text-state-terra-text">
            {providerError}
          </div>
        ) : null}

        {/* Config rows list */}
        {allProviderConfigs.length === 0 ? (
          <p className="text-[12px] text-state-terra-text">
            Not configured yet — no AI calls will work until at least a default is saved.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {allProviderConfigs.map((cfg) => (
              <div
                key={cfg.key}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                  cfg.key === 'default' ? 'border-gold/50 bg-gold/[0.04]' : 'border-line'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-midnight">{cfg.key}</span>
                    {cfg.key === 'default' ? (
                      <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-state-gold-text">
                        Fallback
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-ink-muted">
                    {cfg.provider} · <span className="font-mono">{cfg.model}</span>
                    {cfg.fallbackModel ? (
                      <> (fallback: <span className="font-mono">{cfg.fallbackModel}</span>)</>
                    ) : null}
                    {' '}· key <span className="font-mono">{maskSecret(cfg.apiKey)}</span>
                    {cfg.updatedAt ? <> · last updated {cfg.updatedAt.slice(0, 10)}</> : null}
                  </span>
                  {cfg.key === 'default' ? (
                    <span className="text-[11px] text-ink-faint">
                      Applies to any feature without its own override.
                    </span>
                  ) : null}
                </div>
                {cfg.key !== 'default' ? (
                  <form action={deleteProviderConfigAction}>
                    <input type="hidden" name="key" value={cfg.key} />
                    <button
                      type="submit"
                      className="text-[11px] font-semibold text-state-terra-text underline-offset-2 hover:underline"
                    >
                      Remove override
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <form action={updateProviderConfigAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              name="key"
              label="Key"
              defaultValue="default"
              list="known-config-keys"
              placeholder="e.g. extraction"
              className="w-[140px]"
            />
            <Input
              name="provider"
              label="Provider"
              defaultValue={providerConfig?.provider ?? 'openrouter'}
              required
              className="w-[160px]"
            />
            <Input
              name="model"
              label="Model"
              defaultValue={providerConfig?.model ?? ''}
              placeholder="e.g. anthropic/claude-sonnet-4.5"
              required
              className="flex-1 min-w-[220px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              name="fallbackModel"
              label="Fallback model (optional — v2)"
              defaultValue={providerConfig?.fallbackModel ?? ''}
              placeholder="e.g. openai/gpt-5.2 — leave blank to disable"
              className="flex-1"
            />
            <Input
              name="apiKey"
              type="password"
              label={providerConfig ? 'New API key (leave blank to keep current)' : 'API key (required)'}
              placeholder={providerConfig ? '••••••••' : 'sk-or-...'}
              className="flex-1"
            />
          </div>
          <datalist id="known-config-keys">
            <option value="default" />
            <option value="extraction" />
            <option value="optimization" />
            <option value="ats_scan" />
          </datalist>
          <Button type="submit" variant="primary" className="self-start">
            Save AI provider
          </Button>
        </form>
      </Card>
    </main>
  )
}
