'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Sign out — founder request 2026-09-11, reached from the three-bar menu.
 *
 * Until then there was no way to sign out at all. On a shared or borrowed
 * phone, which is how many of these users work, that left the next person
 * holding the previous one's full Career Profile.
 *
 * THIS DEVICE ONLY. `scope: 'local'` revokes the current session and leaves
 * the same person's other devices signed in. The library default is 'global',
 * which would sign their laptop out because they tapped a button on their
 * phone.
 *
 * THE COOKIES GO EVEN IF THE REVOKE FAILS. supabase-js keeps the session when
 * the revoke call errors for any reason other than "already gone" — a network
 * blip would leave the user signed in after they asked to leave. Deleting the
 * `sb-` cookies directly means the browser forgets the session regardless; the
 * worst case is an orphaned server-side session that expires on its own.
 *
 * `revalidatePath` drops the client router cache, so Back cannot show a
 * signed-in page from memory after the session is gone.
 */
export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut({ scope: 'local' })

  if (error) {
    console.error('sign-out: session revoke failed, clearing cookies anyway:', error.message)
    const cookieStore = await cookies()
    for (const { name } of cookieStore.getAll()) {
      if (name.startsWith('sb-')) cookieStore.delete(name)
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
