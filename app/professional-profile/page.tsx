import { redirect } from 'next/navigation'

// Keep existing bookmarks useful without retaining the retired hub.
export default function Page() {
  redirect('/linkedin-optimization')
}
