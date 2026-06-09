/**
 * Hand-rolled SVG charts for the DECOLSA design system:
 *  - SCurve  : programado (cliente) vs. real ejecutado, % over a timeline
 *  - Gauge   : donut gauge for "Rendimiento"
 *  - Delta   : up/down percentage badge
 *
 * Ported from the design handoff (`components.jsx`).
 */

import { Icon } from './Icon'

/* ----------------------- S-curve chart ----------------------- */
export function SCurve({ curve, height = 230, showInterno = false }) {
  const W = 760
  const H = height
  const padL = 44
  const padR = 16
  const padT = 14
  const padB = 28
  const n = curve.labels.length
  const x = (i) => padL + (i / (n - 1)) * (W - padL - padR)
  const y = (v) => padT + (1 - v / 100) * (H - padT - padB)
  const path = (arr) =>
    arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = (arr) =>
    path(arr) + ` L${x(n - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`
  const gridY = [0, 25, 50, 75, 100]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ds-planFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A241F" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#2A241F" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridY.map((g) => (
        <g key={g}>
          <line
            x1={padL}
            y1={y(g)}
            x2={W - padR}
            y2={y(g)}
            stroke="#E7E1D7"
            strokeWidth="1"
            strokeDasharray={g === 0 ? '0' : '3 4'}
          />
          <text
            x={padL - 8}
            y={y(g) + 3.5}
            textAnchor="end"
            fontSize="10"
            fill="#A8A093"
            fontFamily="JetBrains Mono"
          >
            {g}%
          </text>
        </g>
      ))}
      <path d={area(curve.plan)} fill="url(#ds-planFill)" />
      {showInterno && curve.interno && (
        <path d={path(curve.interno)} fill="none" stroke="#B8AE9E" strokeWidth="2" strokeDasharray="4 4" />
      )}
      <path d={path(curve.plan)} fill="none" stroke="#2A241F" strokeWidth="2.4" />
      <path d={path(curve.real)} fill="none" stroke="#2F7D56" strokeWidth="2.4" />
      {curve.real.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="#2F7D56" />
      ))}
      {curve.labels.map((l, i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize="9.5"
          fill="#A8A093"
          fontFamily="JetBrains Mono"
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

/* ----------------------- Donut gauge ----------------------- */
export function Gauge({ pct, label = 'Rendimiento', size = 124 }) {
  const r = 52
  const c = 2 * Math.PI * r
  const off = c * (1 - pct / 100)
  return (
    <div className="gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 124 124" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="62" cy="62" r={r} fill="none" stroke="#EFE9DF" strokeWidth="13" />
        <circle
          cx="62"
          cy="62"
          r={r}
          fill="none"
          stroke="#E2571E"
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="ctr">
        <div>
          <div className="g-pct num">{pct}%</div>
          <div className="g-lbl">{label}</div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------- Delta badge ----------------------- */
export function Delta({ v }) {
  const up = v >= 0
  return (
    <span className={'delta ' + (up ? 'up' : 'down')}>
      <Icon name={up ? 'arrowUp' : 'arrowDown'} />
      {Math.abs(v)}%
    </span>
  )
}
