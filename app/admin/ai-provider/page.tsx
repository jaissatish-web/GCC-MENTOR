import { requireAdmin } from '@/lib/admin/adminAuth'
import { listProviderConfigs, type AiProviderConfig } from '@/lib/ai/providerConfig'
import { updateProviderConfigAction, deleteProviderConfigAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { AI_SERVICES, SERVICE_KEYS } from '@/lib/ai/services'

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
 * Derived from the ONE service registry (lib/ai/services.ts), not hand-listed.
 *
 * This array used to be its own copy, and it had already drifted: two live,
 * money-spending calls — job_description and job_match_explanation — were missing
 * from it entirely and appeared only under "Other overrides", where nobody would
 * think to tune them. Reading the registry means a new service shows up here the
 * moment it exists, and a key cannot be mistyped into existence.
 */
const SERVICES_FROM_REGISTRY: ServiceDef[] = SERVICE_KEYS.map((k) => ({
  key: k,
  name: AI_SERVICES[k].label,
  description: AI_SERVICES[k].description,
  status: AI_SERVICES[k].built ? 'live' : 'planned',
}))

// Every provider `lib/ai/provider.ts`'s callProvider() actually knows how to
// call. No "Other" option: there is no free-text field to pair it with, and
// selecting it used to save successfully while silently throwing
// "Unsupported AI provider: other" on the very next real AI call — a
// confirmed dead-end fixed here, not a hypothetical.
const PROVIDERS = ['openrouter', 'openai', 'anthropic', 'google', 'mistral'] as const
const PROVIDER_LABELS: Record<string, string> = {
  openrouter: 'OpenRouter',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  mistral: 'Mistral',
}
const providerLabel = (p: string) => PROVIDER_LABELS[p] ?? p

/**
 * Named per-service AI config cards, each with its own provider/model/key
 * and an optional independent fallback provider/model/key (2026-08-13 —
 * cross-provider fallback, tried only when the primary genuinely fails,
 * lib/ai/provider.ts's callProvider()). Distinct from the older
 * `fallback_model` column, which is a same-provider OpenRouter retry list,
 * untouched here.
 *
 * qa_generation / mock_interview are included even though no route in this
 * codebase passes those configKeys yet — inert until a real feature reads
 * that key (founder decision, 2026-08-11 — see docs/TASKS.md TASK-099).
 */
const SERVICES: ServiceDef[] = SERVICES_FROM_REGISTRY
const KNOWN_KEYS = new Set<string>([...SERVICES.map((s) => s.key), 'default'])

function ProviderSelect({ name, value, required = false }: { name: string; value?: string | null; required?: boolean }) {
  return (
    <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-ink-400">Provider</span>
      <select
        name={name}
        defaultValue={value ?? ''}
        required={required}
        className="min-h-11 w-full rounded-radius-md border border-line-light bg-surface-light px-3 text-sm font-medium text-ink-900 outline-none transition-colors focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/20"
      >
        <option value="">{required ? 'Select provider' : 'No fallback — use primary only'}</option>
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>{providerLabel(p)}</option>
        ))}
      </select>
    </label>
  )
}

function ServiceForm({ config, keyName, submitLabel }: { config: AiProviderConfig | undefined; keyName: string; submitLabel: string }) {
  const isDefault = keyName === 'default'
  return (
    <form action={updateProviderConfigAction} className="flex flex-col gap-4">
      <input type="hidden" name="key" value={keyName} />

      <div className="flex flex-col gap-3 rounded-radius-lg border border-line-light bg-surface-2-light p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Primary</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <ProviderSelect name="provider" value={config?.provider} required={isDefault} />
          <Input name="model" label="Model ID" defaultValue={config?.model ?? ''} placeholder="e.g. anthropic/claude-sonnet-4.5" required={isDefault} className="min-w-[220px] flex-1" />
          <Input
            name="apiKey"
            type="password"
            label="API key"
            placeholder={config ? 'Blank keeps current key' : 'Enter secret key'}
            required={isDefault && !config}
            className="min-w-[220px] flex-1"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-radius-lg border border-dashed border-line-light-strong p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">Fallback (optional, different provider)</span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12px] font-semibold text-ink-700">
            <input type="checkbox" name="fallbackEnabled" value="on" defaultChecked={Boolean(config?.fallbackEnabled)} className="size-4 accent-forest" />
            Enable
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <ProviderSelect name="fallbackProvider" value={config?.fallbackProvider} />
          <Input name="fallbackModel" label="Fallback model ID" defaultValue={config?.fallbackModel ?? ''} placeholder="e.g. gpt-5.4" className="min-w-[220px] flex-1" />
          <Input name="fallbackApiKey" type="password" label="Fallback API key" placeholder={config?.fallbackApiKey ? 'Blank keeps current key' : 'Enter fallback key'} className="min-w-[220px] flex-1" />
        </div>
        <p className="text-[11px] text-ink-400">Tried only if the primary call genuinely fails. When disabled, fallback fields are ignored and cleared on save.</p>
        {/* Stated because it is otherwise silent: a partly-filled fallback does
            nothing at all, with no error anywhere. Setting only a model is the
            natural reading of "same provider, cheaper model" and is inert. */}
        <p className="text-[11px] font-semibold text-terra">
          All three are required. A fallback with only a model, or without its own key, is
          ignored at run time — with no error.
        </p>
        <p className="text-[11px] text-ink-400">
          If both the primary and this fallback fail, the <strong>Default AI</strong> configuration
          is tried last. It is skipped when it names the same provider and model that already
          failed.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line-light pt-3">
        <span className="text-[11px] text-ink-400">Leaving provider/model/key blank on an existing override removes it — the service falls back to Default.</span>
        <Button type="submit" variant="primary" className="shrink-0">{submitLabel}</Button>
      </div>
    </form>
  )
}

export default async function AiProviderPage({
  searchParams,
}: {
  searchParams: { providerSaved?: string; providerError?: string }
}) {
  const admin = await requireAdmin()
  const { providerSaved, providerError } = searchParams

  const allProviderConfigs = await listProviderConfigs()
  const byKey = new Map(allProviderConfigs.map((c) => [c.key, c] as const))
  const defaultConfig = byKey.get('default')
  const otherConfigs = allProviderConfigs.filter((c) => !KNOWN_KEYS.has(c.key))

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 font-redesign-sans">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">AI provider</h1>
        <p className="text-sm text-ink-400">Signed in as {admin.email ?? admin.id}</p>
      </div>

      {providerSaved ? (
        <div className="rounded-radius-lg border border-forest/50 bg-forest-tint px-3.5 py-2.5 text-[12px] text-forest">Saved.</div>
      ) : null}
      {providerError ? (
        <div className="rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-2.5 text-[12px] text-terra">{providerError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card tone="light" className="p-4">
          <p className="text-[11px] text-ink-400">AI services</p>
          <p className="mt-1 text-xl font-bold text-ink-900">{SERVICES.length}</p>
        </Card>
        <Card tone="light" className="p-4">
          <p className="text-[11px] text-ink-400">Configured</p>
          <p className="mt-1 text-xl font-bold text-forest">{SERVICES.filter((s) => byKey.has(s.key)).length}</p>
        </Card>
        <Card tone="light" className="p-4">
          <p className="text-[11px] text-ink-400">Default AI</p>
          <p className="mt-1 text-sm font-bold text-ink-900">{defaultConfig ? 'Configured' : 'Not configured'}</p>
        </Card>
      </div>

      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">Services</h2>
        <p className="mt-1 text-[12px] text-ink-400">
          Each service can run on its own provider, model and API key, with an optional fallback on a
          different provider. Leave a service unconfigured and it falls back to Default.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SERVICES.map((service) => {
          const config = byKey.get(service.key)
          return (
            <Card key={service.key} tone="light" className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-ink-900">{service.name}</h3>
                  <span
                    className={
                      service.status === 'live'
                        ? 'rounded-full bg-forest-tint px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest'
                        : 'rounded-full border border-line-light-strong px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-400'
                    }
                  >
                    {service.status === 'live' ? 'Live' : 'Planned — not live yet'}
                  </span>
                </div>
                {config ? (
                  <span className="text-[11px] text-ink-400">
                    {providerLabel(config.provider)} · <span className="font-mono">{config.model}</span> · key{' '}
                    <span className="font-mono">{maskSecret(config.apiKey)}</span>
                    {config.fallbackEnabled ? (
                      <> · fallback {providerLabel(config.fallbackProvider!)} · <span className="font-mono">{config.fallbackModel}</span></>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-[11px] text-terra">Not configured — falls back to Default</span>
                )}
              </div>
              <p className="text-[12px] text-ink-400">{service.description}</p>
              <ServiceForm config={config} keyName={service.key} submitLabel={`Save ${service.name}`} />
            </Card>
          )
        })}
      </div>

      <Card tone="light" className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">Default</h2>
          <p className="mt-1 text-[12px] text-ink-400">
            Used by any service above with nothing saved, and by internal steps like job-description parsing.
          </p>
        </div>
        <ServiceForm config={defaultConfig} keyName="default" submitLabel="Save Default AI" />
      </Card>

      <Card tone="light" className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">Other overrides</h2>
          <p className="mt-1 text-[12px] text-ink-400">
            Advanced — internal AI sub-steps (e.g. job-description parsing) that aren&apos;t one of the named
            services above.
          </p>
        </div>

        {otherConfigs.length === 0 ? (
          <p className="text-[12px] text-ink-400">No other overrides configured.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {otherConfigs.map((cfg) => (
              <div key={cfg.key} className="flex flex-wrap items-center justify-between gap-2 rounded-radius-md border border-line-light p-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-semibold text-ink-900">{cfg.key}</span>
                  <span className="text-[12px] text-ink-400">
                    {providerLabel(cfg.provider)} · <span className="font-mono">{cfg.model}</span> · key{' '}
                    <span className="font-mono">{maskSecret(cfg.apiKey)}</span>
                  </span>
                </div>
                <form action={deleteProviderConfigAction}>
                  <input type="hidden" name="key" value={cfg.key} />
                  <button type="submit" className="text-[11px] font-semibold text-terra underline-offset-2 hover:underline">
                    Remove override
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form action={updateProviderConfigAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input name="key" label="Key" placeholder="e.g. job_description" list="known-config-keys" required className="w-[180px]" />
            <ProviderSelect name="provider" required />
            <Input name="model" label="Model ID" placeholder="e.g. anthropic/claude-sonnet-4.5" required className="flex-1 min-w-[200px]" />
          </div>
          <Input name="apiKey" type="password" label="API key" placeholder="Enter secret key" required className="max-w-[320px]" />
          <datalist id="known-config-keys">
            <option value="job_description" />
            <option value="job_match_explanation" />
          </datalist>
          <Button type="submit" variant="primary" className="self-start">Add override</Button>
        </form>
      </Card>
    </main>
  )
}
