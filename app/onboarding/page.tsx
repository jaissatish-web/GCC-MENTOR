import { PlaceholderPage } from '@/components/PlaceholderPage'

export default function OnboardingPage() {
  return (
    <PlaceholderPage
      title="Choose how to start"
      ticket="TASK-022"
      route="/onboarding"
      next={{ href: '/profile', label: 'Next: Career Profile' }}
    />
  )
}
