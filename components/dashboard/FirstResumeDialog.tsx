'use client'

import { useState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRightIcon, ArrowUpTrayIcon, ClipboardDocumentIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline'
import styles from './first-resume-dialog.module.css'

const choices = [
  { title: 'Upload resume', detail: 'Use your existing PDF or Word resume.', href: '/profile?import=upload', Icon: ArrowUpTrayIcon },
  { title: 'Paste resume text', detail: 'Copy the text from your current resume.', href: '/profile?import=paste', Icon: ClipboardDocumentIcon },
  { title: 'Type my details', detail: 'Start from scratch, one section at a time.', href: '/profile?view=details', Icon: PencilSquareIcon },
]

/** Navigation only. The canonical profile editor owns all intake and saves. */
export function FirstResumeDialog({ eligible }: { eligible: boolean }) {
  const [dismissed, setDismissed] = useState(false)
  return <Dialog.Root open={eligible && !dismissed} onOpenChange={open => { if (!open) setDismissed(true) }}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={`app-type internal-ui ${styles.dialog}`}>
        <Dialog.Close className={styles.close} aria-label="Close first resume guidance"><XMarkIcon aria-hidden="true" /></Dialog.Close>
        <p className={styles.eyebrow}>Welcome to GCC Mentor</p>
        <Dialog.Title className={styles.title}>Create your first resume</Dialog.Title>
        <Dialog.Description className={styles.description}>Choose how you’d like to start. Your details will form your Career Profile.</Dialog.Description>
        <div className={styles.choices}>{choices.map(({title, detail, href, Icon}) => <Link className={styles.choice} href={href} key={href} onClick={() => setDismissed(true)}><Icon aria-hidden="true" /><span><strong>{title}</strong><span>{detail}</span></span><ArrowRightIcon aria-hidden="true" /></Link>)}</div>
        <Dialog.Close className={styles.later}>Explore dashboard</Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
