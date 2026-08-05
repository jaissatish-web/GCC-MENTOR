import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function ProfileVisibilityPage() {
  return (
    <PlaceholderPage
      title="Field visibility"
      ticket="TASK-025"
      route="/profile/visibility"
      next={{ href: '/optimize/target', label: 'Next: Name the target' }}
    />
  )
}
