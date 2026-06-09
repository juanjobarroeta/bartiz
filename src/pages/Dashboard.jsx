/**
 * Dashboard — owner/director portfolio + cash command center (DECOLSA
 * redesign). Replaces the old "Dashboard feed" with a portfolio health
 * table, an avance-de-cartera S-curve, a cash-position rail and a
 * "pendientes" action list.
 *
 * Data sources:
 *  - Portfolio table + contracted-value total come from the LIVE
 *    `/api/construccion/proyectos` list (scoped to the active company).
 *  - Bank balances, the S-curve, performance split and action items are not
 *    exposed by that endpoint yet, so they come from the documented sample
 *    block in `data/dashboardSample.js`. Swap each for a live fetch as the
 *    contabilidad-os treasury/avance endpoints land.
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ds/Icon'
import { SCurve, Gauge, Delta } from '../components/ds/Charts'
import { money, compactMoney, MoneyParts } from '../lib/format'
import {
  BADGE_COLORS,
  SAMPLE_PROJECTS,
  SAMPLE_BANKS,
  SAMPLE_SALDO_TOTAL,
  SAMPLE_PERFORMANCE,
  SAMPLE_ACCIONES,
  SAMPLE_CURVE,
  SAMPLE_FACTURADO,
  SAMPLE_COBRADO,
  SAMPLE_SIN_CONCILIAR,
} from '../data/dashboardSample'

// Live `estado` → status chip tone + label.
const ESTADO_META = {
  PLANEACION: { cls: 'plan', label: 'Planeación' },
  EN_EJECUCION: { cls: 'active', label: 'En obra' },
  SUSPENDIDO: { cls: 'risk', label: 'Suspendido' },
  TERMINADO: { cls: 'active', label: 'Terminado' },
  CANCELADO: { cls: 'risk', label: 'Cancelado' },
}

const STATUS_LABEL = { active: 'En obra', plan: 'Planeación', risk: 'Riesgo' }

// Map a live proyecto record to the portfolio-row shape the table renders.
function toRow(p, i) {
  const meta = ESTADO_META[p.estado] ?? { cls: 'plan', label: p.estado ?? '—' }
  return {
    id: p.id,
    code: p.codigo,
    name: p.nombre,
    short: (p.nombre?.[0] ?? '·').toUpperCase(),
    color: BADGE_COLORS[i % BADGE_COLORS.length],
    location: p.ubicacion || '—',
    status: meta.cls,
    statusLabel: meta.label,
    contratado: Number(p.montoContratado) || 0,
    avance: Number(p.avancePct) || 0,
    plan: 0, // planned-% not exposed by the list endpoint yet
    porCobrar: 0, // receivable not exposed by the list endpoint yet
  }
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const [rows, setRows] = useState([])
  const [usingSample, setUsingSample] = useState(false)
  const [sort, setSort] = useState('contratado')

  useEffect(() => {
    if (!activeCompany?.id) {
      // No company yet (fresh login / switcher not hydrated) — show the
      // sample portfolio so the command center still renders.
      setRows(SAMPLE_PROJECTS)
      setUsingSample(true)
      return
    }
    apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(activeCompany.id)}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        if (list.length === 0) {
          setRows(SAMPLE_PROJECTS)
          setUsingSample(true)
        } else {
          setRows(list.map(toRow))
          setUsingSample(false)
        }
      })
      .catch((err) => {
        console.error('Error loading dashboard:', err)
        setRows(SAMPLE_PROJECTS)
        setUsingSample(true)
      })
  }, [activeCompany?.id])

  const projects = useMemo(
    () => [...rows].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)),
    [rows, sort]
  )

  const totals = useMemo(() => {
    const contratado = rows.reduce((s, p) => s + (p.contratado || 0), 0)
    const activos = rows.filter((p) => p.contratado > 0).length
    return { contratado, activos }
  }, [rows])

  const facturadoPct = totals.contratado > 0 ? (SAMPLE_FACTURADO / totals.contratado) * 100 : 0
  const perf = SAMPLE_PERFORMANCE

  const openProject = (row) => {
    if (row.id) navigate(`/proyectos/${row.id}`)
  }

  return (
    <div className="ds">
      <div className="page">
        {/* toolbar */}
        <div className="page-toolbar">
          <div className="daterange">
            <Icon name="calendar" />
            <span>10 Jun 2026 — 30 Jun 2026</span>
            <Icon name="chevronDown" style={{ width: 15, height: 15, color: 'var(--ink-3)' }} />
          </div>
          <div className="spacer" />
          <button className="btn btn-ghost">
            <Icon name="link" />
            Link público
          </button>
          <button className="btn btn-primary">
            <Icon name="share" />
            Compartir
          </button>
        </div>

        {/* hero KPI strip */}
        <div className="kpi-row">
          <div className="kpi feature">
            <div className="kpi-top">
              <div className="kpi-ic">
                <Icon name="briefcase" />
              </div>
              <div className="kpi-label">Valor de cartera · Contratado</div>
            </div>
            <div className="kpi-value">
              <MoneyParts value={totals.contratado} />
            </div>
            <div className="kpi-sub">
              <Delta v={18} />
              <span>vs. trimestre anterior</span>
              <span style={{ marginLeft: 'auto' }}>{totals.activos} proyectos activos</span>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-top">
              <div className="kpi-ic">
                <Icon name="receipt" />
              </div>
              <div className="kpi-label">Facturado de cartera</div>
            </div>
            <div className="kpi-value">{money(SAMPLE_FACTURADO)}</div>
            <div className="kpi-sub">
              <span className="pill">{facturadoPct.toFixed(1)}% del contrato</span>
              <span>· {money(SAMPLE_COBRADO)} cobrado</span>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: 'var(--pos-soft)', color: 'var(--pos)' }}>
                <Icon name="bank" />
              </div>
              <div className="kpi-label">Saldo en bancos</div>
            </div>
            <div className="kpi-value">
              <MoneyParts value={SAMPLE_SALDO_TOTAL} />
            </div>
            <div className="kpi-sub">
              <span>{SAMPLE_BANKS.length} cuentas operativas</span>
              <span className="pill warn" style={{ marginLeft: 'auto' }}>
                {SAMPLE_SIN_CONCILIAR} sin conciliar
              </span>
            </div>
          </div>

          <div className="kpi">
            <div className="kpi-top">
              <div className="kpi-ic" style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
                <Icon name="target" />
              </div>
              <div className="kpi-label">Rendimiento de cartera</div>
            </div>
            <div className="kpi-value">{perf.rendimiento}%</div>
            <div className="kpi-sub">
              <span>Ganado {compactMoney(perf.valorGanado)}</span>
              <span>· Plan {compactMoney(perf.valorPlaneado)}</span>
            </div>
          </div>
        </div>

        {/* main two-column */}
        <div className="grid-main">
          <div className="col">
            {/* Portfolio table — the redesigned feed */}
            <div className="card">
              <div className="card-head">
                <h3>Cartera de proyectos</h3>
                <span className="hint">Avance físico vs. programado · saldo por cobrar</span>
                <div className="spacer" />
                <button
                  className="btn btn-ghost"
                  style={{ padding: '7px 12px', fontSize: 12.5 }}
                  onClick={() => setSort(sort === 'contratado' ? 'avance' : 'contratado')}
                >
                  <Icon name="filter" style={{ width: 14, height: 14 }} />
                  Ordenar: {sort === 'contratado' ? 'Monto' : 'Avance'}
                </button>
              </div>
              <div className="scroll-x">
                <table className="ptable">
                  <thead>
                    <tr>
                      <th>Proyecto</th>
                      <th>Avance</th>
                      <th className="r">Contratado</th>
                      <th className="r">Por cobrar</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id || p.code} onClick={() => openProject(p)}>
                        <td>
                          <div className="proj-cell">
                            <div className="proj-badge" style={{ background: p.color }}>
                              {p.short}
                            </div>
                            <div>
                              <div className="proj-name">{p.name}</div>
                              <div className="proj-code">
                                {p.code} · {p.location}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="progress-wrap">
                            <div className="progress-top">
                              <span
                                className="pct"
                                style={{ color: p.avance > 0 ? 'var(--pos)' : 'var(--ink-3)' }}
                              >
                                {p.avance.toFixed(1)}%
                              </span>
                              {p.plan > 0 && <span className="planpct">plan {p.plan.toFixed(0)}%</span>}
                            </div>
                            <div className="track">
                              <div
                                className="fill"
                                style={{
                                  width: Math.max(p.avance, 1.5) + '%',
                                  background: p.avance > 0 ? 'var(--pos)' : 'var(--line-2)',
                                }}
                              />
                              {p.plan > 0 && <div className="plan-mark" style={{ left: p.plan + '%' }} />}
                            </div>
                          </div>
                        </td>
                        <td className="r">
                          <span className="money big">{p.contratado ? money(p.contratado) : '—'}</span>
                        </td>
                        <td className="r">
                          {p.porCobrar > 0 ? (
                            <span className="money big" style={{ color: 'var(--brand-strong)' }}>
                              {money(p.porCobrar)}
                            </span>
                          ) : (
                            <span className="money muted">—</span>
                          )}
                        </td>
                        <td>
                          <span className={'status ' + p.status}>
                            <span className="sdot" />
                            {p.statusLabel || STATUS_LABEL[p.status]}
                          </span>
                        </td>
                        <td className="r">
                          <span className="row-go">
                            <Icon name="chevronRight" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* S-curve */}
            <div className="card">
              <div className="chart-head">
                <div>
                  <h3>Avance de cartera</h3>
                  <span className="hint">Curva acumulada · programado (cliente) vs. real ejecutado</span>
                </div>
                <div className="chart-legend">
                  <span className="cl">
                    <span className="ln" style={{ background: '#2A241F' }} />
                    Programado
                  </span>
                  <span className="cl">
                    <span className="ln" style={{ background: '#2F7D56' }} />
                    Real
                  </span>
                </div>
              </div>
              <div className="chart-stats">
                <div className="cstat">
                  <div className="cl2">Real acumulado</div>
                  <div className="cv green">1.0%</div>
                </div>
                <div className="cstat">
                  <div className="cl2">Programado</div>
                  <div className="cv">72.0%</div>
                </div>
                <div className="cstat">
                  <div className="cl2">Desviación</div>
                  <div className="cv" style={{ color: 'var(--neg)' }}>
                    −71.0%
                  </div>
                </div>
                <div className="cstat">
                  <div className="cl2">Total contrato</div>
                  <div className="cv">{compactMoney(totals.contratado)}</div>
                </div>
              </div>
              <div className="card-pad" style={{ paddingTop: 0 }}>
                <SCurve curve={SAMPLE_CURVE} />
              </div>
            </div>
          </div>

          {/* side column / rail */}
          <div className="col">
            {/* cash position */}
            <div className="card">
              <div className="saldo-hero">
                <div className="lbl">Posición de efectivo</div>
                <div className="v">
                  <MoneyParts value={SAMPLE_SALDO_TOTAL} />
                </div>
              </div>
              {SAMPLE_BANKS.map((b, i) => (
                <div className="bank" key={i}>
                  <div className="bank-ic">
                    <Icon name="bank" />
                  </div>
                  <div>
                    <div className="bank-name">
                      {b.name}{' '}
                      <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{b.sub}</span>
                    </div>
                    <div className="bank-meta">
                      ··{b.acct.slice(-4)} · {b.mov} mov.
                    </div>
                  </div>
                  <div className="bank-amt">
                    <div className={'v' + (b.balance < 0 ? ' neg' : '')}>
                      {b.balance < 0 ? '−' : ''}
                      {money(Math.abs(b.balance))}
                    </div>
                    <div className="d">30 días</div>
                  </div>
                </div>
              ))}
            </div>

            {/* rendimiento gauge */}
            <div className="card">
              <div className="card-head">
                <h3>Rendimiento del proyecto</h3>
              </div>
              <div className="gauge-wrap">
                <Gauge pct={perf.rendimiento} />
                <div className="gauge-legend">
                  <div className="gl-item">
                    <div className="gl-top">
                      <span className="sw" style={{ background: 'var(--brand)' }} />
                      Valor ganado
                    </div>
                    <div className="gl-v">{money(perf.valorGanado)}</div>
                  </div>
                  <div className="gl-item">
                    <div className="gl-top">
                      <span className="sw" style={{ background: '#EFE9DF' }} />
                      Valor planeado
                    </div>
                    <div className="gl-v" style={{ color: 'var(--ink-2)' }}>
                      {money(perf.valorPlaneado)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* pendientes / acciones */}
            <div className="card">
              <div className="card-head">
                <h3>Pendientes</h3>
                <span className="hint">Requiere tu atención</span>
              </div>
              {SAMPLE_ACCIONES.map((a, i) => (
                <div className="action" key={i}>
                  <div className={'action-ic ' + a.tone}>
                    <Icon name={a.ic} />
                  </div>
                  <div>
                    <div className="action-txt">
                      <b>{a.n}</b> {a.txt}
                    </div>
                    <div className="action-sub">{a.sub}</div>
                  </div>
                  <span className="row-go" style={{ marginLeft: 'auto' }}>
                    <Icon name="chevronRight" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {usingSample && (
          <p className="ds-sample-note">
            Mostrando datos de muestra de la cartera. Conecta una empresa con proyectos en
            contabilidad-os para ver tu cartera real.
          </p>
        )}
      </div>
    </div>
  )
}

export default Dashboard
