import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function PackagePage({ params }: { params: { id: string } }) {
  return (
    <PlaceholderPage
      title="Results & download"
      ticket="TASK-033"
      route={`/package/[id] (${params.id})`}
      next={{ href: '/dashboard', label: 'Next: Dashboard' }}
    />
  )
}
