import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { Card } from '@/components/ui/Card'
import { signup } from './actions'

/**
 * /signup — TASK-081 light restyle (2026-08-12), per PAGE_SPECS.md §A.
 * Visual-only change: the `signup` server action — validation, the
 * email-confirmation branch, the `/onboarding` redirect on a fresh session
 * — is byte-for-byte unchanged, see ./actions.ts. No fields were added
 * beyond the existing email/password.
 */
export default function SignupPage() {
  return (
    <AuthShell
      headline="Start building your Gulf Career Profile."
      // "…and interview reuses it" promised a feature that is not built —
      // Interview Prep is labelled "Not built yet" everywhere else.
      body="One profile, built once — every CV, cover letter and application reuses it."
    >
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <h1 className="font-display text-[26px] text-ink">Create your account</h1>
        <p className="mb-5 text-[14px] leading-relaxed text-ink-muted">
          Build your Career Profile once. Every application reuses it.
        </p>
        <AuthForm action={signup} submitLabel="Create your account" tone="light" />
        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center px-1 font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
