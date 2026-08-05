import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function ProfilePage() {
  return (
    <PlaceholderPage
      title="Career Profile review"
      ticket="TASK-024"
      route="/profile"
      next={{ href: '/profile/visibility', label: 'Next: Field visibility' }}
    />
  )
}
