import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      ticket="TASK-034"
      route="/dashboard"
      next={{ href: '/settings', label: 'Next: Settings' }}
    />
  )
}
