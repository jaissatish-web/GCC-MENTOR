import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthHashHandler } from '@/components/auth/AuthHashHandler'
import { Card } from '@/components/ui/Card'
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from '@/lib/safeRedirect'
import { login } from './actions'

/**
 * /login — TASK-081 light restyle (2026-08-12), per PAGE_SPECS.md §A.
 *
 * 2026-09-15 (audit M03/M09/H05):
 *   - `?redirectTo=` from middleware is carried through sign-in, so a user who
 *     opened a package or a service lands back on it. It is validated here for
 *     display and again by the server action — never trusted.
 *   - "Forgot password?" now exists, because the recovery flow now exists
 *     (/forgot-password -> emailed link -> /auth/update-password).
 *   - An expired or reused emailed link lands here with ?error=auth_callback_failed
 *     and is told so, instead of showing nothing.
 */
export default async function LoginPage(props: {
  searchParams: Promise<{ redirectTo?: string | string[]; error?: string | string[] }>
}) {
  const searchParams = await props.searchParams
  const rawRedirect = Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
  const redirectTo = safeRedirectPath(rawRedirect)
  const carry = redirectTo !== DEFAULT_AFTER_LOGIN ? redirectTo : null
  const linkError = (Array.isArray(searchParams.error) ? searchParams.error[0] : searchParams.error) === 'auth_callback_failed'

  return (
    <AuthShell
      // Sentence case, like every heading after it.
      headline="Your Gulf career, built with strategy."
      body="Build a stronger profile, tailor your CV to each Gulf job and apply with confidence."
    >
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <AuthHashHandler />
        <h1 className="font-display text-[26px] text-ink">Sign in</h1>
        <p className="mb-5 text-[14px] text-ink-muted">Welcome back to GCC MENTOR.</p>
        {linkError ? (
          <p role="alert" className="mb-4 rounded-lg border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[13px] leading-snug text-alert">
            That link has expired or was already used. Sign in below, or ask for a new link.
          </p>
        ) : null}
        <AuthForm action={login} submitLabel="Sign in" tone="light" redirectTo={carry} />
        <p className="mt-3 text-right text-[13px]">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center px-1 font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Forgot password?
          </Link>
        </p>
        <p className="mt-3 text-center text-[13px] text-ink-muted">
          Don&apos;t have an account?{' '}
          {/* 44px tall: it measured 16px — the way in for someone who landed
              on the wrong form was the hardest thing on the page to tap. */}
          <Link
            href={carry ? `/signup?redirectTo=${encodeURIComponent(carry)}` : '/signup'}
            className="inline-flex min-h-11 items-center px-1 font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Create one
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
