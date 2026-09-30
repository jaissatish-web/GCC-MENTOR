import type { Metadata } from 'next'

// The page is a client component, so its title lives here.
export const metadata: Metadata = { title: 'Set a new password', robots: { index: false, follow: false } }

export default function UpdatePasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
