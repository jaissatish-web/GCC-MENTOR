import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { AuthHashHandler } from '@/components/auth/AuthHashHandler'
import { Card } from '@/components/ui/Card'
import { login } from './actions'

/**
 * /login — TASK-081 light restyle (2026-08-12), per PAGE_SPECS.md §A.
 * Visual-only change: the `login` server action, its validation, its
 * redirect (`/dashboard` on success), and its error messages are
 * byte-for-byte unchanged — see ./actions.ts.
 *
 * No "Forgot password?" link: this product has no password-reset flow
 * implemented anywhere (checked — no reset/recovery route, action, or
 * Supabase call exists). Adding the link would be fake functionality, so
 * it's left out until that flow actually exists.
 */
export default function LoginPage() {
  return (
    <AuthShell
      headline="Your Gulf Career, Built With Strategy."
      body="Build a stronger profile, prepare for Gulf interviews and approach opportunities with confidence."
    >
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <AuthHashHandler />
        <h1 className="font-display text-[26px] text-ink">Sign in</h1>
        <p className="mb-5 text-[14px] text-ink-muted">Welcome back to GCC MENTOR.</p>
        <AuthForm action={login} submitLabel="Sign in" tone="light" />
        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-teal hover:text-teal">
            Create one
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
