import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function OptimizePayPage({
  params,
}: {
  params: { packageId: string }
}) {
  return (
    <PlaceholderPage
      title="Payment"
      ticket="TASK-043"
      route={`/optimize/pay/[packageId] (${params.packageId})`}
      next={{ href: `/package/${params.packageId}`, label: 'Next: Results & download' }}
    />
  )
}
