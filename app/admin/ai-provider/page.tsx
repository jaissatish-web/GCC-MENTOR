import { requireAdmin } from '@/lib/admin/adminAuth'
import { listProviderConfigs } from '@/lib/ai/providerConfig'
import { updateProviderConfigAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const PROVIDERS = ['openrouter', 'openai', 'anthropic', 'google', 'mistral', 'other']
const SERVICES = [
  ['extraction', 'Resume Parsing', 'Extracts structured candidate data.', 'live'],
  ['optimization', 'Resume Optimization', 'Tailors resumes to target jobs.', 'live'],
  ['ats_scan', 'ATS Scanner', 'Scores ATS and GCC readiness.', 'live'],
  ['cover_letter', 'Cover Letter', 'Generates tailored cover letters.', 'live'],
  ['qa_generation', 'Interview Q&A', 'Planned interview preparation.', 'planned'],
  ['mock_interview', 'Mock Interview', 'Planned AI interview review.', 'planned'],
] as const

function Provider({ name, value }: { name: string; value?: string | null }) {
  return <label className="flex min-w-[180px] flex-1 flex-col gap-1"><span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Provider</span><select name={name} defaultValue={value || ''} required className="h-10 rounded-radius-md border border-line-light bg-white px-3 text-sm"><option value="" disabled>Select provider</option>{PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
}

function Form({ config, keyName, label }: { config: any; keyName: string; label: string }) {
  return <form action={updateProviderConfigAction} className="space-y-4"><input type="hidden" name="key" value={keyName}/><div className="rounded-radius-lg bg-ink-50 p-4"><div className="mb-3"><b className="text-xs">Primary AI</b><p className="text-[11px] text-ink-400">Choose the provider, model and API key used normally.</p></div><div className="flex flex-wrap gap-3"><Provider name="provider" value={config?.provider}/><Input name="model" label="Model ID" defaultValue={config?.model || ''} placeholder="e.g. anthropic/claude-sonnet-4.5" required className="min-w-[220px] flex-1"/><Input name="apiKey" type="password" label="API key" placeholder={config ? 'Blank keeps current key' : 'Enter secret'} className="min-w-[220px] flex-1"/></div></div><div className="rounded-radius-lg border border-line-light p-4"><div className="mb-3"><b className="text-xs">Fallback AI</b><p className="text-[11px] text-ink-400">Optional independent provider, model and API key. You can configure this later.</p></div><div className="flex flex-wrap gap-3"><Provider name="fallbackProvider" value={config?.fallbackProvider}/><Input name="fallbackModel" label="Fallback model ID" defaultValue={config?.fallbackModel || ''} placeholder="e.g. gpt-5.4" className="min-w-[220px] flex-1"/><Input name="fallbackApiKey" type="password" label="Fallback API key" placeholder={config?.fallbackApiKey ? 'Blank keeps current key' : 'Optional'} className="min-w-[220px] flex-1"/></div></div><div className="flex items-center justify-between gap-3"><span className="text-[11px] text-ink-400">Secrets stay server-side.</span><Button type="submit" variant="primary">{label}</Button></div></form>
}

export default async function AiProviderPage({ searchParams }: { searchParams: { providerSaved?: string; providerError?: string } }) {
  const admin = await requireAdmin(); const all = await listProviderConfigs(); const byKey = new Map(all.map(c => [c.key,c] as const))
  return <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 font-redesign-sans"><header className="rounded-radius-xl border border-line-light bg-white p-6"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-redesign-gold">GCC MENTOR · ADMIN</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-serif text-3xl text-ink-900">AI Control Center</h1><p className="mt-2 max-w-2xl text-sm text-ink-400">Configure every AI service with its own primary and optional fallback provider, model and API key.</p></div><p className="text-xs text-ink-400">Signed in as {admin.email ?? admin.id}</p></div></header>{searchParams.providerSaved ? <div className="rounded-radius-lg bg-forest-tint p-3 text-sm text-forest">Configuration saved successfully.</div> : null}{searchParams.providerError ? <div className="rounded-radius-lg bg-terra-tint p-3 text-sm text-terra">{searchParams.providerError}</div> : null}<section className="space-y-4">{SERVICES.map(([key,name,description,status]) => { const config=byKey.get(key); return <Card key={key} className="overflow-hidden p-0"><div className="border-b border-line-light p-5"><div className="flex justify-between gap-3"><div><h2 className="text-base font-bold text-ink-900">{name}</h2><p className="mt-1 text-xs text-ink-400">{description}</p></div><span className="rounded-full bg-ink-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-ink-400">{status==='live'?'LIVE':'COMING SOON'}</span></div>{config ? <p className="mt-3 text-[11px] text-ink-400">Primary: {config.provider} / {config.model}{config.fallbackProvider ? ` · Fallback: ${config.fallbackProvider} / ${config.fallbackModel}` : ' · No fallback configured'}</p> : <p className="mt-3 text-[11px] text-terra">Not configured — uses Default.</p>}</div><div className="p-5"><Form config={config} keyName={key} label={`Save ${name}`}/></div></Card>})}</section><Card className="overflow-hidden p-0"><div className="border-b border-line-light p-5"><h2 className="text-base font-bold text-ink-900">Default AI</h2><p className="mt-1 text-xs text-ink-400">Used by services without their own configuration and internal AI steps.</p></div><div className="p-5"><Form config={byKey.get('default')} keyName="default" label="Save Default"/></div></Card></main>
}
