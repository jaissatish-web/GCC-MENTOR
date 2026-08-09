import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/adminAuth'
import {
  searchUsers,
  listPackages,
  getTodayRateLimits,
  listPiiAccessLog,
} from '@/lib/admin/adminData'
import {
  overrideRateLimitAction,
  grantCreditAction,
  updateProviderConfigAction,
  createPromoCodeAction,
  deactivatePromoCodeAction,
  updatePromptTemplateAction,
  createServicePackageAction,
  setServicePackageActiveAction,
} from '@/app/admin/actions'
import { listCreditsForUser } from '@/lib/admin/credits'
import { getProviderConfig } from '@/lib/ai/providerConfig'
import { listPromoCodes } from '@/lib/admin/promoCodes'
import { getAllPromptTemplates } from '@/lib/ai/promptTemplates'
import { listServicePackages } from '@/lib/admin/servicePackages'
import { ServicePackageItemsFields } from '@/components/admin/ServicePackageItemsFields'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Pill } from '@/components/ui/Pill'

/** Never render a full secret into the page HTML — a short masked hint only. */
function maskSecret(secret: string): string {
  if (secret.length <= 8) return '••••••••'
  return `${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

/**
 * Admin panel — TASK-040. ONE screen (docs/ADMIN.md §1: "deliberately
 * minimal... operational tooling, not a second product"). No mockup exists
 * for this screen (not part of design-reference/) — styled with the
 * existing UI primitives and Tailwind tokens rather than a pixel spec.
 *
 * Server-rendered, GET-param-driven search (?q=, ?user=) — no client JS
 * needed for the read paths, matching the "single, minimal screen" intent
 * and keeping "search must not leak" trivially true (nothing is fetched
 * client-side to filter).
 *
 * Scope is exactly the four features TASK-025's entry lists (docs/TASKS.md):
 * users list, read-only payments/packages view, rate-limit override, PII
 * access log viewer. Manual credit grant (docs/ADMIN.md §2.3) is a separate,
 * still-blocked ticket (TASK-045) — not built here.
 */

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function readableCategory(cat: string | null): string {
  if (!cat) return '—'
  return cat.replace(/_/g, ' ')
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: {
    q?: string
    user?: string
    providerSaved?: string
    providerError?: string
    promoSaved?: string
    promoError?: string
    promptSaved?: string
    promptError?: string
    spSaved?: string
    spError?: string
  }
}) {
  const admin = await requireAdmin()
  const { q, user: selectedUserId, providerSaved, providerError, promoSaved, promoError, promptSaved, promptError, spSaved, spError } = searchParams

  const results = q ? await searchUsers(q) : []
  const selectedPackages = selectedUserId
    ? await listPackages({ userId: selectedUserId, limit: 50 }, admin)
    : []
  const selectedRateLimits = selectedUserId ? await getTodayRateLimits(selectedUserId) : []
  const selectedCredits = selectedUserId ? await listCreditsForUser(selectedUserId) : []
  const recentAccessLog = await listPiiAccessLog(50)
  const providerConfig = await getProviderConfig()
  const promoCodes = await listPromoCodes(50)
  const promptTemplates = await getAllPromptTemplates()
  const servicePackages = await listServicePackages()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">Admin</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

      {/* ---- AI provider config (migration 019, founder request 2026-08-07) */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          AI provider
        </h2>
        <p className="text-[12px] text-ink-muted">
          Controls which AI service and model every optimization/extraction call uses —
          change it here any time, no redeploy needed. Leave the API key blank to keep the
          key already saved; only fill it in to change it.
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

        {providerConfig ? (
          <p className="text-[12px] text-ink-faint">
            Currently: <span className="font-semibold text-ink-body">{providerConfig.provider}</span> ·{' '}
            <span className="font-mono">{providerConfig.model}</span>
            {providerConfig.fallbackModel ? (
              <>
                {' '}
                (fallback: <span className="font-mono">{providerConfig.fallbackModel}</span>)
              </>
            ) : null}{' '}
            · key <span className="font-mono">{maskSecret(providerConfig.apiKey)}</span> · last
            updated {providerConfig.updatedAt.slice(0, 10)}
          </p>
        ) : (
          <p className="text-[12px] text-state-terra-text">
            Not configured yet — no AI calls will work until this is saved.
          </p>
        )}

        <form action={updateProviderConfigAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
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
          <Input
            name="fallbackModel"
            label="Fallback model (optional — v2)"
            defaultValue={providerConfig?.fallbackModel ?? ''}
            placeholder="e.g. openai/gpt-5.2 — leave blank to disable"
          />
          <Input
            name="apiKey"
            type="password"
            label={providerConfig ? 'New API key (leave blank to keep current)' : 'API key (required)'}
            placeholder={providerConfig ? '••••••••' : 'sk-or-...'}
          />
          <Button type="submit" variant="primary" className="self-start">
            Save AI provider
          </Button>
        </form>
      </Card>

      {/* ---- Promo codes (TASK-051, Razorpay bypass while KYC is blocked) */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          Promo codes
        </h2>
        <p className="text-[12px] text-ink-muted">
          Unlocks a package&apos;s paid deliverable without Razorpay — for beta testers while
          KYC stays blocked. A user enters a code on the payment screen. Reusable up to the
          redemption limit you set (blank = unlimited).
        </p>

        {promoSaved ? (
          <div className="rounded-xl border border-state-emerald-line bg-state-emerald-bg px-3.5 py-2.5 text-[12px] text-emerald">
            Saved.
          </div>
        ) : null}
        {promoError ? (
          <div className="rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-2.5 text-[12px] text-state-terra-text">
            {promoError}
          </div>
        ) : null}

        <form action={createPromoCodeAction} className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Input
              name="code"
              label="Code"
              placeholder="e.g. BETA2026"
              required
              className="w-[180px]"
            />
            <Input
              name="description"
              label="Description (required)"
              placeholder="e.g. Friends & family beta"
              required
              className="flex-1 min-w-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              name="maxRedemptions"
              type="number"
              min={1}
              label="Max redemptions (blank = unlimited)"
              className="w-[220px]"
            />
            <Input name="expiresAt" type="datetime-local" label="Expires (optional)" className="w-[220px]" />
          </div>
          <Button type="submit" variant="primary" className="self-start">
            Create code
          </Button>
        </form>

        {promoCodes.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-warm">
              Existing codes
            </div>
            {promoCodes.map((c) => (
              <div
                key={c.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[12px]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-semibold text-midnight">{c.code}</span>
                  <span className="text-ink-muted">
                    {c.description} · {c.redemptionCount}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ''} used
                    {c.expiresAt ? ` · expires ${c.expiresAt.slice(0, 10)}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Pill variant={c.active ? 'offer' : 'risk'} label={c.active ? 'Active' : 'Inactive'} />
                  {c.active ? (
                    <form action={deactivatePromoCodeAction}>
                      <input type="hidden" name="code" value={c.code} />
                      <button
                        type="submit"
                        className="text-[11px] font-semibold text-state-terra-text underline-offset-2 hover:underline"
                      >
                        Deactivate
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-faint">No promo codes created yet.</p>
        )}
      </Card>

      {/* ---- Prompt templates (TASK-059) ----------------------------- */}
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

      {/* ---- Service packages (TASK-061) ----------------------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          Service packages
        </h2>
        <p className="text-[12px] text-ink-muted">
          Create and manage bundles of services (e.g. &ldquo;Pro = 3 optimizations + 2 cover letters&rdquo;).
          Service keys must exactly match what the code checks for&mdash;currently known values:
          <code className="mx-1 rounded bg-fill-subtle px-1.5 py-0.5 font-mono text-[11px]">resume_optimization</code>
          and
          <code className="mx-1 rounded bg-fill-subtle px-1.5 py-0.5 font-mono text-[11px]">cover_letter</code>.
          A typo means the quota silently never matches any route.
        </p>

        {spSaved ? (
          <div className="rounded-xl border border-state-emerald-line bg-state-emerald-bg px-3.5 py-2.5 text-[12px] text-emerald">
            Saved.
          </div>
        ) : null}
        {spError ? (
          <div className="rounded-xl border border-terracotta/30 bg-state-terra-bg px-3.5 py-2.5 text-[12px] text-state-terra-text">
            {spError}
          </div>
        ) : null}

        {/* Create form */}
        <form action={createServicePackageAction} className="flex flex-col gap-3" id="create-service-package-form">
          <div className="flex flex-wrap gap-2">
            <Input name="name" label="Name" placeholder="e.g. Pro Package" required className="w-[200px]" />
            <Input name="description" label="Description" placeholder="e.g. For serious applicants" className="flex-1 min-w-[200px]" />
            <Input name="priceInr" type="number" min={0} label="Price (₹)" placeholder="e.g. 1499" required className="w-[140px]" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-warm">Quota line items</div>
            <p className="text-[11px] text-ink-faint">The service package is only available for purchase from here.</p>
            <ServicePackageItemsFields />
          </div>
          <Button type="submit" variant="primary" className="self-start">
            Create package
          </Button>
        </form>

        {/* Existing packages list */}
        {servicePackages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-warm">
              Existing packages
            </div>
            {servicePackages.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-midnight">{p.name}</span>
                    <span className="text-[12px] text-ink-muted">
                      ₹{p.priceInr}{p.description ? ` · ${p.description}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isActive ? (
                      <form action={setServicePackageActiveAction}>
                        <input type="hidden" name="packageId" value={p.id} />
                        <input type="hidden" name="isActive" value="false" />
                        <button type="submit" className="text-[11px] font-semibold text-state-terra-text underline-offset-2 hover:underline">Deactivate</button>
                      </form>
                    ) : (
                      <form action={setServicePackageActiveAction}>
                        <input type="hidden" name="packageId" value={p.id} />
                        <input type="hidden" name="isActive" value="true" />
                        <button type="submit" className="text-[11px] font-semibold text-emerald underline-offset-2 hover:underline">Activate</button>
                      </form>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.items.map((item) => (
                    <span key={item.serviceKey} className="rounded-md border border-line bg-fill-warm px-2 py-0.5 text-[11px] font-mono text-ink-body">
                      {item.serviceKey} &times;{item.quota}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-faint">No service packages created yet.</p>
        )}
      </Card>

      {/* ---- Users list (docs/ADMIN.md §2.1) --------------------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          Find a user
        </h2>
        <form method="get" action="/admin" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by phone or email"
            aria-label="Search by phone or email"
            className="flex-1"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        {q ? (
          results.length === 0 ? (
            <p className="text-sm text-ink-muted">No matches for &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <div
                  key={r.userId}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-midnight">
                      {r.fullName || 'Unnamed profile'}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {r.phone || '—'} · {r.email || '—'}
                    </span>
                    <span className="text-[12px] text-ink-faint">
                      Readiness: {r.readinessScore ?? '—'} ({readableCategory(r.readinessCategory)}) ·
                      Signed up {fmtDate(r.signupDate)}
                    </span>
                  </div>
                  <Link
                    href={`/admin?${new URLSearchParams({ q: q ?? '', user: r.userId }).toString()}`}
                    className="text-[12px] font-semibold text-emerald"
                  >
                    View packages →
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-ink-muted">
            Search for a user to view their packages or override their rate limit.
          </p>
        )}
      </Card>

      {/* ---- Selected user: packages + rate limit ---------------------- */}
      {selectedUserId ? (
        <>
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
              Packages — read-only (docs/ADMIN.md §2.2)
            </h2>
            {selectedPackages.length === 0 ? (
              <p className="text-sm text-ink-muted">No packages for this user.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedPackages.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-midnight">{p.targetJobTitle}</span>
                      <span className="text-[12px] text-ink-muted">
                        {p.targetCountry} · created {fmtDate(p.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill variant={p.status} label={p.status.replace(/_/g, ' ')} />
                      <Pill variant={p.isPaid ? 'offer' : 'risk'} label={p.isPaid ? 'Paid' : 'Unpaid'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ---- Manual credit grant (docs/ADMIN.md §2.3) ---------------- */}
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
              Grant a free optimization (docs/ADMIN.md §2.3)
            </h2>
            <p className="text-[12px] text-ink-muted">
              The fix for &ldquo;I paid but something broke&rdquo;. One grant = one free
              optimization; it is applied automatically the next time this user optimizes.
              Every grant is logged with your admin ID, the reason, and the timestamp.
            </p>
            <form action={grantCreditAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="userId" value={selectedUserId} />
              <input type="hidden" name="q" value={q ?? ''} />
              <Input name="reason" label="Reason (required)" required className="flex-1" />
              <Button type="submit" variant="secondary">
                Grant credit
              </Button>
            </form>

            {selectedCredits.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-warm">
                  Grant history
                </div>
                {selectedCredits.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[12px]"
                  >
                    <span className="text-ink-body">
                      {c.grantedAt.slice(0, 10)} · {c.reason}
                    </span>
                    <Pill
                      variant={c.consumedAt ? 'applied' : 'shortlisted'}
                      label={c.consumedAt ? `Used ${c.consumedAt.slice(0, 10)}` : 'Available'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-ink-faint">No credits granted to this user yet.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
              Rate-limit override (docs/ADMIN.md §2.4) — today only
            </h2>
            <div className="flex flex-col gap-4">
              {selectedRateLimits.map((rl) => (
                <form
                  key={rl.action}
                  action={overrideRateLimitAction}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3"
                >
                  <input type="hidden" name="userId" value={selectedUserId} />
                  <input type="hidden" name="action" value={rl.action} />
                  <input type="hidden" name="q" value={q ?? ''} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-midnight">
                      {rl.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {rl.count} used today
                      {rl.limitOverride != null ? ` · override: ${rl.limitOverride}` : ' · default limit'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      name="override"
                      type="number"
                      min={0}
                      label="New limit for today (blank = clear override)"
                      className="max-w-[220px]"
                    />
                    <Input name="reason" label="Reason (required)" required className="flex-1" />
                    <Button type="submit" variant="secondary">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      {/* ---- PII access log viewer (docs/ADMIN.md §2.5) ---------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          PII access log — most recent
        </h2>
        {recentAccessLog.length === 0 ? (
          <p className="text-sm text-ink-muted">No access recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-3 font-semibold">When</th>
                  <th className="py-1 pr-3 font-semibold">Admin</th>
                  <th className="py-1 pr-3 font-semibold">Target user</th>
                  <th className="py-1 pr-3 font-semibold">Resource</th>
                </tr>
              </thead>
              <tbody>
                {recentAccessLog.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-1.5 pr-3 text-ink-body">{row.accessedAt.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-1.5 pr-3 font-mono text-ink-muted">{row.adminUserId.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3 font-mono text-ink-muted">{row.targetUserId.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3 text-ink-body">
                      {row.resource} · {row.resourceId.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  )
}
