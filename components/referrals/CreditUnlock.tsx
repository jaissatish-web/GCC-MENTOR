import Link from 'next/link'
import type { CreditShortfall } from '@/lib/credits/usePremiumRequest'
import { buttonVariants } from '@/components/ui/Button'

export function CreditUnlock({ balance }: { balance: CreditShortfall }) {
  return <section aria-labelledby="unlock-service-heading" className="my-4 grid gap-3 rounded-card border border-line bg-white p-4 text-left">
    <h2 id="unlock-service-heading" className="type-card text-ink">Unlock {balance.service}</h2>
    <dl className="grid grid-cols-3 gap-2 type-helper text-ink-soft">
      <div><dt>Required</dt><dd className="font-semibold text-ink">{balance.required} credits</dd></div>
      <div><dt>Available</dt><dd className="font-semibold text-ink">{balance.available} credits</dd></div>
      <div><dt>Still needed</dt><dd className="font-semibold text-ink">{balance.additional} credits</dd></div>
    </dl>
    {balance.referrals !== null && <p className="type-helper text-ink-soft">
      Earn the remaining credits with {balance.referrals} qualified {balance.referrals === 1 ? 'referral' : 'referrals'} at the current reward rate.
    </p>}
    <div className="flex flex-wrap items-center gap-3">
      {balance.referrals !== null && <Link href="/settings/referrals#invite" target="_blank" rel="noopener" className={buttonVariants({ variant: 'primary', size: 'sm' })}>Invite & Earn</Link>}
      <Link href="/settings/referrals" target="_blank" rel="noopener" className="type-label text-teal underline">Referral & Credits</Link>
    </div>
  </section>
}
