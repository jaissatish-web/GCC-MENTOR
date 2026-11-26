import Link from 'next/link'
import { ChevronRight, Gift } from 'lucide-react'

export function ReferralWorkspaceLink() {
  return (
    <Link href="/settings/referrals" className="flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-ink hover:border-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-soft text-teal"><Gift size={18} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block type-label font-semibold">Referral &amp; Credits</span>
        <span className="block type-helper text-ink-soft">Invite professionals and view your credit wallet</span>
      </span>
      <ChevronRight size={17} aria-hidden="true" className="shrink-0 text-teal" />
    </Link>
  )
}
