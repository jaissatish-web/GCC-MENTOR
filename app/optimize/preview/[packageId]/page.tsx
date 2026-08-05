import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function OptimizePreviewPage({
  params,
}: {
  params: { packageId: string }
}) {
  return (
    <PlaceholderPage
      title="Before / after preview"
      ticket="TASK-033"
      route={`/optimize/preview/[packageId] (${params.packageId})`}
      next={{ href: `/optimize/pay/${params.packageId}`, label: 'Next: Payment' }}
    />
  )
}
