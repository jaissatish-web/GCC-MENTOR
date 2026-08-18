import { redirect } from 'next/navigation'

/**
 * Retired 2026-08-18. Resume creation now happens INLINE on the Career Profile
 * page — upload, paste or fill manually, all on one screen inside the app shell
 * (components/profile/ResumeImport.tsx). The old chooser here hopped out to
 * /onboarding/extracting, which left the shell and had an inconsistent back
 * button; that whole detour is gone.
 *
 * Kept only as a redirect so the dashboard's first-run CTA, the onboarding
 * fallback, and any old bookmark still land in the right place.
 */
export default function CreateResumePage() {
  redirect('/profile')
}
