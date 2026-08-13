'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { setRateLimitOverride } from '@/lib/admin/adminData'
import { grantOptimizationCredit } from '@/lib/admin/credits'
import { AI_CONFIG_KEY_DEFAULT, getProviderConfigExact, setProviderConfig, deleteProviderConfig } from '@/lib/ai/providerConfig'
import { createPromoCode, deactivatePromoCode } from '@/lib/admin/promoCodes'
import { setPromptTemplate } from '@/lib/ai/promptTemplates'
import { createServicePackage, setServicePackageActive } from '@/lib/admin/servicePackages'

export async function overrideRateLimitAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const userId = String(formData.get('userId') ?? '').trim(); const action = String(formData.get('action') ?? '').trim(); const rawOverride = String(formData.get('override') ?? '').trim(); const reason = String(formData.get('reason') ?? '').trim(); const q = String(formData.get('q') ?? ''); const override = rawOverride === '' ? null : Number.parseInt(rawOverride, 10)
  if (userId && action && reason) await setRateLimitOverride({ userId, action, override, admin, reason })
  const params = new URLSearchParams(); if (q) params.set('q', q); if (userId) params.set('user', userId); const suffix = params.toString(); redirect(`/admin/users${suffix ? `?${suffix}` : ''}`)
}

export async function grantCreditAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const targetUserId = String(formData.get('userId') ?? '').trim(); const reason = String(formData.get('reason') ?? '').trim(); const q = String(formData.get('q') ?? '')
  if (targetUserId && reason) await grantOptimizationCredit({ targetUserId, adminUserId: admin.id, reason })
  const params = new URLSearchParams(); if (q) params.set('q', q); if (targetUserId) params.set('user', targetUserId); const suffix = params.toString(); redirect(`/admin/users${suffix ? `?${suffix}` : ''}`)
}

export async function updateProviderConfigAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin()
  const key = String(formData.get('key') ?? '').trim() || AI_CONFIG_KEY_DEFAULT
  const provider = String(formData.get('provider') ?? '').trim()
  const model = String(formData.get('model') ?? '').trim()
  const rawApiKey = String(formData.get('apiKey') ?? '').trim()
  const fallbackEnabled = String(formData.get('fallbackEnabled') ?? 'off') === 'on'
  const fallbackProviderRaw = String(formData.get('fallbackProvider') ?? '').trim()
  const fallbackModelRaw = String(formData.get('fallbackModel') ?? '').trim()
  const fallbackApiKeyRaw = String(formData.get('fallbackApiKey') ?? '').trim()

  const existing = await getProviderConfigExact(key)
  const apiKey = rawApiKey || existing?.apiKey || ''

  // Service overrides may be removed/disabled so the service transparently uses Default AI.
  if (key !== AI_CONFIG_KEY_DEFAULT && !provider && !model && !rawApiKey && !fallbackEnabled) {
    const result = await deleteProviderConfig(key)
    if (!result.ok) redirect(`/admin/ai-provider?providerError=${encodeURIComponent(result.error)}`)
    redirect('/admin/ai-provider?providerSaved=1')
  }

  if (!provider || !model) redirect('/admin/ai-provider?providerError=Provider+and+model+are+required')
  if (!apiKey) redirect('/admin/ai-provider?providerError=Primary+API+key+is+required')

  let fallbackProvider: string | null = null
  let fallbackModel: string | null = null
  let fallbackApiKey: string | null = null

  if (fallbackEnabled) {
    fallbackProvider = fallbackProviderRaw || existing?.fallbackProvider || null
    fallbackModel = fallbackModelRaw || existing?.fallbackModel || null
    fallbackApiKey = fallbackApiKeyRaw || existing?.fallbackApiKey || null
    if (!fallbackProvider || !fallbackModel || !fallbackApiKey) {
      redirect('/admin/ai-provider?providerError=Fallback+is+enabled.+Enter+fallback+provider%2C+model%2C+and+API+key')
    }
  }

  const result = await setProviderConfig({ key, provider, model, apiKey, fallbackProvider, fallbackModel, fallbackApiKey, adminId: admin.id })
  if (!result.ok) redirect(`/admin/ai-provider?providerError=${encodeURIComponent(result.error)}`)
  redirect('/admin/ai-provider?providerSaved=1')
}

export async function deleteProviderConfigAction(formData: FormData): Promise<void> {
  await requireAdmin(); const key = String(formData.get('key') ?? '').trim(); if (!key) redirect('/admin/ai-provider?providerError=Missing+config+key'); const result = await deleteProviderConfig(key); if (!result.ok) redirect(`/admin/ai-provider?providerError=${encodeURIComponent(result.error)}`); redirect('/admin/ai-provider?providerSaved=1')
}

export async function createPromoCodeAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin(); const code = String(formData.get('code') ?? '').trim(); const description = String(formData.get('description') ?? '').trim(); const rawMax = String(formData.get('maxRedemptions') ?? '').trim(); const rawExpires = String(formData.get('expiresAt') ?? '').trim(); const maxRedemptions = rawMax === '' ? null : Number.parseInt(rawMax, 10); const expiresAt = rawExpires === '' ? null : new Date(rawExpires).toISOString(); const rawPackageId = String(formData.get('packageId') ?? '').trim(); const packageId = rawPackageId === '' ? null : rawPackageId; const result = await createPromoCode({ code, description, maxRedemptions, expiresAt, adminUserId: admin.id, packageId }); if (!result.ok) redirect(`/admin/promo-codes?promoError=${encodeURIComponent(result.error)}`); redirect('/admin/promo-codes?promoSaved=1')
}
export async function deactivatePromoCodeAction(formData: FormData): Promise<void> { const admin = await requireAdmin(); const code = String(formData.get('code') ?? '').trim(); if (code) await deactivatePromoCode(code, admin.id); redirect('/admin/promo-codes?promoSaved=1') }
export async function updatePromptTemplateAction(formData: FormData): Promise<void> { const admin = await requireAdmin(); const key = String(formData.get('key') ?? '').trim(); const content = String(formData.get('content') ?? '').trim(); if (!key || !content) redirect('/admin/prompts?promptError=Key+and+content+are+required'); const result = await setPromptTemplate({ key, content, adminId: admin.id }); if (!result.ok) redirect(`/admin/prompts?promptError=${encodeURIComponent(result.error)}`); redirect('/admin/prompts?promptSaved=1') }
export async function createServicePackageAction(formData: FormData): Promise<void> { const admin = await requireAdmin(); const name = String(formData.get('name') ?? '').trim(); const description = String(formData.get('description') ?? '').trim(); const rawPrice = String(formData.get('priceInr') ?? '').trim(); const priceInr = rawPrice ? Number(rawPrice) : 0; if (!name) { redirect('/admin/packages?spError=Package+name+is+required'); return }; const items: { serviceKey: string; quota: number }[] = []; for (const [key, value] of Array.from(formData.entries())) { const match = /^service_key_(\d+)$/.exec(key); if (match && value) { const quotaRaw = formData.get(`quota_${match[1]}`); const quota = quotaRaw ? Number(quotaRaw) : 0; if (Number.isInteger(quota) && quota > 0) items.push({ serviceKey: String(value).trim(), quota }) } }; const result = await createServicePackage({ name, description: description || null, priceInr, items, adminUserId: admin.id }); if (!result.ok) redirect(`/admin/packages?spError=${encodeURIComponent(result.error)}`); redirect('/admin/packages?spSaved=1') }
export async function setServicePackageActiveAction(formData: FormData): Promise<void> { const admin = await requireAdmin(); const packageId = String(formData.get('packageId') ?? '').trim(); const isActive = formData.get('isActive') === 'true'; if (!packageId) redirect('/admin/packages?spError=Missing+package+id'); const result = await setServicePackageActive(packageId, isActive, admin.id); if (!result.ok) redirect(`/admin/packages?spError=${encodeURIComponent(result.error)}`); redirect('/admin/packages?spSaved=1') }
