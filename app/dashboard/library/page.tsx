import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function DashboardLibraryPage() {
  return (
    <PlaceholderPage
      title="Library"
      ticket="TASK-035"
      route="/dashboard/library"
      next={{ href: '/dashboard', label: 'Next: Dashboard' }}
    />
  )
}
