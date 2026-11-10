import { themeVariables, type Device, type ThemeSettings } from '@/lib/design-system/theme'
import foundation from '@/components/design-system/UniversalTheme.module.css'
import styles from './foundation-preview.module.css'

/** Illustrative UI only: no profile data, service actions or document rendering. */
export function FoundationPreview({ theme, device }: { theme: ThemeSettings; device: Device }) {
  return (
    <div data-universal-theme data-uds-specimen data-uds-device={device} style={themeVariables(theme)} className={`${foundation.theme} ${foundation.surface} ${styles.specimen}`}>
      <header>
        <h2 className={foundation.pageTitle}>Shared component preview</h2>
        <p className={foundation.helper}>Foundation samples for controls and states. Remaining application pages are not connected yet.</p>
      </header>
      <section className={styles.section} aria-label="Typography samples">
        <h3 className={foundation.sectionTitle}>Prepare with clarity</h3>
        <p className={foundation.body}>One Career Profile supports your job preparation. Your verified professional information stays at the center.</p>
        <p className={`${foundation.body} ${styles.report}`}>Report reading sample: Review your answer, identify one improvement and practise again. Comfortable line spacing keeps longer feedback easy to follow.</p>
        <p className={foundation.score}>82 <span className={foundation.helper}>Sample score</span></p>
      </section>
      <section className={styles.section} aria-label="Button samples">
        <h3 className={foundation.cardTitle}>Buttons</h3>
        <div className={styles.row}>
          <button type="button" className={foundation.button}>Primary action</button>
          <button type="button" className={`${foundation.button} ${foundation.secondary}`}>Secondary</button>
          <button type="button" className={`${foundation.button} ${foundation.tertiary}`}>Tertiary</button>
          <button type="button" className={`${foundation.button} ${foundation.danger}`}>Danger sample</button>
          <button type="button" className={`${foundation.button} ${foundation.small}`}>Small</button>
          <button type="button" className={`${foundation.button} ${foundation.large}`}>Large</button>
          <button type="button" className={foundation.button} disabled>Disabled</button>
          <button type="button" className={foundation.button} aria-busy="true" aria-disabled="true"><span className={styles.spinner} aria-hidden="true" />Loading sample</button>
        </div>
      </section>
      <section className={styles.section} aria-label="Card samples">
        <h3 className={foundation.cardTitle}>Cards and status</h3>
        <div className={styles.grid}>
          <div className={foundation.card}><h4 className={foundation.cardTitle}>Standard card</h4><p className={foundation.body}>Calm surfaces and clear hierarchy.</p></div>
          <button type="button" className={`${foundation.card} ${foundation.interactive} ${styles.cardButton}`}><strong className={foundation.cardTitle}>Interactive card</strong><span className={foundation.helper}>Hover or focus to inspect.</span></button>
          <div className={`${foundation.card} ${foundation.selected}`}><h4 className={foundation.cardTitle}>Selected</h4><p className={foundation.body}>An active choice.</p></div>
          <div className={`${foundation.card} ${foundation.highlighted}`}><h4 className={foundation.cardTitle}>Highlighted</h4><p className={foundation.body}>One useful next step.</p></div>
          <div className={`${foundation.card} ${foundation.success}`}><h4 className={foundation.cardTitle}>Success</h4><p className={foundation.body}>Your sample is complete.</p></div>
          <div className={`${foundation.card} ${foundation.warning}`}><h4 className={foundation.cardTitle}>Warning</h4><p className={foundation.body}>Review missing details.</p></div>
          <div className={`${foundation.card} ${foundation.error}`}><h4 className={foundation.cardTitle}>Error</h4><p className={foundation.body}>A sample field needs attention.</p></div>
        </div>
      </section>
      <section className={styles.section} aria-label="Form samples">
        <h3 className={foundation.cardTitle}>Forms</h3>
        <div className={foundation.form}>
          <label className={styles.label}><span className={foundation.body}>Target job title</span><input className={foundation.input} placeholder="For example, Project Engineer" /></label>
          <label className={styles.label}><span className={foundation.body}>Preparation notes</span><textarea className={foundation.input} rows={3} placeholder="Write a brief sample note" /></label>
          <label className={styles.label}><span className={foundation.body}>Target destination</span><select className={foundation.input} defaultValue=""><option value="">Choose a destination</option><option>Saudi Arabia</option><option>United Arab Emirates</option><option>Open to all GCC countries</option></select></label>
          <label className={styles.label}><span className={foundation.body}>Error state sample</span><input className={foundation.input} aria-invalid="true" aria-describedby="sample-field-error" defaultValue="Incomplete example" /><span id="sample-field-error" className={`${foundation.helper} ${styles.errorText}`}>Example validation message.</span></label>
          <label className={styles.label}><span className={foundation.body}>Disabled field</span><input className={foundation.input} disabled value="Sample unavailable field" readOnly /></label>
          <label className={styles.check}><input type="checkbox" /><span className={foundation.body}>Sample checkbox</span></label>
          <fieldset className={styles.radios}><legend className={foundation.body}>Sample preference</legend><label className={styles.check}><input type="radio" name="sample-preference" defaultChecked /><span className={foundation.body}>Option one</span></label><label className={styles.check}><input type="radio" name="sample-preference" /><span className={foundation.body}>Option two</span></label></fieldset>
          <label className={styles.label}><span className={foundation.body}>Sample upload</span><input type="file" className={foundation.input} aria-describedby="sample-file-help" /><span id="sample-file-help" className={foundation.helper}>Local preview only. No files are uploaded or saved.</span></label>
        </div>
      </section>
    </div>
  )
}
