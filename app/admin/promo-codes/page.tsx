import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPromoCodes } from '@/lib/admin/promoCodes'
import { createPromoCodeAction, deactivatePromoCodeAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'

/**
 * Admin · Promo codes (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Unlock a package's paid deliverable without
 * Razorpay while KYC stays blocked. Same form, same action, same behavior
 * as before — this is a navigation restructure only.
 */
export default async function PromoCodesPage({
  searchParams,
}: {
  searchParams: { promoSaved?: string; promoError?: string }
}) {
  const admin = await requireAdmin()
  const { promoSaved, promoError } = searchParams

  const promoCodes = await listPromoCodes(50)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 font-redesign-sans">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">Promo codes</h1>
        <p className="text-sm text-ink-400">Signed in as {admin.email ?? admin.id}</p>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
          Promo codes
        </h2>
        <p className="text-[12px] text-ink-400">
          Unlocks a package&apos;s paid deliverable without Razorpay — for beta testers while
          KYC stays blocked. A user enters a code on the payment screen. Reusable up to the
          redemption limit you set (blank = unlimited).
        </p>

        {promoSaved ? (
          <div className="rounded-radius-lg border border-forest/50 bg-forest-tint px-3.5 py-2.5 text-[12px] text-forest">
            Saved.
          </div>
        ) : null}
        {promoError ? (
          <div className="rounded-radius-lg border border-terra/30 bg-terra-tint px-3.5 py-2.5 text-[12px] text-terra">
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
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Existing codes
            </div>
            {promoCodes.map((c) => (
              <div
                key={c.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-radius-md border border-line-light px-3 py-2 text-[12px]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono font-semibold text-ink-900">{c.code}</span>
                  <span className="text-ink-400">
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
                        className="text-[11px] font-semibold text-terra underline-offset-2 hover:underline"
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
          <p className="text-[12px] text-ink-400">No promo codes created yet.</p>
        )}
      </Card>
    </main>
  )
}
