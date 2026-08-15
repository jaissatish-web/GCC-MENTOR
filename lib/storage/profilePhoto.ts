import { createClient } from '@/lib/supabase/server'

/**
 * Profile photo storage (TASK-113).
 *
 * career_profiles.photo_url holds the storage OBJECT PATH, never a URL — see
 * migration 032 for why. Everything that needs to *display* the photo calls
 * signedPhotoUrl() to mint a short-lived link at read time.
 *
 * All calls use the session client, so Supabase's own RLS on storage.objects is
 * the enforcement point rather than app-level checks. A caller cannot reach
 * another user's folder even if a path were tampered with.
 */

export const PHOTO_BUCKET = 'profile-photos'

/** Deliberately narrow: these three cover every real phone and camera export. */
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

/** How long a display link stays valid. Long enough to render a page and a PDF. */
const SIGNED_URL_TTL_SECONDS = 60 * 30

export interface PhotoValidationError {
  error: string
}

/**
 * Validate an uploaded file before it touches storage.
 *
 * The MIME type from the browser is advisory, so the magic bytes are checked
 * too — a renamed .exe reporting `image/jpeg` must not be stored and later
 * served back to a browser.
 */
export async function validatePhoto(file: File): Promise<PhotoValidationError | null> {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
    return { error: 'Please upload a JPG, PNG or WebP image.' }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: 'Photo must be under 5MB.' }
  }
  if (file.size < 100) {
    return { error: 'That file looks empty. Please choose another photo.' }
  }

  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  const isPng =
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
  // RIFF....WEBP
  const isWebp =
    head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50

  if (!isJpeg && !isPng && !isWebp) {
    return { error: 'That file is not a valid image. Please upload a JPG, PNG or WebP.' }
  }
  return null
}

function extensionFor(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Store a new photo and return its object path.
 *
 * The filename is random rather than derived from the original: user-supplied
 * names carry no useful information here and would otherwise end up in a path.
 */
export async function uploadPhoto(
  userId: string,
  file: File
): Promise<{ path: string } | PhotoValidationError> {
  const supabase = await createClient()
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file.type)}`

  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    console.error('profilePhoto upload failed', error.message)
    return { error: 'Could not save your photo. Please try again.' }
  }
  return { path }
}

/**
 * Remove an object. Failures are logged, never surfaced.
 *
 * This is only ever called to clean up a photo the user has already replaced or
 * deleted; the authoritative change is the `photo_url` column. Failing the whole
 * request because a now-unreferenced file lingered would be the wrong trade —
 * the worst case is one orphaned object, not incorrect state.
 */
export async function deletePhoto(path: string | null | undefined): Promise<void> {
  if (!path) return
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([path])
    if (error) console.error('profilePhoto delete failed', error.message)
  } catch (e) {
    console.error('profilePhoto delete threw', e instanceof Error ? e.message : String(e))
  }
}

/**
 * Mint a short-lived display URL for a stored path.
 *
 * Returns null rather than throwing when the object is missing or the path is
 * empty, so a profile whose photo was removed out-of-band still renders — just
 * without a picture.
 */
export async function signedPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  // Historical rows may hold a full URL from before this feature existed;
  // pass those straight through rather than trying to sign them.
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error || !data?.signedUrl) return null
    return data.signedUrl
  } catch {
    return null
  }
}
