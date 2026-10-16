import { AppShell } from '@/components/layout/AppShell'

export default function EditResumeLayout({ children }: { children: React.ReactNode }) {
  return <AppShell hideNav>{children}</AppShell>
}
