import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { AuthForm } from '@/components/auth/AuthForm'
import { Card } from '@/components/ui/Card'
import { login } from './actions'

export default function LoginPage() {
  return (
    <AuthShell>
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-2xl text-midnight">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-ink-body">Welcome back to [Product Name].</p>
        <AuthForm action={login} submitLabel="Sign in" />
        <p className="mt-6 text-center text-xs text-ink-body">
          No account yet?{' '}
          <Link href="/signup" className="font-semibold text-emerald">
            Create one
          </Link>
        </p>
      </Card>
    </AuthShell>
  )
}
