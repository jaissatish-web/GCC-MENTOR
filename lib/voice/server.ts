import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getProviderConfig, getProviderConfigExact } from '@/lib/ai/providerConfig'
import type { VoiceSession, VoiceAnswer } from './types'

export function voiceEnabled(): boolean { return process.env.VOICE_INTERVIEWS_ENABLED === 'true' }
export type VoiceTranscriptionAuth = { provider: 'openrouter' | 'openai'; apiKey: string }
export async function voiceTranscriptionAuth(): Promise<VoiceTranscriptionAuth | null> {
  // Reuse the founder's server-side OpenRouter account; never return its key to a client.
  const mock = await getProviderConfig('mock_interview')
  if (mock?.provider === 'openrouter' && mock.apiKey?.trim()) return { provider: 'openrouter', apiKey: mock.apiKey }
  const primary = await getProviderConfigExact('default')
  if (primary?.provider === 'openrouter' && primary.apiKey?.trim()) return { provider: 'openrouter', apiKey: primary.apiKey }
  const direct = process.env.VOICE_STT_API_KEY?.trim()
  return direct ? { provider: 'openai', apiKey: direct } : null
}
export async function transcriptionReady(): Promise<boolean> { return Boolean(await voiceTranscriptionAuth()) }
export function voiceAdmin() { return createServiceRoleClient({ fresh: true }) }
export async function ownVoiceSession(packageId: string, sessionId: string) {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) return { error: 'Unauthorized', status: 401 } as const
  const { data, error: readError } = await client.from('voice_interview_sessions').select('*')
    .eq('id', sessionId).eq('package_id', packageId).eq('user_id', user.id).maybeSingle()
  if (readError) return { error: 'Voice interview storage is unavailable. Please try again.', status: 503 } as const
  if (!data) return { error: 'Interview not found', status: 404 } as const
  return { session: data as VoiceSession, user, client }
}
export async function voiceAnswers(sessionId: string): Promise<VoiceAnswer[]> {
  const { data, error } = await voiceAdmin().from('voice_interview_answers').select('*').eq('session_id', sessionId)
  if (error) throw new Error('Could not read saved recordings.')
  return data as VoiceAnswer[]
}
