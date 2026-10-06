'use client'

import { useEffect, useRef, useState } from 'react'

/** True when the visitor asked the OS for less motion. SSR default: false. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduced
}

/**
 * `seen` flips once when the element first scrolls into view (for one-shot
 * reveals and count-ups). `visible` tracks it continuously, so auto-playing
 * demos stop spending frames while they are off screen.
 */
export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      setSeen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting)
        if (entry.isIntersecting) setSeen(true)
      },
      { threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return { ref, visible, seen }
}

/**
 * Advances 0..count-1 every `ms` while `running`. Stops for good once the
 * visitor picks a step themselves — a demo that yanks the view away from what
 * someone chose to read is worse than no demo.
 */
export function useAutoStep(count: number, ms: number, running: boolean) {
  const [index, setIndex] = useState(0)
  const [manual, setManual] = useState(false)
  useEffect(() => {
    if (!running || manual) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), ms)
    return () => window.clearInterval(id)
  }, [count, ms, running, manual])
  const choose = (i: number) => {
    setManual(true)
    setIndex(i)
  }
  return { index, setIndex, choose, manual, resume: () => setManual(false) }
}

/** Counts from `from` to `to` once `start` is true. Instant under reduced motion. */
export function useCountUp(from: number, to: number, start: boolean, duration = 1100) {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (!start) return
    if (reduced) {
      setValue(to)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to, start, duration, reduced])
  return value
}
