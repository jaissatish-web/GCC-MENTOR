import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { Card } from '@/components/ui/Card'
import { ForgotPasswordForm } from './ForgotPasswordForm'

/**
 * /forgot-password — step 1 of password recovery (audit M03, 2026-09-15).
 * Step 2 is the emailed link; step 3 is /auth/update-password.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      headline="Back into your Gulf career profile."
      body="We will email you a link to set a new password. Your profile and saved jobs stay exactly as they are."
    >
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <h1 className="font-display text-[26px] text-ink">Reset your password</h1>
        <p className="mb-5 text-[14px] leading-relaxed text-ink-muted">
          Enter the email you signed up with. If it has an account, a reset link is on its way.
        </p>
        <ForgotPasswordForm />
        <p className="mt-6 text-center text-[13px] text-ink-muted">
          Remembered it?{' '}
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
