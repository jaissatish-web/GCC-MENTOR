import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { REFERRAL_TOKEN } from '@/lib/referrals/cookies'
import { CREDIT_SERVICES, type CreditService } from './services'

interface WalletHold {
  status: string
  reservation_id: string | null
  cost: number | null
  available: number | null
  result_id: string | null
}

export type PremiumAction =
  | { ok: true; walletReservationId: string | null; finish: (succeeded: boolean) => Promise<void> }
  | { ok: false; response: NextResponse }

type Options = Omit<Parameters<typeof reserveAiAction>[0], 'action'> & {
  action: CreditService
  packageId: string
  request: Request
  options?: unknown
}

const REPLAY_COLUMNS = {
  cover_letter: { column: 'cover_letters', responseKey: 'letter' },
  interview_qa: { column: 'interview_question_sets', responseKey: 'interview_questions' },
  mock_interview_start: { column: 'mock_interview_runs', responseKey: 'run' },
} as const

async function replay(opts: Options, resultId: string) {
  if (opts.action === 'optimization') {
    return NextResponse.json({ success: true, packageId: opts.packageId, alreadyGenerated: true })
  }
  const { column, responseKey } = REPLAY_COLUMNS[opts.action]
  const { data, error } = await createServiceRoleClient({ fresh: true }).from('packages').select(column)
    .eq('id', opts.packageId).eq('user_id', opts.userId).maybeSingle()
  if (error) return NextResponse.json({ error: 'Could not load the saved result.' }, { status: 503 })
  const rows = (data as Record<string, unknown> | null)?.[column]
  const result = Array.isArray(rows) ? rows.find(row => row?.id === resultId) : undefined
  if (!result) return NextResponse.json({ error: 'This operation already finished. Its saved result is no longer available.' }, { status: 409 })
  return NextResponse.json({ success: true, [responseKey]: result })
}

function response(status: number, error: string, code: string): PremiumAction {
  return { ok: false, response: NextResponse.json({ error, code }, { status }) }
}

export async function reservePremiumAction(opts: Options): Promise<PremiumAction> {
  const providedOperation = opts.request.headers.get('idempotency-key')
  if (providedOperation !== null && !REFERRAL_TOKEN.test(providedOperation)) {
    return response(400, 'Invalid generation request identity.', 'invalid_operation')
  }
  const admin = createServiceRoleClient({ fresh: true })
  if (!providedOperation) {
    const { data, error } = await admin.from('credit_wallet_settings').select('enforcement_enabled').eq('singleton', true).single()
    if (error || !data) return response(503, 'Could not check your credits. Try again shortly.', 'credit_unavailable')
    if (data.enforcement_enabled) return response(400, 'Refresh the service page before starting a new generation.', 'operation_required')
  }
  const operationId = providedOperation ?? crypto.randomUUID()
  const optionsDigest = createHash('sha256').update(JSON.stringify(opts.options ?? null)).digest('hex')
  const { data: hold, error } = await admin.rpc('reserve_wallet_credits', {
    p_owner: opts.userId,
    p_service: opts.action,
    p_operation_id: operationId,
    p_request_identity: opts.packageId + ':' + optionsDigest,
    p_ttl_seconds: opts.ttlSeconds ?? 360,
  }).single<WalletHold>()
  if (error || !hold) {
    console.error('Failed to check premium service credit authorization', opts.action, error?.code)
    return response(503, 'Could not check your credits. Try again shortly.', 'credit_unavailable')
  }
  if (hold.status === 'insufficient') {
    const { data: config } = await admin.from('referral_program_settings').select('enabled, reward_units').eq('singleton', true).maybeSingle()
    const required = hold.cost ?? 0
    const available = hold.available ?? 0
    const additional = Math.max(0, required - available)
    return { ok: false, response: NextResponse.json({
      error: 'You need more credits to use this service.',
      code: 'insufficient_credits',
      unlock: {
        service: CREDIT_SERVICES[opts.action], required, available, additional,
        referrals: config?.enabled && config.reward_units > 0 ? Math.ceil(additional / config.reward_units) : null,
      },
    }, { status: 402 }) }
  }
  if (hold.status === 'settled' && hold.result_id) return { ok: false, response: await replay(opts, hold.result_id) }
  if (hold.status === 'released') return response(409, 'This request ended without a charge. Start a new attempt to try again.', 'operation_released')
  if (hold.status === 'busy') return response(409, 'This request is already in progress. Wait for it to finish, then retry.', 'operation_busy')
  if (hold.status !== 'disabled' && (hold.status !== 'reserved' || !hold.reservation_id)) {
    return response(409, 'This request identity is already in use. Start a new attempt.', 'operation_conflict')
  }

  const walletReservationId = hold.reservation_id
  const release = async () => {
    if (!walletReservationId) return
    try {
      const { error: releaseError } = await admin.rpc('finish_wallet_reservation', {
        p_owner: opts.userId, p_reservation: walletReservationId,
      })
      if (releaseError) console.error('Credit release deferred to reconciliation', releaseError.code)
    } catch {
      console.error('Credit release deferred to reconciliation')
    }
  }

  let guard: Awaited<ReturnType<typeof reserveAiAction>>
  try {
    guard = await reserveAiAction(opts)
  } catch {
    await release()
    return response(503, 'Could not check service availability. Try again shortly.', 'unavailable')
  }
  if (!guard.ok) {
    await release()
    return response(guard.status, guard.error, guard.code)
  }
  return {
    ok: true,
    walletReservationId,
    finish: async succeeded => {
      if (!succeeded) await release()
      await guard.finish(succeeded)
    },
  }
}
