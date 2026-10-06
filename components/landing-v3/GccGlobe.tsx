'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { LAND_DOTS_B64 } from './globeDots'

/**
 * GCC globe — a digital, dotted Earth that sways around the Gulf while flight
 * paths run from where candidates are to the six GCC countries (and between
 * them, for people changing jobs inside the Gulf).
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
type Gcc = City & { code: string; country: string; role: string; dx: number; dy: number }

const GCC: Gcc[] = [
  { code: 'SA', country: 'Saudi Arabia', name: 'Riyadh', lat: 24.71, lng: 46.68, role: 'Project Manager · Civil Engineer', dx: -104, dy: 34 },
  { code: 'KW', country: 'Kuwait', name: 'Kuwait City', lat: 29.38, lng: 47.99, role: 'Staff Nurse · IT Analyst', dx: -112, dy: -58 },
  { code: 'BH', country: 'Bahrain', name: 'Manama', lat: 26.23, lng: 50.59, role: 'Software Engineer', dx: 14, dy: -88 },
  { code: 'QA', country: 'Qatar', name: 'Doha', lat: 25.29, lng: 51.53, role: 'Registered Nurse · Site Supervisor', dx: 10, dy: 78 },
  { code: 'AE', country: 'UAE', name: 'Dubai', lat: 25.2, lng: 55.27, role: 'Finance Manager · Hospitality', dx: 92, dy: -56 },
  { code: 'OM', country: 'Oman', name: 'Muscat', lat: 23.59, lng: 58.41, role: 'Electrical Engineer · Accountant', dx: 104, dy: 22 },
]

const ORIGINS: Record<string, City> = {
  Kochi: { name: 'Kochi', lat: 9.93, lng: 76.27 },
  Mumbai: { name: 'Mumbai', lat: 19.08, lng: 72.88 },
  Delhi: { name: 'Delhi', lat: 28.61, lng: 77.21 },
  Manila: { name: 'Manila', lat: 14.6, lng: 120.98 },
  Dhaka: { name: 'Dhaka', lat: 23.81, lng: 90.41 },
  Karachi: { name: 'Karachi', lat: 24.86, lng: 67.0 },
  Cairo: { name: 'Cairo', lat: 30.04, lng: 31.24 },
  Nairobi: { name: 'Nairobi', lat: -1.29, lng: 36.82 },
  London: { name: 'London', lat: 51.51, lng: -0.13 },
  Colombo: { name: 'Colombo', lat: 6.93, lng: 79.86 },
  Kathmandu: { name: 'Kathmandu', lat: 27.72, lng: 85.32 },
}
const LABELLED_ORIGINS = new Set(['Kochi', 'Mumbai', 'Delhi', 'Manila', 'Cairo', 'London', 'Dhaka', 'Nairobi'])

/** from → to (GCC code), with an example role. `move` = changing jobs inside the Gulf. */
const FLIGHTS: Array<{ from: string; to: string; role: string; move?: boolean }> = [
  { from: 'Kochi', to: 'QA', role: 'Registered Nurse' },
  { from: 'Mumbai', to: 'AE', role: 'Finance Manager' },
  { from: 'Delhi', to: 'SA', role: 'Project Manager' },
  { from: 'Manila', to: 'KW', role: 'Staff Nurse' },
  { from: 'Cairo', to: 'SA', role: 'Civil Engineer' },
  { from: 'London', to: 'BH', role: 'Software Engineer' },
  { from: 'Karachi', to: 'OM', role: 'Electrical Engineer' },
  { from: 'Dhaka', to: 'QA', role: 'Site Supervisor' },
  { from: 'Nairobi', to: 'AE', role: 'Hospitality Manager' },
  { from: 'Colombo', to: 'OM', role: 'Accountant' },
  { from: 'Kathmandu', to: 'KW', role: 'IT Analyst' },
  { from: 'AE', to: 'SA', role: 'HR Business Partner', move: true },
  { from: 'QA', to: 'AE', role: 'Sales Manager', move: true },
  { from: 'KW', to: 'BH', role: 'Operations Lead', move: true },
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
  const lift = 0.07 + 0.34 * (w / Math.PI)
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
  const drawRef = useRef<((now: number) => void) | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [arrival, setArrival] = useState<{ from: string; to: string; role: string; move?: boolean } | null>(null)
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

    const dots = decodeDots()
    const nDots = dots.length / 3
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let size = 0
    let dpr = 1
    let frame = 0
    let visible = false
    let lam = CENTER_LNG * DEG
    let drag: { x: number; lam: number } | null = null
    let dragOffset = 0
    const t0 = performance.now()
    const lastArrived = new Array(FLIGHTS.length).fill(-1)

    const resize = () => {
      size = wrap.clientWidth
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
      if (!frame) draw(performance.now())
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

    const draw = (now: number) => {
      const t = now - t0
      const W = size * dpr
      const c = W / 2
      const compact = size < 560
      const cy = compact ? W * 0.5 : W * 0.6
      const R = compact ? W * 0.43 : W * 0.56
      ctx.clearRect(0, 0, W, W)

      // Rotation: a slow sway around the Gulf, or turn to face the focused country.
      const f = focusRef.current
      const target = f ? (GCC.find((g) => g.code === f)!.lng + 4) * DEG : (CENTER_LNG + 22 * Math.sin(t / 8000)) * DEG
      if (!drag) dragOffset *= 0.965
      lam += (target + dragOffset - lam) * (reduced ? 1 : 0.05)
      cosL = Math.cos(lam)
      sinL = Math.sin(lam)

      // Atmosphere glow + ocean disc.
      const glow = ctx.createRadialGradient(c, cy, R * 0.95, c, cy, R * 1.1)
      glow.addColorStop(0, 'rgba(80,170,255,0.3)')
      glow.addColorStop(1, 'rgba(80,170,255,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(c, cy, R * 1.1, 0, Math.PI * 2)
      ctx.fill()
      const ocean = ctx.createRadialGradient(c - R * 0.3, cy - R * 0.45, R * 0.1, c, cy, R)
      ocean.addColorStop(0, '#12467a')
      ocean.addColorStop(0.6, '#0a2c52')
      ocean.addColorStop(1, '#061c38')
      ctx.fillStyle = ocean
      ctx.beginPath()
      ctx.arc(c, cy, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(120,200,255,0.35)'
      ctx.lineWidth = 1 * dpr
      ctx.stroke()

      // Land dots, bucketed by depth so they fade toward the limb.
      const buckets: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()]
      const ds = 1.7 * dpr
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
      const alphas = [0.28, 0.45, 0.62, 0.8, 0.95]
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = `rgba(110,200,255,${alphas[b]})`
        ctx.fill(buckets[b])
      }

      // Flights.
      const phaseDots = (t / 60) % 8
      FLIGHTS.forEach((fl, k) => {
        const pts = arcs[k]
        const period = FLIGHT_MS + 1600
        const start = (k * 730) % period
        const cycle = Math.floor((t + period - start) / period)
        const p = reduced ? 1 : (((t + period - start) % period) / FLIGHT_MS)
        const dim = f && f !== fl.to ? 0.18 : 1
        const color = fl.move ? '140,230,255' : '232,177,92'
        const head = Math.min(1, p)
        const nHead = Math.floor(head * ARC_STEPS)
        const fade = p > 1 ? Math.max(0, 1 - (p - 1) * (FLIGHT_MS / 1600)) : 1

        // Faint full route, so every path reads even between flights.
        ctx.strokeStyle = `rgba(${color},${0.16 * dim})`
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

        // Dotted trail that marches along the route.
        for (let i = 0; i <= nHead; i++) {
          if ((i + Math.floor(phaseDots)) % 3 !== 0) continue
          const [x, y, z] = pts[i]
          const [sx, sy, , front] = project(x, y, z, R, c, cy)
          if (!front) continue
          const a = (0.25 + 0.6 * (i / Math.max(1, nHead))) * dim * fade
          ctx.fillStyle = `rgba(${color},${a})`
          ctx.beginPath()
          ctx.arc(sx, sy, 1.7 * dpr, 0, Math.PI * 2)
          ctx.fill()
        }
        // Glowing head (the "flight").
        if (p <= 1 && !reduced) {
          const [x, y, z] = pts[nHead]
          const [sx, sy, , front] = project(x, y, z, R, c, cy)
          if (front) {
            const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 11 * dpr)
            g.addColorStop(0, `rgba(255,240,210,${dim})`)
            g.addColorStop(0.35, `rgba(${color},${0.7 * dim})`)
            g.addColorStop(1, `rgba(${color},0)`)
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(sx, sy, 11 * dpr, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        // Landing: a ring at the destination, and the live ticker.
        if (p > 1 && !reduced) {
          const end = pts[ARC_STEPS]
          const [sx, sy, , front] = project(end[0], end[1], end[2], R, c, cy)
          const q = (p - 1) * (FLIGHT_MS / 1600)
          if (front) {
            ctx.strokeStyle = `rgba(${color},${(1 - q) * 0.9 * dim})`
            ctx.lineWidth = 1.5 * dpr
            ctx.beginPath()
            ctx.arc(sx, sy, (4 + q * 18) * dpr, 0, Math.PI * 2)
            ctx.stroke()
          }
          if (lastArrived[k] !== cycle && dim === 1) {
            lastArrived[k] = cycle
            setArrival(fl)
          }
        }
      })

      // Origin cities.
      ctx.font = `600 ${10 * dpr}px Inter, system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      for (const key of Object.keys(ORIGINS)) {
        const o = ORIGINS[key]
        const v = toV(o.lat, o.lng)
        const [sx, sy, z, front] = project(v[0], v[1], v[2], R, c, cy)
        if (!front || z < 0.05) continue
        ctx.fillStyle = `rgba(160,220,255,${0.5 + 0.5 * z})`
        ctx.beginPath()
        ctx.arc(sx, sy, 2.2 * dpr, 0, Math.PI * 2)
        ctx.fill()
        if (LABELLED_ORIGINS.has(key) && z > 0.25) {
          ctx.fillStyle = `rgba(190,225,255,${0.35 + 0.5 * z})`
          ctx.fillText(o.name, sx + 5 * dpr, sy)
        }
      }

      // GCC capitals: pulsing gold markers with leader-line labels.
      const pulse = reduced ? 0.5 : (Math.sin(t / 420) + 1) / 2
      for (const g of GCC) {
        const v = toV(g.lat, g.lng)
        const [sx, sy, z, front] = project(v[0], v[1], v[2], R, c, cy)
        if (!front || z < 0.05) continue
        const on = f === g.code
        const dim = f && !on ? 0.45 : 1
        ctx.fillStyle = `rgba(232,177,92,${0.25 * (1 - pulse) * dim})`
        ctx.beginPath()
        ctx.arc(sx, sy, (5 + pulse * (on ? 12 : 7)) * dpr, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255,214,140,${dim})`
        ctx.beginPath()
        ctx.arc(sx, sy, (on ? 4.2 : 3.2) * dpr, 0, Math.PI * 2)
        ctx.fill()
        // Label pill at an offset, joined by a hairline.
        const lx = sx + g.dx * dpr * (compact ? 0.7 : 1)
        const ly = sy + g.dy * dpr * (compact ? 0.7 : 1)
        ctx.strokeStyle = `rgba(255,214,140,${0.55 * dim})`
        ctx.lineWidth = 1 * dpr
        ctx.beginPath()
        ctx.font = `700 ${(on ? 12 : 11) * dpr}px Inter, system-ui, sans-serif`
        const label = `${g.code} · ${g.country}`
        const w = ctx.measureText(label).width + 14 * dpr
        const h = 20 * dpr
        const px = Math.min(W * 0.9 - w / 2, Math.max(W * 0.1 + w / 2, lx))
        const py = Math.min(W * 0.86, Math.max(W * 0.12, ly))
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(px, py)
        ctx.stroke()
        ctx.fillStyle = on ? 'rgba(232,177,92,0.98)' : `rgba(6,28,56,${0.85 * dim + 0.1})`
        ctx.strokeStyle = `rgba(255,214,140,${0.7 * dim})`
        ctx.beginPath()
        ctx.roundRect(px - w / 2, py - h / 2, w, h, h / 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = on ? '#14181C' : `rgba(255,236,200,${dim})`
        ctx.textAlign = 'center'
        ctx.fillText(label, px, py + 0.5 * dpr)
        ctx.textAlign = 'start'
      }
    }

    drawRef.current = draw

    const loop = (now: number) => {
      draw(now)
      frame = visible && document.visibilityState === 'visible' && !reduced ? requestAnimationFrame(loop) : 0
    }
    const kick = () => {
      if (!frame && visible && document.visibilityState === 'visible' && !reduced) frame = requestAnimationFrame(loop)
    }

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
      if (reduced) draw(performance.now())
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
  }, [arcs])

  // Reduced motion has no loop: redraw once when the focused country changes.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) drawRef.current?.(performance.now())
  }, [focus])

  const focused = GCC.find((g) => g.code === focus)
  const arrivalTo = arrival ? GCC.find((g) => g.code === arrival.to) : null

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-line bg-white p-4 shadow-lp-card sm:p-6 lg:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_70%_at_78%_50%,rgba(31,90,138,0.10),transparent_70%)]" aria-hidden="true" />
      <div className="relative grid items-center gap-3 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
        <div className="order-2 lg:order-1">
          <span className="font-semibold type-caption uppercase tracking-[0.08em] text-teal">Six Gulf markets</span>
          <h2 id="markets-title" className="mt-2 text-[26px] font-bold leading-[1.15] tracking-[-0.03em] text-ink sm:text-[34px] lg:text-[42px]">
            One profile. <em className="not-italic text-teal">Every GCC country.</em>
          </h2>
          <p className="mt-2.5 max-w-[440px] type-helper leading-relaxed text-ink-soft lg:text-[16.5px]">
            From India, Asia, Africa or Europe — or moving between Gulf jobs. Prepare for any of the six markets from one career profile.
          </p>

          <ul className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2 lg:mt-5" aria-label="GCC countries">
            {GCC.map((g) => (
              <li key={g.code}>
                <button
                  type="button"
                  aria-pressed={focus === g.code}
                  onMouseEnter={() => setFocus(g.code)}
                  onMouseLeave={() => setFocus(null)}
                  onFocus={() => setFocus(g.code)}
                  onBlur={() => setFocus(null)}
                  onClick={() => setFocus((v) => (v === g.code ? null : g.code))}
                  className={cn(
                    'flex min-h-11 w-full items-center gap-1.5 rounded-[12px] px-2 text-left type-caption font-semibold ring-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:gap-2 sm:px-3 ',
                    focus === g.code ? 'bg-teal text-white ring-teal' : 'bg-canvas text-ink ring-line hover:ring-teal/50',
                  )}
                >
                  <b className={cn('font-mono type-caption ', focus === g.code ? 'text-gold-soft' : 'text-gold-ink')}>{g.code}</b>
                  {g.country}
                </button>
              </li>
            ))}
          </ul>

          {/* Live card: the focused country, or the latest "landing". */}
          <div className="mt-3 min-h-[76px] rounded-[16px] bg-canvas p-3.5 ring-1 ring-line lg:mt-4" aria-live="polite">
            {focused ? (
              <>
                <div className="font-semibold type-caption uppercase tracking-[0.08em] text-gold-ink">{focused.country} · example roles</div>
                <div className="mt-1 text-[15px] font-semibold text-ink">{focused.role}</div>
                <div className="type-caption text-ink-muted">CV, cover letter and interview prep made for {focused.country} jobs.</div>
              </>
            ) : arrival && arrivalTo ? (
              <>
                <div className="font-semibold flex items-center gap-2 type-caption uppercase tracking-[0.08em] text-blue">
                  <span className="size-1.5 animate-glow-pulse rounded-full bg-blue" aria-hidden="true" />
                  {arrival.move ? 'Changing jobs in the Gulf' : 'Arriving'} · example
                </div>
                <div className="mt-1 text-[15px] font-semibold text-ink">
                  {cityOf(arrival.from).name} → {arrivalTo.name}, {arrivalTo.country}
                </div>
                <div className="type-caption text-ink-muted">{arrival.role} — application prepared with GCC Mentor</div>
              </>
            ) : (
              <div className="type-helper text-ink-muted">Watch the routes — or pick a country.</div>
            )}
          </div>
        </div>

        <div ref={wrapRef} className="order-1 mx-auto w-full max-w-[600px] lg:order-2">
          <canvas
            ref={canvasRef}
            className="block aspect-square w-full cursor-grab touch-pan-y active:cursor-grabbing"
            style={{
              maskImage: 'radial-gradient(ellipse 70% 68% at 50% 52%, #000 70%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 68% at 50% 52%, #000 70%, transparent 100%)',
            }}
            role="img"
            aria-label="A rotating globe with routes from India, Asia, Africa and Europe to Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain"
          />
        </div>
      </div>
      <p className="relative mt-3 text-center type-caption text-ink-muted lg:text-right">Routes and roles are illustrative examples. Drag the globe to spin it.</p>
    </div>
  )
}
