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

interface ServiceDef {
  key: string
  name: string
  description: string
  /** 'planned' = no AI call in this codebase uses this key yet. */
  status: 'live' | 'planned'
}

/**
 * Named per-service AI config cards — founder request 2026-08-11: "separate
 * API key ... provider, model, and service name ... for each service."
 *
 * Zero backend change required: `ai_provider_config` (migration 019) was
 * already a free-text-key table (TASK-062), and lib/ai/provider.ts's
 * generate({ configKey }) already resolves per-key with fallback to
 * 'default'. This is a UI layer on top of existing plumbing — one named
 * card per service instead of one generic key/provider/model form.
 *
 * qa_generation / mock_interview are included even though no route in this
 * codebase passes those configKeys yet — docs/redesign/PLANNED_SERVICES.md
 * still bans building the features themselves. Founder explicitly chose to
 * override that and pre-configure the AI settings anyway (2026-08-11); the
 * rows are inert until a real feature reads that key. See docs/TASKS.md for
 * the full decision record (ad hoc ticket, this session).
 */
const SERVICES: ServiceDef[] = [
  {
    key: 'extraction',
    name: 'Resume Parsing',
    description:
      'Reads an uploaded or pasted resume, understands its content, and saves it as structured profile data for the user to review and edit.',
    status: 'live',
  },
  {
    key: 'optimization',
    name: 'Resume Optimization',
    description: 'Rewrites the resume against a specific job/target, using only facts already in the profile.',
    status: 'live',
  },
  {
    key: 'ats_scan',
    name: 'ATS Scanner',
    description: 'Scores a resume for ATS/Gulf readiness and produces the Job Match breakdown.',
    status: 'live',
  },
  {
    key: 'cover_letter',
    name: 'Cover Letter Generation',
    description: 'Generates a tailored cover letter for a paid package.',
    status: 'live',
  },
  {
    key: 'qa_generation',
    name: 'Q&A Generation',
    description: 'Interview Q&A prep content — planned feature, not built yet. This key is not called anywhere yet.',
    status: 'planned',
  },
  {
    key: 'mock_interview',
    name: 'Mock Interview',
    description: 'AI-driven mock interview review — planned feature, not built yet. This key is not called anywhere yet.',
    status: 'planned',
  },
]

const KNOWN_KEYS = new Set<string>([...SERVICES.map((s) => s.key), 'default'])

/**
 * Admin · AI provider config. TASK-075-split page, restructured 2026-08-11
 * (ad hoc, founder request) from one generic key/provider/model form into a
 * named card per service, plus a Default fallback card and an Other
 * overrides card for internal sub-steps (job_description,
 * job_match_explanation) that aren't one of the founder-named services.
 * Same actions, same table, same fallback-to-'default' resolution as
 * before — this only changes how the form is presented.
 */
export default async function AiProviderPage({
  searchParams,
}: {
  searchParams: { providerSaved?: string; providerError?: string }
}) {
  const admin = await requireAdmin()
  const { providerSaved, providerError } = searchParams

  const defaultConfig = await getProviderConfig()
  const allProviderConfigs = await listProviderConfigs()
  const byKey = new Map(allProviderConfigs.map((c) => [c.key, c] as const))
  const otherConfigs = allProviderConfigs.filter((c) => !KNOWN_KEYS.has(c.key))

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">AI provider</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

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

      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">Services</h2>
        <p className="mt-1 text-[12px] text-ink-muted">
          Each service below runs on its own provider, model, and API key. Leave a service
          unconfigured and it falls back to Default. Leave the API key field blank on save to
          keep the key already saved for that service.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SERVICES.map((service) => {
          const config = byKey.get(service.key)
          return (
            <Card key={service.key} className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-midnight">{service.name}</h3>
                {service.status === 'planned' ? (
                  <span className="rounded-full border border-line-strong px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
                    Planned — not live yet
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-ink-muted">{service.description}</p>

              {config ? (
                <div className="rounded-xl border border-line p-3 text-[12px] text-ink-muted">
                  {config.provider} · <span className="font-mono">{config.model}</span>
                  {config.fallbackModel ? (
                    <>
                      {' '}
                      (fallback: <span className="font-mono">{config.fallbackModel}</span>)
                    </>
                  ) : null}{' '}
                  · key <span className="font-mono">{maskSecret(config.apiKey)}</span>
                  {config.updatedAt ? <> · last updated {config.updatedAt.slice(0, 10)}</> : null}
                </div>
              ) : (
                <p className="text-[12px] text-state-terra-text">
                  Not configured — falls back to Default below until set here.
                </p>
              )}

              <form action={updateProviderConfigAction} className="flex flex-col gap-2">
                <input type="hidden" name="key" value={service.key} />
                <div className="flex flex-wrap gap-2">
                  <Input
                    name="provider"
                    label="Provider"
                    defaultValue={config?.provider ?? 'openrouter'}
                    required
                    className="w-[140px]"
                  />
                  <Input
                    name="model"
                    label="Model"
                    defaultValue={config?.model ?? ''}
                    placeholder="e.g. anthropic/claude-sonnet-4.5"
                    required
                    className="flex-1 min-w-[220px]"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    name="fallbackModel"
                    label="Fallback model (optional — same provider/key, retried on failure)"
                    defaultValue={config?.fallbackModel ?? ''}
                    placeholder="e.g. openai/gpt-5.2 — leave blank to disable"
                    className="flex-1"
                  />
                  <Input
                    name="apiKey"
                    type="password"
                    label={config ? 'New API key (leave blank to keep current)' : 'API key (required)'}
                    placeholder={config ? '••••••••' : 'sk-or-...'}
                    className="flex-1"
                  />
                </div>
                <Button type="submit" variant="primary" className="self-start">
                  Save {service.name}
                </Button>
              </form>
            </Card>
          )
        })}
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">Default</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Used by any AI call — a service above with nothing saved, or an internal step like
            job-description parsing — that has no key of its own.
          </p>
        </div>

        {defaultConfig ? (
          <div className="rounded-xl border border-gold/50 bg-gold/[0.04] p-3 text-[12px] text-ink-muted">
            {defaultConfig.provider} · <span className="font-mono">{defaultConfig.model}</span>
            {defaultConfig.fallbackModel ? (
              <>
                {' '}
                (fallback: <span className="font-mono">{defaultConfig.fallbackModel}</span>)
              </>
            ) : null}{' '}
            · key <span className="font-mono">{maskSecret(defaultConfig.apiKey)}</span>
            {defaultConfig.updatedAt ? <> · last updated {defaultConfig.updatedAt.slice(0, 10)}</> : null}
          </div>
        ) : (
          <p className="text-[12px] text-state-terra-text">
            Not configured yet — any service above without its own key/model won&apos;t work until
            this is set.
          </p>
        )}

        <form action={updateProviderConfigAction} className="flex flex-col gap-3">
          <input type="hidden" name="key" value="default" />
          <div className="flex flex-wrap gap-2">
            <Input
              name="provider"
              label="Provider"
              defaultValue={defaultConfig?.provider ?? 'openrouter'}
              required
              className="w-[160px]"
            />
            <Input
              name="model"
              label="Model"
              defaultValue={defaultConfig?.model ?? ''}
              placeholder="e.g. anthropic/claude-sonnet-4.5"
              required
              className="flex-1 min-w-[220px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              name="fallbackModel"
              label="Fallback model (optional)"
              defaultValue={defaultConfig?.fallbackModel ?? ''}
              placeholder="e.g. openai/gpt-5.2 — leave blank to disable"
              className="flex-1"
            />
            <Input
              name="apiKey"
              type="password"
              label={defaultConfig ? 'New API key (leave blank to keep current)' : 'API key (required)'}
              placeholder={defaultConfig ? '••••••••' : 'sk-or-...'}
              className="flex-1"
            />
          </div>
          <Button type="submit" variant="primary" className="self-start">
            Save Default
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">Other overrides</h2>
          <p className="mt-1 text-[12px] text-ink-muted">
            Advanced — internal AI sub-steps (e.g. job-description parsing) that aren&apos;t one of
            the named services above, plus anything added by key directly.
          </p>
        </div>

        {otherConfigs.length === 0 ? (
          <p className="text-[12px] text-ink-faint">No other overrides configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {otherConfigs.map((cfg) => (
              <div
                key={cfg.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-semibold text-midnight">{cfg.key}</span>
                  <span className="text-[12px] text-ink-muted">
                    {cfg.provider} · <span className="font-mono">{cfg.model}</span>
                    {cfg.fallbackModel ? (
                      <>
                        {' '}
                        (fallback: <span className="font-mono">{cfg.fallbackModel}</span>)
                      </>
                    ) : null}{' '}
                    · key <span className="font-mono">{maskSecret(cfg.apiKey)}</span>
                    {cfg.updatedAt ? <> · last updated {cfg.updatedAt.slice(0, 10)}</> : null}
                  </span>
                </div>
                <form action={deleteProviderConfigAction}>
                  <input type="hidden" name="key" value={cfg.key} />
                  <button
                    type="submit"
                    className="text-[11px] font-semibold text-state-terra-text underline-offset-2 hover:underline"
                  >
                    Remove override
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={updateProviderConfigAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              name="key"
              label="Key"
              placeholder="e.g. job_description"
              list="known-config-keys"
              required
              className="w-[160px]"
            />
            <Input name="provider" label="Provider" defaultValue="openrouter" required className="w-[160px]" />
            <Input
              name="model"
              label="Model"
              placeholder="e.g. anthropic/claude-sonnet-4.5"
              required
              className="flex-1 min-w-[220px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              name="fallbackModel"
              label="Fallback model (optional)"
              placeholder="e.g. openai/gpt-5.2 — leave blank to disable"
              className="flex-1"
            />
            <Input name="apiKey" type="password" label="API key (required)" placeholder="sk-or-..." className="flex-1" />
          </div>
          <datalist id="known-config-keys">
            <option value="job_description" />
            <option value="job_match_explanation" />
          </datalist>
          <Button type="submit" variant="primary" className="self-start">
            Add override
          </Button>
        </form>
      </Card>
    </main>
  )
}
