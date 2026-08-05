import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function PaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments"
      ticket="Not yet ticketed — flagged for founder decision, see docs/TASKS.md"
      route="/payments"
      next={{ href: '/dashboard', label: 'Next: Dashboard' }}
    />
  )
}
