import { useEffect, useId, useRef, useState } from 'react'

/**
 * Small dependency-free SVG charts for the publisher dashboard.
 * Single-series each (the panel title names the series), thin marks,
 * recessive grid, hover tooltip, and a visually-hidden data table.
 */

interface Datum {
  label: string
  value: number
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(300)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(240, e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

const niceMax = (v: number) => {
  const target = v * 1.05
  const p = Math.pow(10, Math.floor(Math.log10(target)))
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * p >= target) ?? 10
  return step * p
}
const compact = (n: number) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n))

function SrTable({ data, caption, unit }: { data: Datum[]; caption: string; unit: string }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Label</th>
          <th>{unit}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label}>
            <td>{d.label}</td>
            <td>{d.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Tooltip({ x, y, label, value, unit }: { x: number; y: number; label: string; value: number; unit: string }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-ink px-3 py-2 text-xs whitespace-nowrap text-paper shadow-lift"
      style={{ left: x, top: y - 10 }}
    >
      <p className="text-paper/60">{label}</p>
      <p className="font-display text-sm font-bold">
        {value.toLocaleString('en-IN')} <span className="font-sans font-normal text-paper/60">{unit}</span>
      </p>
    </div>
  )
}

export function AreaChart({ data, color = '#3654FF', height = 240, unit = 'reads', caption }: { data: Datum[]; color?: string; height?: number; unit?: string; caption: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId().replace(/:/g, '')
  const pad = { t: 16, r: 12, b: 28, l: 40 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const x = (i: number) => pad.l + (i / (data.length - 1)) * w
  const y = (v: number) => pad.t + h - (v / max) * h
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join('')
  const area = `${line}L${x(data.length - 1)},${pad.t + h}L${x(0)},${pad.t + h}Z`
  const ticks = [0, 0.5, 1].map((t) => t * max)
  const labelEvery = width < 420 ? 2 : 1

  return (
    <div ref={ref} className="relative w-full min-w-0" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={caption} className="block overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="#E4E0D5" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
              {compact(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
              {d.label}
            </text>
          ) : null,
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + h} stroke="#14171B" strokeOpacity="0.25" />
            <circle cx={x(hover)} cy={y(data[hover]!.value)} r="5" fill={color} stroke="#fff" strokeWidth="2" />
          </>
        )}
        {/* last point marker + direct label */}
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1]!.value)} r="4" fill={color} stroke="#fff" strokeWidth="2" />
        {/* hit targets */}
        {data.map((d, i) => (
          <rect
            key={d.label}
            x={x(i) - w / (data.length - 1) / 2}
            y={pad.t}
            width={w / (data.length - 1)}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && <Tooltip x={x(hover)} y={y(data[hover]!.value)} label={`${data[hover]!.label} 2026`} value={data[hover]!.value} unit={unit} />}
      <SrTable data={data} caption={caption} unit={unit} />
    </div>
  )
}

export function ColumnChart({ data, color = '#FFAE1F', height = 220, unit = 'readers', caption }: { data: Datum[]; color?: string; height?: number; unit?: string; caption: string }) {
  const { ref, width } = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { t: 20, r: 4, b: 28, l: 4 }
  const w = width - pad.l - pad.r
  const h = height - pad.t - pad.b
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const slot = w / data.length
  const bw = Math.min(44, slot * 0.56)

  return (
    <div ref={ref} className="relative w-full min-w-0" onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={caption} className="block">
        <line x1={pad.l} x2={width - pad.r} y1={pad.t + h} y2={pad.t + h} stroke="#E4E0D5" />
        {data.map((d, i) => {
          const bh = Math.max(4, (d.value / max) * h)
          const cx = pad.l + slot * i + slot / 2
          const top = pad.t + h - bh
          const r = 4
          const path = `M${cx - bw / 2},${pad.t + h}V${top + r}Q${cx - bw / 2},${top} ${cx - bw / 2 + r},${top}H${cx + bw / 2 - r}Q${cx + bw / 2},${top} ${cx + bw / 2},${top + r}V${pad.t + h}Z`
          const isLast = i === data.length - 1
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={h} fill="transparent" />
              <path d={path} fill={color} opacity={hover === null ? (isLast ? 1 : 0.55) : hover === i ? 1 : 0.35} className="transition-opacity" />
              {isLast && hover === null && (
                <text x={cx} y={top - 6} textAnchor="middle" className="fill-ink text-[11px] font-semibold">
                  {compact(d.value)}
                </text>
              )}
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <Tooltip x={pad.l + slot * hover + slot / 2} y={pad.t + h - Math.max(4, (data[hover]!.value / max) * h)} label={`New readers · ${data[hover]!.label}`} value={data[hover]!.value} unit={unit} />
      )}
      <SrTable data={data} caption={caption} unit={unit} />
    </div>
  )
}

export function BarList({ data, color = '#3654FF', unit = 'e-books', caption }: { data: Datum[]; color?: string; unit?: string; caption: string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <ul className="space-y-3" aria-label={caption}>
        {data.map((d) => (
          <li key={d.label} className="group" title={`${d.label}: ${d.value} ${unit}`}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate text-ink-2">{d.label}</span>
              <span className="font-semibold tabular-nums">{d.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-paper-2">
              <div className="h-full rounded-full transition-[width,opacity] duration-700 group-hover:opacity-80" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
