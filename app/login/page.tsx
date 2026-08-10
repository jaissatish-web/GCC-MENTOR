import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { Card } from '@/components/ui/Card'
import { login } from './actions'

/**
 * /login — Phase 2 dark redesign (2026-08-07). Visual-only change: the
 * `login` server action, its validation, its redirect (`/dashboard` on
 * success), and its error messages are byte-for-byte unchanged — see
 * ./actions.ts.
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
      <Card tone="dark" className="flex w-full flex-col gap-1 p-8">
        <h1 className="font-serif text-[26px] text-marble">Sign in</h1>
        <p className="mb-5 text-[13.5px] text-marble/55">Welcome back to GCC MENTOR.</p>
        <AuthForm action={login} submitLabel="Sign in" tone="dark" />
        <p className="mt-6 text-center text-[12.5px] text-marble/50">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-gold-light hover:text-gold">
            Create one
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
