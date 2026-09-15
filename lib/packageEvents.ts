import type { PackageServiceEvent, PackageServiceEventType } from '@/types/package'

export function packageEvent(
  type: PackageServiceEventType,
  label: string,
  meta?: Record<string, unknown>,
): PackageServiceEvent {
  return {
    id: crypto.randomUUID(),
    type,
    at: new Date().toISOString(),
    label,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  }
}

export function appendPackageEvent(
  existing: unknown,
  type: PackageServiceEventType,
  label: string,
  meta?: Record<string, unknown>,
): PackageServiceEvent[] {
  const events = Array.isArray(existing) ? (existing as PackageServiceEvent[]) : []
  return [...events, packageEvent(type, label, meta)]
}
