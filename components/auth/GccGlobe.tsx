'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Pause, Play } from 'lucide-react'
import { gccDestinations } from '../landing-premium/gccDestinations'
import { useReducedMotion } from '../landing-v3/hooks'
import { LAND_DOTS_B64 } from './globeDots'
import s from './gcc-globe.module.css'

/**
 * GCC globe, a digital, dotted Earth that sways around the Gulf while flight
 * paths run toward the six GCC countries.
 *
 * Plain canvas 2D, no library: an orthographic projection of ~4.8k land dots
 * (globeDots.ts, generated from Natural Earth), great-circle arcs lifted off
 * the surface, and a moving dotted trail + glowing head per flight.
 *
 * Cost control: one rAF loop, running only while the globe is on screen and
 * the tab is visible; device-pixel ratio capped at 2; dots drawn in five depth
 * buckets (five fills per frame, not five thousand). Reduced motion: a single
 * static frame with every route drawn.
 */

type City = { name: string; lat: number; lng: number }
type Gcc = City & { code: string; country: string; dx: number; dy: number }

const GCC: Gcc[] = [
  { code: 'SA', country: 'Saudi Arabia', name: 'Riyadh', lat: 24.71, lng: 46.68, dx: -104, dy: 34 },
  { code: 'KW', country: 'Kuwait', name: 'Kuwait City', lat: 29.38, lng: 47.99, dx: -112, dy: -58 },
  { code: 'BH', country: 'Bahrain', name: 'Manama', lat: 26.23, lng: 50.59, dx: 14, dy: -88 },
  { code: 'QA', country: 'Qatar', name: 'Doha', lat: 25.29, lng: 51.53, dx: 10, dy: 78 },
  { code: 'AE', country: 'UAE', name: 'Dubai', lat: 25.2, lng: 55.27, dx: 92, dy: -56 },
  { code: 'OM', country: 'Oman', name: 'Muscat', lat: 23.59, lng: 58.41, dx: 104, dy: 22 },
]

const ORIGINS: Record<string, City> = {
  Kochi: { name: 'Kochi', lat: 9.93, lng: 76.27 },
  Mumbai: { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  Delhi: { name: 'Delhi', lat: 28.61, lng: 77.21 },
}

type Flight = { from: string; to: string }

const FLIGHTS: Flight[] = [
  { from: 'Delhi', to: 'SA' },
  { from: 'Mumbai', to: 'AE' },
  { from: 'Kochi', to: 'QA' },
  { from: 'Delhi', to: 'KW' },
  { from: 'Mumbai', to: 'BH' },
  { from: 'Kochi', to: 'OM' },
]

const DEG = Math.PI / 180
const TILT = 22 * DEG
const CENTER_LNG = 58
const FLIGHT_MS = 3400
const ARC_STEPS = 60

type V3 = [number, number, number]
const toV = (lat: number, lng: number): V3 => [Math.cos(lat * DEG) * Math.sin(lng * DEG), Math.sin(lat * DEG), Math.cos(lat * DEG) * Math.cos(lng * DEG)]

function cityOf(key: string): City {
  return GCC.find((g) => g.code === key) ?? ORIGINS[key]
}

/** Great-circle points from a to b, lifted off the surface in the middle. */
function arcPoints(a: City, b: City): V3[] {
  const va = toV(a.lat, a.lng)
  const vb = toV(b.lat, b.lng)
  const dot = Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2]))
  const w = Math.acos(dot)
  const lift = 0.11 + 0.50 * (w / Math.PI)
  const pts: V3[] = []
  for (let i = 0; i <= ARC_STEPS; i++) {
    const t = i / ARC_STEPS
    const s1 = Math.sin((1 - t) * w) / Math.sin(w)
    const s2 = Math.sin(t * w) / Math.sin(w)
    const h = 1 + lift * Math.sin(Math.PI * t)
    pts.push([(va[0] * s1 + vb[0] * s2) * h, (va[1] * s1 + vb[1] * s2) * h, (va[2] * s1 + vb[2] * s2) * h])
  }
  return pts
}

function decodeDots(): Float32Array {
  const bin = atob(LAND_DOTS_B64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  const pairs = new Int16Array(bytes.buffer)
  const out = new Float32Array((pairs.length / 2) * 3)
  for (let i = 0, j = 0; i < pairs.length; i += 2, j += 3) {
    const v = toV(pairs[i] / 10, pairs[i + 1] / 10)
    out[j] = v[0]
    out[j + 1] = v[1]
    out[j + 2] = v[2]
  }
  return out
}

export function GccGlobe() {
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const focusRef = useRef<string | null>(null)
  const drawRef = useRef<(() => void) | null>(null)
  const kickRef = useRef<(() => void) | null>(null)
  const pausedRef = useRef(false)
  const reducedMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [focus, setFocus] = useState<string | null>(null)
  const [arrival, setArrival] = useState<Flight | null>(null)
  const arcs = useMemo(() => FLIGHTS.map((f) => arcPoints(cityOf(f.from), cityOf(f.to))), [])

  useEffect(() => {
    focusRef.current = focus
  }, [focus])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const font = getComputedStyle(canvas).fontFamily
    const land = '52, 149, 255'
    const route = '132, 222, 255'

    const dots = decodeDots()
    const nDots = dots.length / 3
    const reduced = reducedMotion
    let size = 0
    let dpr = 1
    let frame = 0
    let visible = false
    let lam = CENTER_LNG * DEG
    let drag: { x: number; lam: number } | null = null
    let dragOffset = 0
    let elapsed = 0
    let lastDraw = 0
    const lastArrived = new Array(FLIGHTS.length).fill(-1)

    const resize = () => {
      size = wrap.clientWidth
      if (!size) return
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      if (!frame) draw()
    }

    // World → screen for the current rotation. Returns [sx, sy, depth, onFront].
    const cosT = Math.cos(TILT)
    const sinT = Math.sin(TILT)
    let cosL = 1
    let sinL = 0
    const project = (x: number, y: number, z: number, R: number, c: number, cy: number): [number, number, number, boolean] => {
      const x1 = x * cosL - z * sinL
      const z1 = x * sinL + z * cosL
      const y2 = y * cosT - z1 * sinT
      const z2 = y * sinT + z1 * cosT
      const front = z2 > 0 || x1 * x1 + y2 * y2 > 1.0
      return [c + R * x1, cy - R * y2, z2, front]
    }

    const draw = () => {
      const t = elapsed
      const W = size * dpr
      const c = W / 2
      const labelScale = Math.min(1.25, size / 330)
      const cy = W * 0.5
      const R = W * 0.43
      ctx.clearRect(0, 0, W, W)

      // Rotation: a slow sway around the Gulf, or turn to face the focused country.
      const f = focusRef.current
      const target = f ? (GCC.find((g) => g.code === f)!.lng + 4) * DEG : (CENTER_LNG + 26 * Math.sin(t / 4800)) * DEG
      if (!drag && !reduced && !pausedRef.current) dragOffset *= 0.965
      lam += (target + dragOffset - lam) * (reduced || pausedRef.current || drag ? 1 : 0.05)
      cosL = Math.cos(lam)
      sinL = Math.sin(lam)

      const ocean = ctx.createRadialGradient(c - R * .28, cy - R * .4, 0, c, cy, R)
      ocean.addColorStop(0, '#103d73')
      ocean.addColorStop(.74, '#09234a')
      ocean.addColorStop(1, '#06142e')
      ctx.fillStyle = ocean
      ctx.beginPath()
      ctx.arc(c, cy, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(${route},0.64)`
      ctx.shadowColor = `rgba(${land},0.65)`
      ctx.shadowBlur = 12 * dpr
      ctx.lineWidth = 1 * dpr
      ctx.stroke()
      ctx.shadowBlur = 0

      // Land dots, bucketed by depth so they fade toward the limb.
      const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
      const ds = Math.min(2.15, size / 200) * dpr
      for (let i = 0; i < nDots; i++) {
        const j = i * 3
        const x1 = dots[j] * cosL - dots[j + 2] * sinL
        const z1 = dots[j] * sinL + dots[j + 2] * cosL
        const y2 = dots[j + 1] * cosT - z1 * sinT
        const z2 = dots[j + 1] * sinT + z1 * cosT
        if (z2 <= 0.02) continue
        const b = Math.min(4, Math.floor(z2 * 5))
        buckets[b].rect(c + R * x1 - ds / 2, cy - R * y2 - ds / 2, ds, ds)
      }
      const alphas = [0.35, 0.5, 0.65, 0.8, 0.95]
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = `rgba(${land},${alphas[b]})`
        ctx.fill(buckets[b])
      }

      // Flights.
      FLIGHTS.forEach((fl, k) => {
        const pts = arcs[k]
        const period = FLIGHT_MS + 1600
        const start = (k * 730) % period
        const cycle = Math.floor((t + period - start) / period)
        const p = reduced ? 1 : (((t + period - start) % period) / FLIGHT_MS)
        const dim = f && f !== fl.to ? 0.18 : 1
        const head = Math.min(1, p)
        const nHead = Math.floor(head * ARC_STEPS)
        const fade = p > 1 ? Math.max(0, 1 - (p - 1) * (FLIGHT_MS / 1600)) : 1

        // Faint full route, so every path reads even between flights.
        ctx.strokeStyle = `rgba(${route},${0.36 * dim})`
        ctx.lineWidth = 1 * dpr
        ctx.setLineDash([2 * dpr, 4 * dpr])
        ctx.beginPath()
        let pen = false
        for (let i = 0; i <= ARC_STEPS; i += 2) {
          const [sx, sy, , front] = project(pts[i][0], pts[i][1], pts[i][2], R, c, cy)
          if (!front) {
            pen = false
            continue
          }
          if (pen) ctx.lineTo(sx, sy)
          else ctx.moveTo(sx, sy)
          pen = true
        }
        ctx.stroke()
        ctx.setLineDash([])

        // Follow the projected route with a traveling dotted tail and arrowhead.
        const pointAt = (position: number) => {
          const index = Math.min(ARC_STEPS - 1, Math.floor(position))
          const fraction = position - index
          const a = pts[index]
          const b = pts[index + 1]
          return project(
            a[0] + (b[0] - a[0]) * fraction,
            a[1] + (b[1] - a[1]) * fraction,
            a[2] + (b[2] - a[2]) * fraction,
            R, c, cy,
          )
        }
        const distance = head * ARC_STEPS
        for (let offset = 4; offset <= 32 && offset <= distance; offset += 4) {
          const [sx, sy, , front] = pointAt(distance - offset)
          if (!front) continue
          ctx.fillStyle = `rgba(${route},${(1 - offset / 40) * dim * fade})`
          ctx.beginPath()
          ctx.arc(sx, sy, 1.65 * dpr, 0, 2 * Math.PI)
          ctx.fill()
        }

        if ((p <= 1 || reduced) && nHead > 0) {
          const [sx, sy, , front] = pointAt(distance)
          const [prevX, prevY] = pointAt(Math.max(0, distance - 3))
          if (front) {
            const direction = Math.atan2(sy - prevY, sx - prevX)
            const length = 7 * dpr
            ctx.strokeStyle = `rgba(${route},${dim})`
            ctx.lineWidth = 1.7 * dpr
            ctx.shadowColor = `rgba(${route},0.85)`
            ctx.shadowBlur = 7 * dpr
            ctx.beginPath()
            ctx.moveTo(sx - length * Math.cos(direction - .48), sy - length * Math.sin(direction - .48))
            ctx.lineTo(sx, sy)
            ctx.lineTo(sx - length * Math.cos(direction + .48), sy - length * Math.sin(direction + .48))
            ctx.stroke()
            ctx.shadowBlur = 0
          }
        }
        // Landing: a ring at the destination, and the live ticker.
        if (p > 1 && !reduced) {
          const end = pts[ARC_STEPS]
          const [sx, sy, , front] = project(end[0], end[1], end[2], R, c, cy)
          const q = (p - 1) * (FLIGHT_MS / 1600)
          if (front) {
            ctx.strokeStyle = `rgba(${route},${(1 - q) * 0.9 * dim})`
            ctx.lineWidth = 1.5 * dpr
            ctx.beginPath()
            ctx.arc(sx, sy, (4 + q * 18) * dpr, 0, Math.PI * 2)
            ctx.stroke()
          }
          if (front && lastArrived[k] !== cycle && dim === 1) {
            lastArrived[k] = cycle
            setArrival(fl)
          }
        }
      })

      ctx.textBaseline = 'middle'

      // Country markers and leader lines follow the globe's rotation.
      const pulse = reduced ? 0.5 : (Math.sin(t / 420) + 1) / 2
      for (const g of GCC) {
        const v = toV(g.lat, g.lng)
        const [sx, sy, z, front] = project(v[0], v[1], v[2], R, c, cy)
        if (!front || z < 0.05) continue
        const on = f === g.code
        const dim = f && !on ? 0.45 : 1
        ctx.fillStyle = `rgba(${route},${0.25 * (1 - pulse) * dim})`
        ctx.beginPath()
        ctx.arc(sx, sy, (5 + pulse * (on ? 12 : 7)) * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(${route},${dim})`
        ctx.beginPath()
        ctx.arc(sx, sy, (on ? 4.2 : 3.2) * dpr, 0, Math.PI * 2)
        ctx.fill()
        // Label pill at an offset, joined by a hairline.
        const lx = sx + g.dx * dpr * labelScale
        const ly = sy + g.dy * dpr * labelScale
        ctx.strokeStyle = `rgba(${route},${0.55 * dim})`
        ctx.lineWidth = 1 * dpr
        ctx.beginPath()
        ctx.font = `600 ${Math.max(9, (on ? 12 : 11) * labelScale) * dpr}px ${font}`
        const label = g.country
        const w = ctx.measureText(label).width + 14 * dpr
        const h = 20 * dpr
        const px = Math.min(W * 0.9 - w / 2, Math.max(W * 0.1 + w / 2, lx))
        const py = Math.min(W * 0.86, Math.max(W * 0.12, ly))
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.fillStyle = on ? '#184879' : '#081a35'
        ctx.strokeStyle = `rgba(${route},${0.7 * dim})`
        ctx.beginPath()
        ctx.roundRect(px - w / 2, py - h / 2, w, h, 3 * dpr)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = on ? '#ffffff' : '#deefff'
        ctx.textAlign = 'center'
        ctx.fillText(label, px, py + 0.5 * dpr)
        ctx.textAlign = 'start'
      }
    }

    drawRef.current = draw

    const canAnimate = () => visible && document.visibilityState === 'visible' && !reduced && !pausedRef.current
    const loop = (now: number) => {
      if (!canAnimate()) {
        frame = 0
        return
      }
      if (now - lastDraw >= 32) {
        elapsed += Math.min(now - lastDraw, 64)
        lastDraw = now
        draw()
      }
      frame = requestAnimationFrame(loop)
    }
    const kick = () => {
      if (!frame && canAnimate()) {
        lastDraw = performance.now()
        frame = requestAnimationFrame(loop)
      }
    }
    kickRef.current = kick

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      kick()
    })
    io.observe(wrap)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    document.addEventListener('visibilitychange', kick)

    // Drag to spin (horizontal). touch-action: pan-y keeps page scroll working.
    const down = (e: PointerEvent) => {
      drag = { x: e.clientX, lam: dragOffset }
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!drag) return
      dragOffset = drag.lam - ((e.clientX - drag.x) / Math.max(1, size)) * Math.PI
      if (reduced || pausedRef.current) draw()
    }
    const up = () => {
      drag = null
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)

    resize()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      io.disconnect()
      ro.disconnect()
      document.removeEventListener('visibilitychange', kick)
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [arcs, reducedMotion])

  useEffect(() => {
    pausedRef.current = paused
    kickRef.current?.()
    if (reducedMotion || paused) drawRef.current?.()
  }, [focus, paused, reducedMotion])

  const focused = GCC.find((g) => g.code === focus)
  const arrivalTo = arrival ? GCC.find((g) => g.code === arrival.to) : null
  const MotionIcon = paused ? Play : Pause

  return (
    <section className={s.panel} aria-labelledby="markets-title">
      <div className={s.content}>
        <h2 id="markets-title" className="type-title">Explore six Gulf destinations</h2>
        <p className="mt-2 type-helper">Select a country for job preparation guidance.</p>

        <div ref={wrapRef} className={s.globe}>
          <canvas
            ref={canvasRef}
            className="block aspect-square w-full max-w-full cursor-grab touch-pan-y active:cursor-grabbing"
            role="img"
            aria-label="Dotted Earth with example routes to Saudi Arabia, Kuwait, Bahrain, Qatar, the UAE and Oman"
          />
        </div>

        {!reducedMotion && (
          <button
            type="button"
            className={s.motion}
            onClick={() => setPaused((value) => !value)}
          >
            <MotionIcon size={14} aria-hidden="true" />
            {paused ? 'Play globe animation' : 'Pause globe animation'}
          </button>
        )}

        <ul className={s.countries} aria-label="GCC countries">
          {GCC.map((g) => (
            <li key={g.code}>
              <button
                type="button"
                className={s.country}
                aria-pressed={focus === g.code}
                onClick={() => setFocus(focus === g.code ? null : g.code)}
              >
                <Image src={gccDestinations.find((destination) => destination.country === (g.code === 'AE' ? 'United Arab Emirates' : g.country))!.src} alt="" width={24} height={18} unoptimized className="h-[18px] w-6 rounded-sm object-cover" />
                <span>{g.country}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className={s.guidance} aria-live={focused ? 'polite' : 'off'}>
          {focused ? (
            <>
              <p className="font-semibold">{focused.country} preparation</p>
              <p>Check the job requirements, tailor your resume and cover letter, and practise your interview answers. Confirm document requests with the employer.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">Gulf career paths</p>
              <p>{arrival && arrivalTo ? `${cityOf(arrival.from).name} → ${arrivalTo.name}, ${arrivalTo.country}` : 'Prepare for your next Gulf opportunity.'}</p>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
