'use client'

import { useCallback, useRef, useState } from 'react'

export interface CreditShortfall {
  service: string
  required: number
  available: number
  additional: number
  referrals: number | null
}

export function usePremiumRequest() {
  const pending = useRef(new Map<string, string>())
  const [shortfall, setShortfall] = useState<CreditShortfall | null>(null)

  const request = useCallback(async (url: string, init: RequestInit) => {
    setShortfall(null)
    const key = url + (typeof init.body === 'string' ? init.body : '')
    const operation = pending.current.get(key) ?? crypto.randomUUID()
    pending.current.set(key, operation)
    const headers = new Headers(init.headers)
    headers.set('Idempotency-Key', operation)
    const response = await fetch(url, { ...init, headers })
    const payload = await response.json().catch(() => null)
    // These responses can arrive before the server checks a previous settlement.
    const retryableStatus = response.status >= 500 || [401, 403, 408, 425, 429].includes(response.status)
    if (payload && !retryableStatus && payload.code !== 'operation_busy' && pending.current.get(key) === operation) {
      pending.current.delete(key)
    }
    const data = payload?.unlock as CreditShortfall | undefined
    const blocked = response.status === 402 && payload?.code === 'insufficient_credits' && data
    if (blocked) setShortfall(data)
    return { response, payload: payload ?? {}, blocked: Boolean(blocked) }
  }, [])

  return { request, shortfall }
}
