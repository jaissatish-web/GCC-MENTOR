import { pathToFileURL } from 'node:url'

const REFERRAL_BRANCH = 'feature/referral-credit-monetization'

function matchesProject(token, project, role) {
  if (typeof token !== 'string') return false
  const segments = token.split('.')
  if (segments.length !== 3) return false
  try {
    const claims = JSON.parse(Buffer.from(segments[1], 'base64url').toString())
    return claims.iss === 'supabase' && claims.ref === project && claims.role === role
      && Number.isFinite(claims.exp) && claims.exp > Date.now() / 1000
  } catch {
    return false
  }
}

export async function verifyReferralPreview(env, request = fetch) {
  if (env.VERCEL_ENV !== 'preview' || (env.VERCEL_GIT_COMMIT_REF !== REFERRAL_BRANCH
    && !env.GCC_MENTOR_PREVIEW_TEST_REF)) return false

  const project = env.GCC_MENTOR_PREVIEW_TEST_REF ?? ''
  if (!/^[a-z]{20}$/.test(project) || env.NEXT_PUBLIC_SUPABASE_URL !== 'https://' + project + '.supabase.co') {
    throw new Error('Referral Preview requires its explicitly scoped test Supabase URL.')
  }
  if (env.DATABASE_URL !== 'preview_disabled' || env.RAZORPAY_KEY_ID !== 'preview_disabled'
    || env.RAZORPAY_KEY_SECRET !== 'preview_disabled') {
    throw new Error('Referral Preview requires isolated database variables and disabled payment credentials.')
  }
  if (!matchesProject(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, project, 'anon')
    || !matchesProject(env.SUPABASE_SERVICE_ROLE_KEY, project, 'service_role')) {
    throw new Error('Referral Preview requires test-project keys with verifiable project and role claims.')
  }
  try {
    const endpoint = new URL('/rest/v1/credit_wallet_settings?select=enforcement_enabled&limit=1', env.NEXT_PUBLIC_SUPABASE_URL)
    const result = await request(endpoint, {
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    })
    if (!result.ok) throw new Error('Test Supabase rejected the key')
  } catch {
    throw new Error('Referral Preview could not authenticate to the scoped test wallet schema.')
  }
  return true
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (await verifyReferralPreview(process.env)) console.log('Referral Preview test project and server credentials verified.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
