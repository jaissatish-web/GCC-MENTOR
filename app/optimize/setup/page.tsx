import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function OptimizeSetupPage() {
  return (
    <PlaceholderPage
      title="Optimization setup"
      ticket="TASK-028"
      route="/optimize/setup"
      next={{ href: '/optimize/preview/demo', label: 'Next: Before/after preview' }}
    />
  )
}
