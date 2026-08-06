'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Data deletion (TASK-037).
 *
 * docs/RULES.md §3 / docs/CAREER_PROFILE.md §7: the user must be able to
 * hard-delete their profile and all packages from Settings, and it must be
 * a real delete, not a soft flag.
 *
 * SCOPE DECISION: this deletes the user's PROFILE DATA — career_profiles,
 * every child table, and every package — not their auth.users row / login
 * credentials. The spec says "delete their profile and all packages," not
 * "close the account." Closing the login itself is a materially bigger,
 * more irreversible decision than this ticket asked for; not invented here.
 *
 * CASCADE, not manual fan-out: profile_work_experience, profile_skills,
 * profile_certifications, profile_education, profile_additional_information
 * (supabase/migrations/011_profile_children.sql) and packages
 * (supabase/migrations/012_packages.sql) all declare
 * `ON DELETE CASCADE` on profile_id -> career_profiles.id. A single DELETE
 * on career_profiles removes everything, atomically, at the database level —
 * there is no multi-step client-side fan-out to get wrong or partially fail.
 *
 * STORAGE OBJECTS: the ticket also says "and all storage objects," but no
 * code anywhere in this repo creates a Supabase Storage object yet — no
 * upload route, no bucket, no stored path column on any table. There is
 * nothing to enumerate or delete. Whoever ships photo/resume upload MUST
 * wire storage cleanup into this action at that point; not fabricated here
 * against a bucket convention that does not exist (docs/RULES.md §4 —
 * no feature outside the current phase's scope, even speculatively).
 *
 * Uses the ANON-key session client (RLS enforced), not the service-role
 * client — career_profiles' owner-only RLS already permits a user to delete
 * their own row; there is no cross-user need here, unlike rate limiting or
 * the PII access log.
 */

export interface DeleteAccountState {
  error?: string | null
}

const CONFIRM_PHRASE = 'DELETE'

export async function deleteMyData(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const confirmation = String(formData.get('confirm') ?? '').trim()
  if (confirmation !== CONFIRM_PHRASE) {
    // Server-side check even though the client also gates the button on this
    // — the client check is UX, this is the actual guard. Defense in depth
    // against a stray or scripted request bypassing the UI.
    return { error: `Type ${CONFIRM_PHRASE} exactly to confirm.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'You must be signed in to do this.' }
  }

  const { error: deleteError } = await supabase
    .from('career_profiles')
    .delete()
    .eq('user_id', user.id)

  if (deleteError) {
    // Never log field values — record id and outcome only (docs/RULES.md §3).
    console.error('account data deletion failed: user=' + user.id, deleteError.message)
    return {
      error:
        'Something went wrong deleting your data. Please try again, or email the founder if this persists.',
    }
  }

  console.info('account data deleted: user=' + user.id)

  await supabase.auth.signOut()
  redirect('/')
}
