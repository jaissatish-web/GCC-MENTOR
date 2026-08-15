import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  uploadPhoto,
  deletePhoto,
  signedPhotoUrl,
  validatePhoto,
  MAX_PHOTO_BYTES,
} from '@/lib/storage/profilePhoto'

/**
 * Profile photo upload / removal (TASK-113).
 *
 * POST   multipart `photo` -> stores the file, points career_profiles.photo_url
 *        at it, deletes whatever it replaced, returns a signed display URL.
 * DELETE -> clears the column and removes the object.
 *
 * The owning user always comes from the verified session, never from the
 * request, so a caller cannot write into another user's folder or repoint
 * another user's profile. Storage RLS (migration 032) is the second,
 * independent check.
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No photo was uploaded.' }, { status: 400 })
  }
  // Cheap guard before reading any bytes into memory.
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: 'Photo must be under 5MB.' }, { status: 400 })
  }

  const invalid = await validatePhoto(file)
  if (invalid) return NextResponse.json(invalid, { status: 400 })

  // Read the existing path BEFORE overwriting, so the old object can be removed
  // once the new one is safely stored.
  const { data: existing } = await supabase
    .from('career_profiles')
    .select('id, photo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) {
    return NextResponse.json(
      { error: 'Create your Career Profile before adding a photo.' },
      { status: 404 },
    )
  }

  const uploaded = await uploadPhoto(user.id, file)
  if ('error' in uploaded) return NextResponse.json(uploaded, { status: 500 })

  const { error: updateError } = await supabase
    .from('career_profiles')
    .update({ photo_url: uploaded.path })
    .eq('user_id', user.id)

  if (updateError) {
    // The column is the source of truth. If it did not move, the freshly
    // uploaded object is an orphan — remove it rather than leaving a file
    // nothing references.
    await deletePhoto(uploaded.path)
    console.error('profile photo: column update failed', updateError.message)
    return NextResponse.json({ error: 'Could not save your photo. Please try again.' }, { status: 500 })
  }

  // Only now is the previous photo genuinely unreferenced.
  if (existing.photo_url && existing.photo_url !== uploaded.path) {
    await deletePhoto(existing.photo_url)
  }

  return NextResponse.json({ photoUrl: await signedPhotoUrl(uploaded.path) })
}

export async function DELETE(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('career_profiles')
    .select('photo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('career_profiles')
    .update({ photo_url: null })
    .eq('user_id', user.id)

  if (error) {
    console.error('profile photo: clear failed', error.message)
    return NextResponse.json({ error: 'Could not remove your photo.' }, { status: 500 })
  }

  await deletePhoto(existing?.photo_url)
  return NextResponse.json({ photoUrl: null })
}
