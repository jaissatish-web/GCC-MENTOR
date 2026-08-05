import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function OptimizeTargetPage() {
  return (
    <PlaceholderPage
      title="Name the target"
      ticket="TASK-027"
      route="/optimize/target"
      next={{ href: '/optimize/setup', label: 'Next: Optimization setup' }}
    />
  )
}
