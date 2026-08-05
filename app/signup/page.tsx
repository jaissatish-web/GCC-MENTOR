import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { Card } from '@/components/ui/Card'
import { signup } from './actions'

export default function SignupPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl text-midnight">Create your account</h1>
        <p className="mb-6 mt-1 text-sm text-ink-body">
          Build your Career Profile once. Every application reuses it.
        </p>
        <AuthForm action={signup} submitLabel="Create account" />
        <p className="mt-6 text-center text-xs text-ink-body">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-emerald">
            Sign in
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
