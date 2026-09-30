import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthHashHandler } from '@/components/auth/AuthHashHandler'
import { Notice } from '@/components/auth/Notice'
import { DEFAULT_AFTER_LOGIN, safeRedirectPath } from '@/lib/safeRedirect'
import { resendConfirmation } from '@/app/signup/actions'
import { login } from './actions'

export const metadata = { title: 'Sign in', robots: { index: false, follow: true } }

/**
 * /login — redesigned 2026-09-30 on the shared AuthShell (matches landing v3).
 *
 * 2026-09-15 (audit M03/M09/H05), unchanged in behaviour:
 *   - `?redirectTo=` from middleware is carried through sign-in (validated here
 *     for display and again by the server action — never trusted).
 *   - "Forgot password?" leads to /forgot-password.
 *   - An expired or reused emailed link lands here with ?error=auth_callback_failed.
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
      panelTitle="Welcome back. Your next Gulf application is waiting."
      panelBody="Your Career Profile, tailored CVs, cover letters and interview practice — all in one place."
      aside={{ prompt: 'New to GCC MENTOR?', label: 'Create account', href: carry ? `/signup?redirectTo=${encodeURIComponent(carry)}` : '/signup' }}
    >
      <AuthCard title="Sign in" subtitle="Welcome back. Sign in to continue your applications.">
        <AuthHashHandler />
        {linkError ? (
          <Notice tone="error" className="mb-4">
            That link has expired or was already used. Sign in below, or ask for a new link.
          </Notice>
        ) : null}
        <AuthForm mode="signin" action={login} resend={resendConfirmation} redirectTo={carry} />
      </AuthCard>
    </AuthShell>
  )
}
