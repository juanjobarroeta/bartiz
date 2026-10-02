/**
 * Inicio (ADMIN) — "Para hoy" estilo Deel.
 *
 * Saludo + buscador (abre la paleta ⌘K del shell), tarjeta "Pagos" (por
 * pagar / en bancos, alerta de vencidos), tarjeta "Para hoy" (pendientes con
 * conteo que enlazan a su página) y la cartera de proyectos.
 *
 * Todo con datos VIVOS. Cada petición es independiente: si una falla se
 * registra en consola y sólo su cifra muestra "—" (nunca un 0 falso).
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/ds/Icon'
import { money } from '../lib/format'
import { BADGE_COLORS } from '../data/dashboardSample'
import { buildPayables } from '../components/home/payables'

const FAIL = Symbol('fail')
const isOk = (v) => v !== undefined && v !== FAIL

// Live `estado` → status chip tone + label.
const ESTADO_META = {
  PLANEACION: { cls: 'plan', label: 'Planeación' },
  EN_EJECUCION: { cls: 'active', label: 'En obra' },
  SUSPENDIDO: { cls: 'risk', label: 'Suspendido' },
  TERMINADO: { cls: 'active', label: 'Terminado' },
  CANCELADO: { cls: 'risk', label: 'Cancelado' },
}

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
    // Programado por calendario (fechaInicio → fechaFinPlan): el backend aún
    // no expone avance físico programado real.
    plan: planPorCalendario(p.fechaInicio, p.fechaFinPlan),
    // El endpoint de lista no expone saldo por cobrar → null = "—".
    porCobrar: p.porCobrar != null ? Number(p.porCobrar) : null,
  }
}

function planPorCalendario(inicio, finPlan) {
  if (!inicio || !finPlan) return 0
  const a = new Date(inicio).getTime()
  const b = new Date(finPlan).getTime()
  if (!(b > a)) return 0
  const f = (Date.now() - a) / (b - a)
  return Math.max(0, Math.min(100, f * 100))
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

function saludo(d = new Date()) {
  const h = d.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function cuando(days) {
  if (days === 0) return 'hoy'
  if (days === 1) return 'mañana'
  return `en ${days} días`
}

function listaNombres(names) {
  const u = [...new Set(names.filter((n) => n && n !== '—'))]
  if (u.length === 0) return ''
  if (u.length === 1) return u[0]
  if (u.length <= 3) return `${u.slice(0, -1).join(', ')} y ${u[u.length - 1]}`
  return `${u.slice(0, 2).join(', ')} y ${u.length - 2} más`
}

// Abre la paleta de comandos del shell (Layout escucha ⌘K / Ctrl+K en window).
function abrirBuscador() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { activeCompany, user } = useAuth()
  const [d, setD] = useState({})
  const [sort, setSort] = useState('contratado')
  const [vista, setVista] = useState('pagar') // pagar | bancos

  useEffect(() => {
    setD({})
    if (!activeCompany?.id) return
    const cid = encodeURIComponent(activeCompany.id)
    let alive = true
    const load = (key, path) =>
      apiFetch(`/api/construccion/${path}${path.includes('?') ? '&' : '?'}companyId=${cid}`)
        .then((v) => v)
        .catch((err) => {
          console.error(`[Inicio] ${key} (${path}) falló:`, err)
          return FAIL
        })
        .then((v) => { if (alive) setD((prev) => ({ ...prev, [key]: v })) })
    load('cfdi', 'cfdis/resumen')
    load('compras', 'solicitudes-compra?estado=PENDIENTE')
    load('borradores', 'solicitudes-compra?estado=BORRADOR')
    load('adjs', 'adjudicaciones?estado=POR_PAGAR&abiertas=1')
    load('gastos', 'gastos?estado=APROBADO')
    load('sups', 'suppliers')
    load('conc', 'bank-transactions?status=UNMATCHED&count=1')
    load('accts', 'bank-accounts?withBalances=true')
    load('reemb', 'reembolsos?estado=SUBMITTED')
    load('proyectos', 'proyectos')
    return () => { alive = false }
  }, [activeCompany?.id])

  // ── Pagos ──
  // Proveedores sólo afinan los días de crédito; si fallan se usa el default.
  const payablesReady = isOk(d.adjs) && isOk(d.gastos) && d.sups !== undefined
  const payablesFailed = d.adjs === FAIL || d.gastos === FAIL
  const payables = useMemo(
    () => (payablesReady ? buildPayables(d.adjs, d.gastos, d.sups === FAIL ? [] : d.sups) : null),
    [payablesReady, d.adjs, d.gastos, d.sups]
  )
  const pagos = useMemo(() => {
    if (!payables) return null
    const total = payables.reduce((s, p) => s + p.monto, 0)
    const vencidos = payables.filter((p) => p.daysUntil != null && p.daysUntil < 0)
    const semana = payables.filter((p) => p.daysUntil != null && p.daysUntil >= 0 && p.daysUntil <= 7)
    const sum = (xs) => xs.reduce((s, p) => s + p.monto, 0)
    return { total, n: payables.length, vencidos, vencidosMonto: sum(vencidos), semana, semanaMonto: sum(semana) }
  }, [payables])

  const cuentas = isOk(d.accts) && Array.isArray(d.accts) ? d.accts : null
  const saldoBancos = cuentas && cuentas.length ? cuentas.reduce((s, a) => s + (Number(a.balance) || 0), 0) : null
  const sinConciliar = isOk(d.conc) && typeof d.conc?.count === 'number' ? d.conc.count : d.conc === undefined ? undefined : FAIL

  // ── Para hoy ──
  const count = (v, fn) => (v === undefined ? undefined : v === FAIL ? FAIL : fn(v))
  const arrLen = (v) => (Array.isArray(v) ? v.length : 0)
  const todos = [
    { key: 'compras', label: 'Compras por autorizar', to: '/compras-por-autorizar', icon: 'receipt', n: count(d.compras, arrLen), tone: 'warn' },
    { key: 'cfdi', label: 'Facturas CFDI sin vincular', to: '/facturas', icon: 'file', n: count(d.cfdi, (v) => (typeof v?.porVincular === 'number' ? v.porVincular : FAIL)) },
    { key: 'conc', label: 'Movimientos bancarios por conciliar', to: '/tesoreria-bartiz', icon: 'bank', n: sinConciliar },
    { key: 'reemb', label: 'Reembolsos de caja chica por revisar', to: '/caja-chica', icon: 'cajachica', n: count(d.reemb, arrLen) },
    { key: 'borradores', label: 'Requisiciones en borrador', to: '/requisiciones', icon: 'edit', n: count(d.borradores, arrLen), tone: 'muted' },
  ]
  const todosLoading = todos.some((t) => t.n === undefined)
  const todosVisibles = todos.filter((t) => t.n === FAIL || (typeof t.n === 'number' && t.n > 0))

  // ── Cartera ──
  const rows = useMemo(
    () => (isOk(d.proyectos) && Array.isArray(d.proyectos) ? d.proyectos.map(toRow) : []),
    [d.proyectos]
  )
  const projects = useMemo(() => [...rows].sort((a, b) => (b[sort] || 0) - (a[sort] || 0)), [rows, sort])

  const nombre = (user?.name || '').trim().split(/\s+/)[0]

  const fig = (v) => (v === FAIL ? '—' : v)
  const porPagarValor = payablesFailed ? '—' : pagos ? money(pagos.total) : '…'
  const porPagarSub = payablesFailed ? 'no se pudo cargar' : pagos ? plural(pagos.n, 'cuenta', 'cuentas') : 'cargando'
  const bancosValor = d.accts === undefined ? '…' : saldoBancos == null ? '—' : money(saldoBancos)
  const bancosSub = d.accts === undefined ? 'cargando' : d.accts === FAIL ? 'no se pudo cargar'
    : !cuentas?.length ? 'sin cuentas conectadas' : plural(cuentas.length, 'cuenta', 'cuentas')

  const vencidos = pagos?.vencidos ?? []
  const maxAtraso = vencidos.length ? Math.max(...vencidos.map((p) => -p.daysUntil)) : 0
  const minAtraso = vencidos.length ? Math.min(...vencidos.map((p) => -p.daysUntil)) : 0
  const proximo = pagos?.semana?.[0]

  return (
    <div className="ds">
      <div className="page home">
        <div className="home-greet">
          <h1>{saludo()}{nombre ? `, ${nombre}` : ''}</h1>
          <button type="button" className="home-search" onClick={abrirBuscador}>
            <Icon name="search" />
            <span>Busca una página: obras, requisiciones, pagos…</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        <div className="home-grid">
          {/* ── Pagos ── */}
          <section className="home-card">
            <header className="home-card-head">
              <span className="home-card-ic"><Icon name="bank" /></span>
              <h2>Pagos</h2>
            </header>

            <div className="home-pair" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'pagar'}
                className={'home-fig' + (vista === 'pagar' ? ' on' : '')}
                onClick={() => setVista('pagar')}
              >
                <span className={'home-fig-l' + (vencidos.length ? ' neg' : '')}>
                  Por pagar
                  {vencidos.length > 0 && <span className="home-dot" aria-label="Hay pagos vencidos" />}
                </span>
                <span className="home-fig-v num">{porPagarValor}</span>
                <span className="home-fig-s">{porPagarSub}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={vista === 'bancos'}
                className={'home-fig' + (vista === 'bancos' ? ' on' : '')}
                onClick={() => setVista('bancos')}
              >
                <span className="home-fig-l">En bancos</span>
                <span className={'home-fig-v num' + (saldoBancos == null ? ' muted' : '')}>{bancosValor}</span>
                <span className="home-fig-s">{bancosSub}</span>
              </button>
            </div>

            {vista === 'pagar' ? (
              <div className="home-detail">
                {payablesFailed && (
                  <div className="home-note">No se pudieron cargar las cuentas por pagar.</div>
                )}
                {pagos && vencidos.length > 0 && (
                  <div className="home-alert" role="alert">
                    <b>Acción requerida: {plural(vencidos.length, 'pago vencido', 'pagos vencidos')}</b>
                    <span>
                      {listaNombres(vencidos.map((p) => p.supplierName)) || 'Proveedores'}{' '}
                      {vencidos.length === 1 ? 'venció' : 'vencieron'} hace{' '}
                      {minAtraso === maxAtraso ? plural(maxAtraso, 'día', 'días') : `${minAtraso}–${maxAtraso} días`}.
                    </span>
                  </div>
                )}
                {pagos && vencidos.length > 0 && (
                  <div className="home-line">
                    <span className="home-line-ic neg"><Icon name="clock" /></span>
                    <span className="home-line-t">
                      <b className="neg">{plural(vencidos.length, 'vencido', 'vencidos')} · {money(pagos.vencidosMonto)}</b>
                      <small>El más antiguo venció hace {plural(maxAtraso, 'día', 'días')}</small>
                    </span>
                    <Link className="btn btn-primary home-btn" to="/cuentas-por-pagar">Pagar ahora</Link>
                  </div>
                )}
                {pagos && pagos.semana.length > 0 && (
                  <div className="home-line">
                    <span className="home-line-ic warn"><Icon name="calendar" /></span>
                    <span className="home-line-t">
                      <b>{pagos.semana.length} {pagos.semana.length === 1 ? 'vence' : 'vencen'} esta semana · {money(pagos.semanaMonto)}</b>
                      {proximo && <small>Próximo: {proximo.supplierName}, {cuando(proximo.daysUntil)}</small>}
                    </span>
                    <Link className="btn btn-ghost home-btn" to="/cuentas-por-pagar">Revisar</Link>
                  </div>
                )}
                {pagos && vencidos.length === 0 && pagos.semana.length === 0 && (
                  <div className="home-note">
                    {pagos.n === 0 ? 'Nada por pagar.' : 'Nada vencido ni por vencer esta semana.'}
                  </div>
                )}
              </div>
            ) : (
              <div className="home-detail">
                {d.accts === FAIL && <div className="home-note">No se pudieron cargar las cuentas bancarias.</div>}
                {cuentas && cuentas.length === 0 && (
                  <div className="home-note">Sin cuentas bancarias conectadas. <Link to="/tesoreria-bartiz">Impórtalas en Bancos</Link>.</div>
                )}
                {cuentas?.map((b) => (
                  <div className="home-bank" key={b.id}>
                    <span className="home-line-ic"><Icon name="bank" /></span>
                    <span className="home-line-t">
                      <b>{b.banco} <span className="home-muted">{b.nombre}</span></b>
                      <small>{b.tipo === 'CAJA' ? 'caja chica' : b.titular || '—'}</small>
                    </span>
                    <span className={'home-bank-v num' + ((Number(b.balance) || 0) < 0 ? ' neg' : '')}>
                      {(Number(b.balance) || 0) < 0 ? '−' : ''}{money(Math.abs(Number(b.balance) || 0))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Para hoy ── */}
          <section className="home-card">
            <header className="home-card-head">
              <span className="home-card-ic"><Icon name="check" /></span>
              <h2>Para hoy</h2>
            </header>
            <p className="home-card-sub">Pendientes que requieren tu atención</p>
            {todosVisibles.length === 0 ? (
              <div className="home-empty">
                {todosLoading ? 'Cargando pendientes…' : (
                  <>
                    <span className="home-empty-ic"><Icon name="check" /></span>
                    <b>Todo al día</b>
                    <span>No hay pendientes que requieran tu atención.</span>
                  </>
                )}
              </div>
            ) : (
              <ul className="home-todos">
                {todosVisibles.map((t) => (
                  <li key={t.key}>
                    <Link to={t.to} className="home-todo" title={t.n === FAIL ? 'No se pudo cargar este conteo' : undefined}>
                      <span className={'home-bub' + (t.tone ? ' ' + t.tone : '')}>
                        <Icon name={t.icon} />
                        <b className="num">{fig(t.n)}</b>
                      </span>
                      <span className="home-todo-l">{t.label}</span>
                      <Icon name="chevronRight" className="home-todo-go" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Cartera de proyectos ── */}
        <section className="home-card home-cartera">
          <header className="home-card-head">
            <span className="home-card-ic"><Icon name="projects" /></span>
            <h2>Cartera de proyectos</h2>
            <span className="home-card-hint">Avance físico vs. programado</span>
            <span className="home-spacer" />
            {rows.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost home-btn"
                onClick={() => setSort(sort === 'contratado' ? 'avance' : 'contratado')}
              >
                <Icon name="filter" />
                Ordenar: {sort === 'contratado' ? 'Monto' : 'Avance'}
              </button>
            )}
          </header>
          {d.proyectos === undefined && <div className="home-note pad">Cargando cartera…</div>}
          {d.proyectos === FAIL && <div className="home-note pad">No se pudo cargar la cartera.</div>}
          {isOk(d.proyectos) && projects.length === 0 && (
            <div className="home-note pad">
              Sin obras aún. Crea la primera en <Link to="/proyectos">Obras</Link> y su presupuesto aparecerá aquí.
            </div>
          )}
          {projects.length > 0 && (
            <div className="scroll-x">
              <table className="ptable home-ptable">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Avance</th>
                    <th className="r">Contratado</th>
                    <th className="r" title="El saldo por cobrar aún no está disponible en la lista de obras">Por cobrar</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id || p.code} onClick={() => p.id && navigate(`/proyectos/${p.id}`)}>
                      <td>
                        <div className="proj-cell">
                          <div className="proj-badge" style={{ background: p.color }}>{p.short}</div>
                          <div>
                            <div className="proj-name">{p.name}</div>
                            <div className="proj-code">{p.code} · {p.location}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="progress-wrap">
                          <div className="progress-top">
                            <span className="pct" style={{ color: p.avance > 0 ? 'var(--pos)' : 'var(--ink-3)' }}>
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
                      <td className="r"><span className="home-money num">{p.contratado ? money(p.contratado) : '—'}</span></td>
                      <td className="r">
                        <span className={'home-money num' + (p.porCobrar == null ? ' home-muted' : '')}>
                          {p.porCobrar == null ? '—' : money(p.porCobrar)}
                        </span>
                      </td>
                      <td>
                        <span className={'status ' + p.status}>
                          <span className="sdot" />
                          {p.statusLabel}
                        </span>
                      </td>
                      <td className="r"><span className="row-go"><Icon name="chevronRight" /></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Dashboard
