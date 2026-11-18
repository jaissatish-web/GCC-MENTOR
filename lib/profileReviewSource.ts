/** Current-tab source identity only. File bytes and pasted text never enter browser storage. */
export interface ReviewSourceIdentity { digest: string; size: number }
export type ReviewSourceKind = 'original' | 'reference' | 'extracted'

export async function digestSource(bytes: Uint8Array): Promise<string> {
  // Copy to an ordinary ArrayBuffer so browser WebCrypto never receives a SharedArrayBuffer.
  const digest = await globalThis.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes).buffer)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function identifyReattachedSource(recorded: ReviewSourceIdentity | null | undefined, incoming: ReviewSourceIdentity): 'original' | 'reference' {
  return recorded && /^[a-f0-9]{64}$/.test(recorded.digest) && recorded.digest === incoming.digest && recorded.size === incoming.size ? 'original' : 'reference'
}

export function sourceDisplay(kind: ReviewSourceKind): { label: string; notice: string } {
  if (kind === 'original') return { label: 'Original resume', notice: 'Read-only source. Your edits do not change this file.' }
  if (kind === 'reference') return { label: 'Reference file', notice: 'This file is not confirmed as the original resume. Use it for reference only.' }
  return { label: 'Originally extracted details', notice: 'These are the initial extracted details, not the original file. Reattach the original to compare it.' }
}
