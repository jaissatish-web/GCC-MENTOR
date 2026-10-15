'use client'
import { useApplicationWorkspace } from './ApplicationWorkspace'
import type { StageSnapshot } from './stages'
/** All navigation surfaces follow the same selected application and loaded state. */
export function useCurrentStage(): StageSnapshot | null {
  return useApplicationWorkspace()?.snapshot ?? null
}
