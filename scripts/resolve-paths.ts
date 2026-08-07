/**
 * Test-only path-alias resolver (sucrase-node does not honour tsconfig paths).
 *
 * Import this as the FIRST side-effect import in any script that imports source
 * files which use the `@/...` alias (e.g. components/templates/GulfPremium,
 * which now imports `@/lib/resumeDocument` at runtime). It remaps `@/<x>` to
 * `<repo-root>/<x>` and appends `.ts`/`.tsx`/`.js` so the file is found and
 * compiled by sucrase's require hook. Only used by the dev scripts in scripts/ —
 * never part of the app bundle (Next resolves `@/` natively).
 */
import Module from 'node:module'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const original = (Module as unknown as { _resolveFilename: Function })._resolveFilename

const candidates = (p: string): string[] => {
  if (p.endsWith('.ts') || p.endsWith('.tsx') || p.endsWith('.js') || p.endsWith('.json')) return [p]
  return [p + '.ts', p + '.tsx', p + '.js']
}

;(Module as unknown as { _resolveFilename: Function })._resolveFilename = function (
  request: string,
  parent: NodeModule,
  isMain: boolean,
  options: unknown
): string {
  if (typeof request === 'string' && request.startsWith('@/')) {
    const base = resolve(process.cwd(), request.slice(2))
    const hit = candidates(base).find((c) => existsSync(c))
    if (hit) return original.call(this, hit, parent, isMain, options)
    return original.call(this, request, parent, isMain, options)
  }
  return original.call(this, request, parent, isMain, options)
}
