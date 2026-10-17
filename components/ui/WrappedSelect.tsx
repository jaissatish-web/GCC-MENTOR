'use client'

import { useId, useRef } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

/** Native disclosure with wrapping choices: long career labels stay readable on phones. */
export function WrappedSelect({ label, options, value, onChange }: {
  label: string
  options: readonly string[]
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  const disclosure = useRef<HTMLDetailsElement>(null)
  const trigger = useRef<HTMLElement>(null)
  const close = () => {
    if (disclosure.current) disclosure.current.open = false
    trigger.current?.focus()
  }
  return <div className="min-w-0 w-full">
    <span id={`${id}-label`} className="mb-1.5 block text-[13px] font-semibold">{label}</span>
    <details ref={disclosure} className="min-w-0 rounded-ctl border-2 border-gold bg-white text-ink" onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); close() }
    }}>
      <summary ref={trigger} aria-labelledby={`${id}-label ${id}-value`} className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-ctl px-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
        <span id={`${id}-value`} className="min-w-0 whitespace-normal text-[16px] leading-normal [overflow-wrap:anywhere]">{options[value]}</span>
        <ChevronDownIcon className="size-5 shrink-0" aria-hidden="true" />
      </summary>
      <div role="group" aria-labelledby={`${id}-label`} className="max-h-[min(50dvh,320px)] overflow-y-auto overscroll-contain border-t border-line p-1">
        {options.map((option, index) => <button key={option} type="button" aria-pressed={value === index} onClick={() => { onChange(index); close() }} className="flex min-h-11 w-full items-center gap-2 rounded-ctl px-3 py-2.5 text-left text-[15px] leading-normal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal aria-pressed:bg-teal-soft aria-pressed:font-semibold">
          <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]">{option}</span>
          {value === index ? <CheckIcon className="size-4 shrink-0 text-teal" aria-hidden="true" /> : null}
        </button>)}
      </div>
    </details>
  </div>
}
