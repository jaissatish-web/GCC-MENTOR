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
      headline="Start Building Your Gulf Career Profile."
      body="One profile, built once — every future application, resume and interview reuses it."
    >
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <h1 className="font-serif text-[26px] text-ink-900">Create your account</h1>
        <p className="mb-5 text-[13.5px] leading-relaxed text-ink-400">
          Build your Career Profile once. Every application reuses it.
        </p>
        <AuthForm action={signup} submitLabel="Create your account" tone="light" />
        <p className="mt-6 text-center text-[12.5px] text-ink-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-forest hover:text-forest-dark">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
