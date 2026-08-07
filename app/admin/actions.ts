'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { setRateLimitOverride } from '@/lib/admin/adminData'

/**
 * Admin Server Actions — TASK-040.
 *
 * Server Actions are their own POST endpoints, not covered by the page's
 * render-time middleware gate — each one re-verifies is_admin independently
 * (docs/ADMIN.md §1: check in "the route handler AND in middleware", and a
 * Server Action IS the route handler here).
 */
export async function overrideRateLimitAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const userId = String(formData.get('userId') ?? '').trim()
  const action = String(formData.get('action') ?? '').trim()
  const rawOverride = String(formData.get('override') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()
  const q = String(formData.get('q') ?? '')

  const override = rawOverride === '' ? null : Number.parseInt(rawOverride, 10)

  if (userId && action && reason) {
    await setRateLimitOverride({ userId, action, override, admin, reason })
  }

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (userId) params.set('user', userId)
  const suffix = params.toString()
  redirect(`/admin${suffix ? `?${suffix}` : ''}`)
}
