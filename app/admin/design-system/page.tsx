import { requireAdmin } from '@/lib/admin/adminAuth'
import { DesignSettings } from './DesignSettings'

export const dynamic = 'force-dynamic'

export default async function DesignSystemPage() {
  await requireAdmin()
  return <DesignSettings />
}
