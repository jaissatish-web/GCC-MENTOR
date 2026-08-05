import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      ticket="TASK-037"
      route="/settings"
      next={{ href: '/admin', label: 'Next: Admin' }}
    />
  )
}
