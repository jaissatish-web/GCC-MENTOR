/** Successful empty reads, never absence inferred from loading or an error. */
export function shouldOfferFirstResume(state: {
  ready: boolean
  error: boolean
  profileExists: boolean
  profileLoaded: boolean
  profileError: boolean
  packagesLoaded: boolean
  packagesError: boolean
  packageCount: number
  overviewLoading: boolean
  overviewError: boolean
  resumeCount: number | undefined
  nextActionState: string
}): boolean {
  return state.ready && !state.error && state.profileLoaded && !state.profileError && !state.profileExists &&
    state.packagesLoaded && !state.packagesError && state.packageCount === 0 &&
    !state.overviewLoading && !state.overviewError && state.resumeCount === 0 && state.nextActionState === 'no_profile'
}
