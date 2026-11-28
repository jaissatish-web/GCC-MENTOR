'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronDown, Coins, CreditCard, Gift, Settings, ShieldCheck, Trash2, UserRound, UserRoundCog } from 'lucide-react'
import styles from './settings.module.css'

const sections = [
  { id: 'account', title: 'Personal Account', description: 'Your profile information and career details.', icon: UserRoundCog, tone: 'account' },
  { id: 'security', title: 'Account Security', description: 'Manage your email and account security.', icon: ShieldCheck, tone: 'account' },
  { id: 'credits', title: 'Credits & Rewards', description: 'Your credit balance, referral rewards and credit history.', short: 'Credit balance and referral rewards.', icon: Coins, tone: 'referral' },
  { id: 'payments', title: 'Billing & Payments', description: 'Purchases and payment information.', icon: CreditCard, tone: 'credits' },
  { id: 'privacy', title: 'Privacy & Data', description: 'Manage your data and deletion settings.', icon: Trash2, tone: 'danger' },
] as const

type SectionId = typeof sections[number]['id']
type WalletView = 'referrals' | 'history'
const WalletNavigation = createContext<{ view: WalletView; select: (view: WalletView) => void } | null>(null)

export function SettingsWalletControls() {
  const wallet = useContext(WalletNavigation)
  if (!wallet) return null
  return <div className={styles.walletControls} role="group" aria-label="Credit wallet views">
    {(['referrals', 'history'] as const).map(view => (
      <button key={view} type="button" aria-pressed={wallet.view === view} onClick={() => wallet.select(view)}>
        {view === 'referrals' ? 'Refer & Earn' : 'Credit History'}
      </button>
    ))}
  </div>
}

export function SettingsWorkspace({ initialSection, initialView, memberSince, balance, earned, purchases, children } : {
  initialSection?: SectionId
  initialView: WalletView
  memberSince: string
  balance: string
  earned: string
  purchases: string
  children: Record<SectionId, ReactNode>
}) {
  const [expanded, setExpanded] = useState<SectionId | undefined>(initialSection)
  const [view, select] = useState(initialView)
  const jumpTo = useRef<SectionId | undefined>(undefined)
  const summaries = [
    { id: 'account', title: 'Account', label: 'Member since', value: memberSince, icon: UserRound, tone: 'account' },
    { id: 'credits', title: 'Credits', label: 'Available balance', value: balance, icon: Coins, tone: 'credits' },
    { id: 'credits', title: 'Referral Rewards', short: 'Referral', label: 'Total earned', value: earned, icon: Gift, tone: 'referral' },
    { id: 'payments', title: 'Payments', label: 'Unlocked', value: purchases, icon: CreditCard, tone: 'payments' },
  ] as const

  useEffect(() => {
    if (!initialSection && window.matchMedia('(min-width: 768px)').matches) setExpanded('account')
  }, [initialSection])

  function scrollToSection(id: SectionId) {
    const section = document.getElementById('settings-' + id)
    section?.querySelector('button')?.focus({ preventScroll: true })
    section?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'nearest',
    })
  }

  useEffect(() => {
    if (jumpTo.current && jumpTo.current === expanded) {
      scrollToSection(jumpTo.current)
      jumpTo.current = undefined
    }
  }, [expanded])

  function openSummary(id: SectionId, tone: string) {
    if (id === 'credits') select(tone === 'referral' ? 'referrals' : 'history')
    if (id === expanded) {
      scrollToSection(id)
      return
    }
    jumpTo.current = id
    setExpanded(id)
  }

  return <main className={styles.workspace}>
    <header className={styles.heading} data-website-ui>
      <span className={styles.headingIcon}><Settings size={30} aria-hidden="true" /></span>
      <div><h1>Settings</h1><p>Manage your account, credits, payments and data in one place.</p></div>
    </header>
    <div className={styles.summaries} data-website-ui>
      {summaries.map(({ id, title, label, value, icon: Icon, tone, ...item }) => (
        <button key={title} type="button" data-tone={tone} className={styles.summary}
          aria-controls={'settings-panel-' + id} onClick={() => openSummary(id, tone)}>
          <span className={styles.icon}><Icon size={23} aria-hidden="true" /></span>
          <span className={styles.summaryText}>
            <span className={styles.title}>{'short' in item ? <><span className={styles.desktop}>{title}</span><span className={styles.mobile}>{item.short}</span></> : title}</span>
            <span className={styles.summaryLabel}>{label}</span>
            <strong>{value}</strong>
          </span>
        </button>
      ))}
    </div>

    <WalletNavigation.Provider value={{ view, select }}>
      <div className={styles.sections} data-wallet-view={view}>
        {sections.map(({ id, title, description, icon: Icon, tone, ...section }) => {
          const open = expanded === id
          return <section key={id} id={'settings-' + id} data-tone={tone}
            data-open={open} className={styles.section}>
            <h2 data-website-ui><button type="button" id={'settings-trigger-' + id} aria-expanded={open}
              aria-controls={'settings-panel-' + id} className={styles.trigger}
              onClick={() => setExpanded(open ? undefined : id)}>
              <span className={styles.icon}><Icon size={24} aria-hidden="true" /></span>
              <span className={styles.sectionText}>
                <span className={styles.title}>{title}</span>
                <span className={styles.description}>{'short' in section ? <><span className={styles.desktop}>{description}</span><span className={styles.mobile}>{section.short}</span></> : description}</span>
              </span>
              <ChevronDown className={styles.chevron} size={19} aria-hidden="true" />
            </button></h2>
            <div id={'settings-panel-' + id} role="region" aria-labelledby={'settings-trigger-' + id}
              inert={!open} className={styles.collapse}>
              <div className={styles.clip}><div className={styles.body}>{children[id]}</div></div>
            </div>
          </section>
        })}
      </div>
    </WalletNavigation.Provider>
  </main>
}
