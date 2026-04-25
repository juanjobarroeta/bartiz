/**
 * Reportes — monthly rollup view (Sprint 4).
 *
 * For the active company (optionally filtered to one proyecto), shows
 * 12 months of:
 *   - gasto directo (insumos linked to gastos)
 *   - gasto indirecto (overhead categorías)
 *   - destajo rayas
 *   - compras pagadas (OCs cerradas)
 *   - ingresos por estimaciones
 *   - net flow bancario (sum of monto across BankTransactions)
 *
 * Per-month drill-down panels show top categorías indirectas and top
 * insumos by spend. The annual totals card shows gastado / ingresado /
 * neto (la pregunta "ganamos plata este año").
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './Reportes.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtMoneyDec = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

export default function Reportes() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const [year, setYear] = useState(new Date().getFullYear())
  const [proyectoId, setProyectoId] = useState('')
  const [proyectos, setProyectos] = useState([])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openMonth, setOpenMonth] = useState(null)

  useEffect(() => {
    if (!companyId) return
    apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`)
      .then((r) => setProyectos(Array.isArray(r) ? r : []))
      .catch(() => setProyectos([]))
  }, [companyId])

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    const params = new URLSearchParams({ companyId, year: String(year) })
    if (proyectoId) params.set('proyectoId', proyectoId)
    apiFetch(`/api/construccion/reportes/mensual?${params.toString()}`)
      .then((r) => setData(r))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [companyId, year, proyectoId])

  const maxBar = useMemo(() => {
    if (!data) return 1
    return Math.max(
      1,
      ...data.meses.map((m) => Math.max(m.totalGastado, m.ingresosEstimaciones))
    )
  }, [data])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="reportes-page">
      <header>
        <h1>Reportes</h1>
        <p className="muted small">
          Resumen mensual del año. Cuánto entró por estimaciones, cuánto
          salió por gastos, compras y destajo. Click una barra para ver
          el desglose del mes.
        </p>
      </header>

      <div className="toolbar">
        <div className="years">
          {[year - 1, year, year + 1].map((y) => (
            <button key={y} className={year === y ? 'active' : ''} onClick={() => setYear(y)}>
              {y}
            </button>
          ))}
        </div>
        <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
          ))}
        </select>
      </div>

      {loading || !data ? (
        <div className="pd-empty">Cargando…</div>
      ) : (
        <>
          <div className="totals-grid">
            <div className="kpi">
              <div className="kpi-label">Total gastado {year}</div>
              <div className="kpi-value">{fmtMoney(data.totals.gastado)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total ingresado {year}</div>
              <div className="kpi-value" style={{ color: '#16a34a' }}>{fmtMoney(data.totals.ingresado)}</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Neto</div>
              <div
                className="kpi-value"
                style={{ color: data.totals.neto >= 0 ? '#16a34a' : '#dc2626' }}
              >
                {fmtMoney(data.totals.neto)}
              </div>
            </div>
          </div>

          <div className="month-bars">
            {data.meses.map((m) => {
              const isOpen = openMonth === m.mes
              const totalH = (m.totalGastado / maxBar) * 100
              const ingH = (m.ingresosEstimaciones / maxBar) * 100
              const empty = m.totalGastado === 0 && m.ingresosEstimaciones === 0
              return (
                <div key={m.mes} className={`month-col ${isOpen ? 'open' : ''} ${empty ? 'empty' : ''}`}>
                  <div className="month-bar-wrap" onClick={() => setOpenMonth(isOpen ? null : m.mes)}>
                    <div className="bar-pair">
                      <div className="bar gasto" style={{ height: `${totalH}%` }} title={`Gastado ${fmtMoney(m.totalGastado)}`} />
                      <div className="bar ingreso" style={{ height: `${ingH}%` }} title={`Ingresado ${fmtMoney(m.ingresosEstimaciones)}`} />
                    </div>
                    <div className="month-label">{m.label.slice(0, 3)}</div>
                    {!empty && (
                      <div className="muted xs">{fmtMoney(m.totalGastado)}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Drill-down panel */}
          {openMonth != null && (
            <MonthDetail mes={data.meses.find((m) => m.mes === openMonth)} onClose={() => setOpenMonth(null)} />
          )}

          <table className="months-table">
            <thead>
              <tr>
                <th>Mes</th>
                <th style={{ textAlign: 'right' }}>Directo</th>
                <th style={{ textAlign: 'right' }}>Indirecto</th>
                <th style={{ textAlign: 'right' }}>Destajo</th>
                <th style={{ textAlign: 'right' }}>Compras OC</th>
                <th style={{ textAlign: 'right' }}>Total gastado</th>
                <th style={{ textAlign: 'right' }}>Estimaciones</th>
                <th style={{ textAlign: 'right' }}>Flujo banco</th>
              </tr>
            </thead>
            <tbody>
              {data.meses.map((m) => (
                <tr
                  key={m.mes}
                  className={`clickable ${m.mes === openMonth ? 'active' : ''}`}
                  onClick={() => setOpenMonth(m.mes)}
                >
                  <td>{m.label}</td>
                  <td style={{ textAlign: 'right' }}>{m.gastoDirecto ? fmtMoney(m.gastoDirecto) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{m.gastoIndirecto ? fmtMoney(m.gastoIndirecto) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{m.destajoRayas ? fmtMoney(m.destajoRayas) : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{m.comprasPagadas ? fmtMoney(m.comprasPagadas) : '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{m.totalGastado ? fmtMoney(m.totalGastado) : '—'}</td>
                  <td style={{ textAlign: 'right', color: '#16a34a' }}>{m.ingresosEstimaciones ? fmtMoney(m.ingresosEstimaciones) : '—'}</td>
                  <td
                    style={{
                      textAlign: 'right',
                      color: m.flowBancario > 0 ? '#16a34a' : m.flowBancario < 0 ? '#dc2626' : '#64748b',
                    }}
                  >
                    {m.flowBancario ? fmtMoney(m.flowBancario) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function MonthDetail({ mes, onClose }) {
  if (!mes) return null
  return (
    <div className="month-detail">
      <div className="month-detail-head">
        <h2>{mes.label}</h2>
        <button type="button" className="link" onClick={onClose}>cerrar ×</button>
      </div>
      <div className="month-detail-grid">
        <div>
          <h3>Top indirectos</h3>
          {mes.topIndirectos.length === 0 ? (
            <div className="muted small">Sin gastos indirectos.</div>
          ) : (
            <ul className="kv">
              {mes.topIndirectos.map((c) => (
                <li key={c.categoria}>
                  <span>{c.categoria}</span>
                  <strong>{fmtMoneyDec(c.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3>Top insumos directos</h3>
          {mes.topInsumos.length === 0 ? (
            <div className="muted small">Sin gastos directos.</div>
          ) : (
            <ul className="kv">
              {mes.topInsumos.map((i) => (
                <li key={i.codigo}>
                  <span>
                    <span className="mono">{i.codigo}</span> {i.descripcion?.slice(0, 30)}
                  </span>
                  <strong>{fmtMoneyDec(i.total)}</strong>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
