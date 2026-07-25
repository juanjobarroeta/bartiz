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
  const [cfdiResumen, setCfdiResumen] = useState(null)
  // Real, actionable pendientes for Gerardo's flow (counts only). Gerardo
  // uploads presupuestos already approved, so there is no "presupuestos por
  // aprobar" here — his approval queue is "compras por autorizar".
  const [pend, setPend] = useState({ compras: 0, porPagar: 0, porPagarMonto: 0, sinConciliar: 0, loaded: false })
  // Saldo real en bancos (para el stat protagonista "En bancos").
  const [saldoBancos, setSaldoBancos] = useState(null)

  useEffect(() => {
    if (!activeCompany?.id) return
    apiFetch(`/api/construccion/cfdis/resumen?companyId=${encodeURIComponent(activeCompany.id)}`)
      .then((d) => { if (d && typeof d.porVincular === 'number') setCfdiResumen(d) })
      .catch(() => {})
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) { setPend({ compras: 0, porPagar: 0, porPagarMonto: 0, sinConciliar: 0, loaded: false }); return }
    const cid = encodeURIComponent(activeCompany.id)
    let alive = true
    ;(async () => {
      const [compras, porPagar, conc, accts] = await Promise.all([
        apiFetch(`/api/construccion/solicitudes-compra?companyId=${cid}&estado=PENDIENTE`).catch(() => []),
        apiFetch(`/api/construccion/adjudicaciones?companyId=${cid}&estado=POR_PAGAR&abiertas=1`).catch(() => []),
        apiFetch(`/api/construccion/bank-transactions?companyId=${cid}&status=UNMATCHED&count=1`).catch(() => null),
        apiFetch(`/api/construccion/bank-accounts?companyId=${cid}&withBalances=true`).catch(() => null),
      ])
      if (!alive) return
      const abiertas = Array.isArray(porPagar) ? porPagar : []
      setPend({
        compras: Array.isArray(compras) ? compras.length : 0,
        porPagar: abiertas.length,
        porPagarMonto: abiertas.reduce((s, a) => s + (Number(a.saldo ?? a.total) || 0), 0),
        sinConciliar: conc && typeof conc.count === 'number' ? conc.count : 0,
        loaded: true,
      })
      if (Array.isArray(accts) && accts.length) {
        setSaldoBancos(accts.reduce((s, a) => s + (a.balance ?? 0), 0))
      }
    })()
    return () => { alive = false }
  }, [activeCompany?.id])

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

  const openProject = (row) => {
    if (row.id) navigate(`/proyectos/${row.id}`)
  }


  // Pendientes del día — alimentan la tarjeta "Hoy en la obra" (mockup:
  // lista numerada 01/02/03, no prosa).
  const pendientes = []
  if (pend.compras > 0) pendientes.push({ n: `${pend.compras} compra${pend.compras === 1 ? '' : 's'} por autorizar`, to: '/compras-por-autorizar' })
  if (pend.porPagar > 0) pendientes.push({ n: `${pend.porPagar} cuenta${pend.porPagar === 1 ? '' : 's'} por pagar (${money(pend.porPagarMonto)})`, to: '/cuentas-por-pagar' })
  if (cfdiResumen?.porVincular > 0) pendientes.push({ n: `${cfdiResumen.porVincular} factura${cfdiResumen.porVincular === 1 ? '' : 's'} por vincular`, to: '/facturas' })
  if (pend.sinConciliar > 0) pendientes.push({ n: `${pend.sinConciliar} movimiento${pend.sinConciliar === 1 ? '' : 's'} sin conciliar`, to: '/tesoreria-bartiz' })

  // Encabezado con la fecha (patrón mockup: "Sábado 25 de julio")
  const hoyRaw = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const hoyTitulo = hoyRaw.charAt(0).toUpperCase() + hoyRaw.slice(1)
  const corte = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="ds">
      <div className="page">
        {/* Encabezado — fecha grande + contexto + acción primaria */}
        <div className="hoy-head">
          <div className="hoy-head-l">
            <h1 className="hoy-title">{hoyTitulo}</h1>
            <span className="hoy-head-sub">
              {activeCompany?.razonSocial ?? 'Bartiz'} · corte {corte}
            </span>
          </div>
          <button className="hoy-op" onClick={() => navigate('/requisiciones')}>
            + Requisición
          </button>
        </div>

        {/* KPI strip — 4 columnas con divisores finos (mockup) */}
        <div className="hoy-kpis">
          <div className="kpi">
            <div className="eyebrow">Valor de cartera</div>
            <div className="kpi-v num"><MoneyParts value={totals.contratado} /></div>
            <div className="kpi-s">{totals.activos} obra{totals.activos === 1 ? '' : 's'} activa{totals.activos === 1 ? '' : 's'}</div>
          </div>
          <div className="kpi">
            <div className="eyebrow">En bancos</div>
            <div className="kpi-v num"><MoneyParts value={saldoBancos ?? SAMPLE_SALDO_TOTAL} /></div>
            <div className="kpi-s">{pend.sinConciliar > 0 ? `${pend.sinConciliar} mov. sin conciliar` : 'conciliado'}</div>
          </div>
          <div className="kpi">
            <div className="eyebrow">Por pagar</div>
            <div className="kpi-v num"><MoneyParts value={pend.porPagarMonto} /></div>
            <div className="kpi-s accent">{pend.porPagar} proveedor{pend.porPagar === 1 ? '' : 'es'} con saldo</div>
          </div>
          <div className="kpi">
            <div className="eyebrow">Por autorizar</div>
            <div className="kpi-v num">{pend.compras}</div>
            <div className="kpi-s">
              {pend.compras > 0 ? (
                <a href="/compras-por-autorizar" onClick={(e) => { e.preventDefault(); navigate('/compras-por-autorizar') }}>
                  ir a compras →
                </a>
              ) : 'sin pendientes'}
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

            {/* Hoy en la obra — pendientes numerados (mockup 01/02/03) */}
            <div className="card">
              <div className="card-head">
                <h3>Hoy en la obra</h3>
              </div>
              {pendientes.length === 0 ? (
                <div className="hoy-lista-empty">
                  {pend.loaded ? 'Todo al día — no hay pendientes que requieran tu atención.' : 'Cargando pendientes…'}
                </div>
              ) : (
                <div className="hoy-lista">
                  {pendientes.map((p, i) => (
                    <a
                      key={p.to}
                      className="hoy-lista-item"
                      href={p.to}
                      onClick={(e) => { e.preventDefault(); navigate(p.to) }}
                    >
                      <span className="hoy-lista-n">{String(i + 1).padStart(2, '0')}</span>
                      <span>{p.n}</span>
                    </a>
                  ))}
                </div>
              )}
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
