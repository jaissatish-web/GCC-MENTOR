import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
export const metadata: Metadata = { robots: { index: false, follow: false } }
export default async function Layout({ children }: { children: React.ReactNode }) {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect('/login?redirectTo=/naukrigulf-optimization')
  return <AppShell>{children}</AppShell>
}
