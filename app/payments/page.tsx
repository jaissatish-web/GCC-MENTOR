import { redirect } from 'next/navigation'

/**
 * /payments — now a permanent redirect into Settings → Payments.
 *
 * Payments was removed from the main navigation and folded into Settings.
 * The route itself is kept (rather than deleted) so any existing bookmark,
 * link or browser history entry still lands somewhere correct instead of a
 * 404. There was no payment *functionality* here to preserve — this page had
 * only ever rendered PlaceholderPage — so nothing is lost by redirecting; the
 * real unlock state now renders under the Payments tab.
 */
export default function PaymentsPage() {
  redirect('/settings?tab=payments')
}
