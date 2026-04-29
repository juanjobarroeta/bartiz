/**
 * ProgramaTab — sheet 3 (gráfica), sheet 4 (calendario cierre) y sheet 5
 * (curva cliente) del Excel de Gerardo en una sola pestaña.
 *
 * Tres sub-vistas controladas con un toggle:
 *   • Gráfica avance     — line chart programado (cliente) vs real
 *                          (de estimaciones). Sheet 3.
 *   • Curva cliente      — gantt-style editor por capítulo × semanas.
 *                          Sheet 5 (programa físico financiero).
 *   • Calendario cierre  — gantt-style editor para Gerardo (planeación
 *                          interna de cashflow). Sheet 4.
 *
 * El componente carga de /api/construccion/proyectos/[id]/programa.
 * Los editores guardan célula a célula vía PATCH a los endpoints de cada
 * curva.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiFetch } from '../config/api'
import { alertDialog } from './Dialog'
import './ProgramaTab.css'

const fmtPct = (n) => `${(n * 100).toFixed(1)}%`
const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(Number(n) || 0)
const fmtShortDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export default function ProgramaTab({ proyecto }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('chart') // chart | curva | calendario

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/construccion/proyectos/${proyecto.id}/programa`)
      setData(r)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar programa' })
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { reload() }, [reload])

  if (loading) return <div className="pd-empty">Cargando programa…</div>
  if (!data) return <div className="pd-empty">No se pudo cargar el programa.</div>
  if (!data.proyecto.fechaInicio) {
    return (
      <div className="pd-empty">
        Para ver el programa físico-financiero necesitas asignar las fechas de
        inicio y término del proyecto. Edítalas desde Resumen o re-bootstrappea
        la plantilla.
      </div>
    )
  }

  return (
    <div className="programa-tab">
      <div className="programa-toolbar">
        <div className="programa-segments">
          <button
            className={view === 'chart' ? 'active' : ''}
            onClick={() => setView('chart')}
          >
            📈 Avance gráfico
          </button>
          <button
            className={view === 'curva' ? 'active' : ''}
            onClick={() => setView('curva')}
          >
            📊 Curva cliente
          </button>
          <button
            className={view === 'calendario' ? 'active' : ''}
            onClick={() => setView('calendario')}
          >
            📅 Calendario cierre
          </button>
        </div>
      </div>

      {view === 'chart' && <AvanceChart data={data} />}
      {view === 'curva' && (
        <CurvaEditor
          mode="cliente"
          data={data}
          onChange={reload}
        />
      )}
      {view === 'calendario' && (
        <CurvaEditor
          mode="calendario"
          data={data}
          onChange={reload}
        />
      )}
    </div>
  )
}

// ── Avance Chart (sheet 3) ──────────────────────────────────────────────────
function AvanceChart({ data }) {
  const { capitulos, curvasCliente, calendarioCierre, estimaciones, weekStartDates, proyecto } = data

  const chartData = useMemo(() => {
    const totalContrato = capitulos.reduce((a, c) => a + c.importeContrato, 0)
    if (totalContrato === 0) return []

    const importeByCap = new Map(capitulos.map((c) => [c.capituloCode, c.importeContrato]))

    // Programmed cumulative pct per week
    const programmedByWeek = new Array(weekStartDates.length).fill(0)
    for (const curva of curvasCliente) {
      const imp = importeByCap.get(curva.capituloCode) ?? 0
      const arr = curva.pesoPctSemanal ?? []
      let cumulative = 0
      for (let w = 0; w < weekStartDates.length; w++) {
        cumulative += (arr[w] ?? 0) * imp
        programmedByWeek[w] += cumulative
      }
    }

    // Calendario cierre cumulative pct per week (Gerardo's internal plan)
    const calByWeek = new Array(weekStartDates.length).fill(0)
    for (const cal of calendarioCierre) {
      const imp = importeByCap.get(cal.capituloCode) ?? 0
      const arr = cal.pesoPctSemanal ?? []
      let cumulative = 0
      for (let w = 0; w < weekStartDates.length; w++) {
        cumulative += (arr[w] ?? 0) * imp
        calByWeek[w] += cumulative
      }
    }

    // Real cumulative pct per week — for each week, find latest estimación
    // whose fechaCorte ≤ end of that week.
    const realByWeek = new Array(weekStartDates.length).fill(null)
    const sortedEsts = [...estimaciones].sort(
      (a, b) =>
        new Date(a.fechaCorte ?? a.periodoFin).getTime() -
        new Date(b.fechaCorte ?? b.periodoFin).getTime()
    )
    for (let w = 0; w < weekStartDates.length; w++) {
      const weekEnd = new Date(weekStartDates[w])
      weekEnd.setDate(weekEnd.getDate() + 7)
      let last = null
      for (const e of sortedEsts) {
        const d = new Date(e.fechaCorte ?? e.periodoFin)
        if (d <= weekEnd) last = e
        else break
      }
      realByWeek[w] = last ? last.pctAcumulado * totalContrato : null
    }

    return weekStartDates.map((iso, i) => ({
      semana: `S${i + 1}`,
      fecha: fmtShortDate(iso),
      programadoPct: programmedByWeek[i] / totalContrato,
      programadoMonto: programmedByWeek[i],
      planInternoPct: calByWeek[i] / totalContrato,
      planInternoMonto: calByWeek[i],
      realPct: realByWeek[i] != null ? realByWeek[i] / totalContrato : null,
      realMonto: realByWeek[i],
    }))
  }, [capitulos, curvasCliente, calendarioCierre, estimaciones, weekStartDates])

  const totalContrato = capitulos.reduce((a, c) => a + c.importeContrato, 0)
  const lastReal = chartData.findLast?.((d) => d.realPct != null) ??
    [...chartData].reverse().find((d) => d.realPct != null)
  const lastProg = chartData[chartData.length - 1]

  return (
    <div className="programa-chart-wrap">
      <div className="programa-chart-stats">
        <div>
          <span className="muted small">Real acumulado</span>
          <strong>{lastReal ? fmtPct(lastReal.realPct) : '—'}</strong>
          <span className="muted small">{lastReal ? fmtMoney(lastReal.realMonto) : ''}</span>
        </div>
        <div>
          <span className="muted small">Programado actual</span>
          <strong>{lastProg ? fmtPct(lastProg.programadoPct) : '—'}</strong>
        </div>
        <div>
          <span className="muted small">Plan interno (calendario)</span>
          <strong>{lastProg ? fmtPct(lastProg.planInternoPct) : '—'}</strong>
        </div>
        <div>
          <span className="muted small">Total contrato</span>
          <strong>{fmtMoney(totalContrato)}</strong>
        </div>
      </div>

      <div className="programa-chart">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="fecha"
              tick={{ fontSize: 11 }}
              interval={Math.max(1, Math.floor(chartData.length / 14))}
            />
            <YAxis
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              domain={[0, 1]}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value, name) => [
                value == null ? '—' : `${(value * 100).toFixed(2)}%`,
                name,
              ]}
              labelFormatter={(label, payload) => {
                const semana = payload?.[0]?.payload?.semana
                return `${label}${semana ? ` · ${semana}` : ''}`
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="programadoPct"
              name="Programado (cliente)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="planInternoPct"
              name="Plan interno"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="realPct"
              name="Real"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Curva Editor (sheets 4 + 5) ─────────────────────────────────────────────
// Gantt-style table of capítulos × weeks. Each cell is a percentage editable
// by Gerardo. Sums per row are highlighted (cliente curve = should be 1.0;
// calendario interno can be ≤ 1.0).
function CurvaEditor({ mode, data, onChange }) {
  const rows = mode === 'cliente' ? data.curvasCliente : data.calendarioCierre
  const weekStartDates = data.weekStartDates ?? []
  const capitulos = data.capitulos ?? []
  const importeByCap = useMemo(
    () => new Map(capitulos.map((c) => [c.capituloCode, c.importeContrato])),
    [capitulos]
  )

  const [pending, setPending] = useState({}) // { rowId: weeklyArray (edited) }
  const [savingId, setSavingId] = useState(null)

  const setCell = (rowId, weekIdx, value) => {
    setPending((prev) => {
      const current = prev[rowId] ?? rows.find((r) => r.id === rowId).pesoPctSemanal ?? []
      const next = [...current]
      next[weekIdx] = isFinite(value) ? value : 0
      return { ...prev, [rowId]: next }
    })
  }

  const saveRow = async (row) => {
    const arr = pending[row.id]
    if (!arr) return
    setSavingId(row.id)
    try {
      const url = mode === 'cliente'
        ? `/api/construccion/estimacion-curva-capitulo/${row.id}`
        : `/api/construccion/calendario-cierre-capitulo/${row.id}`
      await apiFetch(url, { method: 'PATCH', body: { pesoPctSemanal: arr } })
      setPending((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      onChange?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar' })
    } finally {
      setSavingId(null)
    }
  }

  // Build month headers — group weeks by their starting month.
  const monthHeaders = useMemo(() => {
    if (weekStartDates.length === 0) return []
    const groups = []
    let current = null
    weekStartDates.forEach((iso, i) => {
      const d = new Date(iso)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!current || current.key !== key) {
        current = { key, label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }), span: 1, startIdx: i }
        groups.push(current)
      } else {
        current.span += 1
      }
    })
    return groups
  }, [weekStartDates])

  const rowSum = (row) => {
    const arr = pending[row.id] ?? row.pesoPctSemanal ?? []
    return arr.reduce((a, v) => a + (Number(v) || 0), 0)
  }

  return (
    <div className="curva-editor-wrap">
      <div className="curva-editor-help">
        {mode === 'cliente' ? (
          <>
            <strong>Curva cliente (sheet 5)</strong> — la distribución semanal
            esperada por el cliente. Cada fila debe sumar 100%. Pre-cargada con
            el estándar para vivienda 2R; edítala si tu contrato difiere.
          </>
        ) : (
          <>
            <strong>Calendario cierre (sheet 4)</strong> — tu planeación interna
            de cashflow. Marca las semanas en las que esperas pagar/ejecutar
            cada capítulo; la suma puede ser menor a 100%.
          </>
        )}
      </div>

      <div className="curva-editor-scroll">
        <table className="curva-editor">
          <thead>
            <tr className="curva-month-row">
              <th rowSpan="2" style={{ minWidth: 220 }}>Capítulo</th>
              <th rowSpan="2" style={{ minWidth: 120, textAlign: 'right' }}>Importe</th>
              {monthHeaders.map((m) => (
                <th key={m.key} colSpan={m.span} style={{ textAlign: 'center' }}>
                  {m.label}
                </th>
              ))}
              <th rowSpan="2" style={{ textAlign: 'right' }}>Σ</th>
              <th rowSpan="2"></th>
            </tr>
            <tr>
              {weekStartDates.map((iso, i) => (
                <th key={i} className="curva-week-th">
                  S{i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sum = rowSum(row)
              const arr = pending[row.id] ?? row.pesoPctSemanal ?? []
              const dirty = !!pending[row.id]
              const sumOk = mode === 'cliente'
                ? Math.abs(sum - 1) < 0.01
                : sum <= 1.001
              return (
                <tr key={row.id}>
                  <td>
                    <strong>cap {row.capituloCode}</strong>
                    <div className="muted small">{row.descripcion}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtMoney(importeByCap.get(row.capituloCode))}
                  </td>
                  {weekStartDates.map((_, w) => {
                    const v = arr[w] ?? 0
                    return (
                      <td key={w} className="curva-cell">
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.01"
                          value={v === 0 ? '' : v}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value)
                            setCell(row.id, w, isFinite(num) ? num : 0)
                          }}
                        />
                      </td>
                    )
                  })}
                  <td className={`curva-sum ${sumOk ? '' : 'bad'}`}>{fmtPct(sum)}</td>
                  <td>
                    {dirty && (
                      <button
                        type="button"
                        className="link small"
                        onClick={() => saveRow(row)}
                        disabled={savingId === row.id}
                      >
                        {savingId === row.id ? '…' : 'Guardar'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
