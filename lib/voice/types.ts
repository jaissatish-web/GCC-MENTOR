import type { CareerProfileFull } from '@/types/careerProfile'
import type { MockInterviewRun, MockInterviewFinalReport } from '@/types/package'

export const VOICE_BUCKET = 'mock-interview-audio'
export const VOICE_RUBRIC = 'recorded-voice-v1'
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024
export const MAX_ANSWER_SECONDS = 180
export const SILENCE_SECONDS = 7
export const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg',
}
export type VoiceStatus = 'recording' | 'queued' | 'processing' | 'failed' | 'completed' | 'deleting'
export interface DeliveryMetrics {
  duration_seconds: number
  word_count: number
  words_per_minute: number | null
  long_pause_count: number | null
  filler_count: number
  timing_available: boolean
  note: string
}
export interface VoiceFeedback {
  score: number
  feedback: string
  better_answer: string
  follow_up: string | null
  grammar: string[]
}
export interface VoiceAnswer {
  session_id: string
  question_id: string
  audio_path: string
  mime_type: string
  saved_at: string | null
  duration_seconds: number | null
  byte_size: number | null
  transcript: string | null
  delivery: DeliveryMetrics | null
  feedback: VoiceFeedback | null
}
export interface VoiceSession {
  id: string
  user_id: string
  package_id: string
  run_snapshot: MockInterviewRun
  profile_snapshot: CareerProfileFull
  resume_fingerprint: string
  rubric_version: string
  status: VoiceStatus
  lease_token: string | null
  lease_until: string | null
  attempts: number
  last_error: string | null
  report: MockInterviewFinalReport | null
  created_at: string
  completed_at: string | null
}
export interface VoiceSessionView {
  id: string
  status: VoiceStatus
  last_error: string | null
  answers: VoiceAnswer[]
  history: Array<{ id: string; created_at: string; report: MockInterviewFinalReport }>
}
