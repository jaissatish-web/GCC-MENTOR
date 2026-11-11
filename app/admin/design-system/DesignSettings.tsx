'use client'

import { useEffect, useRef, useState } from 'react'
import { COLOR_FIELDS, DEFAULT_THEME, FONT_OPTIONS, NUMBER_FIELDS, normalizeTheme, contrastRatio, withThemeFont, type ThemeSettings } from '@/lib/design-system/theme'
import styles from './design-settings.module.css'
import { FoundationPreview } from './FoundationPreview'

type Device = 'mobile' | 'tablet' | 'desktop'
const DEVICES: { key: Device; label: string; width: number }[] = [
  { key: 'mobile', label: 'Mobile', width: 390 },
  { key: 'tablet', label: 'Tablet', width: 768 },
  { key: 'desktop', label: 'Desktop', width: 1440 },
]
const DRAFT_KEY = 'gcc-mentor:design-draft:v1'

function NumberControl({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  return <input type="number" min={min} max={max} step={step} value={text} onChange={(event) => {
    setText(event.target.value)
    const next = event.target.valueAsNumber
    if (Number.isFinite(next) && next >= min && next <= max) onChange(next)
  }} onBlur={() => setText(String(value))} />
}

/** Drafts stay on this browser. There is deliberately no production write path. */
export function DesignSettings() {
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME)
  const [device, setDevice] = useState<Device>('mobile')
  const [status, setStatus] = useState('Preview uses the Executive Slate & Teal default.')
  const [dirty, setDirty] = useState(false)
  const [previewReady, setPreviewReady] = useState(false)
  const [previewDelayed, setPreviewDelayed] = useState(false)
  const iframe = useRef<HTMLIFrameElement>(null)
  const currentTheme = useRef(theme)
  currentTheme.current = theme

  const sendPreview = () => {
    iframe.current?.contentWindow?.postMessage({ type: 'gcc-design-preview', theme: currentTheme.current }, window.location.origin)
  }

  useEffect(() => {
    try {
      const draft = window.localStorage.getItem(DRAFT_KEY)
      if (draft) {
        setTheme(normalizeTheme(JSON.parse(draft)))
        setStatus('Saved browser draft restored. Your live website has not changed.')
      }
    } catch {
      setStatus('The saved browser draft could not be loaded. The default theme is shown.')
    }
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframe.current?.contentWindow) return
      if (event.data?.type === 'gcc-design-preview-ready') {
        setPreviewReady(true)
        iframe.current?.contentWindow?.postMessage({ type: 'gcc-design-preview', theme: currentTheme.current }, window.location.origin)
      }
    }
    const timeout = window.setTimeout(() => setPreviewDelayed(true), 20000)
    window.addEventListener('message', receive)
    return () => { window.removeEventListener('message', receive); window.clearTimeout(timeout) }
  }, [])

  useEffect(() => {
    iframe.current?.contentWindow?.postMessage({ type: 'gcc-design-preview', theme }, window.location.origin)
  }, [theme])

  function update(next: ThemeSettings) {
    setTheme(normalizeTheme(next))
    setDirty(true)
    setStatus('Unsaved preview changes. Your live website has not changed.')
  }

  function saveDraft() {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(normalizeTheme(theme)))
      setDirty(false)
      setStatus('Draft saved in this browser only. It is not published or shared across devices.')
    } catch {
      setStatus('This browser could not save the draft. Your preview changes are still visible.')
    }
  }

  const selectedDevice = DEVICES.find((entry) => entry.key === device)!
  const sections = Array.from(new Set(NUMBER_FIELDS.map((field) => field.section)))
  const contrastWarnings = [
    ['Primary text on cards', theme.colors.ink, theme.colors.surface],
    ['Secondary text on cards', theme.colors.muted, theme.colors.surface],
    ['Primary button text', theme.colors.primaryText, theme.buttonBackground ?? theme.colors.brand],
  ].filter(([, foreground, background]) => contrastRatio(foreground, background) < 4.5).map(([label]) => label)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Website appearance</p>
          <h1>Universal Design Settings</h1>
          <p>Adjust your website theme in one place. Resume documents keep their existing design.</p>
        </div>
        <span className={styles.badge}>Landing-page pilot</span>
      </header>

      <div className={styles.notice}>
        <strong>Preview and browser drafts are available.</strong>
        <p>Live publishing and restoring a published theme need an approved secure storage update. These controls do not change the live website. Remaining app pages will be connected after approval.</p>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={saveDraft}>Save browser draft{dirty ? ' *' : ''}</button>
        <button type="button" onClick={() => { update(DEFAULT_THEME); setStatus('Default preset restored in preview. Save the browser draft to keep it.') }}>Reset to default</button>
        <button type="button" disabled aria-describedby="publishing-help">Publish</button>
        <button type="button" disabled aria-describedby="publishing-help">Restore previous published theme</button>
      </div>
      <p id="publishing-help" className={styles.helper}>Publishing and rollback are unavailable until persistence is approved and tested.</p>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>

      <div className={styles.workspace}>
        <section className={styles.settings} aria-label="Theme controls">
          <div className={styles.preset}>
            <label htmlFor="theme-preset">Theme preset</label>
            <select id="theme-preset" value="executive" onChange={() => update(DEFAULT_THEME)}>
              <option value="executive">Executive Slate &amp; Teal</option>
            </select>
            <p className={styles.helper}>One approved starting point. Every value below can be previewed independently.</p>
          </div>

          <details open>
            <summary>Theme colors</summary>
            <div className={styles.fields}>
              {contrastWarnings.length > 0 && <p className={styles.contrastWarning} role="status">Contrast below 4.5:1: {contrastWarnings.join(', ')}. Choose more distinct colors for readable text.</p>}
              {COLOR_FIELDS.map((field) => (
                <label className={styles.colorField} key={field.key}>
                  <span>{field.label}</span>
                  <input type="color" value={theme.colors[field.key]} onChange={(event) => update({ ...theme, colors: { ...theme.colors, [field.key]: event.target.value } })} />
                  <span className={styles.hex}>{theme.colors[field.key].toUpperCase()}</span>
                </label>
              ))}
            </div>
          </details>

          <details open>
            <summary>Primary button background</summary>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Follow primary color</span>
                <input type="checkbox" checked={!theme.buttonBackground} onChange={(event) => update({ ...theme, buttonBackground: event.target.checked ? undefined : theme.colors.brand })} />
              </label>
              {theme.buttonBackground && <label className={styles.colorField}>
                <span>Button background</span>
                <input type="color" value={theme.buttonBackground} onChange={(event) => update({ ...theme, buttonBackground: event.target.value })} />
                <span className={styles.hex}>{theme.buttonBackground}</span>
              </label>}
            </div>
          </details>

          <details open>
            <summary>Font family</summary>
            <div className={styles.fields}>
              <label className={styles.field}>
                <span>Website font</span>
                <select value={theme.fontFamily} onChange={(event) => update(withThemeFont(theme, event.target.value as ThemeSettings['fontFamily']))}>
                  {FONT_OPTIONS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                </select>
              </label>
              <p className={styles.helper}>Uses bundled or installed fonts. Resume fonts are separate.</p>
            </div>
          </details>

          <div className={styles.responsiveHeading}>
            <h2>Responsive settings</h2>
            <p>Choose a device to edit its values and preview the same width.</p>
            <div className={styles.deviceTabs} role="group" aria-label="Edit responsive values">
              {DEVICES.map((entry) => <button type="button" key={entry.key} aria-pressed={device === entry.key} onClick={() => setDevice(entry.key)}>{entry.label}</button>)}
            </div>
          </div>

          {sections.map((section, index) => (
            <details key={section} open={index === 0}>
              <summary>{section}</summary>
              <div className={styles.fields}>
                {NUMBER_FIELDS.filter((field) => field.section === section).map((field) => (
                  <label className={styles.field} key={`${device}-${field.key}`}>
                    <span>{field.label} <small>{field.unit}</small></span>
                    <NumberControl
                      min={field.min} max={field.max} step={field.step}
                      value={theme[device][field.key]}
                      onChange={(value) => update({ ...theme, [device]: { ...theme[device], [field.key]: value } })}
                    />
                  </label>
                ))}
              </div>
            </details>
          ))}
        </section>

        <section className={styles.preview} aria-label="Live landing-page preview">
          <header className={styles.previewHeader}>
            <div><h2>Live preview</h2><p>{selectedDevice.label} · {selectedDevice.width}px · {previewReady ? 'Connected' : 'Loading preview'}</p></div>
            <button type="button" onClick={sendPreview}>Refresh theme</button>
          </header>
          {previewDelayed && !previewReady && <p className={styles.contrastWarning} role="status">The landing preview has not connected. Reload this page to retry. Your controls and browser draft are still available.</p>}
          <p className={styles.helper}>Scroll inside the preview to inspect the full landing page. Wide layouts scroll horizontally on smaller screens.</p>
          <div className={styles.previewScroll}>
            <iframe
              ref={iframe}
              src="/?designPreview=1"
              title={`${selectedDevice.label} landing page design preview`}
              style={{ width: selectedDevice.width }}
              onLoad={sendPreview}
            />
          </div>
          <FoundationPreview theme={theme} device={device} />
        </section>
      </div>
    </main>
  )
}
