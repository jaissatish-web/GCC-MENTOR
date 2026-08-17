import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import type { ServiceKey } from '@/lib/ai/runTask'
import { AI_SERVICES } from '@/lib/ai/runTask'

/**
 * VERSIONED PROMPTS — the founder's editing surface, and its floor.
 *
 * Founder decision 2026-08-17: prompts are edited and optimised from /admin,
 * with versions and testing, because prompt quality is product quality here.
 * Draft-then-publish was chosen over edit-goes-live, so a change can be written
 * and tested before anyone receives it.
 *
 * WHAT IS EDITABLE, AND WHAT IS NOT. A prompt has three parts and they are not
 * equally safe to hand over:
 *
 *   persona · tone · task instructions · emphasis · examples   EDITABLE
 *   the grounding block                                        NEVER
 *   the output schema                                          NEVER
 *
 * Only the first is stored here. The grounding block is injected by
 * lib/ai/runTask.ts from one constant, and the schema lives with the parser that
 * depends on it. A bad edit to the grounding block would silently turn off the
 * product's one promise and nothing downstream would catch it — the model would
 * simply start inventing. A bad edit to the schema would break every call for
 * every user. Editing must be able to change quality; it must not be able to
 * change safety.
 *
 * WHY THE FALLBACK IS THE IN-CODE PROMPT. A service with no published version
 * runs on the prompt written in its own module. That is deliberate: it means this
 * table can be introduced service by service, an unreachable database does not
 * take the product down, and deleting every row degrades to today's behaviour
 * rather than to nothing.
 */

/** Prompt keys are service keys. One list, so a key cannot be mistyped into existence. */
export type PromptKey = ServiceKey

export function isPromptKey(v: unknown): v is PromptKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(AI_SERVICES, v)
}

export type PromptStatus = 'draft' | 'active' | 'archived'

export interface PromptVersion {
  id: string
  promptKey: PromptKey
  version: number
  body: string
  status: PromptStatus
  notes: string | null
  createdAt: string
  publishedAt: string | null
}

interface Row {
  id: string
  prompt_key: string
  version: number
  body: string
  status: string
  notes: string | null
  created_at: string
  published_at: string | null
}

function mapRow(r: Row): PromptVersion {
  return {
    id: r.id,
    promptKey: r.prompt_key as PromptKey,
    version: r.version,
    body: r.body,
    status: r.status as PromptStatus,
    notes: r.notes,
    createdAt: r.created_at,
    publishedAt: r.published_at,
  }
}

const COLUMNS = 'id, prompt_key, version, body, status, notes, created_at, published_at'

/**
 * The active version for a prompt, or null to run on the in-code prompt.
 *
 * Called on every generation, so a failure here must never take generation down:
 * an unreadable table returns null and the service uses its own prompt. That is
 * the opposite bias to lib/entitlements.ts, and deliberately so — there, silence
 * means "refuse", because the thing being protected is money. Here silence means
 * "use the prompt we shipped", because the alternative is refusing to serve a
 * user over a database blip.
 */
export async function getActivePrompt(key: PromptKey): Promise<PromptVersion | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('prompt_versions')
    .select(COLUMNS)
    .eq('prompt_key', key)
    .eq('status', 'active')
    .maybeSingle()
  if (error) {
    console.error('prompt_versions read failed, using in-code prompt: key=' + key, error.message)
    return null
  }
  return data ? mapRow(data as Row) : null
}

/** Every version of one prompt, newest first — for the admin picker. */
export async function listVersions(key: PromptKey): Promise<PromptVersion[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('prompt_versions')
    .select(COLUMNS)
    .eq('prompt_key', key)
    .order('version', { ascending: false })
  if (error) {
    console.error('prompt_versions list failed: key=' + key, error.message)
    return []
  }
  return ((data ?? []) as Row[]).map(mapRow)
}

/** One row per prompt key with its active version, if any — for the index screen. */
export async function listPromptSummaries(): Promise<
  { key: PromptKey; label: string; built: boolean; active: PromptVersion | null; versionCount: number }[]
> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.from('prompt_versions').select(COLUMNS)
  if (error) console.error('prompt_versions summary failed', error.message)
  const rows = ((data ?? []) as Row[]).map(mapRow)

  return (Object.keys(AI_SERVICES) as PromptKey[]).map((key) => {
    const mine = rows.filter((r) => r.promptKey === key)
    return {
      key,
      label: AI_SERVICES[key].label,
      built: AI_SERVICES[key].built,
      active: mine.find((r) => r.status === 'active') ?? null,
      versionCount: mine.length,
    }
  })
}

/**
 * Save a new DRAFT. Never touches what is live.
 *
 * Always a new version rather than an edit, so the version referenced by an old
 * usage row stays readable. The number is derived from the current maximum: a
 * caller cannot choose it and therefore cannot overwrite history by passing one
 * that already exists.
 */
export async function createDraft(input: {
  key: PromptKey
  body: string
  notes?: string | null
  createdBy: string
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  if (!isPromptKey(input.key)) return { ok: false, error: 'Unknown prompt.' }
  const body = input.body.trim()
  if (!body) return { ok: false, error: 'A prompt cannot be empty.' }

  const supabase = createServiceRoleClient()
  const { data: existing } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_key', input.key)
    .order('version', { ascending: false })
    .limit(1)

  const next = (((existing ?? [])[0]?.version as number | undefined) ?? 0) + 1

  const { error } = await supabase.from('prompt_versions').insert({
    prompt_key: input.key,
    version: next,
    body,
    status: 'draft',
    notes: input.notes?.trim() || null,
    created_by: input.createdBy,
  })
  if (error) {
    console.error('prompt_versions draft insert failed: key=' + input.key, error.message)
    return { ok: false, error: 'Could not save that draft.' }
  }
  return { ok: true, version: next }
}

/**
 * Make one version live. Publishing and rolling back are the same operation.
 *
 * Archive-then-activate, in that order. The database carries a partial unique
 * index allowing one active row per key, so if these two steps ever race, the
 * second fails loudly instead of leaving two active versions and a silent
 * coin-flip over which prompt a user gets. Doing it in the other order would
 * make that collision certain rather than possible.
 */
export async function publishVersion(
  versionId: string,
): Promise<{ ok: true; key: PromptKey; version: number } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()

  const { data: target, error: readErr } = await supabase
    .from('prompt_versions')
    .select(COLUMNS)
    .eq('id', versionId)
    .maybeSingle()
  if (readErr || !target) return { ok: false, error: 'That version no longer exists.' }

  const row = mapRow(target as Row)
  if (row.status === 'active') return { ok: true, key: row.promptKey, version: row.version }

  const { error: archiveErr } = await supabase
    .from('prompt_versions')
    .update({ status: 'archived' })
    .eq('prompt_key', row.promptKey)
    .eq('status', 'active')
  if (archiveErr) {
    console.error('prompt_versions archive failed: key=' + row.promptKey, archiveErr.message)
    return { ok: false, error: 'Could not publish. Nothing was changed.' }
  }

  const { error: activateErr } = await supabase
    .from('prompt_versions')
    .update({ status: 'active', published_at: new Date().toISOString() })
    .eq('id', versionId)
  if (activateErr) {
    console.error('prompt_versions activate failed: id=' + versionId, activateErr.message)
    // The previous active is archived and this one did not go live, so the
    // service falls back to its in-code prompt — degraded, never broken, and
    // loud in the log. Recovering is one click on any listed version.
    return { ok: false, error: 'Could not publish. This prompt is running on its built-in text.' }
  }
  return { ok: true, key: row.promptKey, version: row.version }
}

/**
 * Stop using any stored version for a prompt — back to the in-code prompt.
 *
 * Kept as an explicit action rather than leaving "delete the row" as the only way
 * out. Nothing is deleted, so the history and every usage row that references it
 * stay intact.
 */
export async function revertToBuiltIn(key: PromptKey): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('prompt_versions')
    .update({ status: 'archived' })
    .eq('prompt_key', key)
    .eq('status', 'active')
  if (error) {
    console.error('prompt_versions revert failed: key=' + key, error.message)
    return { ok: false, error: 'Could not revert that prompt.' }
  }
  return { ok: true }
}
