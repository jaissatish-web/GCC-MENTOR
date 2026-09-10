import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * Every URL that matches nothing — and every `notFound()`, including the legal
 * pages before they are written.
 *
 * There was no file here, so a mistyped link or an old bookmark got Next.js's
 * bare default: black "404" on white, no logo, no way back. Found in the
 * 2026-09-10 audit. For a product whose users are wary of scam sites, a page
 * that stops looking like the product is the moment trust breaks.
 *
 * Server component and self-contained on purpose: it renders outside the app
 * shell (a signed-out visitor can land here), so it carries its own mark.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5 py-16 text-center font-redesign-sans">
      <Link
        href="/"
        aria-label="GCC MENTOR — home"
        className="mb-8 flex items-center gap-2.5 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        <span className="flex size-9 items-center justify-center rounded-ctl bg-teal font-display text-[16px] font-bold text-white">
          G
        </span>
        <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-ink">GCC MENTOR</span>
      </Link>

      <p className="font-display text-[64px] font-bold leading-none tracking-[-0.03em] text-teal">404</p>
      <h1 className="mt-3 font-display text-[24px] font-bold text-ink">This page isn&rsquo;t here</h1>
      <p className="mt-2 max-w-[42ch] text-[14px] leading-relaxed text-ink-soft">
        The link may be old or mistyped. Your profile and target jobs are safe — pick up from one
        of these.
      </p>

      <div className="mt-7 flex w-full max-w-[340px] flex-col gap-2.5 sm:w-auto sm:max-w-none sm:flex-row">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'primary' }), 'sm:w-auto')}>
          Go to my dashboard
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: 'secondary' }), 'sm:w-auto')}>
          Back to the home page
        </Link>
      </div>
    </main>
  )
}
