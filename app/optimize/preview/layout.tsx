import type { ReactNode } from 'react'

export default function WorkspaceThemeLayout({ children }: { children: ReactNode }) {
  return <div data-workspace-theme>{children}</div>
}
