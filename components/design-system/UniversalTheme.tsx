'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_THEME, normalizeTheme, themeVariables, type ThemeSettings } from '@/lib/design-system/theme'
import styles from './UniversalTheme.module.css'

/** Website-only opt-in boundary. Public visits always receive code defaults;
 * draft messages are accepted exclusively from a same-origin embedding parent. */
export function UniversalTheme({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME)
  useEffect(() => {
    if (window.parent === window || new URLSearchParams(window.location.search).get('designPreview') !== '1') return
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return
      if (event.data?.type === 'gcc-design-preview') setTheme(normalizeTheme(event.data.theme))
    }
    window.addEventListener('message', receive)
    window.parent.postMessage({ type: 'gcc-design-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', receive)
  }, [])
  return <div data-universal-theme className={styles.theme} style={themeVariables(theme)}>{children}</div>
}
