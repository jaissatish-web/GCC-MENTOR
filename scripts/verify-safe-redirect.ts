/**
 * Assertions for the post-auth redirect rule (audit H05 + M09).
 *
 *   node_modules/.bin/sucrase-node scripts/verify-safe-redirect.ts
 *
 * Every hostile variant here either appears in public open-redirect write-ups
 * or is a way URL parsers normalise input. The rule must send all of them to
 * the fallback, and must keep the app's own deep links — including the query
 * string that carries a package id — intact.
 */

import './resolve-paths'
import { safeRedirectPath, sameOriginRedirectUrl, DEFAULT_AFTER_LOGIN } from '../lib/safeRedirect'

let failures = 0
function check(name: string, cond: boolean) {
  if (cond) console.log(`  PASS  ${name}`)
  else {
    console.error(`  FAIL  ${name}`)
    failures++
  }
}

console.log('\nApp deep links are kept')
check('/dashboard', safeRedirectPath('/dashboard') === '/dashboard')
check('package page with id', safeRedirectPath('/package/7f1c2e') === '/package/7f1c2e')
check('service with ?package= keeps the query', safeRedirectPath('/interview-qa?package=abc') === '/interview-qa?package=abc')
check('mock report deep link keeps two params', safeRedirectPath('/mock-interview?package=a&run=b') === '/mock-interview?package=a&run=b')
check('cover letter preselect', safeRedirectPath('/cover-letter?package=x') === '/cover-letter?package=x')
check('onboarding', safeRedirectPath('/onboarding') === '/onboarding')
check('password update page', safeRedirectPath('/auth/update-password') === '/auth/update-password')
check('encoded slashes stay a path on this origin', safeRedirectPath('/package/%2F%2Fevil.example') === '/package/%2F%2Fevil.example')

console.log('\nHostile destinations fall back')
const hostile: Array<[string, unknown]> = [
  ['absolute https URL', 'https://evil.example/dashboard'],
  ['scheme-only', 'http:evil.example'],
  ['javascript: URL', 'javascript:alert(1)'],
  ['protocol-relative', '//evil.example'],
  ['protocol-relative with path', '//evil.example/dashboard'],
  ['slash-backslash', '/\\evil.example'],
  ['double backslash', '\\\\evil.example'],
  ['backslash later in path', '/dashboard\\..\\..\\evil'],
  ['user-info concatenation', '@evil.example'],
  ['dot-host concatenation', '.evil.example'],
  ['tab smuggling', '/\t/evil.example'],
  ['newline smuggling', '/dashboard\n//evil.example'],
  ['leading space', ' /dashboard'],
  ['dot segment normalises to //', '/.//evil.example'],
  ['unknown section', '/not-a-page'],
  ['auth page would loop', '/login'],
  ['signup would loop', '/signup'],
  ['callback would loop', '/auth/callback?next=/dashboard'],
  ['prefix lookalike', '/dashboardevil'],
  ['empty string', ''],
  ['null', null],
  ['number', 42],
  ['over-long', '/dashboard?' + 'a'.repeat(3000)],
]
for (const [name, value] of hostile) {
  check(name, safeRedirectPath(value) === DEFAULT_AFTER_LOGIN)
}

console.log('\nAbsolute URL construction never leaves the origin')
const origin = 'https://gcc-mentor.vercel.app'
check('safe path builds on the origin', sameOriginRedirectUrl('/package/1?tab=a', origin).href === origin + '/package/1?tab=a')
check('@host cannot change the host', sameOriginRedirectUrl('@evil.example', origin).origin === origin)
check('//host cannot change the host', sameOriginRedirectUrl('//evil.example', origin).origin === origin)
check('custom fallback is honoured', safeRedirectPath('//x', '/onboarding') === '/onboarding')

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`)
  process.exit(1)
}
console.log('\nAll safe-redirect checks passed')
