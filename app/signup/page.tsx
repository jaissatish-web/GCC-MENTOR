import Link from 'next/link'
import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { safeRedirectPath } from '@/lib/safeRedirect'
import { resendConfirmation, signup } from './actions'

export const metadata = {
  title: 'Create your account',
  description: 'Create your free GCC MENTOR account and build one Career Profile for every Gulf job application.',
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: true },
}

/**
 * /signup — redesigned 2026-09-30 on the shared AuthShell (matches landing v3).
 * Asks for the password twice; after sign-up with email confirmation on, the
 * form becomes a "check your inbox" screen with a resend button.
 */
export default async function SignupPage(props: { searchParams: Promise<{ redirectTo?: string | string[] }> }) {
  // Carried from /login or middleware so a new user still lands on the page they
  // asked for (audit M09). Validated here and again in the action.
  const searchParams = await props.searchParams
  const raw = Array.isArray(searchParams.redirectTo) ? searchParams.redirectTo[0] : searchParams.redirectTo
  const safe = safeRedirectPath(raw, '/onboarding')
  const carry = safe !== '/onboarding' ? safe : null
  const loginHref = carry ? `/login?redirectTo=${encodeURIComponent(carry)}` : '/login'

  return (
    <AuthShell
      panelTitle="One career profile. Every Gulf application, prepared properly."
      panelBody="Upload your CV once. Get an ATS-ready CV, cover letter and interview practice for each job you target."
      aside={{ prompt: 'Already have an account?', label: 'Sign in', href: loginHref }}
    >
      <AuthCard title="Create your account" subtitle="Free to start. No card needed.">
        <AuthForm mode="signup" action={signup} resend={resendConfirmation} redirectTo={carry} />
        <p className="mt-5 text-center text-[14px] text-ink-muted">
          Already have an account?{' '}
          <Link href={loginHref} className="inline-flex min-h-11 items-center px-1 font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthShell>
  )
}
