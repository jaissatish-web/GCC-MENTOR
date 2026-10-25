import Link from 'next/link'
import s from './premium.module.css'
const links = [['Career Profile','/profile'],['Optimize Resume','/optimize/target'],['Cover Letters','/cover-letter'],['Interview Q&A','/interview-qa'],['Mock Interview','/mock-interview'],['Resume Library','/dashboard/library'],['LinkedIn Guidance','/linkedin-optimization'],['NaukriGulf Guidance','/naukrigulf-optimization']] as const
export function LandingFooter(){
  return <footer className={s.footer}><div className={s.inner}><div className={s.footerGrid}>
    <div><Link href="/" className={s.footerBrand}>GCC MENTOR</Link><p className={s.footerCopy}>Prepare your next Gulf application with your real experience.</p></div>
    <nav aria-label="Product services"><h2>Preparation tools</h2><ul>{links.map(([text,href])=><li key={href}><Link href={href}>{text}</Link></li>)}</ul></nav>
    <div><h2>Stay connected</h2><a href="mailto:jaissatish@gmail.com">jaissatish@gmail.com</a><a href="mailto:support@gccmentor.com">Contact</a><a href="#privacy">Privacy & data control</a><a href="#faq">Common questions</a></div>
  </div><div className={s.footerBottom}><span>© {new Date().getFullYear()} GCC MENTOR</span><span>Career preparation · Employment is not guaranteed</span></div></div></footer>
}
