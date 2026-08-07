'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { setRateLimitOverride } from '@/lib/admin/adminData'
import { grantOptimizationCredit } from '@/lib/admin/credits'

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

/**
 * Grant one free optimization — TASK-045, docs/ADMIN.md §2.3.
 *
 * Payment-adjacent, so it re-verifies is_admin independently: a Server Action
 * is its own POST endpoint and is NOT covered by the page's middleware-gated
 * render. The granting admin's identity comes from requireAdmin() — the
 * authenticated session — and never from a form field, so a crafted POST
 * cannot attribute a grant to someone else.
 */
export async function grantCreditAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const targetUserId = String(formData.get('userId') ?? '').trim()
  const reason = String(formData.get('reason') ?? '').trim()
  const q = String(formData.get('q') ?? '')

  // Reason is required (docs/ADMIN.md §2.3 — every grant is logged WITH a
  // reason). Enforced here as well as in lib/admin/credits.ts, so neither the
  // form nor a direct POST can produce an unexplained grant.
  if (targetUserId && reason) {
    await grantOptimizationCredit({ targetUserId, adminUserId: admin.id, reason })
  }

  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (targetUserId) params.set('user', targetUserId)
  const suffix = params.toString()
  redirect(`/admin${suffix ? `?${suffix}` : ''}`)
}
