'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { setRateLimitOverride } from '@/lib/admin/adminData'
import { grantOptimizationCredit } from '@/lib/admin/credits'
import { getProviderConfig, setProviderConfig } from '@/lib/ai/providerConfig'
import { createPromoCode, deactivatePromoCode } from '@/lib/admin/promoCodes'

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

/**
 * Update the AI provider configuration (migration 019) — founder request,
 * 2026-08-07. Not a pre-written ticket; same standing as TASK-047's pricing
 * config, added to docs/TASKS.md as an Unplanned entry.
 *
 * Re-verifies is_admin independently, same reasoning as every other action
 * in this file. The api_key field is left BLANK on the page after a save
 * (never round-tripped back into the form) — leaving it blank on submit
 * means "keep the existing key," so the founder isn't forced to re-paste a
 * secret just to change the model string.
 */
export async function updateProviderConfigAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const provider = String(formData.get('provider') ?? '').trim()
  const model = String(formData.get('model') ?? '').trim()
  const rawFallback = String(formData.get('fallbackModel') ?? '').trim()
  const rawApiKey = String(formData.get('apiKey') ?? '').trim()

  if (!provider || !model) {
    redirect('/admin?providerError=Provider+and+model+are+required')
  }

  let apiKey = rawApiKey
  if (!apiKey) {
    // Blank submission = keep the existing key. Read it back rather than
    // trusting a hidden form field, so a crafted POST can't smuggle in a
    // stale or forged key value.
    const existing = await getProviderConfig()
    if (!existing) {
      redirect('/admin?providerError=API+key+is+required+the+first+time')
    }
    apiKey = existing.apiKey
  }

  const result = await setProviderConfig({
    provider,
    model,
    fallbackModel: rawFallback || null,
    apiKey,
    adminId: admin.id,
  })

  if (!result.ok) {
    redirect(`/admin?providerError=${encodeURIComponent(result.error)}`)
  }

  redirect('/admin?providerSaved=1')
}

/**
 * Create a promo code — TASK-051 (Razorpay payment bypass, blocked on the
 * founder's Saudi Arabia residency / India-only KYC).
 *
 * Payment-adjacent, so it re-verifies is_admin independently, same reasoning
 * as every other action in this file. The creating admin's identity comes
 * from requireAdmin(), never a form field.
 */
export async function createPromoCodeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()

  const code = String(formData.get('code') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const rawMax = String(formData.get('maxRedemptions') ?? '').trim()
  const rawExpires = String(formData.get('expiresAt') ?? '').trim()

  const maxRedemptions = rawMax === '' ? null : Number.parseInt(rawMax, 10)
  // datetime-local input has no timezone; treat as a wall-clock deadline.
  const expiresAt = rawExpires === '' ? null : new Date(rawExpires).toISOString()

  const result = await createPromoCode({
    code,
    description,
    maxRedemptions,
    expiresAt,
    adminUserId: admin.id,
  })

  if (!result.ok) {
    redirect(`/admin?promoError=${encodeURIComponent(result.error)}`)
  }

  redirect('/admin?promoSaved=1')
}

/** Deactivate a promo code — "stop this one right now" (e.g. it leaked). */
export async function deactivatePromoCodeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const code = String(formData.get('code') ?? '').trim()
  if (code) {
    await deactivatePromoCode(code, admin.id)
  }
  redirect('/admin?promoSaved=1')
}
