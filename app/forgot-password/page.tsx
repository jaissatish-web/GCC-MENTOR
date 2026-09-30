import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export const metadata = { title: 'Reset your password', robots: { index: false, follow: true } }

/**
 * /forgot-password — step 1 of password recovery (audit M03, 2026-09-15;
 * redesigned 2026-09-30). Step 2 is the emailed link; step 3 is
 * /auth/update-password.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      panelTitle="Back into your Gulf career profile in a minute."
      panelBody="Your profile, saved jobs, CVs and cover letters stay exactly as they are."
      aside={{ prompt: 'Remembered it?', label: 'Sign in', href: '/login' }}
    >
      <AuthCard title="Reset your password" subtitle="Enter the email you signed up with. We’ll send you a link to set a new password.">
        <ForgotPasswordForm />
      </AuthCard>
    </AuthShell>
  )
}
